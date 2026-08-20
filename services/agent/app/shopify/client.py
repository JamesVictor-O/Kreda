"""Shopify Admin GraphQL client: cursor-paginated order ingestion with
leaky-bucket backoff.

NOTE ON SCHEMA ACCURACY: the query below targets stable, well-known Admin
GraphQL fields (orders connection, cursor pagination, order/customer/
shippingAddress/refund shapes). It has not been run against a live Shopify
store as part of this change — validate field names against the actual
Admin API schema for `settings.shopify_api_version` once a Partners
development store is wired up, per CLAUDE.md's Shopify scope. Nothing
downstream of `iter_orders` touches this raw shape directly — see
app/shopify/normalize.py.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ORDERS_QUERY = """
query Orders($cursor: String, $query: String!) {
  orders(first: 50, after: $cursor, query: $query, sortKey: CREATED_AT) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        createdAt
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        displayFulfillmentStatus
        customer {
          id
        }
        shippingAddress {
          address1
          city
          province
          zip
          country
        }
        fulfillments {
          status
          deliveryStatus
        }
        refunds {
          id
        }
        disputes: risk {
          recommendation
        }
      }
    }
  }
  extensions {
    cost {
      throttleStatus {
        currentlyAvailable
        restoreRate
      }
    }
  }
}
"""

SHOP_QUERY = """
query Shop {
  shop {
    myshopifyDomain
    createdAt
    currencyCode
  }
}
"""

# Shopify's leaky bucket: back off well before we'd actually be throttled.
_MIN_COST_BUFFER = 50


class ShopifyRateLimited(Exception):
    """Raised when Shopify throttles us even after backing off — the
    caller should treat ingestion as failed for this attempt, not silently
    return a partial window."""


class ShopifyClient:
    def __init__(self, store_domain: str, access_token: str) -> None:
        self._url = f"https://{store_domain}/admin/api/{settings.shopify_api_version}/graphql.json"
        self._headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
        }

    async def fetch_shop_metadata(self, client: httpx.AsyncClient) -> dict:
        response = await self._post(client, SHOP_QUERY, {})
        return response["data"]["shop"]

    async def iter_orders(
        self, client: httpx.AsyncClient, window_start: datetime
    ) -> AsyncIterator[dict]:
        """Yields raw order nodes for every order created since `window_start`,
        paginating with Shopify's cursor and backing off on the leaky-bucket
        throttle status reported in each response's extensions.
        """
        cursor: str | None = None
        query_filter = f"created_at:>='{window_start.isoformat()}'"

        while True:
            payload = await self._post(
                client, ORDERS_QUERY, {"cursor": cursor, "query": query_filter}
            )
            orders_connection = payload["data"]["orders"]
            for edge in orders_connection["edges"]:
                yield edge["node"]

            await self._respect_throttle(payload.get("extensions"))

            page_info = orders_connection["pageInfo"]
            if not page_info["hasNextPage"]:
                return
            cursor = page_info["endCursor"]

    async def _post(self, client: httpx.AsyncClient, query: str, variables: dict) -> dict:
        for attempt in range(1, 4):
            response = await client.post(
                self._url,
                headers=self._headers,
                json={"query": query, "variables": variables},
            )
            if response.status_code == 429:
                retry_after = float(response.headers.get("Retry-After", "2"))
                logger.warning("Shopify 429, backing off %.1fs (attempt %d)", retry_after, attempt)
                await asyncio.sleep(retry_after)
                continue

            response.raise_for_status()
            payload = response.json()
            if "errors" in payload:
                raise RuntimeError(f"Shopify GraphQL errors: {payload['errors']}")
            return payload

        raise ShopifyRateLimited("Shopify kept throttling us after 3 attempts")

    async def _respect_throttle(self, extensions: dict | None) -> None:
        """Leaky bucket: if the bucket is nearly empty, wait for it to
        refill rather than firing the next page request into a 429."""
        if not extensions:
            return
        throttle = extensions.get("cost", {}).get("throttleStatus")
        if not throttle:
            return

        available = throttle["currentlyAvailable"]
        restore_rate = throttle["restoreRate"]
        if available < _MIN_COST_BUFFER and restore_rate > 0:
            wait_seconds = (_MIN_COST_BUFFER - available) / restore_rate
            logger.info("Shopify bucket low (%s available), waiting %.2fs", available, wait_seconds)
            await asyncio.sleep(wait_seconds)
