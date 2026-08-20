"""Stage 1: pull the seller's order history — via whichever StoreDataProvider
is configured, see app/data_provider — normalize it immediately, and cache
the snapshot.

Nothing downstream of `ingest()` ever sees a raw Shopify shape — see
app/shopify/normalize.py — or knows which provider served it, and
re-underwriting the same store within the cache window doesn't re-fetch.
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.core.models import StoreSnapshot
from app.data_provider import StoreDataProvider, get_provider
from app.storage.snapshot_cache import SnapshotCache

logger = logging.getLogger(__name__)


async def ingest(
    store_domain: str,
    *,
    cache: SnapshotCache | None = None,
    provider: StoreDataProvider | None = None,
) -> StoreSnapshot:
    cache = cache or SnapshotCache()

    cached = cache.get(store_domain)
    if cached is not None:
        logger.info("using cached snapshot for %s (ingested %s)", store_domain, cached.ingested_at)
        return cached

    provider = provider or get_provider()
    snapshot = await provider.fetch_snapshot(store_domain, settings.ingest_window_days)
    logger.info(
        "ingested %d orders for %s via %s",
        len(snapshot.orders),
        store_domain,
        type(provider).__name__,
    )
    cache.put(snapshot)
    return snapshot
