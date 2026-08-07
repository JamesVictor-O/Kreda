from enum import StrEnum

from pydantic import BaseModel


class Outcome(StrEnum):
    APPROVED = "approved"
    DECLINED = "declined"


class StoreData(BaseModel):
    """Raw data ingested from the seller's connected store."""

    seller_address: str
    shop_domain: str
    orders_90d: list[dict]
    fulfilled_orders_90d: list[dict]


class CheckResult(BaseModel):
    """A single verification check run against the ingested data."""

    name: str
    passed: bool
    detail: str


class Decision(BaseModel):
    """The underwriter agent's output for one receivable, approve or decline."""

    receivable_id: str
    seller_address: str
    outcome: Outcome
    confidence_bps: int
    checks: list[CheckResult]
    advance_rate_bps: int | None = None
    evidence_uri: str
    evidence_hash: str


class SignedDecision(BaseModel):
    decision: Decision
    signature: str
    agent_address: str
