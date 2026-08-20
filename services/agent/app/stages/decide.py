"""Stage 3: one LLM call turns six CheckResults into a grade, advance rate,
confidence, and written reasoning.

The model receives numbers computed in Stage 2 — it does not fetch data,
does not choose which checks to run, does not call tools. Two hard rules
are enforced here in code, never left to the model:

  - If any check FAILED, the decision is DECLINE. Non-negotiable.
  - Grade maps to a fixed advance rate (GRADE_ADVANCE_RATE_BPS). The
    model's own advance_rate_bps field is parsed and validated as part of
    the output schema, then discarded.

The decline path runs through this exact same function — see
app/stages/commit.py for why that matters.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from collections.abc import Callable

from pydantic import ValidationError

from app.core.config import settings
from app.core.models import (
    GRADE_ADVANCE_RATE_BPS,
    CheckResult,
    Decision,
    Grade,
    LLMDecisionOutput,
    Outcome,
)
from app.core.thresholds import CheckStatus
from app.llm.client import LLMCallError, call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Kreda's underwriting model. You receive the results of six \
deterministic checks already run against a seller's order history, plus basic store \
context. You do not run checks, fetch data, or call tools — the checks are already final.

Return your assessment as a single JSON object matching this exact schema, and nothing \
else — no prose, no markdown code fences:

{
  "grade": "A" | "B+" | "B" | "C" | "DECLINE",
  "advance_rate_bps": <int>,
  "confidence_bps": <int, 0-10000>,
  "reasoning": "<string>",
  "expected_settlement_days": <int>
}

Rules:
- If ANY check has status FAIL, you MUST return grade "DECLINE". This is non-negotiable \
regardless of how the other checks look.
- Grade bands, indicative: A = strongest, B+ = strong, B = adequate, C = weak but \
approvable, DECLINE = not approvable. The platform fixes the actual advance rate per \
grade — your advance_rate_bps is recorded but not authoritative.
- reasoning must be two to four sentences, must cite specific figures from the checks \
provided, and must not hedge ("based on the data provided", "it appears that", "this \
suggests"). State the conclusion plainly.
- Output raw JSON only. No markdown fences, no explanation before or after the JSON."""

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```\s*$", re.MULTILINE)

FALLBACK_CONFIDENCE_BPS = 3_000
FALLBACK_SETTLEMENT_DAYS = 30
FALLBACK_REASONING = (
    "Automated fallback: the underwriting model's output could not be validated after "
    "two attempts. Grade derived deterministically from check results alone, with no "
    "model-generated reasoning to report."
)

LLMCallFn = Callable[..., str]


def decide(
    *,
    receivable_id: str,
    seller_address: str,
    face_value: float,
    store_tenure_days: int,
    order_count: int,
    currency: str,
    checks: list[CheckResult],
    llm_call: LLMCallFn = call_llm,
) -> Decision:
    any_failed = any(c.status is CheckStatus.FAIL for c in checks)
    user_prompt = _build_user_prompt(store_tenure_days, order_count, currency, face_value, checks)

    output, fallback_used = _get_llm_output(user_prompt, checks, llm_call)

    grade = Grade.DECLINE if any_failed else output.grade
    advance_rate_bps = GRADE_ADVANCE_RATE_BPS[grade]
    outcome = Outcome.APPROVED if grade is not Grade.DECLINE else Outcome.DECLINED

    return Decision(
        receivable_id=receivable_id,
        seller_address=seller_address,
        outcome=outcome,
        grade=grade,
        advance_rate_bps=advance_rate_bps,
        confidence_bps=output.confidence_bps,
        expected_settlement_days=output.expected_settlement_days,
        reasoning=output.reasoning,
        checks=checks,
        face_value=face_value,
        fallback_used=fallback_used,
        prompt_hash=prompt_hash(SYSTEM_PROMPT, user_prompt),
        model="deterministic-fallback" if fallback_used else settings.anthropic_model,
    )


def prompt_hash(system: str, user: str) -> str:
    return "0x" + hashlib.sha256(f"{system}\n---\n{user}".encode()).hexdigest()


def _build_user_prompt(
    store_tenure_days: int,
    order_count: int,
    currency: str,
    face_value: float,
    checks: list[CheckResult],
) -> str:
    checks_json = json.dumps([c.model_dump(mode="json") for c in checks], indent=2, sort_keys=True)
    return (
        f"Store tenure: {store_tenure_days} days\n"
        f"Order count in window: {order_count}\n"
        f"Currency: {currency}\n"
        f"Requested face value: {face_value} {currency}\n\n"
        f"Checks:\n{checks_json}"
    )


def _get_llm_output(
    user_prompt: str, checks: list[CheckResult], llm_call: LLMCallFn
) -> tuple[LLMDecisionOutput, bool]:
    for attempt in (1, 2):
        try:
            raw_text = llm_call(system=SYSTEM_PROMPT, user=user_prompt)
        except LLMCallError as exc:
            logger.warning("decide: LLM call failed on attempt %d: %s", attempt, exc)
            continue

        # Log the exact prompt and raw response for every attempt — part of
        # the audit trail, independent of whether parsing succeeds.
        logger.info(
            "decide: attempt %d\nsystem=%s\nuser=%s\nraw_response=%s",
            attempt,
            SYSTEM_PROMPT,
            user_prompt,
            raw_text,
        )

        try:
            return _parse_output(raw_text), False
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("decide: output failed validation on attempt %d: %s", attempt, exc)
            continue

    logger.error("decide: LLM output invalid twice; falling back to deterministic grade band")
    return _deterministic_fallback(checks), True


def _parse_output(raw_text: str) -> LLMDecisionOutput:
    # Structured outputs should already guarantee bare JSON, but strip
    # fences defensively anyway — cheap, and the system prompt tells the
    # model not to use them regardless of the enforcement mechanism.
    stripped = _FENCE_RE.sub("", raw_text).strip()
    data = json.loads(stripped)
    return LLMDecisionOutput.model_validate(data)


def _deterministic_fallback(checks: list[CheckResult]) -> LLMDecisionOutput:
    any_failed = any(c.status is CheckStatus.FAIL for c in checks)
    if any_failed:
        grade = Grade.DECLINE
    else:
        flagged = sum(1 for c in checks if c.status is CheckStatus.FLAG)
        grade = {0: Grade.A, 1: Grade.B_PLUS, 2: Grade.B}.get(flagged, Grade.C)

    return LLMDecisionOutput(
        grade=grade,
        advance_rate_bps=GRADE_ADVANCE_RATE_BPS[grade],
        confidence_bps=FALLBACK_CONFIDENCE_BPS,
        reasoning=FALLBACK_REASONING,
        expected_settlement_days=FALLBACK_SETTLEMENT_DAYS,
    )
