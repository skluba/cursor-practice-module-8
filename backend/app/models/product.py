"""Catalog items."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import UniqueConstraint

from app.extensions import db


class Product(db.Model):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("sku", name="uq_products_sku"),)

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(64), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price_cents = db.Column(db.Integer, nullable=False)
    stock_qty = db.Column(db.Integer, nullable=False, default=0)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
