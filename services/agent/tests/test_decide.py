from __future__ import annotations

import json

import pytest

from app.core.models import GRADE_ADVANCE_RATE_BPS, CheckResult, Grade, Outcome
from app.core.thresholds import CheckStatus
from app.llm.client import LLMCallError
from app.stages.decide import FALLBACK_CONFIDENCE_BPS, decide

PASSING_CHECKS = [
    CheckResult(
        name="fulfilment_coverage", status=CheckStatus.PASS, value=0.99, detail="", threshold=0.98
    ),
    CheckResult(
        name="sales_velocity", status=CheckStatus.PASS, value=1.1, detail="", threshold=3.0
    ),
    CheckResult(
        name="chargeback_rate", status=CheckStatus.PASS, value=0.001, detail="", threshold=0.01
    ),
    CheckResult(name="return_rate", status=CheckStatus.PASS, value=0.02, detail="", threshold=0.07),
    CheckResult(
        name="address_clustering", status=CheckStatus.PASS, value=0.05, detail="", threshold=0.20
    ),
    CheckResult(
        name="synthetic_order_patterns",
        status=CheckStatus.PASS,
        value=0.1,
        detail="",
        threshold=0.5,
    ),
]

FAILING_CHECKS = [
    *PASSING_CHECKS[:-1],
    CheckResult(
        name="synthetic_order_patterns",
        status=CheckStatus.FAIL,
        value=0.9,
        detail="",
        threshold=0.75,
    ),
]


def _valid_response(grade: str = "A", advance_rate_bps: int = 9_999) -> str:
    return json.dumps(
        {
            "grade": grade,
            "advance_rate_bps": advance_rate_bps,  # deliberately wrong — must be ignored
            "confidence_bps": 9_200,
            "reasoning": "312/312 orders show a delivery scan and the return rate sits at 2%.",
            "expected_settlement_days": 21,
        }
    )


def _decide(checks, llm_call, **overrides):
    kwargs = {
        "receivable_id": "rcv_1",
        "seller_address": "0xseller",
        "face_value": 10_000.0,
        "store_tenure_days": 400,
        "order_count": 60,
        "currency": "USD",
        "checks": checks,
        "llm_call": llm_call,
        **overrides,
    }
    return decide(**kwargs)


def test_grade_maps_to_fixed_advance_rate_not_the_models_own_number():
    calls = []

    def llm_call(*, system, user):
        calls.append((system, user))
        return _valid_response(grade="B+", advance_rate_bps=1)  # nonsense number

    decision = _decide(PASSING_CHECKS, llm_call)

    assert decision.grade is Grade.B_PLUS
    assert decision.advance_rate_bps == GRADE_ADVANCE_RATE_BPS[Grade.B_PLUS]
    assert decision.advance_rate_bps != 1
    assert decision.outcome is Outcome.APPROVED
    assert len(calls) == 1


def test_any_fail_forces_decline_regardless_of_model_output():
    def llm_call(*, system, user):
        return _valid_response(grade="A")  # model says approve; a check FAILED

    decision = _decide(FAILING_CHECKS, llm_call)

    assert decision.grade is Grade.DECLINE
    assert decision.advance_rate_bps == 0
    assert decision.outcome is Outcome.DECLINED


def test_retries_once_on_schema_failure_then_succeeds():
    attempts = {"n": 0}

    def llm_call(*, system, user):
        attempts["n"] += 1
        if attempts["n"] == 1:
            return "not json at all"
        return _valid_response(grade="B")

    decision = _decide(PASSING_CHECKS, llm_call)

    assert attempts["n"] == 2
    assert decision.grade is Grade.B
    assert decision.fallback_used is False


def test_falls_back_to_deterministic_grade_band_after_two_failures():
    def llm_call(*, system, user):
        return "{ this is not valid json"

    decision = _decide(PASSING_CHECKS, llm_call)

    assert decision.fallback_used is True
    assert decision.confidence_bps == FALLBACK_CONFIDENCE_BPS
    # All PASS, zero flags -> deterministic band picks grade A.
    assert decision.grade is Grade.A
    assert decision.advance_rate_bps == GRADE_ADVANCE_RATE_BPS[Grade.A]


def test_fallback_still_declines_when_a_check_failed():
    def llm_call(*, system, user):
        raise LLMCallError("boom")

    decision = _decide(FAILING_CHECKS, llm_call)

    assert decision.fallback_used is True
    assert decision.grade is Grade.DECLINE
    assert decision.outcome is Outcome.DECLINED


def test_llm_call_error_is_retried_then_falls_back():
    attempts = {"n": 0}

    def llm_call(*, system, user):
        attempts["n"] += 1
        raise LLMCallError("refused")

    decision = _decide(PASSING_CHECKS, llm_call)

    assert attempts["n"] == 2
    assert decision.fallback_used is True


def test_strict_json_schema_rejects_out_of_range_confidence():
    def llm_call(*, system, user):
        return json.dumps(
            {
                "grade": "A",
                "advance_rate_bps": 8_500,
                "confidence_bps": 50_000,  # out of the 0-10000 range
                "reasoning": "x" * 10,
                "expected_settlement_days": 30,
            }
        )

    decision = _decide(PASSING_CHECKS, llm_call)
    assert decision.fallback_used is True


@pytest.mark.parametrize(
    ("flagged_count", "expected_grade"),
    [(0, Grade.A), (1, Grade.B_PLUS), (2, Grade.B), (3, Grade.C)],
)
def test_deterministic_fallback_grade_band(flagged_count, expected_grade):
    checks = list(PASSING_CHECKS)
    for i in range(flagged_count):
        checks[i] = checks[i].model_copy(update={"status": CheckStatus.FLAG})

    def llm_call(*, system, user):
        raise LLMCallError("down")

    decision = _decide(checks, llm_call)
    assert decision.grade is expected_grade
