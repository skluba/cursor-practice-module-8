"""Authentication: multi-step registration, login, JWT logout revocation."""

from __future__ import annotations

from datetime import datetime, timezone

from flask.views import MethodView
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from flask_smorest import Blueprint
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, Unauthorized

from app.constants import (
    BAD_REQUEST_REGISTRATION_FINALIZED_DESCRIPTION,
    UNAUTHORIZED_UNKNOWN_USER_DESCRIPTION,
)
from app.extensions import db
from app.models.user import User
from app.passwords import hash_password, verify_password
from app.schemas.api import (
    LoginSchema,
    RegisterStartSchema,
    RegistrationProfileSchema,
    RegistrationShippingSchema,
    TokenResponseSchema,
    UserPublicSchema,
)

bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth", description="Accounts and JWT")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _user_public(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "registration_complete": user.registration_complete,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "shipping_address": user.shipping_address,
    }


def _load_user_from_identity() -> User | None:
    raw = get_jwt_identity()
    if raw is None:
        return None
    uid = int(str(raw))
    return db.session.get(User, uid)


@bp.route("/register/start")
class RegisterStart(MethodView):
    """Step 1: create account skeleton (credential)."""

    @bp.arguments(RegisterStartSchema)
    @bp.response(201, TokenResponseSchema)
    def post(self, payload: dict) -> dict:
        email = _normalize_email(payload["email"])
        user = User(
            email=email,
            password_hash=hash_password(payload["password"]),
            registration_complete=False,
        )
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise Conflict(description="Email already registered.")

        return {"access_token": create_access_token(identity=str(user.id))}


@bp.route("/register/profile")
class RegisterProfile(MethodView):
    """Step 2: contact details."""

    @jwt_required()
    @bp.arguments(RegistrationProfileSchema)
    @bp.response(200, UserPublicSchema)
    def post(self, payload: dict) -> dict:
        user = _load_user_from_identity()
        if user is None:
            raise Unauthorized(description=UNAUTHORIZED_UNKNOWN_USER_DESCRIPTION)
        if user.registration_complete:
            raise BadRequest(description=BAD_REQUEST_REGISTRATION_FINALIZED_DESCRIPTION)

        user.first_name = payload["first_name"]
        user.last_name = payload["last_name"]
        user.phone = payload["phone"]
        db.session.commit()
        return _user_public(user)


@bp.route("/register/shipping")
class RegisterShipping(MethodView):
    """Step 3: shipping snapshot for future checkout."""

    @jwt_required()
    @bp.arguments(RegistrationShippingSchema)
    @bp.response(200, UserPublicSchema)
    def post(self, payload: dict) -> dict:
        user = _load_user_from_identity()
        if user is None:
            raise Unauthorized(description=UNAUTHORIZED_UNKNOWN_USER_DESCRIPTION)
        if user.registration_complete:
            raise BadRequest(description=BAD_REQUEST_REGISTRATION_FINALIZED_DESCRIPTION)
        if not user.first_name or not user.last_name:
            raise BadRequest(description="Complete profile (/register/profile) before shipping.")

        user.shipping_address = {
            "street": payload["street"],
            "city": payload["city"],
            "postal_code": payload["postal_code"],
            "country": payload["country"],
        }
        db.session.commit()
        return _user_public(user)


@bp.route("/register/complete")
class RegisterComplete(MethodView):
    """Step 4: mark account active for login + issue a fresh JWT."""

    @jwt_required()
    @bp.response(200, TokenResponseSchema)
    def post(self) -> dict:
        user = _load_user_from_identity()
        if user is None:
            raise Unauthorized(description=UNAUTHORIZED_UNKNOWN_USER_DESCRIPTION)
        if user.registration_complete:
            raise BadRequest(description=BAD_REQUEST_REGISTRATION_FINALIZED_DESCRIPTION)
        if not user.first_name or not user.last_name or not user.phone:
            raise BadRequest(description="Profile incomplete.")
        if not user.shipping_address:
            raise BadRequest(description="Shipping address missing.")

        user.registration_complete = True
        db.session.commit()
        return {"access_token": create_access_token(identity=str(user.id))}


@bp.route("/login")
class Login(MethodView):
    @bp.arguments(LoginSchema)
    @bp.response(200, TokenResponseSchema)
    def post(self, payload: dict) -> dict:
        email = _normalize_email(payload["email"])
        user = User.query.filter_by(email=email).one_or_none()
        if user is None or not verify_password(payload["password"], user.password_hash):
            raise Unauthorized(description="Invalid email or password.")
        if not user.registration_complete:
            raise Forbidden(
                description="Finish multi-step registration before logging in.",
            )
        return {"access_token": create_access_token(identity=str(user.id))}


@bp.route("/logout")
class Logout(MethodView):
    """Revokes the current access JWT until expiry (stored in Redis)."""

    @jwt_required()
    @bp.response(204)
    def post(self) -> None:
        from flask import current_app

        payload = get_jwt()
        jti = payload.get("jti")
        exp_ts = payload.get("exp")
        redis = current_app.extensions.get("redis")
        now_ts = datetime.now(timezone.utc).timestamp()
        if redis is not None and jti is not None and exp_ts is not None:
            ttl = max(int(exp_ts - now_ts), 1)
            redis.setex(f"jwt_blacklist:{jti}", ttl, "1")


@bp.route("/me")
class Me(MethodView):
    @jwt_required()
    @bp.response(200, UserPublicSchema)
    def get(self) -> dict:
        user = _load_user_from_identity()
        if user is None:
            raise Unauthorized(description=UNAUTHORIZED_UNKNOWN_USER_DESCRIPTION)
        return _user_public(user)
