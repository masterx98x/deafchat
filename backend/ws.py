"""DeafChat – WebSocket handler."""

from __future__ import annotations

import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from .config import settings
from .models import WSIncoming, WSMessageType, WSOutgoing
from .rooms import room_manager
from .models import RoomType

# --- S6: per-IP connection tracking ---
_ip_connections: dict[str, int] = defaultdict(int)
MAX_WS_PER_IP = 10

# --- S1: per-connection message rate-limit ---
WS_MSG_RATE = 10    # tokens refilled per second
WS_MSG_BURST = 15   # max burst

# --- Audio rate-limit (stricter) ---
WS_AUDIO_RATE = 0.5   # 1 token every 2 seconds
WS_AUDIO_BURST = 2    # max burst


class _TokenBucket:
    """Simple token-bucket rate-limiter."""
    __slots__ = ("_rate", "_cap", "_tokens", "_last")

    def __init__(self, rate: float, capacity: int) -> None:
        self._rate = rate
        self._cap = capacity
        self._tokens = float(capacity)
        self._last = time.monotonic()

    def consume(self) -> bool:
        now = time.monotonic()
        self._tokens = min(self._cap, self._tokens + (now - self._last) * self._rate)
        self._last = now
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False


async def _broadcast(room_id: str, message: WSOutgoing, exclude_ws: WebSocket | None = None) -> None:
    """Send a message to every member of a room."""
    payload = message.model_dump_json()
    for ws in room_manager.get_members_ws(room_id):
        if ws is exclude_ws:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            pass


async def _send(ws: WebSocket, message: WSOutgoing) -> None:
    try:
        await ws.send_text(message.model_dump_json())
    except Exception:
        pass


