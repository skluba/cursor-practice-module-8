"""Shared Flask extensions."""

from __future__ import annotations

import redis
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_smorest import Api
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
api = Api()
jwt = JWTManager()


def init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)

    app.extensions["redis"] = redis.Redis.from_url(
        app.config["REDIS_URL"],
        decode_responses=True,
    )

    jwt.init_app(app)

    @jwt.revoked_token_loader
    def _token_revoked(*_unused):  # noqa: ANN202
        return jsonify({"message": "Authentication token revoked."}), 401

    @jwt.token_in_blocklist_loader
    def _blocked(_jwt_header: dict, payload: dict) -> bool:
        conn = app.extensions.get("redis")
        jti = payload.get("jti")
        if conn is None or jti is None:
            return False
        try:
            return conn.get(f"jwt_blacklist:{jti}") == "1"
        except redis.RedisError:
            return False

    api.init_app(app)
