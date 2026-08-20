from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.models import NormalizedOrder, ShopMetadata, StoreSnapshot

WINDOW_END = datetime(2026, 8, 17, tzinfo=UTC)
WINDOW_START = WINDOW_END - timedelta(days=90)


def make_order(
    index: int,
    *,
    placed_at: datetime | None = None,
    total_amount: float | None = None,
    customer_ref: str | None = None,
    fulfilled: bool = True,
    has_delivery_scan: bool = True,
    shipping_address_hash: str | None = None,
    refunded: bool = False,
    disputed: bool = False,
) -> NormalizedOrder:
    return NormalizedOrder(
        id=f"order_{index}",
        placed_at=placed_at or (WINDOW_END - timedelta(days=1, hours=index)),
        total_amount=total_amount if total_amount is not None else 100.0 + index,
        customer_ref=customer_ref or f"0xcustomer{index}",
        fulfilled=fulfilled,
        has_delivery_scan=has_delivery_scan,
        shipping_address_hash=shipping_address_hash or f"0xaddress{index}",
        refunded=refunded,
        disputed=disputed,
    )


def make_snapshot(
    orders: list[NormalizedOrder],
    *,
    store_id: str = "test-shop.myshopify.com",
    shop_created_at: datetime | None = None,
    window_start: datetime = WINDOW_START,
    window_end: datetime = WINDOW_END,
) -> StoreSnapshot:
    return StoreSnapshot(
        store_id=store_id,
        shop=ShopMetadata(
            domain=store_id,
            created_at=shop_created_at or (window_start - timedelta(days=365)),
            currency="USD",
        ),
        window_start=window_start,
        window_end=window_end,
        orders=orders,
        ingested_at=window_end,
    )


def healthy_snapshot(order_count: int = 60) -> StoreSnapshot:
    """A snapshot that should clear every check: full delivery scans,
    steady historical volume, no disputes/refunds, distinct addresses and
    customers, irregular timing, varied order totals."""
    orders = [
        make_order(
            i,
            placed_at=WINDOW_END - timedelta(days=(i * 89 // order_count) + 1, hours=(i * 7) % 23),
            total_amount=80.0 + (i * 37 % 400),
            customer_ref=f"0xcustomer{i}",
            shipping_address_hash=f"0xaddress{i}",
            fulfilled=True,
            has_delivery_scan=True,
            refunded=False,
            disputed=False,
        )
        for i in range(order_count)
    ]
    return make_snapshot(orders)


def declining_snapshot(order_count: int = 40) -> StoreSnapshot:
    """A snapshot engineered to FAIL fulfilment_coverage: most orders never
    got a delivery scan. Everything else stays healthy so this isolates
    the one check that should force a decline."""
    orders = [
        make_order(
            i,
            placed_at=WINDOW_END - timedelta(days=(i * 89 // order_count) + 1, hours=(i * 7) % 23),
            total_amount=80.0 + (i * 37 % 400),
            customer_ref=f"0xcustomer{i}",
            shipping_address_hash=f"0xaddress{i}",
            fulfilled=i % 5 == 0,
            has_delivery_scan=i % 5 == 0,  # 20% coverage — well under the 90% FAIL line
            refunded=False,
            disputed=False,
        )
        for i in range(order_count)
    ]
    return make_snapshot(orders)
