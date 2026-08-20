from __future__ import annotations

from app.core.config import settings
from app.data_provider.base import StoreDataProvider
from app.data_provider.fixture_provider import FixtureProvider, UnknownFixtureStore
from app.data_provider.shopify_provider import ShopifyProvider

__all__ = [
    "StoreDataProvider",
    "FixtureProvider",
    "ShopifyProvider",
    "UnknownFixtureStore",
    "get_provider",
]


def get_provider() -> StoreDataProvider:
    if settings.data_provider == "shopify":
        return ShopifyProvider()
    if settings.data_provider == "fixture":
        return FixtureProvider()
    raise ValueError(
        f"unknown KREDA_DATA_PROVIDER={settings.data_provider!r}; expected 'fixture' or 'shopify'"
    )
