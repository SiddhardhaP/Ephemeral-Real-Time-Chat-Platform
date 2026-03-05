from app.schemas.message_schema import ChatMessage
from app.services.redis_service import redis_service


class ChatService:
    async def persist_ephemeral_message(self, message: ChatMessage) -> None:
        await redis_service.store_ephemeral_message(message)
        await redis_service.upsert_active_chat_session(message.sender_id, message.receiver_id)


chat_service = ChatService()
