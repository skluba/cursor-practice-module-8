"""Product catalogue (public)."""

from __future__ import annotations

import math

from flask.views import MethodView
from flask_smorest import Blueprint
from sqlalchemy import ColumnElement, or_
from sqlalchemy.orm import Query
from werkzeug.exceptions import NotFound

from app.models.product import Product
from app.schemas.api import (
    CatalogListQuerySchema,
    CatalogListSchema,
    PaginationMetaSchema,
    ProductExposeSchema,
)

bp = Blueprint("catalog", __name__, url_prefix="/api/v1/catalog", description="Product catalogue")

_LIKE_ESCAPE_CHAR = "\\"


def _escaped_ilike_substring_clause(column: ColumnElement[str], substring: str):
    """Match substring literally (wildcards `%` / `_` in user input do not widen the match)."""
    safe = (
        substring.replace(_LIKE_ESCAPE_CHAR, _LIKE_ESCAPE_CHAR * 2)
        .replace("%", f"{_LIKE_ESCAPE_CHAR}%")
        .replace("_", f"{_LIKE_ESCAPE_CHAR}_")
    )
    pattern = f"%{safe}%"
    return column.ilike(pattern, escape=_LIKE_ESCAPE_CHAR)


def _apply_catalog_filters(
    *,
    raw_q: str | None,
    min_pc: int | None,
    max_pc: int | None,
) -> Query:
    query = Product.query.filter_by(active=True)

    if raw_q is not None:
        term = raw_q.strip()
        if term:
            query = query.filter(
                or_(
                    _escaped_ilike_substring_clause(Product.title, term),
                    _escaped_ilike_substring_clause(Product.sku, term),
                    _escaped_ilike_substring_clause(Product.description, term),
                ),
            )

    if min_pc is not None:
        query = query.filter(Product.price_cents >= min_pc)
    if max_pc is not None:
        query = query.filter(Product.price_cents <= max_pc)

    return query


def _apply_catalog_sort(query: Query, sort: str) -> Query:
    if sort == "title_asc":
        return query.order_by(Product.title.asc(), Product.id.asc())
    if sort == "title_desc":
        return query.order_by(Product.title.desc(), Product.id.desc())
    if sort == "price_asc":
        return query.order_by(Product.price_cents.asc(), Product.id.asc())
    if sort == "price_desc":
        return query.order_by(Product.price_cents.desc(), Product.id.desc())
    return query.order_by(Product.id.asc())


def _serialize_pagination_meta(*, total: int, page: int, page_size: int) -> dict:
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    return PaginationMetaSchema().dump(
        {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    )


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
        page = int(args["page"])
        page_size = int(args["page_size"])
        sort_key = args["sort"]
        filtered = _apply_catalog_filters(
            raw_q=args.get("q"),
            min_pc=args.get("min_price_cents"),
            max_pc=args.get("max_price_cents"),
        )
        total = filtered.count()
        ordered = _apply_catalog_sort(filtered, sort_key)

        rows = ordered.offset((page - 1) * page_size).limit(page_size).all()
        meta = _serialize_pagination_meta(total=total, page=page, page_size=page_size)
        return {"items": [_product_public(p) for p in rows], "meta": meta}


@bp.route("/items/<int:product_id>")
class ItemDetail(MethodView):
    """Single active product by id."""

    @bp.response(200, ProductExposeSchema)
    def get(self, product_id: int) -> dict:
        prod = Product.query.filter_by(id=product_id, active=True).first()
        if prod is None:
            raise NotFound(description="Product not found.")
        return _product_public(prod)
