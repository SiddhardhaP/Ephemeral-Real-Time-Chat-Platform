from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int) -> None:
        self.active_connections.pop(user_id, None)

    def get_connection(self, user_id: int) -> WebSocket | None:
        return self.active_connections.get(user_id)

    def is_connected(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_personal_message(self, user_id: int, payload: dict) -> None:
        websocket = self.get_connection(user_id)
        if websocket is not None:
            if websocket.client_state != WebSocketState.CONNECTED:
                self.disconnect(user_id)
                return
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, payload: dict) -> None:
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(user_id, payload)


connection_manager = ConnectionManager()
