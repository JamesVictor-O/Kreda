from __future__ import annotations

from datetime import UTC, datetime

import pytest
from eth_account import Account
from eth_account.messages import encode_typed_data

from app.chain.blob import CalldataHashTreeCommitter, get_committer
from app.chain.eip712 import _RECORD_TYPES, agent_address_from_key, build_record, sign_record
from app.core.config import settings
from app.core.models import CheckResult, Decision, Grade, Outcome
from app.core.thresholds import CheckStatus
from app.stages.commit import build_evidence_payload, commit
from app.storage.decision_store import DecisionStore
from app.storage.evidence_store import EvidenceStore

# Anvil/Hardhat's well-known default test account #0 — a public test-only
# key, never used for real funds. Fine to commit.
TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

CHECKS = [
    CheckResult(
        name="fulfilment_coverage", status=CheckStatus.PASS, value=0.99, detail="d", threshold=0.98
    ),
    CheckResult(
        name="sales_velocity", status=CheckStatus.PASS, value=1.0, detail="d", threshold=3.0
    ),
    CheckResult(
        name="chargeback_rate", status=CheckStatus.PASS, value=0.0, detail="d", threshold=0.01
    ),
    CheckResult(name="return_rate", status=CheckStatus.PASS, value=0.0, detail="d", threshold=0.07),
    CheckResult(
        name="address_clustering", status=CheckStatus.PASS, value=0.0, detail="d", threshold=0.20
    ),
    CheckResult(
        name="synthetic_order_patterns",
        status=CheckStatus.PASS,
        value=0.0,
        detail="d",
        threshold=0.5,
    ),
]


@pytest.fixture(autouse=True)
def _agent_key(monkeypatch):
    monkeypatch.setattr(settings, "agent_private_key", TEST_PRIVATE_KEY)
    monkeypatch.setattr(settings, "attestation_contract_address", "0x" + "11" * 20)
    monkeypatch.setattr(settings, "chain_id", 968)
    monkeypatch.setattr(settings, "stablecoin_decimals", 6)


def _decision(
    *, outcome: Outcome, grade: Grade, advance_rate_bps: int, receivable_id: str
) -> Decision:
    return Decision(
        receivable_id=receivable_id,
        seller_address="0x" + "22" * 20,
        outcome=outcome,
        grade=grade,
        advance_rate_bps=advance_rate_bps,
        confidence_bps=9_000,
        expected_settlement_days=30,
        reasoning="Test reasoning citing 312/312 orders scanned.",
        checks=CHECKS,
        face_value=10_000.0,
        prompt_hash="0x" + "aa" * 32,
        model="claude-opus-5",
    )


def _payload(decision: Decision):
    return build_evidence_payload(
        decision,
        store_domain="test-shop.myshopify.com",
        window_start=datetime(2026, 5, 1, tzinfo=UTC),
        window_end=datetime(2026, 8, 1, tzinfo=UTC),
        order_count=60,
        fulfilled_order_count=59,
    )


class TestCalldataHashTreeCommitter:
    def test_commit_is_deterministic(self):
        decision = _decision(
            outcome=Outcome.APPROVED, grade=Grade.A, advance_rate_bps=8_500, receivable_id="rcv_a"
        )
        payload = _payload(decision)
        committer = CalldataHashTreeCommitter()

        first = committer.commit(payload)
        second = committer.commit(payload)

        assert first.commitment_hash == second.commitment_hash
        assert first.method == "calldata_hash_tree"
        assert len(first.commitment_hash) == 66  # 0x + 32 bytes

    def test_different_payloads_commit_differently(self):
        approved = _decision(
            outcome=Outcome.APPROVED, grade=Grade.A, advance_rate_bps=8_500, receivable_id="rcv_b"
        )
        declined = _decision(
            outcome=Outcome.DECLINED, grade=Grade.DECLINE, advance_rate_bps=0, receivable_id="rcv_c"
        )
        committer = CalldataHashTreeCommitter()
        assert committer.commit(_payload(approved)).commitment_hash != (
            committer.commit(_payload(declined)).commitment_hash
        )

    def test_get_committer_defaults_to_calldata(self, monkeypatch):
        monkeypatch.setattr(settings, "evidence_commitment_method", "calldata_hash_tree")
        assert isinstance(get_committer(), CalldataHashTreeCommitter)


