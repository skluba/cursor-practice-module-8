from app.models.product import Product


def test_demo_catalog_has_minimum_size() -> None:
    from app.catalog_seed import DEMO_PRODUCTS

    assert len(DEMO_PRODUCTS) >= 30
    skus = {p["sku"] for p in DEMO_PRODUCTS}
    assert len(skus) == len(DEMO_PRODUCTS)


def test_upsert_demo_catalog_idempotent(app):
    """First run inserts; second run updates same SKUs — no duplicates."""
    with app.app_context():
        from app.catalog_seed import DEMO_PRODUCTS, upsert_demo_catalog

        ins1, upd1 = upsert_demo_catalog()
        assert ins1 == len(DEMO_PRODUCTS)
        assert upd1 == 0

        count = Product.query.count()
        assert count == len(DEMO_PRODUCTS)

        ins2, upd2 = upsert_demo_catalog()
        assert ins2 == 0
        assert upd2 == len(DEMO_PRODUCTS)

        assert Product.query.count() == len(DEMO_PRODUCTS)
