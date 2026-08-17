// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReceivableVault} from "./ReceivableVault.sol";
import {Attestation} from "./Attestation.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @notice Confirms a receivable's marketplace payout and moves proceeds
/// into its vault for pro-rata redemption.
///
/// THIS IS THE WEAKEST COMPONENT IN THE SYSTEM, and that is stated here
/// deliberately rather than left for a reviewer to find. v1 trusts a
/// single `oracleSigner` to attest that a marketplace payout happened and
/// its amount — there is no decentralised feed, no multi-attester quorum,
/// and nothing on-chain that verifies the payout beyond this one
/// signature. Production would require either a decentralised oracle with
/// multiple independent attesters, or a legal assignment of the receivable
/// enforceable off-chain, or both. Neither exists today. See CLAUDE.md and
/// the PRD, section 4.4 — do not describe this as Chainlink-style anywhere
/// it's discussed.
///
/// @dev confirmPayout is signature-gated, not msg.sender-gated: the
/// oracleSigner's signature is the authorization. The caller (typically
/// Kreda's own ops wallet) must separately hold and approve the payout
/// amount — the signature proves the payout is authorized, it does not
/// supply the funds.
contract Settlement is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    bytes32 public constant PAYOUT_TYPEHASH = keccak256("PayoutConfirmation(address vault,uint256 amount)");

    AgentRegistry public immutable agentRegistry;
    Attestation public immutable attestation;

    /// @notice The single trusted signer for payout confirmations. Named
    /// plainly, not `priceFeed` or anything Chainlink-adjacent — see the
    /// contract-level NatSpec.
    address public oracleSigner;

    mapping(address => bool) public settled;

    event OracleSignerSet(address indexed oracleSigner);
    event PayoutConfirmed(address indexed vault, uint256 amount, address indexed oracleSigner, address indexed agent);

    error AlreadySettled();
    error InvalidSignature();
    error ZeroAddress();

    constructor(address initialOwner, address agentRegistryAddress, address attestationAddress, address oracleSigner_)
        Ownable(initialOwner)
        EIP712("Kreda Settlement", "1")
    {
        if (oracleSigner_ == address(0)) revert ZeroAddress();
        agentRegistry = AgentRegistry(agentRegistryAddress);
        attestation = Attestation(attestationAddress);
        oracleSigner = oracleSigner_;
        emit OracleSignerSet(oracleSigner_);
    }

    /// @notice Rotates the trusted oracle signer. The only lever v1 has if
    /// that one key is compromised.
    function setOracleSigner(address oracleSigner_) external onlyOwner {
        if (oracleSigner_ == address(0)) revert ZeroAddress();
        oracleSigner = oracleSigner_;
        emit OracleSignerSet(oracleSigner_);
    }

    /// @notice Confirms a marketplace payout for `vault` and moves `amount`
    /// into it for redemption.
    /// @dev Replay-proof per vault: `settled[vault]` can only flip once.
    /// The caller must have approved this contract for `amount` of the
    /// vault's asset beforehand.
    function confirmPayout(address vault, uint256 amount, bytes calldata signature) external nonReentrant {
        if (settled[vault]) revert AlreadySettled();

        bytes32 structHash = keccak256(abi.encode(PAYOUT_TYPEHASH, vault, amount));
        address signer = _hashTypedDataV4(structHash).recoverCalldata(signature);
        if (signer != oracleSigner) revert InvalidSignature();

        settled[vault] = true;

        ReceivableVault receivableVault = ReceivableVault(vault);
        IERC20 token = IERC20(receivableVault.asset());
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.forceApprove(vault, amount);
        receivableVault.receivePayout(amount);

        address agent = attestation.get(receivableVault.attestationId()).agent;
        agentRegistry.recordOutcome(agent, true);

        emit PayoutConfirmed(vault, amount, oracleSigner, agent);
    }
}
