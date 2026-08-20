from __future__ import annotations

import json
from datetime import UTC, datetime

import httpx
import pytest

from app.shopify.client import ShopifyClient, ShopifyRateLimited
from app.shopify.normalize import normalize_order, normalize_shop


def _order_node(order_id: str, *, created_at: str = "2026-07-01T00:00:00+00:00") -> dict:
    return {
        "id": order_id,
        "createdAt": created_at,
        "currentTotalPriceSet": {"shopMoney": {"amount": "120.00", "currencyCode": "USD"}},
        "displayFulfillmentStatus": "FULFILLED",
        "customer": {"id": f"gid://shopify/Customer/{order_id}"},
        "shippingAddress": {
            "address1": "1 Main St",
            "city": "Austin",
            "province": "TX",
            "zip": "78701",
            "country": "US",
        },
        "fulfillments": [{"status": "SUCCESS", "deliveryStatus": "DELIVERED"}],
        "refunds": [],
        "risk": {"recommendation": "ACCEPT"},
    }


@pytest.mark.asyncio
async def test_iter_orders_follows_cursor_pagination():
    pages = [
        {
            "data": {
                "orders": {
                    "pageInfo": {"hasNextPage": True, "endCursor": "cursor1"},
                    "edges": [{"node": _order_node("order_1")}, {"node": _order_node("order_2")}],
                }
            },
            "extensions": {
                "cost": {"throttleStatus": {"currentlyAvailable": 1000, "restoreRate": 50}}
            },
        },
        {
            "data": {
                "orders": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [{"node": _order_node("order_3")}],
                }
            },
            "extensions": {
                "cost": {"throttleStatus": {"currentlyAvailable": 1000, "restoreRate": 50}}
            },
        },
    ]
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        # First call has no cursor, second must carry the cursor from page one.
        if call_count["n"] == 0:
            assert body["variables"]["cursor"] is None
        else:
            assert body["variables"]["cursor"] == "cursor1"
        response = pages[call_count["n"]]
        call_count["n"] += 1
        return httpx.Response(200, json=response)

    shopify_client = ShopifyClient("test-shop.myshopify.com", "shpat_test")
    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as http_client:
        orders = [
            node
            async for node in shopify_client.iter_orders(
                http_client, datetime(2026, 5, 1, tzinfo=UTC)
            )
        ]

    assert [o["id"] for o in orders] == ["order_1", "order_2", "order_3"]
    assert call_count["n"] == 2


@pytest.mark.asyncio
async def test_backs_off_and_retries_on_429(monkeypatch):
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr("app.shopify.client.asyncio.sleep", fake_sleep)

    attempts = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["n"] += 1
        if attempts["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "1.5"})
        return httpx.Response(
            200,
            json={
                "data": {
                    "orders": {
                        "pageInfo": {"hasNextPage": False, "endCursor": None},
                        "edges": [{"node": _order_node("order_1")}],
                    }
                },
                "extensions": None,
            },
        )

    shopify_client = ShopifyClient("test-shop.myshopify.com", "shpat_test")
    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as http_client:
        orders = [
            node
            async for node in shopify_client.iter_orders(
                http_client, datetime(2026, 5, 1, tzinfo=UTC)
            )
        ]

    assert [o["id"] for o in orders] == ["order_1"]
    assert attempts["n"] == 2
    assert sleeps == [1.5]


@pytest.mark.asyncio
async def test_gives_up_after_repeated_throttling(monkeypatch):
    async def fake_sleep(seconds: float) -> None:
        return None

    monkeypatch.setattr("app.shopify.client.asyncio.sleep", fake_sleep)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, headers={"Retry-After": "0.1"})

    shopify_client = ShopifyClient("test-shop.myshopify.com", "shpat_test")
    transport = httpx.MockTransport(handler)

    with pytest.raises(ShopifyRateLimited):
        async with httpx.AsyncClient(transport=transport) as http_client:
            async for _ in shopify_client.iter_orders(
                http_client, datetime(2026, 5, 1, tzinfo=UTC)
            ):
                pass


@pytest.mark.asyncio
async def test_waits_out_a_low_throttle_bucket_before_next_page(monkeypatch):
    waited = {"seconds": None}

    async def fake_sleep(seconds: float) -> None:
        waited["seconds"] = seconds

    monkeypatch.setattr("app.shopify.client.asyncio.sleep", fake_sleep)

    pages = [
        {
            "data": {
                "orders": {
                    "pageInfo": {"hasNextPage": True, "endCursor": "cursor1"},
                    "edges": [{"node": _order_node("order_1")}],
                }
            },
            # Bucket nearly empty — should trigger a wait before the next page.
            "extensions": {
                "cost": {"throttleStatus": {"currentlyAvailable": 10, "restoreRate": 50}}
            },
        },
        {
            "data": {
                "orders": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [],
                }
            },
            "extensions": {
                "cost": {"throttleStatus": {"currentlyAvailable": 1000, "restoreRate": 50}}
            },
        },
    ]
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        response = pages[call_count["n"]]
        call_count["n"] += 1
        return httpx.Response(200, json=response)

    shopify_client = ShopifyClient("test-shop.myshopify.com", "shpat_test")
    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as http_client:
        async for _ in shopify_client.iter_orders(http_client, datetime(2026, 5, 1, tzinfo=UTC)):
            pass

    assert waited["seconds"] == pytest.approx((50 - 10) / 50, rel=1e-6)


def test_normalize_order_strips_pii():
    order = normalize_order(_order_node("order_1"), store_id="test-shop.myshopify.com")

    assert order.id == "order_1"
    assert order.total_amount == 120.0
    assert order.fulfilled is True
    assert order.has_delivery_scan is True
    assert order.refunded is False
    assert order.disputed is False
    # No raw address or customer id anywhere on the normalized order.
    assert "1 Main St" not in order.model_dump_json()
    assert "Customer/order_1" not in order.model_dump_json()
    assert order.customer_ref.startswith("0x")
    assert order.shipping_address_hash.startswith("0x")


def test_normalize_order_hash_is_salted_per_store():
    order_a = normalize_order(_order_node("order_1"), store_id="shop-a.myshopify.com")
    order_b = normalize_order(_order_node("order_1"), store_id="shop-b.myshopify.com")
    assert order_a.shipping_address_hash != order_b.shipping_address_hash
    assert order_a.customer_ref != order_b.customer_ref


def test_normalize_shop():
    shop = normalize_shop(
        {
            "myshopifyDomain": "test-shop.myshopify.com",
            "createdAt": "2024-01-01T00:00:00Z",
            "currencyCode": "USD",
        }
    )
    assert shop.domain == "test-shop.myshopify.com"
    assert shop.currency == "USD"
