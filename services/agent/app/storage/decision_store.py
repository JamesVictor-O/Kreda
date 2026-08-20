"""Durable record of every decision this agent has made, keyed by
receivable id — backs GET /decisions/{id} and GET /agent/stats. Filesystem
by default; the interface is narrow enough to swap for a real database
without touching callers.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.core.models import Decision, Outcome


class DecisionStore:
    def __init__(self, store_dir: str | None = None) -> None:
        self._dir = Path(store_dir or settings.evidence_store_dir).parent / "decisions"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, receivable_id: str) -> Path:
        safe_id = receivable_id.replace("/", "_")
        return self._dir / f"{safe_id}.json"

    def put(self, decision: Decision) -> None:
        self._path(decision.receivable_id).write_text(decision.model_dump_json(indent=2))

    def get(self, receivable_id: str) -> Decision | None:
        path = self._path(receivable_id)
        if not path.exists():
            return None
        return Decision.model_validate_json(path.read_text())

    def all(self) -> list[Decision]:
        paths = sorted(self._dir.glob("*.json"))
        return [Decision.model_validate_json(p.read_text()) for p in paths]

    def stats(self) -> dict[str, int]:
        decisions = self.all()
        approvals = sum(1 for d in decisions if d.outcome is Outcome.APPROVED)
        declines = sum(1 for d in decisions if d.outcome is Outcome.DECLINED)
        return {"decisions": len(decisions), "approvals": approvals, "declines": declines}
