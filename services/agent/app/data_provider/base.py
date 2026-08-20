"""The interface everything in app/stages/ingest.py depends on. Two
implementations exist — see shopify_provider.py and fixture_provider.py —
and nothing downstream of ingest() ever knows which one served a snapshot.
"""

from __future__ import annotations

from typing import Protocol

from app.core.models import StoreSnapshot


class StoreDataProvider(Protocol):
    async def fetch_snapshot(self, store_id: str, days: int) -> StoreSnapshot: ...
