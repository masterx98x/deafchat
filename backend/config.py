"""DeafChat – application settings."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    env: str = field(default_factory=lambda: os.getenv("ENV", "production"))

    # Rooms
    room_expiry_minutes: int = field(
        default_factory=lambda: int(os.getenv("ROOM_EXPIRY_MINUTES", "30"))
    )
    max_room_members: int = field(
        default_factory=lambda: int(os.getenv("MAX_ROOM_MEMBERS", "50"))
    )
    max_message_length: int = field(
        default_factory=lambda: int(os.getenv("MAX_MESSAGE_LENGTH", "2000"))
    )
    max_active_rooms: int = field(
        default_factory=lambda: int(os.getenv("MAX_ACTIVE_ROOMS", "500"))
    )

    # Audio
    max_audio_duration: int = field(
        default_factory=lambda: int(os.getenv("MAX_AUDIO_DURATION", "120"))
    )
    max_audio_size: int = field(
        default_factory=lambda: int(os.getenv("MAX_AUDIO_SIZE", "1500000"))
    )

    # Images
    max_image_size: int = field(
        default_factory=lambda: int(os.getenv("MAX_IMAGE_SIZE", "14000000"))  # ~10 MB file -> ~13.3 MB base64
    )

    # Security
    # C1: default empty = same-origin only (no wildcard)
    cors_origins: str = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "")
    )
    rate_limit_rooms: str = field(
        default_factory=lambda: os.getenv("RATE_LIMIT_ROOMS", "10/minute")
    )
    rate_limit_api: str = field(
        default_factory=lambda: os.getenv("RATE_LIMIT_API", "30/minute")
    )

    @property
    def is_dev(self) -> bool:
        return self.env.lower() in ("dev", "development")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
