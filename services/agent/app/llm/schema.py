"""The JSON shape both LLM providers are asked to return — see
app/core/models.py's LLMDecisionOutput, which is what actually validates
it. Kept separate from either provider so the schema isn't duplicated
between them."""

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
