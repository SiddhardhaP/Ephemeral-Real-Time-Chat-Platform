from datetime import datetime, timezone

from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    receiver_id: int = Field(gt=0)
    content: str = Field(min_length=1, max_length=2000)


class ChatMessage(BaseModel):
    sender_id: int
    receiver_id: int
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
