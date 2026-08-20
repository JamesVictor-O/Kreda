"""Fixture provider — seeded, pre-generated snapshots. This is the provider
the demo and the test suite actually run against; see tests/fixtures/generator.py
for how the snapshots are built and tests/fixtures/generated/manifest.json for
the store_id -> file mapping it reads.

Snapshots are read from disk, not regenerated per request: a live demo
should never depend on generation logic running correctly under time
pressure, only on a JSON file that's already committed and already known
to produce the right grade.
"""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

from app.core.config import settings
from app.core.models import StoreSnapshot


class UnknownFixtureStore(Exception):
    def __init__(self, store_id: str, known: list[str]) -> None:
        super().__init__(
            f"no fixture registered for store_id={store_id!r}; known store ids: {known}"
        )


class FixtureProvider:
    def __init__(self, data_dir: str | None = None) -> None:
        self._dir = Path(data_dir or settings.fixture_data_dir)
        self._manifest: dict[str, dict] | None = None

    def _load_manifest(self) -> dict[str, dict]:
        if self._manifest is None:
            manifest_path = self._dir / "manifest.json"
            self._manifest = json.loads(manifest_path.read_text())
        return self._manifest

    async def fetch_snapshot(self, store_id: str, days: int) -> StoreSnapshot:
        manifest = self._load_manifest()
        entry = manifest.get(store_id)
        if entry is None:
            raise UnknownFixtureStore(store_id, sorted(manifest))

        snapshot_path = self._dir / entry["file"]
        snapshot = StoreSnapshot.model_validate_json(snapshot_path.read_text())
        return _windowed(snapshot, days)


def _windowed(snapshot: StoreSnapshot, days: int) -> StoreSnapshot:
    """Fixtures are generated with a fixed 90-day window. If the caller asks
    for fewer days, trim orders and narrow window_start to match rather than
    silently ignoring the request."""
    if days >= (snapshot.window_end - snapshot.window_start).days:
        return snapshot

    cutoff = snapshot.window_end - timedelta(days=days)
    return snapshot.model_copy(
        update={
            "window_start": cutoff,
            "orders": [o for o in snapshot.orders if o.placed_at >= cutoff],
        }
    )
