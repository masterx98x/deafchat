"""DeafChat – WebSocket handler."""

from __future__ import annotations

import asyncio
import re
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
import base64

from fastapi import WebSocket, WebSocketDisconnect

from .config import settings
from .models import WSIncoming, WSMessageType, WSOutgoing
from .rooms import room_manager
from .models import RoomType

# C2: room-ID validation
_ROOM_ID_RE = re.compile(r"^[a-z0-9]{10}$")

# --- S6: per-IP connection tracking ---
_ip_connections: dict[str, int] = defaultdict(int)
MAX_WS_PER_IP = 10

# --- S1: per-connection message rate-limit ---
WS_MSG_RATE = 10    # tokens refilled per second
WS_MSG_BURST = 15   # max burst

# --- Audio rate-limit (stricter) ---
WS_AUDIO_RATE = 0.5   # 1 token every 2 seconds
WS_AUDIO_BURST = 2    # max burst

# --- H1: max raw WS message size (defense-in-depth) ---
MAX_WS_RAW_SIZE = 15_000_000  # ~15 MB

# --- H2: allowed audio MIME types ---
ALLOWED_AUDIO_MIMES = (
    "audio/webm", "audio/webm;codecs=opus", "audio/ogg;codecs=opus",
    "audio/mp4", "audio/mpeg", "audio/ogg",
)

# --- H4: max signaling payload sizes ---
MAX_SDP_SIZE = 65_536   # 64 KB
MAX_ICE_SIZE = 2_048    # 2 KB

# --- H5: join timeout ---
JOIN_TIMEOUT = 10.0  # seconds

# --- V4: base64 validation pattern ---
_BASE64_RE = re.compile(r"^[A-Za-z0-9+/=]+$")

def _is_valid_base64(data: str) -> bool:
    """Check that a string is valid base64."""
    if not _BASE64_RE.match(data):
        return False
    try:
        base64.b64decode(data, validate=True)
        return True
    except Exception:
        return False

# --- V8: reserved nicknames ---
_RESERVED_NICKNAMES = {
    "sistema", "system", "admin", "deafchat", "server",
    "moderatore", "moderator", "bot", "info",
}


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

    # L4: WebSocket Origin check (V2: stricter – reject missing origin when origins configured)
    # NOTE: origin check runs pre-accept; on failure we reject the HTTP upgrade (no WS frame).
    origin = None
    for header_name, header_value in ws.scope.get("headers", []):
        if header_name == b"origin":
            origin = header_value.decode("utf-8", errors="ignore")
            break
    allowed_origins = settings.cors_origin_list
    if allowed_origins:
        if not origin or origin not in allowed_origins:
            await ws.close(code=4006, reason="Origin not allowed")
            return

    # V12: reject connections without identifiable client IP
    if not ws.client or not ws.client.host:
        await ws.close(code=4008, reason="Unknown client")
        return

    # S6: per-IP connection cap
    client_ip = ws.client.host
    if _ip_connections[client_ip] >= MAX_WS_PER_IP:
        await ws.close(code=4005, reason="Too many connections")
        return

    # Accept first so the client receives proper close codes for room-level errors
    await ws.accept()

    # C2: validate room_id format
    if not _ROOM_ID_RE.match(room_id):
        await ws.close(code=4004, reason="Invalid room ID")
        return

    # Verify room exists
    room = room_manager.get_room(room_id)
    if room is None:
        await ws.close(code=4004, reason="Room not found")
        return

    ws_id = str(uuid.uuid4())
    nickname: str | None = None
    bucket = _TokenBucket(WS_MSG_RATE, WS_MSG_BURST)
    audio_bucket = _TokenBucket(WS_AUDIO_RATE, WS_AUDIO_BURST)

    # V9: increment IP counter inside try so finally always decrements correctly
    _ip_connections[client_ip] += 1
    try:
        # H5: Wait for the join message with timeout
        try:
            raw = await asyncio.wait_for(ws.receive_text(), timeout=JOIN_TIMEOUT)
        except asyncio.TimeoutError:
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Join timeout"))
            await ws.close(code=4007, reason="Join timeout")
            return
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

        # V8: block reserved nicknames
        if nickname.lower() in _RESERVED_NICKNAMES:
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Questo nickname è riservato. Scegline un altro."))
            await ws.close(code=4002)
            return

        # V8: block nicknames with only invisible/control characters
        if not re.sub(r'[\s\u200b-\u200f\u2028-\u202f\u2060\ufeff]', '', nickname):
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Nickname non valido."))
            await ws.close(code=4002)
            return

        # V7: add_member now checks for duplicates atomically
        result = room_manager.add_member(room_id, ws_id, nickname, ws)
        if result == "duplicate":
            await _send(ws, WSOutgoing(type=WSMessageType.error, content="Nickname già in uso in questa stanza"))
            await ws.close(code=4002)
            return
        if not result:
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

            # H1: defense-in-depth size check
            if len(raw) > MAX_WS_RAW_SIZE:
                await _send(ws, WSOutgoing(
                    type=WSMessageType.error,
                    content="Messaggio troppo grande.",
                    timestamp=_now_iso(),
                ))
                continue

            try:
                incoming = WSIncoming.model_validate_json(raw)
            except Exception:
                continue

            # C3: keep-alive ping
            if incoming.type == WSMessageType.ping:
                room = room_manager.get_room(room_id)
                if room:
                    room.touch()
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
                # V3: audio MIME must not be empty
                if not incoming.audio_mime or incoming.audio_mime not in ALLOWED_AUDIO_MIMES:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Formato audio non supportato.",
                        timestamp=_now_iso(),
                    ))
                    continue
                # V4: validate base64 audio data
                if not _is_valid_base64(audio_data):
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Dati audio non validi.",
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
                # V4: validate base64 image data
                if not _is_valid_base64(image_data):
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Dati immagine non validi.",
                        timestamp=_now_iso(),
                    ))
                    continue
                # Validate size
                if len(image_data) > settings.max_image_size:
                    await _send(ws, WSOutgoing(
                        type=WSMessageType.error,
                        content="Immagine troppo grande (max 5 MB).",
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

                # H3: validate call_mode
                if incoming.call_mode not in ("video", "voice"):
                    continue

                # H4: cap SDP/ICE payload size
                if incoming.sdp and len(incoming.sdp) > MAX_SDP_SIZE:
                    continue
                if incoming.ice and len(incoming.ice) > MAX_ICE_SIZE:
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
