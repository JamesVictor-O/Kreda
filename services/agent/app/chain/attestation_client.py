"""web3 wiring for the two on-chain calls this service makes: submitting a
signed Attestation.Record, and reading AgentRegistry.agentStats for
GET /agent/stats.

Minimal inline ABIs rather than importing contracts/out/*.json — that
directory is a Foundry build artifact, gitignored, and not meant to be a
runtime dependency of a separate service. Keep these two fragments in sync
with contracts/src/Attestation.sol and contracts/src/AgentRegistry.sol by
hand; they're small and change rarely.
"""

from __future__ import annotations

import logging

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from app.chain.eip712 import AttestationRecordFields
from app.core.config import settings

logger = logging.getLogger(__name__)

_ATTESTATION_ABI = [
    {
        "type": "function",
        "name": "submit",
        "stateMutability": "nonpayable",
        "inputs": [
            {
                "name": "r",
                "type": "tuple",
                "components": [
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
                ],
            },
            {"name": "signature", "type": "bytes"},
        ],
        "outputs": [{"name": "attestationId", "type": "bytes32"}],
    }
]

_AGENT_REGISTRY_ABI = [
    {
        "type": "function",
        "name": "agentStats",
        "stateMutability": "view",
        "inputs": [{"name": "agent", "type": "address"}],
        "outputs": [
            {"name": "decisions", "type": "uint64"},
            {"name": "approvals", "type": "uint64"},
            {"name": "declines", "type": "uint64"},
            {"name": "accurate", "type": "uint64"},
        ],
    }
]


def _client() -> Web3:
    # BOT Chain is PoSA (the BSC consensus lineage, per CLAUDE.md) —
    # block headers carry a longer extraData (validator info/signatures)
    # than plain web3.py's default formatter allows, which otherwise
    # raises on any call that touches a block (get_transaction_count
    # included). Without this middleware every write silently can't build
    # a transaction at all.
    w3 = Web3(Web3.HTTPProvider(settings.testnet_rpc_url))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def submit_attestation(record: AttestationRecordFields, signature: bytes) -> str:
    """Submits the signed record and returns the transaction hash. The
    attestationId itself is deterministic (keccak of the receivable_id
    string — see eip712.receivable_id_to_bytes32), so callers don't need to
    parse the return value or wait for a receipt just to know it.
    """
    w3 = _client()
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.attestation_contract_address),
        abi=_ATTESTATION_ABI,
    )
    account = w3.eth.account.from_key(settings.agent_private_key)

    record_tuple = (
        record.receivable_id,
        record.seller,
        record.face_value,
        record.grade,
        record.advance_rate,
        record.expected_settlement,
        record.confidence,
        record.evidence_ref,
        record.agent,
        record.approved,
    )
    tx = contract.functions.submit(record_tuple, signature).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "chainId": settings.chain_id,
        }
    )
    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    logger.info("submitted attestation tx %s", tx_hash.hex())
    return f"0x{tx_hash.hex()}"


def read_agent_stats(agent_address: str) -> dict[str, int]:
    w3 = _client()
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.agent_registry_contract_address),
        abi=_AGENT_REGISTRY_ABI,
    )
    decisions, approvals, declines, accurate = contract.functions.agentStats(
        Web3.to_checksum_address(agent_address)
    ).call()
    return {
        "decisions": decisions,
        "approvals": approvals,
        "declines": declines,
        "accurate": accurate,
    }
