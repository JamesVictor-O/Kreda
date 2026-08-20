"""Stage 3's single LLM call. Structured outputs (`output_config.format`)
constrain the response to valid JSON matching DECISION_JSON_SCHEMA at the
API level, at low effort — this is a synthesis step over already-computed
checks, not an open-ended reasoning task.

No `temperature` parameter. Claude Opus 5 rejects temperature/top_p/top_k
outright (400) — sampling parameters were removed starting with the
Opus 4.7 generation. This is a real deviation from "temperature 0" in the
underwriting spec, but temperature 0 was never a determinism guarantee on
any model — retries, infra changes, and provider-side updates can all
still change output even at temperature 0. The pipeline's actual
determinism comes from the hard rules enforced in code
(app/stages/decide.py): any FAIL forces DECLINE, and grade maps to a fixed
advance rate, regardless of what the model says. The determinism test
asserts against a stubbed LLM call, not the live API — see
tests/test_determinism.py.
"""

from __future__ import annotations

import anthropic

from app.core.config import settings

MAX_TOKENS = 1024

DECISION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "grade": {"type": "string", "enum": ["A", "B+", "B", "C", "DECLINE"]},
        "advance_rate_bps": {"type": "integer"},
        "confidence_bps": {"type": "integer"},
        "reasoning": {"type": "string"},
        "expected_settlement_days": {"type": "integer"},
    },
    "required": [
        "grade",
        "advance_rate_bps",
        "confidence_bps",
        "reasoning",
        "expected_settlement_days",
    ],
    "additionalProperties": False,
}


class LLMCallError(Exception):
    """Anything that means we didn't get usable text back — refusal, API
    error, or an empty response. app/stages/decide.py treats this the same
    as a schema-validation failure: one retry, then the deterministic
    fallback."""


def call_llm(*, system: str, user: str) -> str:
    client = anthropic.Anthropic()
    try:
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={
                "format": {"type": "json_schema", "schema": DECISION_JSON_SCHEMA},
                "effort": "low",
            },
        )
    except anthropic.APIError as exc:
        raise LLMCallError(str(exc)) from exc

    if response.stop_reason == "refusal":
        category = getattr(response.stop_details, "category", None)
        raise LLMCallError(f"model refused (category={category})")

    text = next((block.text for block in response.content if block.type == "text"), None)
    if not text:
        raise LLMCallError("no text content in response")
    return text
