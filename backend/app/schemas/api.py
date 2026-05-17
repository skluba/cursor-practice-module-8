from marshmallow import EXCLUDE, Schema, fields, validate, validates_schema
from marshmallow.exceptions import ValidationError


class CatalogListQuerySchema(Schema):
    """Catalogue list: pagination + optional sort, text search, and price band (cents)."""

    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    page_size = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    sort = fields.String(
        load_default="id",
        validate=validate.OneOf(["id", "title_asc", "title_desc", "price_asc", "price_desc"]),
    )
    q = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=200))
    min_price_cents = fields.Integer(
        load_default=None,
        allow_none=True,
        validate=validate.Range(min=0),
    )
    max_price_cents = fields.Integer(
        load_default=None,
        allow_none=True,
        validate=validate.Range(min=0),
    )

    class Meta:
        unknown = EXCLUDE

    @validates_schema
    def _price_band(self, data: dict, **kwargs) -> None:
        lo = data.get("min_price_cents")
        hi = data.get("max_price_cents")
        if lo is not None and hi is not None and lo > hi:
            raise ValidationError(
                "min_price_cents cannot be greater than max_price_cents.",
                field_name="min_price_cents",
            )


class PaginationMetaSchema(Schema):
    page = fields.Integer(required=True)
    page_size = fields.Integer(required=True)
    total = fields.Integer(required=True)
    total_pages = fields.Integer(required=True)


class TokenResponseSchema(Schema):
    access_token = fields.String(required=True)

    class Meta:
        unknown = EXCLUDE


class RegisterStartSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=256))

    class Meta:
        unknown = EXCLUDE


class RegistrationProfileSchema(Schema):
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    phone = fields.String(required=True, validate=validate.Length(min=3, max=64))

    class Meta:
        unknown = EXCLUDE


class RegistrationShippingSchema(Schema):
    street = fields.String(required=True, validate=validate.Length(min=1, max=200))
    city = fields.String(required=True, validate=validate.Length(min=1, max=120))
    postal_code = fields.String(required=True, validate=validate.Length(min=1, max=32))
    country = fields.String(required=True, validate=validate.Length(min=2, max=96))

    class Meta:
        unknown = EXCLUDE


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1, max=256))

    class Meta:
        unknown = EXCLUDE


class UserPublicSchema(Schema):
    id = fields.Integer(required=True)
    email = fields.Email(required=True)
    registration_complete = fields.Boolean(required=True)
    first_name = fields.String(allow_none=True)
    last_name = fields.String(allow_none=True)
    phone = fields.String(allow_none=True)
    shipping_address = fields.Raw(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class ProductExposeSchema(Schema):
    id = fields.Integer(required=True)
    sku = fields.String(required=True)
    title = fields.String(required=True)
    description = fields.String(required=True, allow_none=True)
    price_cents = fields.Integer(required=True)
    active = fields.Boolean(required=True)


class CatalogListSchema(Schema):
    items = fields.List(fields.Nested(ProductExposeSchema), required=True)
    meta = fields.Nested(PaginationMetaSchema(), required=True)


class CartProductMiniSchema(Schema):
    id = fields.Integer(required=True)
    sku = fields.String(required=True)
    title = fields.String(required=True)
    price_cents = fields.Integer(required=True)


class CartLineExposeSchema(Schema):
    id = fields.Integer(required=True)
    quantity = fields.Integer(required=True)
    product = fields.Nested(CartProductMiniSchema, required=True)


class CartExposeSchema(Schema):
    lines = fields.List(fields.Nested(CartLineExposeSchema), required=True)
    line_count = fields.Integer(required=True)
    quantity_total = fields.Integer(required=True)
    estimated_total_cents = fields.Integer(required=True)


class AddCartLineSchema(Schema):
    product_id = fields.Integer(required=True, validate=validate.Range(min=1))
    quantity = fields.Integer(required=True, validate=validate.Range(min=1, max=999))

    class Meta:
        unknown = EXCLUDE


class OrderLineExposeSchema(Schema):
    product_id = fields.Integer(required=True)
    sku = fields.String(required=True)
    title = fields.String(required=True)
    quantity = fields.Integer(required=True)
    unit_price_cents = fields.Integer(required=True)
    line_total_cents = fields.Integer(required=True)


class OrderExposeSchema(Schema):
    id = fields.Integer(required=True)
    total_cents = fields.Integer(required=True)
    status = fields.String(required=True)
    lines = fields.List(fields.Nested(OrderLineExposeSchema), required=True)
