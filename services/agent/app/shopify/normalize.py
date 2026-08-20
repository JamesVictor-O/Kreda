"""Turns raw Shopify GraphQL nodes into the PII-free internal shapes
everything downstream operates on. This is the only place that ever
touches a raw shipping address, customer id, or Shopify order shape —
by the time a NormalizedOrder exists, the PII is already gone, replaced by
salted one-way hashes.
"""

from __future__ import annotations

import hashlib
from datetime import datetime

from app.core.models import NormalizedOrder, ShopMetadata

_FULFILLED_STATUSES = {"FULFILLED"}
_DELIVERED_STATUSES = {"DELIVERED", "CONFIRMED_DELIVERY"}


def _hash(store_id: str, *parts: str) -> str:
    """Salted with store_id so the same physical address hashes differently
    across stores — a hash on-chain should never let anyone build a
    cross-store address index."""
    digest = hashlib.sha256(f"{store_id}|{'|'.join(parts)}".encode()).hexdigest()
    return f"0x{digest}"


def normalize_shop(raw_shop: dict) -> ShopMetadata:
    return ShopMetadata(
        domain=raw_shop["myshopifyDomain"],
        created_at=datetime.fromisoformat(raw_shop["createdAt"]),
        currency=raw_shop["currencyCode"],
    )


def normalize_order(raw_order: dict, store_id: str) -> NormalizedOrder:
    order_id = raw_order["id"]

    customer = raw_order.get("customer")
    customer_seed = customer["id"] if customer else f"guest:{order_id}"
    customer_ref = _hash(store_id, "customer", customer_seed)

    address = raw_order.get("shippingAddress") or {}
    address_seed = "|".join(
        str(address.get(field, "")).strip().lower()
        for field in ("address1", "city", "province", "zip", "country")
    )
    shipping_address_hash = _hash(store_id, "address", address_seed or f"none:{order_id}")

    fulfillments = raw_order.get("fulfillments") or []
    fulfilled = raw_order.get("displayFulfillmentStatus") in _FULFILLED_STATUSES
    has_delivery_scan = any(
        (f.get("deliveryStatus") or "").upper() in _DELIVERED_STATUSES for f in fulfillments
    )

    refunds = raw_order.get("refunds") or []
    risk = raw_order.get("disputes") or {}

    total = raw_order["currentTotalPriceSet"]["shopMoney"]["amount"]

    return NormalizedOrder(
        id=order_id,
        placed_at=datetime.fromisoformat(raw_order["createdAt"]),
        total_amount=float(total),
        customer_ref=customer_ref,
        fulfilled=fulfilled,
        has_delivery_scan=has_delivery_scan,
        shipping_address_hash=shipping_address_hash,
        refunded=len(refunds) > 0,
        disputed=(risk.get("recommendation") or "").upper() == "DECLINE",
    )
