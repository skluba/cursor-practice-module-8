"""Demo catalogue rows for local development (upserted by SKU)."""

from __future__ import annotations

from typing import TypedDict

from app.extensions import db
from app.models.product import Product


class _ProductRow(TypedDict):
    sku: str
    title: str
    description: str | None
    price_cents: int
    stock_qty: int
    active: bool


# 36 items — unique SKUs; safe to re-run `flask seed-catalog`.
DEMO_PRODUCTS: list[_ProductRow] = [
    {
        "sku": "DRK-ESP-250G",
        "title": "Single-origin espresso beans",
        "description": "Medium roast, chocolate and cherry notes. 250 g whole bean.",
        "price_cents": 1899,
        "stock_qty": 80,
        "active": True,
    },
    {
        "sku": "DRK-OAT-1L",
        "title": "Barista oat drink",
        "description": "Creamy oat milk alternative, 1 L carton.",
        "price_cents": 349,
        "stock_qty": 120,
        "active": True,
    },
    {
        "sku": "KIT-CHEF-8",
        "title": "Chef’s knife 8-inch",
        "description": "Stainless blade, walnut handle; ships sharpened.",
        "price_cents": 6599,
        "stock_qty": 25,
        "active": True,
    },
    {
        "sku": "KIT-BOARD-BAM",
        "title": "Bamboo cutting board",
        "description": "Reversible workspace with juice groove.",
        "price_cents": 2499,
        "stock_qty": 45,
        "active": True,
    },
    {
        "sku": "KIT-SPOON-WD",
        "title": "Wooden cooking spoon set",
        "description": "Three sizes, beech wood, mineral oil finish.",
        "price_cents": 1899,
        "stock_qty": 60,
        "active": True,
    },
    {
        "sku": "HME-LAMP-DESK",
        "title": "LED desk lamp with dimmer",
        "description": "Warm/neutral daylight, articulated arm.",
        "price_cents": 4299,
        "stock_qty": 30,
        "active": True,
    },
    {
        "sku": "HME-BASKET-WV",
        "title": "Woven storage basket",
        "description": "Round 35 cm basket for towels or toys.",
        "price_cents": 2799,
        "stock_qty": 40,
        "active": True,
    },
    {
        "sku": "HME-CANDLE-LN",
        "title": "Linen scented candle",
        "description": "Soy wax, 40 h burn time, glass vessel.",
        "price_cents": 2299,
        "stock_qty": 55,
        "active": True,
    },
    {
        "sku": "HME-FRAME-A4",
        "title": "Gallery picture frame A4",
        "description": "Oak veneer, tempered glass front.",
        "price_cents": 1599,
        "stock_qty": 70,
        "active": True,
    },
    {
        "sku": "TEC-MOUSE-ERG",
        "title": "Ergonomic wireless mouse",
        "description": "Silent clicks, multi-device Bluetooth.",
        "price_cents": 4999,
        "stock_qty": 50,
        "active": True,
    },
    {
        "sku": "TEC-KBD-COMP",
        "title": "Compact mechanical keyboard",
        "description": "Hot-swappable switches, USB-C.",
        "price_cents": 8999,
        "stock_qty": 28,
        "active": True,
    },
    {
        "sku": "TEC-HUB-USBC",
        "title": "USB-C hub 7-in-1",
        "description": "HDMI 4K, SD/microSD, two USB-A, pass-through power.",
        "price_cents": 5499,
        "stock_qty": 65,
        "active": True,
    },
    {
        "sku": "TEC-WEBCAM-HD",
        "title": "1080p webcam with privacy shutter",
        "description": "Autofocus, dual mics, clip mount.",
        "price_cents": 6299,
        "stock_qty": 35,
        "active": True,
    },
    {
        "sku": "OFF-NOTE-A5",
        "title": "Hardcover notebook A5 dotted",
        "description": "192 pages, lay-flat binding, ribbon marker.",
        "price_cents": 1299,
        "stock_qty": 200,
        "active": True,
    },
    {
        "sku": "OFF-PEN-GEL-3",
        "title": "Gel pen trio — black",
        "description": "0.7 mm, archival ink, comfort grip.",
        "price_cents": 699,
        "stock_qty": 300,
        "active": True,
    },
    {
        "sku": "OFF-STPLR-MINI",
        "title": "Mini stapler with staples",
        "description": "Metal body, includes 1000 staples.",
        "price_cents": 899,
        "stock_qty": 150,
        "active": True,
    },
    {
        "sku": "OFF-CLIP-MAG",
        "title": "Magnetic document clips — 12 pack",
        "description": "Neodymium grip; for fridges or whiteboards.",
        "price_cents": 499,
        "stock_qty": 180,
        "active": True,
    },
    {
        "sku": "OUT-BTL-INS-750",
        "title": "Insulated steel bottle 750 ml",
        "description": "Keeps drinks cold 24 h; powder coat finish.",
        "price_cents": 3199,
        "stock_qty": 90,
        "active": True,
    },
    {
        "sku": "OUT-TOWEL-MIC",
        "title": "Microfiber gym towel",
        "description": "Quick-dry, antimicrobial treatment.",
        "price_cents": 1499,
        "stock_qty": 110,
        "active": True,
    },
    {
        "sku": "OUT-CAP-MESH",
        "title": "Breathable running cap",
        "description": "Adjustable strap, reflective trim.",
        "price_cents": 2299,
        "stock_qty": 75,
        "active": True,
    },
    {
        "sku": "SNK-GRAN-MAP",
        "title": "Maple pecan granola",
        "description": "400 g bag, low sugar, baked in small batches.",
        "price_cents": 799,
        "stock_qty": 95,
        "active": True,
    },
    {
        "sku": "SNK-CHOC-70",
        "title": "Dark chocolate bar 70%",
        "description": "Single-origin Ecuador, 100 g.",
        "price_cents": 459,
        "stock_qty": 220,
        "active": True,
    },
    {
        "sku": "SNK-CRISP-SEA",
        "title": "Sea salt crisps",
        "description": "Kettle cooked, sharing size 150 g.",
        "price_cents": 349,
        "stock_qty": 160,
        "active": True,
    },
    {
        "sku": "PET-BOWL-ST",
        "title": "Stainless pet bowl medium",
        "description": "Non-slip ring; dishwasher safe.",
        "price_cents": 1299,
        "stock_qty": 85,
        "active": True,
    },
    {
        "sku": "PET-TOY-TUG",
        "title": "Rope tug toy",
        "description": "Cotton braid for dogs; machine washable.",
        "price_cents": 899,
        "stock_qty": 100,
        "active": True,
    },
    {
        "sku": "GDN-GLOVES-L",
        "title": "Leather pruning gloves — L",
        "description": "Reinforced palms and long cuffs.",
        "price_cents": 2699,
        "stock_qty": 40,
        "active": True,
    },
    {
        "sku": "GDN-SEED-HERB",
        "title": "Herb seed starter kit",
        "description": "Basil, parsley, thyme; peat pots included.",
        "price_cents": 1199,
        "stock_qty": 58,
        "active": True,
    },
    {
        "sku": "BTH-BODY-WASH",
        "title": "Cedar body wash",
        "description": "Sulfate-free, 400 ml refillable pump.",
        "price_cents": 1699,
        "stock_qty": 130,
        "active": True,
    },
    {
        "sku": "BTH-HAND-CRM",
        "title": "Shea hand cream",
        "description": "Unscented, fast absorbing, 75 ml tube.",
        "price_cents": 999,
        "stock_qty": 175,
        "active": True,
    },
    {
        "sku": "TOY-PZ-500",
        "title": "500-piece skyline puzzle",
        "description": "Matte pieces, poster included.",
        "price_cents": 1899,
        "stock_qty": 42,
        "active": True,
    },
    {
        "sku": "TOY-CARD-STR",
        "title": "Strategy card game",
        "description": "2–5 players, 30–45 min; travel tin.",
        "price_cents": 2499,
        "stock_qty": 33,
        "active": True,
    },
    {
        "sku": "MUS-TUN-CLIP",
        "title": "Clip-on guitar tuner",
        "description": "Chromatic, bright display, auto power-off.",
        "price_cents": 1999,
        "stock_qty": 62,
        "active": True,
    },
    {
        "sku": "MUS-STND-FLD",
        "title": "Folding music stand",
        "description": "Aluminium, carrying bag.",
        "price_cents": 3499,
        "stock_qty": 48,
        "active": True,
    },
    {
        "sku": "KID-PASTEL-24",
        "title": "Washable pastels — 24 colors",
        "description": "Triangular grips for little hands.",
        "price_cents": 799,
        "stock_qty": 140,
        "active": True,
    },
    {
        "sku": "KIT-SCALE-DIG",
        "title": "Digital kitchen scale",
        "description": "5 kg capacity, tare button, tempered glass.",
        "price_cents": 2799,
        "stock_qty": 52,
        "active": True,
    },
    {
        "sku": "BOOK-COOK-VG",
        "title": "Weeknight vegetarian cookbook",
        "description": "120 recipes under 45 minutes.",
        "price_cents": 2799,
        "stock_qty": 37,
        "active": True,
    },
    {
        "sku": "KIT-MUG-STN",
        "title": "Stoneware coffee mug pair",
        "description": "Matte glaze, 350 ml, microwave safe.",
        "price_cents": 2299,
        "stock_qty": 88,
        "active": True,
    },
]


def demo_product_count() -> int:
    return len(DEMO_PRODUCTS)


def upsert_demo_catalog() -> tuple[int, int]:
    """Insert or refresh demo rows keyed by SKU. Commits once.

    Returns (inserted_count, updated_count).
    """
    inserted = 0
    updated = 0
    for row in DEMO_PRODUCTS:
        p = Product.query.filter_by(sku=row["sku"]).first()
        if p is None:
            db.session.add(Product(**row))
            inserted += 1
            continue
        p.title = row["title"]
        p.description = row["description"]
        p.price_cents = row["price_cents"]
        p.stock_qty = row["stock_qty"]
        p.active = row["active"]
        updated += 1

    db.session.commit()
    return inserted, updated
