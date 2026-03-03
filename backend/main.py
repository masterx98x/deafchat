"""DeafChat – FastAPI application entry-point."""

from __future__ import annotations

import uuid
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import settings
from .models import ALLOWED_EXPIRY_MINUTES, CreateRoomRequest, CreateRoomResponse, RoomInfoResponse
from .rooms import room_manager
from .ws import handle_websocket


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# --- Rate limiter (keyed by client IP) ---
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

# --- Rate-limit error handler ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=False,
)


# --- Security headers (CSP, X-Content-Type, etc.) ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        # S5: HSTS – forza HTTPS
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )
        # S9: request tracing
        response.headers["X-Request-ID"] = str(uuid.uuid4())
        # S7: rimosso 'unsafe-inline' da style-src
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "media-src 'self' blob:; "
            "connect-src 'self' ws: wss:; "
            "worker-src 'self'; "
            "frame-ancestors 'none'"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ---------- REST API ----------

@app.post("/api/rooms", response_model=CreateRoomResponse)
@limiter.limit(settings.rate_limit_rooms)
async def create_room(body: CreateRoomRequest, request: Request):
    # Enforce global room cap
    if room_manager.active_room_count >= settings.max_active_rooms:
        return JSONResponse(
            status_code=429,
            content={"detail": "Tropppe stanze attive. Riprova tra qualche minuto."},
        )
    # Validate & clamp expiry
    expiry = body.expiry_minutes
    if expiry not in ALLOWED_EXPIRY_MINUTES:
        expiry = min(ALLOWED_EXPIRY_MINUTES, key=lambda x: abs(x - expiry))

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


# ---------- Health (S4: used by Docker HEALTHCHECK) ----------

@app.get("/health")
async def health_check():
    return {"status": "ok", "active_rooms": room_manager.active_room_count}


# ---------- WebSocket ----------

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(ws: WebSocket, room_id: str):
    await handle_websocket(ws, room_id)


# ---------- Frontend (HTML pages) ----------

@app.get("/sw.js")
async def service_worker():
    sw_path = FRONTEND_DIR / "sw.js"
    return FileResponse(
        path=str(sw_path),
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"},
    )


@app.get("/robots.txt")
async def robots_txt():
    robots_path = FRONTEND_DIR / "robots.txt"
    return FileResponse(path=str(robots_path), media_type="text/plain")


@app.get("/sitemap.xml")
async def sitemap_xml():
    sitemap_path = FRONTEND_DIR / "sitemap.xml"
    return FileResponse(path=str(sitemap_path), media_type="application/xml")


@app.get("/", response_class=HTMLResponse)
async def landing_page():
    html_path = FRONTEND_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.get("/chat/{room_id}", response_class=HTMLResponse)
async def chat_page(room_id: str):
    if not room_manager.room_exists(room_id):
        # Serve 404 page or redirect – for now, lightweight error
        return HTMLResponse(
            content="""<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
            <title>Stanza non trovata – DeafChat</title>
            <link rel="stylesheet" href="/static/css/style.css">
            </head><body class="dc-body">
            <div class="dc-error"><h1>Stanza non trovata</h1>
            <p>Questa stanza non esiste o è scaduta.</p>
            <a href="/" class="dc-btn">Torna alla home</a></div>
            </body></html>""",
            status_code=404,
        )
    html_path = FRONTEND_DIR / "chat.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


# Mount static files last so it doesn't shadow routes
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


def run() -> None:
    """Entry-point for `python -m backend.main`."""
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_dev,
    )


if __name__ == "__main__":
    run()
