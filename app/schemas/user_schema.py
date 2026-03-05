from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLoginRequest(BaseModel):
    username_or_email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    is_online: bool = False


class ConnectRequestCreate(BaseModel):
    receiver_id: int = Field(gt=0)


class ConnectRequestItem(BaseModel):
    sender_id: int


class ConnectPendingResponse(BaseModel):
    requests: list[ConnectRequestItem]


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class RegisterResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime
