import json
from collections.abc import Sequence

from redis.asyncio import Redis

from app.core.config import get_settings
from app.schemas.message_schema import ChatMessage


class RedisService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.redis: Redis | None = None

    async def connect(self) -> None:
        if self.redis is None:
            self.redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
            await self.redis.ping()

    async def disconnect(self) -> None:
        if self.redis is not None:
            await self.redis.aclose()
            self.redis = None

    def _get_client(self) -> Redis:
        if self.redis is None:
            raise RuntimeError('Redis client is not initialized')
        return self.redis

    async def mark_user_online(self, user_id: int) -> None:
        client = self._get_client()
        await client.sadd('online_users', user_id)
        await client.set(f'online_users:{user_id}', '1', ex=120)

    async def refresh_user_presence(self, user_id: int) -> None:
        client = self._get_client()
        await client.expire(f'online_users:{user_id}', 120)

    async def mark_user_offline(self, user_id: int) -> None:
        client = self._get_client()
        await client.srem('online_users', user_id)
        await client.delete(f'online_users:{user_id}')

    async def get_online_user_ids(self) -> set[int]:
        client = self._get_client()
        online_ids = await client.smembers('online_users')
        online_int_ids = {int(user_id) for user_id in online_ids}
        if not online_int_ids:
            return set()

        ordered_ids = sorted(online_int_ids)
        pipeline = client.pipeline()
        for uid in ordered_ids:
            pipeline.exists(f'online_users:{uid}')
        key_exists_results = await pipeline.execute()

        active_ids: set[int] = set()
        stale_ids: list[int] = []
        for uid, exists in zip(ordered_ids, key_exists_results, strict=False):
            if exists:
                active_ids.add(uid)
            else:
                stale_ids.append(uid)

        if stale_ids:
            await client.srem('online_users', *stale_ids)
        return active_ids

    @staticmethod
    def build_chat_key(user_a: int, user_b: int) -> str:
        left, right = sorted([user_a, user_b])
        return f'chat:{left}:{right}'

    async def store_ephemeral_message(self, message: ChatMessage) -> None:
        client = self._get_client()
        key = self.build_chat_key(message.sender_id, message.receiver_id)
        await client.rpush(key, message.model_dump_json())
        await client.expire(key, self.settings.ephemeral_message_ttl_seconds)

    async def get_ephemeral_messages(self, user_a: int, user_b: int) -> Sequence[ChatMessage]:
        client = self._get_client()
        key = self.build_chat_key(user_a, user_b)
        raw_messages = await client.lrange(key, 0, -1)
        return [ChatMessage(**json.loads(item)) for item in raw_messages]

    async def upsert_active_chat_session(self, user_a: int, user_b: int) -> None:
        client = self._get_client()
        await client.sadd(f'active_chat_sessions:{user_a}', user_b)
        await client.sadd(f'active_chat_sessions:{user_b}', user_a)
        await client.expire(f'active_chat_sessions:{user_a}', self.settings.ephemeral_message_ttl_seconds)
        await client.expire(f'active_chat_sessions:{user_b}', self.settings.ephemeral_message_ttl_seconds)

    @staticmethod
    def build_chat_request_key(sender_id: int, receiver_id: int) -> str:
        return f'chat_request:{receiver_id}:{sender_id}'

    async def create_chat_request(self, sender_id: int, receiver_id: int) -> None:
        client = self._get_client()
        request_key = self.build_chat_request_key(sender_id, receiver_id)
        pending_set_key = f'pending_chat_requests:{receiver_id}'

        await client.set(request_key, 'pending', ex=self.settings.chat_request_ttl_seconds)
        await client.sadd(pending_set_key, sender_id)
        await client.expire(pending_set_key, self.settings.chat_request_ttl_seconds)

    async def get_pending_chat_request_ids(self, receiver_id: int) -> list[int]:
        client = self._get_client()
        pending_set_key = f'pending_chat_requests:{receiver_id}'
        raw_sender_ids = await client.smembers(pending_set_key)
        sender_ids = sorted({int(sender_id) for sender_id in raw_sender_ids})
        if not sender_ids:
            return []

        pipeline = client.pipeline()
        for sender_id in sender_ids:
            pipeline.exists(self.build_chat_request_key(sender_id, receiver_id))
        exists_flags = await pipeline.execute()

        active_sender_ids: list[int] = []
        stale_sender_ids: list[int] = []
        for sender_id, exists in zip(sender_ids, exists_flags, strict=False):
            if exists:
                active_sender_ids.append(sender_id)
            else:
                stale_sender_ids.append(sender_id)

        if stale_sender_ids:
            await client.srem(pending_set_key, *stale_sender_ids)
        return active_sender_ids

    async def accept_chat_request(self, sender_id: int, receiver_id: int) -> bool:
        client = self._get_client()
        request_key = self.build_chat_request_key(sender_id, receiver_id)
        pending_set_key = f'pending_chat_requests:{receiver_id}'

        deleted = await client.delete(request_key)
        await client.srem(pending_set_key, sender_id)
        if deleted:
            await self.upsert_active_chat_session(sender_id, receiver_id)
        return bool(deleted)

    async def reject_chat_request(self, sender_id: int, receiver_id: int) -> bool:
        client = self._get_client()
        request_key = self.build_chat_request_key(sender_id, receiver_id)
        pending_set_key = f'pending_chat_requests:{receiver_id}'

        deleted = await client.delete(request_key)
        await client.srem(pending_set_key, sender_id)
        return bool(deleted)


redis_service = RedisService()
