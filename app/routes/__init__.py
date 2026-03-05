from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.routes.websocket_routes import router as websocket_router

__all__ = ['auth_router', 'user_router', 'websocket_router']
