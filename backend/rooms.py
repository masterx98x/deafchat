"""DeafChat – in-memory room manager.

Rooms live only in memory.  Messages are never persisted.
An asyncio background task prunes expired rooms.
"""

from __future__ import annotations

import asyncio
import secrets
import string
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict

from fastapi import WebSocket

from .config import settings
from .models import RoomType


def _generate_room_id(length: int = 10) -> str:
    """URL-safe room identifier (lowercase + digits)."""
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@dataclass
class Member:
    nickname: str
    ws: WebSocket


@dataclass
class Room:
    room_id: str
    room_type: RoomType
    room_name: str
    expiry_minutes: int = 30
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    members: Dict[str, Member] = field(default_factory=dict)  # ws id -> Member

    def touch(self) -> None:
        self.last_activity = datetime.now(timezone.utc)

    @property
    def member_count(self) -> int:
        return len(self.members)

    @property
    def nicknames(self) -> list[str]:
        return [m.nickname for m in self.members.values()]

    @property
    def expires_at(self) -> datetime:
        from datetime import timedelta
        return self.last_activity + timedelta(minutes=self.expiry_minutes)


class RoomManager:
    """Thread-safe (single-event-loop) manager for all active rooms."""

    def __init__(self) -> None:
        self._rooms: Dict[str, Room] = {}
        self._cleanup_task: asyncio.Task | None = None

    # --- lifecycle ----------------------------------------------------------

    def start_cleanup_loop(self) -> None:
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def shutdown(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        # close all websockets
        for room in list(self._rooms.values()):
            for member in list(room.members.values()):
                try:
                    await member.ws.close(code=1001)
                except Exception:
                    pass
        self._rooms.clear()

    async def _cleanup_loop(self) -> None:
        """Remove rooms that exceeded the expiry timeout."""
        while True:
            await asyncio.sleep(60)  # check every minute
            now = datetime.now(timezone.utc)
            expired = [
                rid
                for rid, room in self._rooms.items()
                if (now - room.last_activity).total_seconds()
                > room.expiry_minutes * 60
            ]
            for rid in expired:
                room = self._rooms.pop(rid, None)
                if room:
                    for member in list(room.members.values()):
                        try:
                            await member.ws.close(code=1000, reason="Room expired")
                        except Exception:
                            pass

    # --- CRUD ---------------------------------------------------------------

    def create_room(
        self,
        room_type: RoomType = RoomType.group,
        room_name: str = "",
        expiry_minutes: int = 30,
    ) -> Room:
        room_id = _generate_room_id()
        while room_id in self._rooms:
            room_id = _generate_room_id()

        if not room_name:
            room_name = f"Chat {room_id[:6]}"

        room = Room(
            room_id=room_id,
            room_type=room_type,
            room_name=room_name,
            expiry_minutes=expiry_minutes,
        )
        self._rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> Room | None:
        return self._rooms.get(room_id)

    def room_exists(self, room_id: str) -> bool:
        return room_id in self._rooms

    # --- membership ---------------------------------------------------------

    def add_member(self, room_id: str, ws_id: str, nickname: str, ws: WebSocket) -> bool:
        room = self._rooms.get(room_id)
        if room is None:
            return False
        if room.member_count >= settings.max_room_members:
            return False
        room.members[ws_id] = Member(nickname=nickname, ws=ws)
        room.touch()
        return True

    def remove_member(self, room_id: str, ws_id: str) -> str | None:
        """Remove member and return their nickname, or None."""
        room = self._rooms.get(room_id)
        if room is None:
            return None
        member = room.members.pop(ws_id, None)
        if member:
            room.touch()
            return member.nickname
        return None

    def get_members_ws(self, room_id: str) -> list[WebSocket]:
        room = self._rooms.get(room_id)
        if room is None:
            return []
        return [m.ws for m in room.members.values()]

    def get_nicknames(self, room_id: str) -> list[str]:
        room = self._rooms.get(room_id)
        return room.nicknames if room else []

    # --- stats --------------------------------------------------------------

    @property
    def active_room_count(self) -> int:
        return len(self._rooms)


room_manager = RoomManager()
