"""DeafChat - FastAPI application entry-point."""

import re
import uuid
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import settings
from .models import (
    ALLOWED_EXPIRY_MINUTES,
    CreateRoomRequest,
    CreateRoomResponse,
    RoomInfoResponse,
)
from .rooms import room_manager
from .ws import handle_websocket


_ROOM_ID_RE = re.compile(r"^[a-z0-9]{10}$")


def _valid_room_id(rid: str) -> bool:
    return bool(_ROOM_ID_RE.match(rid))


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    room_manager.start_cleanup_loop()
    yield
    await room_manager.shutdown()


app = FastAPI(
    title="DeafChat",
    description="Chat temporanea, senza registrazione, effimera e privacy-first.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=False,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = (
            "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()"
        )
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )
        response.headers["X-Request-ID"] = str(uuid.uuid4())

        is_https = (
            request.url.scheme == "https"
            or request.headers.get("x-forwarded-proto") == "https"
        )
        ws_scheme = "wss:" if is_https else "ws: wss:"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "media-src 'self' blob:; "
            f"connect-src 'self' {ws_scheme}; "
            "worker-src 'self'; "
            "frame-ancestors 'none'"
        )

        if request.url.path == "/":
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.post("/api/rooms", response_model=CreateRoomResponse)
@limiter.limit(settings.rate_limit_rooms)
async def create_room(body: CreateRoomRequest, request: Request):
    if room_manager.active_room_count >= settings.max_active_rooms:
        return JSONResponse(
            status_code=429,
            content={"detail": "Troppe stanze attive. Riprova tra qualche minuto."},
        )

    expiry = body.expiry_minutes
    if expiry not in ALLOWED_EXPIRY_MINUTES:
        expiry = min(ALLOWED_EXPIRY_MINUTES, key=lambda value: abs(value - expiry))

    room = room_manager.create_room(
        room_type=body.room_type,
        room_name=body.room_name,
        expiry_minutes=expiry,
    )
    base_url = str(request.base_url).rstrip("/")
    return CreateRoomResponse(
        room_id=room.room_id,
        room_type=room.room_type,
        room_name=room.room_name,
        link=f"{base_url}/chat/{room.room_id}",
        expiry_minutes=room.expiry_minutes,
        created_at=room.created_at,
    )


@app.get("/api/rooms/{room_id}", response_model=RoomInfoResponse)
@limiter.limit(settings.rate_limit_api)
async def get_room_info(room_id: str, request: Request):
    del request
    if not _valid_room_id(room_id):
        return JSONResponse(status_code=404, content={"detail": "Room not found"})

    room = room_manager.get_room(room_id)
    if room is None:
        return JSONResponse(status_code=404, content={"detail": "Room not found"})

    return RoomInfoResponse(
        room_id=room.room_id,
        room_type=room.room_type,
        room_name=room.room_name,
        member_count=room.member_count,
        expiry_minutes=room.expiry_minutes,
        expires_at=room.expires_at,
        created_at=room.created_at,
    )


@app.get("/api/ice-config")
@limiter.limit(settings.rate_limit_api)
async def ice_config(request: Request):
    del request
    servers = []
    turn_host = settings.turn_host
    if turn_host:
        servers.extend(
            [
                {"urls": f"stun:{turn_host}:{settings.turn_port}"},
                {
                    "urls": f"turn:{turn_host}:{settings.turn_port}",
                    "username": settings.turn_username,
                    "credential": settings.turn_password,
                },
                {
                    "urls": f"turn:{turn_host}:{settings.turn_port}?transport=tcp",
                    "username": settings.turn_username,
                    "credential": settings.turn_password,
                },
            ]
        )
    else:
        servers.append({"urls": "stun:stun.l.google.com:19302"})

    return {"iceServers": servers}


@app.get("/")
async def backend_root():
    return {
        "service": "deafchat-backend",
        "status": "ok",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(ws: WebSocket, room_id: str):
    await handle_websocket(ws, room_id)


def run() -> None:
    """Entry-point for `python -m backend.main`."""
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_dev,
        ws_max_size=16 * 1024 * 1024,
    )


if __name__ == "__main__":
    run()