class TestEip712Signing:
    def test_signature_recovers_to_agent_address(self):
        decision = _decision(
            outcome=Outcome.APPROVED,
            grade=Grade.B_PLUS,
            advance_rate_bps=8_000,
            receivable_id="rcv_d",
        )
        agent_address = agent_address_from_key(TEST_PRIVATE_KEY)
        record = build_record(
            receivable_id=decision.receivable_id,
            seller=decision.seller_address,
            face_value=10_000_000_000,
            grade=decision.grade,
            advance_rate_bps=decision.advance_rate_bps,
            expected_settlement=1_800_000_000,
            confidence_bps=decision.confidence_bps,
            evidence_ref="0x" + "bb" * 32,
            agent_address=agent_address,
            approved=True,
        )
        signature = sign_record(record, TEST_PRIVATE_KEY)
        assert len(signature) == 65
        assert record.agent == agent_address

        # Recover the signer independently, via the same EIP-712 domain and
        # types Attestation.sol verifies against, and confirm it's the agent.
        domain_data = {
            "name": "Kreda Attestation",
            "version": "1",
            "chainId": settings.chain_id,
            "verifyingContract": settings.attestation_contract_address,
        }
        message_data = {
            "receivableId": record.receivable_id,
            "seller": record.seller,
            "faceValue": record.face_value,
            "grade": record.grade,
            "advanceRate": record.advance_rate,
            "expectedSettlement": record.expected_settlement,
            "confidence": record.confidence,
            "evidenceRef": record.evidence_ref,
            "agent": record.agent,
            "approved": record.approved,
        }
        signable = encode_typed_data(
            domain_data=domain_data, message_types=_RECORD_TYPES, message_data=message_data
        )
        recovered_address = Account.recover_message(signable, signature=signature)
        assert recovered_address == agent_address

    def test_tampered_record_recovers_a_different_signer(self):
        agent_address = agent_address_from_key(TEST_PRIVATE_KEY)
        record = build_record(
            receivable_id="rcv_tamper",
            seller="0x" + "22" * 20,
            face_value=10_000_000_000,
            grade=Grade.A,
            advance_rate_bps=8_500,
            expected_settlement=1_800_000_000,
            confidence_bps=9_000,
            evidence_ref="0x" + "bb" * 32,
            agent_address=agent_address,
            approved=True,
        )
        signature = sign_record(record, TEST_PRIVATE_KEY)

        domain_data = {
            "name": "Kreda Attestation",
            "version": "1",
            "chainId": settings.chain_id,
            "verifyingContract": settings.attestation_contract_address,
        }
        tampered_message = {
            "receivableId": record.receivable_id,
            "seller": record.seller,
            "faceValue": record.face_value + 1,  # tampered after signing
            "grade": record.grade,
            "advanceRate": record.advance_rate,
            "expectedSettlement": record.expected_settlement,
            "confidence": record.confidence,
            "evidenceRef": record.evidence_ref,
            "agent": record.agent,
            "approved": record.approved,
        }
        signable = encode_typed_data(
            domain_data=domain_data, message_types=_RECORD_TYPES, message_data=tampered_message
        )
        recovered_address = Account.recover_message(signable, signature=signature)
        assert recovered_address != agent_address

    def test_tampering_with_record_changes_nothing_about_the_signature_call(self):
        # Signing is a pure function of (record, key) — same inputs, same
        # signature, which is what lets the contract-side test suite in
        # contracts/test/Attestation.t.sol assert byte-for-byte compatibility.
        agent_address = agent_address_from_key(TEST_PRIVATE_KEY)
        kwargs = dict(
            receivable_id="rcv_e",
            seller="0x" + "22" * 20,
            face_value=1_000,
            grade=Grade.A,
            advance_rate_bps=8_500,
            expected_settlement=1_800_000_000,
            confidence_bps=9_000,
            evidence_ref="0x" + "cc" * 32,
            agent_address=agent_address,
            approved=True,
        )
        record1 = build_record(**kwargs)
        record2 = build_record(**kwargs)
        assert sign_record(record1, TEST_PRIVATE_KEY) == sign_record(record2, TEST_PRIVATE_KEY)


class TestCommitStage:
    def test_decline_commits_with_zero_advance_rate_and_not_approved(self, tmp_path):
        decision = _decision(
            outcome=Outcome.DECLINED,
            grade=Grade.DECLINE,
            advance_rate_bps=0,
            receivable_id="rcv_decline",
        )
        payload = _payload(decision)

        signed = commit(
            decision,
            payload,
            evidence_store=EvidenceStore(str(tmp_path / "evidence")),
            decision_store=DecisionStore(str(tmp_path / "evidence")),
            submit_onchain=False,
        )

        assert signed.approved is False
        assert signed.advance_rate == 0
        assert signed.tx_hash is None  # submit_onchain=False
        assert signed.evidence_ref  # still committed and mirrored

    def test_commit_mirrors_evidence_and_records_the_decision(self, tmp_path):
        decision = _decision(
            outcome=Outcome.APPROVED,
            grade=Grade.A,
            advance_rate_bps=8_500,
            receivable_id="rcv_mirror",
        )
        payload = _payload(decision)
        evidence_store = EvidenceStore(str(tmp_path / "evidence"))
        decision_store = DecisionStore(str(tmp_path / "evidence"))

        signed = commit(
            decision,
            payload,
            evidence_store=evidence_store,
            decision_store=decision_store,
            submit_onchain=False,
        )

        mirrored = evidence_store.get(signed.evidence_ref)
        assert mirrored is not None
        assert mirrored.receivable_id == "rcv_mirror"

        stored_decision = decision_store.get("rcv_mirror")
        assert stored_decision is not None
        assert stored_decision.evidence_ref == signed.evidence_ref

    def test_face_value_scaled_to_stablecoin_decimals(self, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "stablecoin_decimals", 6)
        decision = _decision(
            outcome=Outcome.APPROVED,
            grade=Grade.A,
            advance_rate_bps=8_500,
            receivable_id="rcv_scale",
        )
        decision.face_value = 10_000.0
        payload = _payload(decision)

        signed = commit(
            decision,
            payload,
            evidence_store=EvidenceStore(str(tmp_path / "evidence")),
            decision_store=DecisionStore(str(tmp_path / "evidence")),
            submit_onchain=False,
        )

        assert signed.face_value == 10_000 * 10**6
