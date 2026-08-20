"""Venice AI provider — an OpenAI-compatible chat completions API
(https://docs.venice.ai). Used via raw httpx rather than the `openai` SDK
to avoid adding a dependency for what's a single POST.

Uses basic JSON mode (`response_format: {"type": "json_object"}`) rather
than a strict json_schema constraint: Venice's exact json_schema request
shape wasn't confirmed against a live call before this was written, and
the system prompt already spells out the exact schema in plain text (see
app/stages/decide.py's SYSTEM_PROMPT) — the usual fallback pattern for
providers where strict schema enforcement isn't verified. Malformed output
still degrades safely: app/stages/decide.py retries once, then falls back
to deterministic grading, same as any other LLM failure.
"""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.llm.errors import LLMCallError

_BASE_URL = "https://api.venice.ai/api/v1"
MAX_TOKENS = 1024


def call_llm(*, system: str, user: str) -> str:
    try:
        response = httpx.post(
            f"{_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {settings.venice_api_key}"},
            json={
                "model": settings.venice_model,
                "max_tokens": MAX_TOKENS,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=30.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise LLMCallError(str(exc)) from exc

    payload = response.json()
    choices = payload.get("choices") or []
    if not choices:
        raise LLMCallError("no choices in response")

    choice = choices[0]
    finish_reason = choice.get("finish_reason")
    if finish_reason not in ("stop", "length", None):
        raise LLMCallError(f"unexpected finish_reason={finish_reason!r}")

    text = (choice.get("message") or {}).get("content")
    if not text:
        raise LLMCallError("no text content in response")
    return text
