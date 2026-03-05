from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Ephemeral Chat Platform'
    app_env: str = Field(default='development', alias='APP_ENV')
    app_debug: bool = Field(default=False, alias='APP_DEBUG')

    api_prefix: str = '/api/v1'

    postgres_host: str = Field(default='postgres', alias='POSTGRES_HOST')
    postgres_port: int = Field(default=5432, alias='POSTGRES_PORT')
    postgres_db: str = Field(default='chat_db', alias='POSTGRES_DB')
    postgres_user: str = Field(default='chat_user', alias='POSTGRES_USER')
    postgres_password: str = Field(default='chat_password', alias='POSTGRES_PASSWORD')

    redis_host: str = Field(default='redis', alias='REDIS_HOST')
    redis_port: int = Field(default=6379, alias='REDIS_PORT')
    redis_db: int = Field(default=0, alias='REDIS_DB')
    redis_password: str | None = Field(default=None, alias='REDIS_PASSWORD')

    jwt_secret_key: str = Field(default='please_change_me', alias='JWT_SECRET_KEY')
    jwt_algorithm: str = Field(default='HS256', alias='JWT_ALGORITHM')
    access_token_expire_minutes: int = Field(default=60, alias='ACCESS_TOKEN_EXPIRE_MINUTES')

    ephemeral_message_ttl_seconds: int = Field(default=300, alias='EPHEMERAL_MESSAGE_TTL_SECONDS')
    chat_request_ttl_seconds: int = Field(default=300, alias='CHAT_REQUEST_TTL_SECONDS')
    cors_allow_origins: str = Field(
        default='http://localhost:5173,http://127.0.0.1:5173',
        alias='CORS_ALLOW_ORIGINS',
    )
    cors_allow_origin_regex: str = Field(
        default=r'^https?://(\d{1,3}\.){3}\d{1,3}:5173$',
        alias='CORS_ALLOW_ORIGIN_REGEX',
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return self.database_url.replace('postgresql+asyncpg', 'postgresql')

    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ''
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
