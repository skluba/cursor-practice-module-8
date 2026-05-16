from marshmallow import EXCLUDE, Schema, fields


class HealthOkSchema(Schema):
    """`GET /api/v1/health` payload."""

    status = fields.String(required=True, metadata={"description": "Service status"})

    class Meta:
        unknown = EXCLUDE
