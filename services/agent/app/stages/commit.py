"""Stage 4: assemble the evidence payload, commit it (blob or calldata hash
tree, behind app.chain.blob.EvidenceCommitter), mirror it to durable
storage, sign the Attestation record with the agent key, and submit it
on-chain.

Declines commit too — same evidence payload shape, same commitment, same
Attestation record with advanceRate 0 and approved False. No vault, no
sponsorship policy, but the record persists. See CLAUDE.md: the decline
path is a first-class output, not an error case.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime

from app.chain.attestation_client import submit_attestation
from app.chain.blob import get_committer
from app.chain.eip712 import agent_address_from_key, build_record, sign_record
from app.core.config import settings
from app.core.models import Decision, EvidencePayload, Outcome, SignedAttestation
from app.storage.decision_store import DecisionStore
from app.storage.evidence_store import EvidenceStore


def build_evidence_payload(
    decision: Decision,
    *,
    store_domain: str,
    window_start: datetime,
    window_end: datetime,
    order_count: int,
    fulfilled_order_count: int,
) -> EvidencePayload:
    return EvidencePayload(
        receivable_id=decision.receivable_id,
        store_domain=store_domain,
        ingestion_window_start=window_start,
        ingestion_window_end=window_end,
        order_count=order_count,
        fulfilled_order_count=fulfilled_order_count,
        checks=decision.checks,
        grade=decision.grade,
        advance_rate_bps=decision.advance_rate_bps,
        confidence_bps=decision.confidence_bps,
        expected_settlement_days=decision.expected_settlement_days,
        reasoning=decision.reasoning,
        outcome=decision.outcome,
        prompt_hash=decision.prompt_hash,
        model=decision.model,
        committed_at=datetime.now(UTC),
    )


def commit(
    decision: Decision,
    payload: EvidencePayload,
    *,
    evidence_store: EvidenceStore | None = None,
    decision_store: DecisionStore | None = None,
    submit_onchain: bool = True,
) -> SignedAttestation:
    """Commits evidence and, by default, submits the signed attestation
    on-chain. `submit_onchain=False` skips only the eth_sendRawTransaction —
    commitment, mirroring, and signing all still run — for tests and for
    runs where the agent key or contract address aren't wired up yet.
    """
    evidence_store = evidence_store or EvidenceStore()
    decision_store = decision_store or DecisionStore()

    committer = get_committer()
    commitment = committer.commit(payload)
    evidence_store.put(commitment.commitment_hash, payload)

    agent_address = agent_address_from_key(settings.agent_private_key)
    expected_settlement_ts = int(time.time()) + decision.expected_settlement_days * 86_400
    face_value_units = round(decision.face_value * 10**settings.stablecoin_decimals)

    record = build_record(
        receivable_id=decision.receivable_id,
        seller=decision.seller_address,
        face_value=face_value_units,
        grade=decision.grade,
        advance_rate_bps=decision.advance_rate_bps,
        expected_settlement=expected_settlement_ts,
        confidence_bps=decision.confidence_bps,
        evidence_ref=commitment.commitment_hash,
        agent_address=agent_address,
        approved=decision.outcome is Outcome.APPROVED,
    )
    signature = sign_record(record, settings.agent_private_key)

    tx_hash = submit_attestation(record, signature) if submit_onchain else None

    decision.evidence_ref = commitment.commitment_hash
    decision.tx_hash = tx_hash
    decision_store.put(decision)

    return SignedAttestation(
        receivable_id=decision.receivable_id,
        seller=record.seller,
        face_value=record.face_value,
        grade=record.grade,
        advance_rate=record.advance_rate,
        expected_settlement=record.expected_settlement,
        confidence=record.confidence,
        evidence_ref=commitment.commitment_hash,
        agent=agent_address,
        approved=record.approved,
        signature="0x" + signature.hex(),
        evidence_uri=commitment.commitment_hash,
        commitment_method=commitment.method,
        tx_hash=tx_hash,
    )