async def _broadcast_members(room_id: str) -> None:
    """Broadcast updated member list to all participants."""
    members = room_manager.get_nicknames(room_id)
    msg = WSOutgoing(
        type=WSMessageType.members,
        members=members,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    await _broadcast(room_id, msg)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def handle_websocket(ws: WebSocket, room_id: str) -> None:
    """Full lifecycle of a WebSocket connection to a chat room."""

    # Verify room exists
    room = room_manager.get_room(room_id)
    if room is None:
        await ws.close(code=4004, reason="Room not found")
        return

    # S6: per-IP connection cap
    client_ip = ws.client.host if ws.client else "unknown"
    if _ip_connections[client_ip] >= MAX_WS_PER_IP:
        await ws.close(code=4005, reason="Too many connections")
        return

    await ws.accept()
    _ip_connections[client_ip] += 1
    ws_id = str(uuid.uuid4())
    nickname: str | None = None
    bucket = _TokenBucket(WS_MSG_RATE, WS_MSG_BURST)
    audio_bucket = _TokenBucket(WS_AUDIO_RATE, WS_AUDIO_BURST)

    try:
        # Wait for the join message
        raw = await ws.receive_text()
        try:
            incoming = WSIncoming.model_validate_json(raw)
        except Exception:
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Invalid message format"))
            await ws.close(code=4000)
            return

        if incoming.type != WSMessageType.join or not incoming.nickname.strip():
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="First message must be a join with a nickname"))
            await ws.close(code=4001)
            return

        nickname = incoming.nickname.strip()[:30]

        # Check for duplicate nickname
        existing = room_manager.get_nicknames(room_id)
        if nickname.lower() in [n.lower() for n in existing]:
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Nickname già in uso in questa stanza"))
            await ws.close(code=4002)
            return

        # Add to room
        if not room_manager.add_member(room_id, ws_id, nickname, ws):
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Stanza piena"))
            await ws.close(code=4003)
            return

        # Announce join
        await _broadcast(
            room_id,
            WSOutgoing(
                type=WSMessageType.system,
                content=f"{nickname} è entrato nella chat",
                timestamp=_now_iso(),
            ),
        )
        await _broadcast_members(room_id)

        # Message loop
        while True:
            raw = await ws.receive_text()
            try:
                incoming = WSIncoming.model_validate_json(raw)
            except Exception:
                continue

            if incoming.type == WSMessageType.message:
                # S1: per-connection rate-limit
                if not bucket.consume():
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Troppi messaggi. Rallenta.",
                        timestamp=_now_iso(),
                    ))
                    continue

                content = incoming.content.strip()
                if not content:
                    continue
                if len(content) > settings.max_message_length:
                    content = content[: settings.max_message_length]

                room = room_manager.get_room(room_id)
                if room:
                    room.touch()

                await _broadcast(
                    room_id,
                    WSOutgoing(
                        type=WSMessageType.message,
                        nickname=nickname,
                        content=content,
                        timestamp=_now_iso(),
                    ),
                )

            elif incoming.type == WSMessageType.audio:
                # Audio rate-limit (stricter)
                if not audio_bucket.consume():
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Troppi messaggi audio. Aspetta un momento.",
                        timestamp=_now_iso(),
                    ))
                    continue

                audio_data = incoming.audio_data
                if not audio_data:
                    continue
                # Validate size (base64 string length)
                if len(audio_data) > settings.max_audio_size:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Audio troppo grande.",
                        timestamp=_now_iso(),
                    ))
                    continue
                # Validate duration
                if incoming.audio_duration <= 0 or incoming.audio_duration > settings.max_audio_duration:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content=f"Durata audio non valida (max {settings.max_audio_duration}s).",
                        timestamp=_now_iso(),
                    ))
                    continue

                room = room_manager.get_room(room_id)
                if room:
                    room.touch()

                await _broadcast(
                    room_id,
                    WSOutgoing(
                        type=WSMessageType.audio,
                        nickname=nickname,
                        audio_data=audio_data,
                        audio_duration=incoming.audio_duration,
                        audio_mime=incoming.audio_mime,
                        timestamp=_now_iso(),
                    ),
                )

            elif incoming.type == WSMessageType.image:
                # Image rate-limit (use audio bucket – stricter)
                if not audio_bucket.consume():
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Troppi invii. Aspetta un momento.",
                        timestamp=_now_iso(),
                    ))
                    continue

                image_data = incoming.image_data
                if not image_data:
                    continue
                # Validate size
                if len(image_data) > settings.max_image_size:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Immagine troppo grande (max 1.5 MB).",
                        timestamp=_now_iso(),
                    ))
                    continue
                # Validate mime
                allowed_mimes = ("image/jpeg", "image/png", "image/gif", "image/webp")
                if incoming.image_mime not in allowed_mimes:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Formato immagine non supportato.",
                        timestamp=_now_iso(),
                    ))
                    continue

                room = room_manager.get_room(room_id)
                if room:
                    room.touch()

                await _broadcast(
                    room_id,
                    WSOutgoing(
                        type=WSMessageType.image,
                        nickname=nickname,
                        image_data=image_data,
                        image_mime=incoming.image_mime,
                        timestamp=_now_iso(),
                    ),
                )

            # --- WebRTC video-call signaling (1-to-1 private rooms) ---
            elif incoming.type in (
                WSMessageType.call_request,
                WSMessageType.call_accept,
                WSMessageType.call_reject,
                WSMessageType.call_offer,
                WSMessageType.call_answer,
                WSMessageType.call_ice,
                WSMessageType.call_end,
            ):
                room = room_manager.get_room(room_id)
                if not room or room.room_type != RoomType.private:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Le videochiamate sono disponibili solo nelle chat private 1-to-1.",
                        timestamp=_now_iso(),
                    ))
                    continue

                # Forward the signaling message to the other peer
                out = WSOutgoing(
                    type=incoming.type,
                    nickname=nickname,
                    sdp=incoming.sdp,
                    ice=incoming.ice,
                    call_mode=incoming.call_mode,
                    timestamp=_now_iso(),
                )
                await _broadcast(room_id, out, exclude_ws=ws)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        # S6: decrement IP counter
        _ip_connections[client_ip] -= 1
        if _ip_connections[client_ip] <= 0:
            _ip_connections.pop(client_ip, None)

        # Cleanup: remove member and announce leave
        left_nick = room_manager.remove_member(room_id, ws_id)
        if left_nick:
            await _broadcast(
                room_id,
                WSOutgoing(
                    type=WSMessageType.system,
                    content=f"{left_nick} ha lasciato la chat",
                    timestamp=_now_iso(),
                ),
            )
            await _broadcast_members(room_id)
