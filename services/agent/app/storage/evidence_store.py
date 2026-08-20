"""Durable mirror for evidence payloads. Blobs prune and calldata is
expensive to re-read at scale — the on-chain commitment is tamper-evidence,
this is the actual storage layer. Keyed by the commitment hash (`ref`), so
GET /evidence/{ref} can serve the full payload behind whatever hash ended
up in the Attestation record's evidenceRef.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.core.models import EvidencePayload


class EvidenceStore:
    def __init__(self, store_dir: str | None = None) -> None:
        self._dir = Path(store_dir or settings.evidence_store_dir)
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, ref: str) -> Path:
        safe_ref = ref.removeprefix("0x")
        return self._dir / f"{safe_ref}.json"

    def put(self, ref: str, payload: EvidencePayload) -> None:
        self._path(ref).write_text(payload.model_dump_json(indent=2))

    def get(self, ref: str) -> EvidencePayload | None:
        path = self._path(ref)
        if not path.exists():
            return None
        return EvidencePayload.model_validate_json(path.read_text())
