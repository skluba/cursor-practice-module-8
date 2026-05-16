"""Flask application factory."""

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import api, init_extensions


def create_app(config_class: type[Config] | None = None) -> Flask:
    app = Flask(__name__)

    cfg = config_class or Config
    app.config.from_object(cfg)
    cfg.init_app(app)

    init_extensions(app)

    from app.routes.auth import bp as auth_bp
    from app.routes.cart import bp as cart_bp
    from app.routes.catalog import bp as catalog_bp
    from app.routes.health import bp as health_bp
    from app.routes.orders import bp as orders_bp

    api.register_blueprint(auth_bp)
    api.register_blueprint(catalog_bp)
    api.register_blueprint(cart_bp)
    api.register_blueprint(orders_bp)
    api.register_blueprint(health_bp)

    CORS(
        app,
        origins=tuple(cfg.CORS_ORIGINS) if cfg.CORS_ORIGINS else "*",
        allow_headers=["Authorization", "Content-Type"],
        methods=["GET", "HEAD", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    )

    return app
