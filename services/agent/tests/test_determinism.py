"""Given the same snapshot, the pipeline must produce an identical
decision. The live Claude API isn't a determinism source for any model,
temperature or not, so this pins determinism at the boundary this service
actually controls: check() is a pure function, and decide() is exercised
against a stubbed LLM call that itself behaves deterministically (as the
real one is instructed to, via structured outputs pinned to the checks it's
given).
"""

from __future__ import annotations

import json

from app.stages.check import run_checks
from app.stages.decide import decide
from tests.conftest import declining_snapshot, healthy_snapshot


def _stub_llm_call(*, system: str, user: str) -> str:
    # A deterministic stand-in: same input text -> same output, exactly
    # like structured outputs at low effort should behave in practice.
    return json.dumps(
        {
            "grade": "A",
            "advance_rate_bps": 8_500,
            "confidence_bps": 9_400,
            "reasoning": "Stable order history with full delivery scan coverage across the window.",
            "expected_settlement_days": 21,
        }
    )


def _run_pipeline(snapshot):
    checks = run_checks(snapshot)
    return decide(
        receivable_id="rcv_determinism",
        seller_address="0xseller",
        face_value=12_345.0,
        store_tenure_days=(snapshot.window_end - snapshot.shop.created_at).days,
        order_count=len(snapshot.orders),
        currency=snapshot.shop.currency,
        checks=checks,
        llm_call=_stub_llm_call,
    )


def test_checks_are_deterministic_over_repeated_runs():
    snapshot = healthy_snapshot()
    results = [run_checks(snapshot) for _ in range(5)]
    serialized = [
        json.dumps([c.model_dump(mode="json") for c in r], sort_keys=True) for r in results
    ]
    assert len(set(serialized)) == 1


def test_full_pipeline_is_deterministic_for_approved_snapshot():
    snapshot = healthy_snapshot()
    decisions = [_run_pipeline(snapshot) for _ in range(5)]
    serialized = {d.model_dump_json(exclude={"prompt_hash"}) for d in decisions}
    assert len(serialized) == 1


def test_full_pipeline_is_deterministic_for_declined_snapshot():
    snapshot = declining_snapshot()
    decisions = [_run_pipeline(snapshot) for _ in range(5)]
    serialized = {d.model_dump_json(exclude={"prompt_hash"}) for d in decisions}
    assert len(serialized) == 1
    assert all(d.outcome.value == "declined" for d in decisions)


def test_prompt_hash_is_stable_for_identical_inputs():
    snapshot = healthy_snapshot()
    decisions = [_run_pipeline(snapshot) for _ in range(3)]
    assert len({d.prompt_hash for d in decisions}) == 1
