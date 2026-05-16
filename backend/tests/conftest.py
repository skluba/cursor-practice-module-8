import fakeredis
import pytest
import sqlalchemy as sa
from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models.product import Product


def auth_hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register_fully_logged_in(client, email: str, password: str) -> str:
    """Run all registration steps and return JWT for a completed account."""
    r = client.post("/api/v1/auth/register/start", json={"email": email, "password": password})
    assert r.status_code == 201, r.get_json()
    t = r.get_json()["access_token"]

    r = client.post(
        "/api/v1/auth/register/profile",
        json={"first_name": "T", "last_name": "E", "phone": "+1000000000"},
        headers=auth_hdr(t),
    )
    assert r.status_code == 200, r.get_json()

    r = client.post(
        "/api/v1/auth/register/shipping",
        json={
            "street": "1 Test Way",
            "city": "Testville",
            "postal_code": "00001",
            "country": "US",
        },
        headers=auth_hdr(t),
    )
    assert r.status_code == 200, r.get_json()

    r = client.post("/api/v1/auth/register/complete", headers=auth_hdr(t))
    assert r.status_code == 200, r.get_json()
    return r.get_json()["access_token"]


@pytest.fixture()
def app():
    flask_app = create_app(TestConfig)
    flask_app.extensions["redis"] = fakeredis.FakeRedis(decode_responses=True)

    with flask_app.app_context():
        db.create_all()
        db.session.execute(sa.text("PRAGMA foreign_keys=ON"))
        db.session.commit()

    yield flask_app

    with flask_app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def sample_products(app):
    with app.app_context():
        hammer = Product(
            sku="TOOL-HAMMER",
            title="Claw Hammer",
            description=None,
            price_cents=1299,
            stock_qty=5,
            active=True,
        )
        nails = Product(
            sku="FAST-NAILS",
            title="Steel Nails",
            description=None,
            price_cents=499,
            stock_qty=100,
            active=True,
        )
        inactive = Product(
            sku="OLD",
            title="Inactive",
            description=None,
            price_cents=100,
            stock_qty=0,
            active=False,
        )
        db.session.add_all([hammer, nails, inactive])
        db.session.commit()
        return {"hammer_id": hammer.id, "nails_id": nails.id, "inactive_id": inactive.id}
