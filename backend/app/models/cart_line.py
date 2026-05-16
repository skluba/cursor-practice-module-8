"""Shopping cart rows (one row per sku per user)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, UniqueConstraint

from app.extensions import db


class CartLine(db.Model):
    __tablename__ = "cart_lines"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_line_user_product"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(
        db.Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user = db.relationship("User", backref=db.backref("cart_lines", lazy="dynamic"))
    product = db.relationship("Product", backref=db.backref("cart_lines", lazy="dynamic"))
