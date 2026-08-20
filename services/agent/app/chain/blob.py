"""Evidence commitment, behind one interface so the blob/calldata switch is
one line — see Settings.evidence_commitment_method.

Whether chain 677 accepts user-submitted blob transactions is an open
question per CLAUDE.md (section 3.3 / the PRD's blocking questions). Until
that's confirmed in the Builder Hub, CalldataHashTreeCommitter is the
default and the only one that actually runs.
"""

from __future__ import annotations

import hashlib
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

from app.core.config import settings
from app.core.models import EvidencePayload


@dataclass(frozen=True)
class CommitmentResult:
    commitment_hash: str  # goes into Attestation.Record.evidenceRef
    method: Literal["blob", "calldata_hash_tree"]


class EvidenceCommitter(ABC):
    @abstractmethod
    def commit(self, payload: EvidencePayload) -> CommitmentResult: ...


def _leaves(payload: EvidencePayload) -> list[bytes]:
    """One leaf per top-level field, deterministically ordered — splitting
    the payload rather than hashing it as one blob means a future version
    could support proving a single field without revealing the rest."""
    data = json.loads(payload.model_dump_json())
    return [
        hashlib.sha256(f"{key}:{json.dumps(data[key], sort_keys=True)}".encode()).digest()
        for key in sorted(data)
    ]


def _merkle_root(leaves: list[bytes]) -> bytes:
    if not leaves:
        return hashlib.sha256(b"").digest()
    level = leaves
    while len(level) > 1:
        if len(level) % 2 == 1:
            level = [*level, level[-1]]
        level = [hashlib.sha256(level[i] + level[i + 1]).digest() for i in range(0, len(level), 2)]
    return level[0]


class CalldataHashTreeCommitter(EvidenceCommitter):
    """Commits a Merkle root over the evidence payload's fields. Same audit
    properties as a blob commitment — a small, permanent on-chain reference
    that can be checked against the mirrored payload in EvidenceStore —
    higher gas cost, no dependency on an unconfirmed BOT Chain feature.

    There's no separate on-chain transaction here: the root becomes
    Attestation.Record.evidenceRef, which is committed as part of the same
    Attestation.submit() calldata. See app/chain/attestation_client.py.
    """

    def commit(self, payload: EvidencePayload) -> CommitmentResult:
        root = _merkle_root(_leaves(payload))
        return CommitmentResult(commitment_hash=f"0x{root.hex()}", method="calldata_hash_tree")


class BotChainBlobCommitter(EvidenceCommitter):
    """EIP-4844 blob commitment. Not implemented: building a valid blob
    transaction needs a KZG trusted-setup library (blob encoding, KZG
    commitment and proof, versioned-hash computation per EIP-4844), which
    is real cryptographic surface area not worth shipping untested against
    an unconfirmed feature. Once blob submission is confirmed available on
    chain 677, implement this method and flip
    Settings.evidence_commitment_method — nothing else in the commit stage
    needs to change.
    """

    def commit(self, payload: EvidencePayload) -> CommitmentResult:
        raise NotImplementedError(
            "Blob submission on chain 677 is unconfirmed (CLAUDE.md open question) "
            "and KZG commitment construction isn't wired up. Use calldata_hash_tree."
        )


def get_committer() -> EvidenceCommitter:
    if settings.evidence_commitment_method == "blob":
        return BotChainBlobCommitter()
    return CalldataHashTreeCommitter()
