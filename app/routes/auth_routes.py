from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.user_schema import (
    AuthTokenResponse,
    RegisterResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.user_service import user_service

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/register', response_model=RegisterResponse, status_code=201)
async def register_user(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    user = await user_service.create_user(db, payload)
    return RegisterResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
    )


@router.post('/login', response_model=AuthTokenResponse)
async def login_user(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    user = await user_service.authenticate_user(db, payload)
    token = create_access_token(subject=str(user.id))
    return AuthTokenResponse(access_token=token)
