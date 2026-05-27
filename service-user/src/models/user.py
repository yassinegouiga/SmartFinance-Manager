"""
User SQLAlchemy model.

Schema (from architecture_design.md §14):
    users (id, firebase_uid, email, first_name, last_name, avatar_url,
           auth_provider, currency, theme, created_at)

Added `avatar_url` and `auth_provider` for Google OAuth profile data.
Added `updated_at` for audit tracking.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "user_service"}  # Isolated schema per architecture §5

    # ── Primary Key ───────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Firebase Identity ─────────────────────────────────
    firebase_uid: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )

    # ── Profile ───────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Auth Provider ─────────────────────────────────────
    # Tracks sign-in method: "google.com", "password", "github.com", etc.
    auth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Preferences / Settings ────────────────────────────
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    theme: Mapped[str] = mapped_column(String(20), default="light")

    # ── Timestamps ────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
