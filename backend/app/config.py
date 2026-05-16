import os
from datetime import timedelta


def _postgres_default_url() -> str:
    """Docker Compose Postgres user/db defaults (docker-compose.yml host port)."""
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5434")
    return f"postgresql+psycopg://app:app@{host}:{port}/app"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        _postgres_default_url(),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6381/0")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "dev-secret-change-me"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_SECONDS", str(3600))),
    )
    JWT_BLOCKLIST_ENABLED = True

    _cors_origins_raw = os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    CORS_ORIGINS = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

    API_TITLE = "Practice Module API"
    API_VERSION = "1.0.0"
    OPENAPI_VERSION = "3.0.3"

    API_SPEC_OPTIONS = {
        "info": {
            "description": (
                "HTTP API for the React + Flask practice stack. Interactive docs are served "
                "via Swagger UI; use openapi.json for code generation."
            ),
        },
    }

    OPENAPI_URL_PREFIX = "/openapi"
    OPENAPI_JSON_PATH = "openapi.json"
    OPENAPI_SWAGGER_UI_PATH = "swagger-ui"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/"

    @staticmethod
    def init_app(app) -> None:  # noqa: ANN001
        return None


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite+pysqlite:///:memory:"
    SECRET_KEY = "pytest-secret-key-change-me-xxxxxxxxxxxxxxxx"
    JWT_SECRET_KEY = "pytest-jwt-secret-key-change-me-xxxxxxxx"
