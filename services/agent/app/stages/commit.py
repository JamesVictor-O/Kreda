"""Stage 4: sign the decision and commit it on-chain via the Attestation contract."""

import json

from eth_account import Account
from eth_account.messages import encode_defunct

from app.core.config import settings
from app.core.models import Decision, SignedDecision


def sign_decision(decision: Decision) -> SignedDecision:
    account = Account.from_key(settings.agent_private_key)
    message = encode_defunct(text=json.dumps(decision.model_dump(mode="json"), sort_keys=True))
    signature = account.sign_message(message)

    return SignedDecision(
        decision=decision,
        signature=signature.signature.hex(),
        agent_address=account.address,
    )


def commit_onchain(signed: SignedDecision) -> str:
    """Submit the signed decision to the Attestation contract.

    Returns the transaction hash. Left as a stub pending the Attestation
    contract ABI wiring — see contracts/src/Attestation.sol.
    """
    raise NotImplementedError("wire up web3 call to Attestation.commitDecision")
