"""Stage 3: turn check results into an approve/decline decision.

The decline path is a first-class output, not an error case — a declined
receivable still produces a Decision and gets committed on-chain in the
commit stage, just without a vault or funding.
"""

import hashlib
import json

from app.core.models import CheckResult, Decision, Outcome, StoreData


def decide(receivable_id: str, store_data: StoreData, checks: list[CheckResult]) -> Decision:
    passed = all(c.passed for c in checks)
    outcome = Outcome.APPROVED if passed else Outcome.DECLINED

    evidence = {
        "receivable_id": receivable_id,
        "seller_address": store_data.seller_address,
        "checks": [c.model_dump() for c in checks],
    }
    evidence_bytes = json.dumps(evidence, sort_keys=True).encode()
    evidence_hash = "0x" + hashlib.sha256(evidence_bytes).hexdigest()

    return Decision(
        receivable_id=receivable_id,
        seller_address=store_data.seller_address,
        outcome=outcome,
        confidence_bps=_confidence(checks),
        checks=checks,
        advance_rate_bps=8_000 if outcome is Outcome.APPROVED else None,
        evidence_uri="",  # filled in by the commit stage once evidence is stored
        evidence_hash=evidence_hash,
    )


def _confidence(checks: list[CheckResult]) -> int:
    if not checks:
        return 0
    passed = sum(1 for c in checks if c.passed)
    return round((passed / len(checks)) * 10_000)
