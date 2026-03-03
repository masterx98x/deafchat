"""DeafChat – data models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class RoomType(str, Enum):
    private = "private"   # 1-to-1
    group = "group"       # stanza di gruppo


ALLOWED_EXPIRY_MINUTES = [5, 15, 30, 60, 120]


class CreateRoomRequest(BaseModel):
    room_type: RoomType = RoomType.group
    room_name: str = Field(default="", max_length=60)
    expiry_minutes: int = Field(default=30, description="Auto-destruct timer in minutes")


class CreateRoomResponse(BaseModel):
    room_id: str
    room_type: RoomType
    room_name: str
    link: str
    expiry_minutes: int
    created_at: datetime


class RoomInfoResponse(BaseModel):
    room_id: str
    room_type: RoomType
    room_name: str
    member_count: int
    expiry_minutes: int
    expires_at: datetime
    created_at: datetime


# --- WebSocket message types ---

class WSMessageType(str, Enum):
    join = "join"
    leave = "leave"
    message = "message"
    audio = "audio"
    system = "system"
    error = "error"
    members = "members"


class WSIncoming(BaseModel):
    """Message received from a client."""
    type: WSMessageType
    nickname: str = ""
    content: str = ""
    audio_data: str = ""
    audio_duration: float = 0


class WSOutgoing(BaseModel):
    """Message sent to clients."""
    type: WSMessageType
    nickname: str = ""
    content: str = ""
    audio_data: str = ""
    audio_duration: float = 0
    timestamp: str = ""
    members: list[str] = Field(default_factory=list)
