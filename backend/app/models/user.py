"""User account (multi-step registration + login)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import UniqueConstraint

from app.extensions import db


class User(db.Model):
    """Registration is finalized when registration_complete becomes True."""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(320), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    first_name = db.Column(db.String(120), nullable=True)
    last_name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(64), nullable=True)

    shipping_address = db.Column(db.JSON, nullable=True)

    registration_complete = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
