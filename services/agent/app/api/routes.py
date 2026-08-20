"""HTTP surface for the underwriting pipeline.

POST /underwrite streams progress over SSE — the seller dashboard shows
checks resolving one by one, and a spinner undercuts that; the six
check.completed events plus decide/commit milestones are what makes the
pipeline feel real rather than a black box. The final `done` event carries
the same decision + refs a synchronous caller would want.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.models import CheckResult, Decision, EvidencePayload, StoreSnapshot
from app.data_provider.fixture_provider import UnknownFixtureStore
from app.stages.check import run_checks
from app.stages.commit import build_evidence_payload, commit
from app.stages.decide import decide
from app.stages.ingest import ingest
from app.storage.decision_store import DecisionStore
from app.storage.evidence_store import EvidenceStore

logger = logging.getLogger(__name__)
router = APIRouter()


class UnderwriteRequest(BaseModel):
    store_id: str
    receivable_ids: list[str]
    """The Shopify order ids the seller selected to bundle into one
    receivable — the same selection the seller dashboard's "select
    receivables" step produces. Their sum is the requested face value."""
    seller_address: str


class DecisionWithEvidence(BaseModel):
    decision: Decision
    evidence: EvidencePayload | None


class OrderSummary(BaseModel):
    """A trimmed, still PII-free view of a NormalizedOrder for the seller's
    order-picker UI — no customer_ref or shipping_address_hash, since the
    picker has no use for them and there's no reason to widen the response
    surface beyond what's actually displayed."""

    id: str
    placed_at: str
    total_amount: float
    fulfilled: bool
    has_delivery_scan: bool


class StoreOrdersResponse(BaseModel):
    store_id: str
    domain: str
    orders: list[OrderSummary]


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _derive_receivable_id(store_id: str, order_ids: list[str]) -> str:
    key = f"{store_id}:{','.join(sorted(order_ids))}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _face_value(snapshot: StoreSnapshot, order_ids: list[str]) -> float:
    selected = set(order_ids)
    return sum(o.total_amount for o in snapshot.orders if o.id in selected)


@router.post("/underwrite")
async def underwrite(request: UnderwriteRequest) -> StreamingResponse:
    return StreamingResponse(_underwrite_stream(request), media_type="text/event-stream")


async def _underwrite_stream(request: UnderwriteRequest) -> AsyncIterator[str]:
    try:
        yield _sse("ingest.started", {"store_id": request.store_id})
        snapshot = await ingest(request.store_id)
        yield _sse("ingest.completed", {"order_count": len(snapshot.orders)})

        checks: list[CheckResult] = []
        for result in run_checks(snapshot):
            checks.append(result)
            yield _sse("check.completed", result.model_dump(mode="json"))
            await asyncio.sleep(0)  # flush this event before computing the next

        receivable_id = _derive_receivable_id(request.store_id, request.receivable_ids)
        face_value = _face_value(snapshot, request.receivable_ids)
        store_tenure_days = (snapshot.window_end - snapshot.shop.created_at).days

        yield _sse("decide.started", {})
        decision = await asyncio.to_thread(
            decide,
            receivable_id=receivable_id,
            seller_address=request.seller_address,
            face_value=face_value,
            store_tenure_days=store_tenure_days,
            order_count=len(snapshot.orders),
            currency=snapshot.shop.currency,
            checks=checks,
        )
        yield _sse(
            "decide.completed", {"grade": decision.grade.value, "outcome": decision.outcome.value}
        )

        payload = build_evidence_payload(
            decision,
            store_domain=snapshot.shop.domain,
            window_start=snapshot.window_start,
            window_end=snapshot.window_end,
            order_count=len(snapshot.orders),
            fulfilled_order_count=sum(1 for o in snapshot.orders if o.fulfilled),
        )
        can_submit = bool(settings.agent_private_key and settings.attestation_contract_address)
        signed = await asyncio.to_thread(commit, decision, payload, submit_onchain=can_submit)
        yield _sse(
            "commit.completed", {"evidence_ref": signed.evidence_ref, "tx_hash": signed.tx_hash}
        )

        yield _sse(
            "done",
            {
                "decision": decision.model_dump(mode="json"),
                "attestation": signed.model_dump(mode="json"),
            },
        )
    except Exception as exc:  # noqa: BLE001 — surfaced to the client, not swallowed
        logger.exception("underwrite pipeline failed for store %s", request.store_id)
        yield _sse("error", {"message": str(exc)})


@router.get("/stores/{store_id}/orders", response_model=StoreOrdersResponse)
async def get_store_orders(store_id: str) -> StoreOrdersResponse:
    """Read-only: ingests (or reuses the cached snapshot for) a store and
    returns its orders, for the seller's order-picker UI to select which
    ones to bundle into a receivable — a step that necessarily comes
    before POST /underwrite runs the checks against that same selection."""
    try:
        snapshot = await ingest(store_id)
    except UnknownFixtureStore as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return StoreOrdersResponse(
        store_id=snapshot.store_id,
        domain=snapshot.shop.domain,
        orders=[
            OrderSummary(
                id=o.id,
                placed_at=o.placed_at.isoformat(),
                total_amount=o.total_amount,
                fulfilled=o.fulfilled,
                has_delivery_scan=o.has_delivery_scan,
            )
            for o in snapshot.orders
        ],
    )


@router.get("/decisions/{receivable_id}", response_model=DecisionWithEvidence)
async def get_decision(receivable_id: str) -> DecisionWithEvidence:
    decision = DecisionStore().get(receivable_id)
    if decision is None:
        raise HTTPException(status_code=404, detail="decision not found")

    evidence = EvidenceStore().get(decision.evidence_ref) if decision.evidence_ref else None
    return DecisionWithEvidence(decision=decision, evidence=evidence)


@router.get("/evidence/{ref}", response_model=EvidencePayload)
async def get_evidence(ref: str) -> EvidencePayload:
    payload = EvidenceStore().get(ref)
    if payload is None:
        raise HTTPException(status_code=404, detail="evidence not found")
    return payload


@router.get("/agent/stats")
async def agent_stats() -> dict[str, int]:
    return DecisionStore().stats()
