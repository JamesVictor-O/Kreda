"""Real provider — Shopify Admin GraphQL API. See app/shopify/client.py's
module docstring: the query shape targets stable, well-known fields but
hasn't been run against a live store yet. Left correct in shape; not
required to work for the demo — see fixture_provider.py for what is.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings
from app.core.models import StoreSnapshot
from app.shopify.client import ShopifyClient
from app.shopify.normalize import normalize_order, normalize_shop

logger = logging.getLogger(__name__)


class ShopifyProvider:
    async def fetch_snapshot(self, store_id: str, days: int) -> StoreSnapshot:
        client = ShopifyClient(store_id, settings.shopify_admin_access_token)
        window_end = datetime.now(UTC)
        window_start = window_end - timedelta(days=days)

        async with httpx.AsyncClient(timeout=30.0) as http_client:
            raw_shop = await client.fetch_shop_metadata(http_client)
            shop = normalize_shop(raw_shop)

            orders = [
                normalize_order(raw_order, store_id=store_id)
                async for raw_order in client.iter_orders(http_client, window_start)
            ]

        logger.info("ingested %d orders for %s", len(orders), store_id)

        return StoreSnapshot(
            store_id=store_id,
            shop=shop,
            window_start=window_start,
            window_end=window_end,
            orders=orders,
            ingested_at=window_end,
        )
