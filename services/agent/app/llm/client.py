"""Dispatches stage 3's single LLM call to whichever provider is
configured via LLM_PROVIDER — "anthropic" (default) or "venice". Mirrors
app/data_provider's interface-plus-providers pattern: app/stages/decide.py
imports only call_llm and LLMCallError from here and never knows which
provider actually served a given call.
"""

from __future__ import annotations

from app.core.config import settings
from app.llm import anthropic_client, venice_client
from app.llm.errors import LLMCallError

__all__ = ["call_llm", "LLMCallError"]


def call_llm(*, system: str, user: str) -> str:
    if settings.llm_provider == "venice":
        return venice_client.call_llm(system=system, user=user)
    if settings.llm_provider == "anthropic":
        return anthropic_client.call_llm(system=system, user=user)
    raise ValueError(
        f"unknown LLM_PROVIDER={settings.llm_provider!r}; expected 'anthropic' or 'venice'"
    )
