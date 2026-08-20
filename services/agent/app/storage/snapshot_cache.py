"""Caches the ingested StoreSnapshot keyed by store, so re-underwriting a
receivable for the same store within `snapshot_cache_max_age_seconds`
reuses the snapshot instead of re-fetching from Shopify. The cached
snapshot is exactly what later gets committed as evidence — see
app/core/models.py's StoreSnapshot docstring.

Filesystem-backed: one JSON file per store, overwritten on each fresh
ingest. Good enough for a single-instance deploy.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.core.models import StoreSnapshot


class SnapshotCache:
    def __init__(self, cache_dir: str | None = None) -> None:
        self._dir = Path(cache_dir or settings.snapshot_cache_dir)
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, store_id: str) -> Path:
        safe_id = store_id.replace("/", "_")
        return self._dir / f"{safe_id}.json"

    def get(self, store_id: str, max_age_seconds: int | None = None) -> StoreSnapshot | None:
        path = self._path(store_id)
        if not path.exists():
            return None

        snapshot = StoreSnapshot.model_validate_json(path.read_text())
        if max_age_seconds is not None:
            max_age = max_age_seconds
        else:
            max_age = settings.snapshot_cache_max_age_seconds
        age = (datetime.now(UTC) - snapshot.ingested_at).total_seconds()
        if age > max_age:
            return None
        return snapshot

    def put(self, snapshot: StoreSnapshot) -> None:
        self._path(snapshot.store_id).write_text(snapshot.model_dump_json())
