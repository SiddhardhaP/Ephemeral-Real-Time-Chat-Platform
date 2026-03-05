from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user_schema import UserLoginRequest, UserRegisterRequest


class UserService:
    async def create_user(self, db: AsyncSession, payload: UserRegisterRequest) -> User:
        user = User(
            username=payload.username.strip(),
            email=payload.email.lower().strip(),
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Username or email already exists',
            ) from exc
        await db.refresh(user)
        return user

    async def authenticate_user(self, db: AsyncSession, payload: UserLoginRequest) -> User:
        stmt = select(User).where(
            or_(
                User.username == payload.username_or_email.strip(),
                User.email == payload.username_or_email.lower().strip(),
            )
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid credentials',
            )
        return user

    async def list_users(self, db: AsyncSession) -> list[User]:
        stmt = select(User).order_by(User.created_at.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


user_service = UserService()
