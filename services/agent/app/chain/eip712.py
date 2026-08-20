"""EIP-712 signing over the Attestation.Record struct, matching
contracts/src/Attestation.sol's RECORD_TYPEHASH field for field. If this
drifts from the contract, signatures verify against the wrong hash and
every submission reverts with InvalidSignature — keep the type list below
byte-for-byte in sync with the Solidity struct.
"""

from __future__ import annotations

from dataclasses import dataclass

from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

from app.core.config import settings
from app.core.models import GRADE_CODE, Grade

_RECORD_TYPES = {
    "Record": [
        {"name": "receivableId", "type": "bytes32"},
        {"name": "seller", "type": "address"},
        {"name": "faceValue", "type": "uint256"},
        {"name": "grade", "type": "uint8"},
        {"name": "advanceRate", "type": "uint16"},
        {"name": "expectedSettlement", "type": "uint64"},
        {"name": "confidence", "type": "uint16"},
        {"name": "evidenceRef", "type": "bytes32"},
        {"name": "agent", "type": "address"},
        {"name": "approved", "type": "bool"},
    ]
}


@dataclass(frozen=True)
class AttestationRecordFields:
    """The exact values that go into the on-chain Record struct — kept
    separate from app.core.models.Decision so chain encoding concerns
    (bytes32 ids, uint widths) don't leak into the domain model."""

    receivable_id: bytes  # bytes32
    seller: str
    face_value: int
    grade: int  # uint8, see GRADE_CODE
    advance_rate: int  # bps
    expected_settlement: int  # unix timestamp
    confidence: int  # bps
    evidence_ref: bytes  # bytes32
    agent: str
    approved: bool


def receivable_id_to_bytes32(receivable_id: str) -> bytes:
    return Web3.keccak(text=receivable_id)


def build_record(
    *,
    receivable_id: str,
    seller: str,
    face_value: int,
    grade: Grade,
    advance_rate_bps: int,
    expected_settlement: int,
    confidence_bps: int,
    evidence_ref: str,
    agent_address: str,
    approved: bool,
) -> AttestationRecordFields:
    return AttestationRecordFields(
        receivable_id=receivable_id_to_bytes32(receivable_id),
        seller=Web3.to_checksum_address(seller),
        face_value=face_value,
        grade=GRADE_CODE[grade],
        advance_rate=advance_rate_bps,
        expected_settlement=expected_settlement,
        confidence=confidence_bps,
        evidence_ref=bytes.fromhex(evidence_ref.removeprefix("0x")),
        agent=Web3.to_checksum_address(agent_address),
        approved=approved,
    )


def sign_record(record: AttestationRecordFields, private_key: str) -> bytes:
    """Signs `record` with the agent key, over the same EIP-712 domain and
    typed data the Attestation contract's submit() verifies against."""
    domain_data = {
        "name": "Kreda Attestation",
        "version": "1",
        "chainId": settings.chain_id,
        "verifyingContract": Web3.to_checksum_address(settings.attestation_contract_address),
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
    signed = Account.sign_message(signable, private_key=private_key)
    return bytes(signed.signature)


def agent_address_from_key(private_key: str) -> str:
    return Account.from_key(private_key).address
