"""Product catalogue (public)."""

from __future__ import annotations

import math

from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import NotFound

from app.models.product import Product
from app.schemas.api import CatalogListSchema, PaginationQuerySchema, ProductExposeSchema

bp = Blueprint("catalog", __name__, url_prefix="/api/v1/catalog", description="Product catalogue")


def _product_public(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "title": p.title,
        "description": p.description,
        "price_cents": p.price_cents,
        "active": p.active,
    }


@bp.route("/items")
class ItemsList(MethodView):
    """Paginated list of active catalogue items."""

    @bp.arguments(PaginationQuerySchema, location="query")
    @bp.response(200, CatalogListSchema)
    def get(self, args: dict) -> dict:
        page = args["page"]
        page_size = args["page_size"]
        query = Product.query.filter_by(active=True).order_by(Product.id)
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = max(1, math.ceil(total / page_size))
        meta = {"page": page, "page_size": page_size, "total": total, "total_pages": total_pages}
        return {"items": [_product_public(p) for p in items], "meta": meta}


@bp.route("/items/<int:product_id>")
class ItemDetail(MethodView):
    """Single active product by id."""

    @bp.response(200, ProductExposeSchema)
    def get(self, product_id: int) -> dict:
        prod = Product.query.filter_by(id=product_id, active=True).first()
        if prod is None:
            raise NotFound(description="Product not found.")
        return _product_public(prod)
