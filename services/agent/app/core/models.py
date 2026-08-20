"""Shared Pydantic models for the ingest -> check -> decide -> commit pipeline.

Everything downstream of ingest.py operates on these types, never on raw
Shopify JSON — see app/shopify/normalize.py.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.core.thresholds import CheckStatus

__all__ = [
    "CheckStatus",
    "CheckResult",
    "NormalizedOrder",
    "ShopMetadata",
    "StoreSnapshot",
    "Grade",
    "GRADE_ADVANCE_RATE_BPS",
    "LLMDecisionOutput",
    "Outcome",
    "Decision",
    "EvidencePayload",
    "SignedAttestation",
]


# ── Stage 1: ingest ──────────────────────────────────────────────────────


class ShopMetadata(BaseModel):
    domain: str
    created_at: datetime
    currency: str


class NormalizedOrder(BaseModel):
    """A single order, stripped of everything that isn't needed downstream.

    No customer name, email, or raw address — see app/shopify/normalize.py
    for how these are derived. `customer_ref` and `shipping_address_hash`
    are one-way hashes: enough to detect repetition and clustering, not
    enough to identify anyone. This is what eventually gets committed as
    evidence, so it has to be PII-free from the moment it's created, not
    scrubbed later.
    """

    id: str
    placed_at: datetime
    total_amount: float
    customer_ref: str
    fulfilled: bool
    has_delivery_scan: bool
    shipping_address_hash: str
    refunded: bool
    disputed: bool


class StoreSnapshot(BaseModel):
    """The normalized, PII-free ingestion snapshot. This is what's cached,
    what checks run against, and — via its summary counts — what gets
    committed as evidence. See app/stages/ingest.py.
    """

    store_id: str
    shop: ShopMetadata
    window_start: datetime
    window_end: datetime
    orders: list[NormalizedOrder]
    ingested_at: datetime


# ── Stage 2: check ───────────────────────────────────────────────────────


class CheckResult(BaseModel):
    """One deterministic check's output. Every field here is rendered in
    the investor dashboard — `detail` is user-facing copy."""

    name: str
    status: CheckStatus
    value: float
    detail: str
    threshold: float


# ── Stage 3: decide ──────────────────────────────────────────────────────


class Grade(StrEnum):
    A = "A"
    B_PLUS = "B+"
    B = "B"
    C = "C"
    DECLINE = "DECLINE"


# Fixed by the platform, not the model. See app/stages/decide.py — the
# model's own advance_rate_bps is parsed but never trusted.
GRADE_ADVANCE_RATE_BPS: dict[Grade, int] = {
    Grade.A: 8_500,
    Grade.B_PLUS: 8_000,
    Grade.B: 7_500,
    Grade.C: 6_500,
    Grade.DECLINE: 0,
}

# Attestation.Record.grade is a raw uint8 on-chain — this is the encoding,
# matching the convention already used in contracts/test/ReceivableVault.t.sol.
GRADE_CODE: dict[Grade, int] = {
    Grade.A: 0,
    Grade.B_PLUS: 1,
    Grade.B: 2,
    Grade.C: 3,
    Grade.DECLINE: 4,
}


class LLMDecisionOutput(BaseModel):
    """Strict schema for the single LLM call's JSON output. Nothing else
    from the model is trusted — grade->advance-rate mapping and the
    any-FAIL->DECLINE rule are both enforced in code after this parses."""

    grade: Grade
    advance_rate_bps: int
    confidence_bps: int = Field(ge=0, le=10_000)
    reasoning: str
    expected_settlement_days: int = Field(gt=0)


# ── Stage 4: commit ──────────────────────────────────────────────────────


class Outcome(StrEnum):
    APPROVED = "approved"
    DECLINED = "declined"


class Decision(BaseModel):
    """The underwriter's final output for one receivable — approve or
    decline. This is the record that gets attested on-chain."""

    receivable_id: str
    seller_address: str
    outcome: Outcome
    grade: Grade
    advance_rate_bps: int
    confidence_bps: int
    expected_settlement_days: int
    reasoning: str
    checks: list[CheckResult]
    face_value: float
    fallback_used: bool = False
    prompt_hash: str = ""
    model: str = ""
    # Populated by app/stages/commit.py once the evidence is committed and
    # (optionally) submitted on-chain — absent on a Decision that hasn't
    # reached the commit stage yet.
    evidence_ref: str | None = None
    tx_hash: str | None = None


class EvidencePayload(BaseModel):
    """The full audit trail mirrored to durable storage and committed
    on-chain (as a blob or a calldata hash-tree root — see app/chain/blob.py).
    No PII: store metadata, window, summary counts, all six checks in full,
    the model's reasoning, and enough about the LLM call to reproduce the
    judgment step's inputs.
    """

    receivable_id: str
    store_domain: str
    ingestion_window_start: datetime
    ingestion_window_end: datetime
    order_count: int
    fulfilled_order_count: int
    checks: list[CheckResult]
    grade: Grade
    advance_rate_bps: int
    confidence_bps: int
    expected_settlement_days: int
    reasoning: str
    outcome: Outcome
    prompt_hash: str
    model: str
    committed_at: datetime


class SignedAttestation(BaseModel):
    """Mirrors Attestation.Record in contracts/src/Attestation.sol field for
    field, plus the EIP-712 signature over it and the pointers produced by
    the commit stage."""

    receivable_id: str
    seller: str
    face_value: int
    grade: int
    advance_rate: int
    expected_settlement: int
    confidence: int
    evidence_ref: str
    agent: str
    approved: bool
    signature: str
    evidence_uri: str
    commitment_method: str
    tx_hash: str | None = None
