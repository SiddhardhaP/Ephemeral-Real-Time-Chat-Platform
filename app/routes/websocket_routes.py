import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError
from starlette.websockets import WebSocketState

from app.core.security import decode_access_token
from app.schemas.message_schema import ChatMessage, ChatMessageIn
from app.services.chat_service import chat_service
from app.services.connection_manager import connection_manager
from app.services.redis_service import redis_service
from app.utils.dependencies import extract_token_from_websocket

router = APIRouter(tags=['websocket'])


async def _presence_heartbeat(user_id: int, interval_seconds: int = 30) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        await redis_service.refresh_user_presence(user_id)


@router.websocket('/ws/{user_id}')
async def websocket_chat(websocket: WebSocket, user_id: int) -> None:
    token = extract_token_from_websocket(
        protocol_header=websocket.headers.get('sec-websocket-protocol'),
        token_query=websocket.query_params.get('token'),
    )
    if token is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if payload is None or str(user_id) != str(payload.get('sub')):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    heartbeat_task: asyncio.Task | None = None

    try:
        await connection_manager.connect(user_id, websocket)
        await redis_service.mark_user_online(user_id)
        await connection_manager.broadcast(
            {'event': 'presence', 'data': {'user_id': user_id, 'is_online': True}}
        )
        pending_sender_ids = await redis_service.get_pending_chat_request_ids(user_id)
        for sender_id in pending_sender_ids:
            await connection_manager.send_personal_message(
                user_id,
                {'event': 'connection_request', 'data': {'from_user_id': sender_id}},
            )
        heartbeat_task = asyncio.create_task(_presence_heartbeat(user_id))

        while True:
            data = await websocket.receive_json()
            try:
                incoming = ChatMessageIn(**data)
            except ValidationError as exc:
                await websocket.send_json({'event': 'error', 'detail': str(exc)})
                continue

            message = ChatMessage(
                sender_id=user_id,
                receiver_id=incoming.receiver_id,
                content=incoming.content,
                timestamp=datetime.now(timezone.utc),
            )

            await chat_service.persist_ephemeral_message(message)

            payload_out = {
                'event': 'message',
                'data': message.model_dump(mode='json'),
            }
            await connection_manager.send_personal_message(incoming.receiver_id, payload_out)
            await connection_manager.send_personal_message(user_id, payload_out)
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception:
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        if heartbeat_task is not None:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
        connection_manager.disconnect(user_id)
        await redis_service.mark_user_offline(user_id)
        await connection_manager.broadcast(
            {'event': 'presence', 'data': {'user_id': user_id, 'is_online': False}}
        )
