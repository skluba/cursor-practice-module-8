"""Catalogue list query: filters, sort, validation, and pagination edges."""

from __future__ import annotations

from urllib.parse import quote

import pytest
from app.extensions import db
from app.models.product import Product


@pytest.fixture()
def sortable_products(app):
    with app.app_context():
        rows = [
            Product(
                sku="SORT-AA",
                title="Alpha Air",
                description="Has steel in description",
                price_cents=3000,
                stock_qty=9,
                active=True,
            ),
            Product(
                sku="SORT-BB",
                title="Bravo Box",
                description=None,
                price_cents=1000,
                stock_qty=9,
                active=True,
            ),
            Product(
                sku="SORT-CC",
                title="Charlie Cup",
                description="Budget line",
                price_cents=2500,
                stock_qty=9,
                active=True,
            ),
        ]
        db.session.add_all(rows)
        db.session.commit()
        return {p.sku: p.id for p in rows}


def test_catalog_sort_title_asc(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?sort=title_asc&page_size=10")
    assert r.status_code == 200
    titles = [x["title"] for x in r.get_json()["items"]]
    assert titles == sorted(titles)


def test_catalog_sort_price_desc(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?sort=price_desc&page_size=10")
    assert r.status_code == 200
    prices = [x["price_cents"] for x in r.get_json()["items"]]
    assert prices == [3000, 2500, 1000]


def test_catalog_filter_q_matches_title_sku_or_description(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?q=bravo&page_size=10")
    assert r.status_code == 200
    skus = {x["sku"] for x in r.get_json()["items"]}
    assert skus == {"SORT-BB"}

    r2 = client.get("/api/v1/catalog/items?q=SORT-AA&page_size=10")
    assert {x["sku"] for x in r2.get_json()["items"]} == {"SORT-AA"}

    r3 = client.get("/api/v1/catalog/items?q=steel&page_size=10")
    assert {x["sku"] for x in r3.get_json()["items"]} == {"SORT-AA"}


def test_catalog_filter_price_band(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?min_price_cents=1500&max_price_cents=2600")
    assert r.status_code == 200
    data = r.get_json()
    assert data["meta"]["total"] == 1
    assert data["items"][0]["sku"] == "SORT-CC"


def test_catalog_combine_filter_sort(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?q=a&sort=price_asc&page_size=10")
    assert r.status_code == 200
    assert {x["sku"] for x in r.get_json()["items"]} == {"SORT-AA", "SORT-BB", "SORT-CC"}
    cents = [x["price_cents"] for x in r.get_json()["items"]]
    assert cents == sorted(cents)


def test_catalog_filter_no_matches_returns_empty(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?q=zzzz_nomatch")
    assert r.status_code == 200
    data = r.get_json()
    assert data["items"] == []
    assert data["meta"]["total"] == 0


def test_catalog_invalid_sort_negative(client):
    r = client.get("/api/v1/catalog/items?sort=nope")
    assert r.status_code == 422


def test_catalog_invalid_price_band_negative(client, sortable_products):
    del sortable_products
    r = client.get("/api/v1/catalog/items?min_price_cents=9000&max_price_cents=100")
    assert r.status_code == 422


def test_catalog_negative_page_corner(client):
    r = client.get("/api/v1/catalog/items?page=0")
    assert r.status_code == 422


def test_catalog_search_q_too_long_rejected(client, sortable_products):
    del sortable_products

    r = client.get("/api/v1/catalog/items?q=" + quote("x" * 201))
    assert r.status_code == 422


def test_catalog_blank_q_ignored_matches_all_actives(client, sample_products):
    del sample_products
    r = client.get("/api/v1/catalog/items?q=%20%20")
    assert r.status_code == 200
    assert r.get_json()["meta"]["total"] == 2
