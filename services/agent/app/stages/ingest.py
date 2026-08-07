"""Stage 1: pull the seller's order and fulfilment history from Shopify."""

import httpx

from app.core.config import settings
from app.core.models import StoreData

SHOPIFY_API_VERSION = "2025-01"


async def ingest(seller_address: str) -> StoreData:
    url = f"https://{settings.shopify_store_domain}/admin/api/{SHOPIFY_API_VERSION}/orders.json"
    headers = {"X-Shopify-Access-Token": settings.shopify_admin_access_token}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params={"status": "any", "limit": 250})
        response.raise_for_status()
        orders = response.json()["orders"]

    fulfilled = [o for o in orders if o.get("fulfillment_status") == "fulfilled"]

    return StoreData(
        seller_address=seller_address,
        shop_domain=settings.shopify_store_domain,
        orders_90d=orders,
        fulfilled_orders_90d=fulfilled,
    )
