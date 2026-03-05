from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.routes.websocket_routes import router as websocket_router
from app.services.redis_service import redis_service

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await redis_service.connect()
    try:
        yield
    finally:
        await redis_service.disconnect()


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health', tags=['health'])
async def health() -> dict[str, str]:
    return {'status': 'ok'}


app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(user_router, prefix=settings.api_prefix)
app.include_router(websocket_router)
