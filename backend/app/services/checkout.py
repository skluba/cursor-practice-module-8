"""Finalize an order from the current user's cart."""

from __future__ import annotations

from sqlalchemy.orm import joinedload
from werkzeug.exceptions import BadRequest, Conflict

from app.extensions import db
from app.models.cart_line import CartLine
from app.models.order import Order, OrderLine
from app.models.product import Product
from app.models.user import User


def finalize_cart_order(user_id: int) -> Order:
    """Create an ``Order``, snapshot lines and prices, decrease stock, clear cart."""

    user = db.session.get(User, user_id)
    if user is None:
        raise BadRequest("User missing.")

    if not user.registration_complete:
        raise BadRequest("Complete registration before checkout.")

    if not user.shipping_address:
        raise BadRequest("Add a shipping address before checkout.")

    lines = CartLine.query.filter_by(user_id=user_id).join(Product).all()
    if not lines:
        raise BadRequest("Cart is empty.")

    for cl in lines:
        prod = cl.product  # noqa: SLF001
        if prod is None:
            raise BadRequest("Cart references an unknown product.")
        if not prod.active:
            raise BadRequest(f"Product {prod.id} is not available.")
        if cl.quantity <= 0:
            raise BadRequest("Invalid quantity in cart.")
        if cl.quantity > prod.stock_qty:
            raise Conflict(
                description=f'Insufficient stock for "{prod.title}" (SKU {prod.sku}).',
            )

    total = sum(cl.product.price_cents * cl.quantity for cl in lines)

    order = Order(
        user_id=user.id,
        total_cents=total,
        status="pending",
        shipping_snapshot=dict(user.shipping_address),
    )
    db.session.add(order)
    db.session.flush()

    for cl in lines:
        prod = cl.product  # noqa: SLF001
        prod.stock_qty -= cl.quantity
        db.session.add(
            OrderLine(
                order_id=order.id,
                product_id=prod.id,
                quantity=cl.quantity,
                unit_price_cents=prod.price_cents,
            ),
        )

    oid = order.id
    CartLine.query.filter_by(user_id=user_id).delete(synchronize_session=False)
    db.session.commit()
    loaded = (
        Order.query.options(
            joinedload(Order.lines).joinedload(OrderLine.product),
        )
        .filter_by(id=oid)
        .one()
    )
    return loaded
