from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.core.config import settings
from app.data_provider import get_provider
from app.data_provider.fixture_provider import FixtureProvider, UnknownFixtureStore
from app.data_provider.shopify_provider import ShopifyProvider
from app.stages.ingest import ingest
from app.storage.snapshot_cache import SnapshotCache


@pytest.mark.asyncio
async def test_fixture_provider_returns_the_registered_snapshot():
    provider = FixtureProvider()
    snapshot = await provider.fetch_snapshot("northfield-outfitters.myshopify.com", 90)
    assert snapshot.store_id == "northfield-outfitters.myshopify.com"
    assert len(snapshot.orders) > 0


@pytest.mark.asyncio
async def test_fixture_provider_raises_on_unknown_store():
    provider = FixtureProvider()
    with pytest.raises(UnknownFixtureStore):
        await provider.fetch_snapshot("not-a-real-store.myshopify.com", 90)


@pytest.mark.asyncio
async def test_fixture_provider_narrows_window_for_fewer_days():
    provider = FixtureProvider()
    full = await provider.fetch_snapshot("northfield-outfitters.myshopify.com", 90)
    narrowed = await provider.fetch_snapshot("northfield-outfitters.myshopify.com", 30)
    assert len(narrowed.orders) < len(full.orders)
    assert all(o.placed_at >= narrowed.window_start for o in narrowed.orders)


def test_get_provider_defaults_to_fixture(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "fixture")
    assert isinstance(get_provider(), FixtureProvider)


def test_get_provider_selects_shopify(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "shopify")
    assert isinstance(get_provider(), ShopifyProvider)


def test_get_provider_rejects_unknown_value(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "carrier-pigeon")
    with pytest.raises(ValueError, match="carrier-pigeon"):
        get_provider()


@pytest.mark.asyncio
async def test_ingest_uses_the_injected_provider_and_bypasses_cache(tmp_path):
    cache = SnapshotCache(cache_dir=str(tmp_path))
    snapshot = await ingest(
        "northfield-outfitters.myshopify.com", cache=cache, provider=FixtureProvider()
    )
    assert snapshot.store_id == "northfield-outfitters.myshopify.com"

    # Fixture snapshots carry a fixed, deterministic ingested_at (the
    # generator's WINDOW_END) so regeneration is byte-identical — which
    # means, stamped against a real clock, they read as long since stale.
    # Re-stamp as freshly ingested to test the cache path in isolation from
    # that fixture-specific staleness.
    fresh = snapshot.model_copy(update={"ingested_at": datetime.now(UTC)})
    cache.put(fresh)

    # A provider that always raises proves the cache short-circuits it.
    class ExplodingProvider:
        async def fetch_snapshot(self, store_id: str, days: int):
            raise AssertionError("should not be called — cache should have hit")

    cached_again = await ingest(
        "northfield-outfitters.myshopify.com", cache=cache, provider=ExplodingProvider()
    )
    assert cached_again.store_id == snapshot.store_id
