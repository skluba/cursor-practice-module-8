from flask.views import MethodView
from flask_smorest import Blueprint

from app.schemas.health import HealthOkSchema

bp = Blueprint(
    "health",
    __name__,
    url_prefix="/api/v1",
    description="Operational health and readiness probes",
)


@bp.route("/health")
class Health(MethodView):
    @bp.response(200, HealthOkSchema)
    def get(self) -> dict:
        return {"status": "ok"}
