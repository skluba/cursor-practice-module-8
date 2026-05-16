"""Order checkout from cart."""

from __future__ import annotations

from flask.views import MethodView
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_smorest import Blueprint
from werkzeug.exceptions import Unauthorized

from app.schemas.api import OrderExposeSchema
from app.services.checkout import finalize_cart_order

bp = Blueprint("orders", __name__, url_prefix="/api/v1/orders", description="Checkout")


def _order_public(order) -> dict:
    rows = []
    for line in order.lines:
        prod = line.product
        sku = getattr(prod, "sku", "?") if prod is not None else "?"
        title = getattr(prod, "title", "?") if prod is not None else "?"
        rows.append(
            {
                "product_id": line.product_id,
                "sku": sku,
                "title": title,
                "quantity": line.quantity,
                "unit_price_cents": line.unit_price_cents,
                "line_total_cents": line.quantity * line.unit_price_cents,
            },
        )
    return {"id": order.id, "total_cents": order.total_cents, "status": order.status, "lines": rows}


def _require_uid() -> int:
    raw = get_jwt_identity()
    if raw is None:
        raise Unauthorized(description="Unauthorized.")
    return int(str(raw))


@bp.route("/checkout")
class Checkout(MethodView):
    """Create a pending ``Order`` from cart lines, decrement stock, clear cart."""

    @jwt_required()
    @bp.response(201, OrderExposeSchema)
    def post(self) -> dict:
        order = finalize_cart_order(_require_uid())
        return _order_public(order)
