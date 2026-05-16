"""Orders (simplified finalize-from-cart checkout)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey

from app.extensions import db


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_cents = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending")
    shipping_snapshot = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("orders", lazy="dynamic"))
    lines = db.relationship(
        "OrderLine",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="joined",
    )


class OrderLine(db.Model):
    __tablename__ = "order_lines"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price_cents = db.Column(db.Integer, nullable=False)

    order = db.relationship("Order", back_populates="lines")
    product = db.relationship("Product", backref="order_lines")
