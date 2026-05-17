"""Product catalogue (public)."""

from __future__ import annotations

import math

from flask.views import MethodView
from flask_smorest import Blueprint
from sqlalchemy import or_
from werkzeug.exceptions import NotFound

from app.models.product import Product
from app.schemas.api import CatalogListQuerySchema, CatalogListSchema, ProductExposeSchema

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

    @bp.arguments(CatalogListQuerySchema, location="query")
    @bp.response(200, CatalogListSchema)
    def get(self, args: dict) -> dict:
        page = args["page"]
        page_size = args["page_size"]
        sort = args["sort"]
        raw_q = args.get("q")
        min_pc = args.get("min_price_cents")
        max_pc = args.get("max_price_cents")

        query = Product.query.filter_by(active=True)

        if raw_q is not None:
            term = raw_q.strip()
            if term:
                pat = f"%{term}%"
                query = query.filter(
                    or_(
                        Product.title.ilike(pat),
                        Product.sku.ilike(pat),
                        Product.description.ilike(pat),
                    ),
                )

        if min_pc is not None:
            query = query.filter(Product.price_cents >= min_pc)
        if max_pc is not None:
            query = query.filter(Product.price_cents <= max_pc)

        total = query.count()

        if sort == "title_asc":
            query = query.order_by(Product.title.asc(), Product.id.asc())
        elif sort == "title_desc":
            query = query.order_by(Product.title.desc(), Product.id.desc())
        elif sort == "price_asc":
            query = query.order_by(Product.price_cents.asc(), Product.id.asc())
        elif sort == "price_desc":
            query = query.order_by(Product.price_cents.desc(), Product.id.desc())
        else:
            query = query.order_by(Product.id.asc())

        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = max(1, math.ceil(total / page_size)) if total else 1
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
