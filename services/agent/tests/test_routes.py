from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_store_orders_returns_pii_free_summaries():
    response = client.get("/stores/northfield-outfitters.myshopify.com/orders")
    assert response.status_code == 200

    body = response.json()
    assert body["store_id"] == "northfield-outfitters.myshopify.com"
    assert body["domain"] == "northfield-outfitters.myshopify.com"
    assert len(body["orders"]) > 0

    order = body["orders"][0]
    expected_keys = {"id", "placed_at", "total_amount", "fulfilled", "has_delivery_scan"}
    assert set(order.keys()) == expected_keys


def test_get_store_orders_unknown_store_errors():
    response = client.get("/stores/not-a-real-store.myshopify.com/orders")
    assert response.status_code >= 400
