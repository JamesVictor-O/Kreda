// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Attestation} from "../../src/Attestation.sol";

/// @notice Mirrors the exact EIP-712 domain and struct hashing done
/// on-chain by Attestation and Settlement, so tests sign the same digest
/// the contracts verify. Kept dependency-free (no vm) — callers do the
/// actual signing with `vm.sign(privateKey, digest)`.
abstract contract Eip712 {
    bytes32 internal constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 internal constant PAYOUT_TYPEHASH = keccak256("PayoutConfirmation(address vault,uint256 amount)");

    function _domainSeparator(string memory name, string memory version, address verifyingContract)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH, keccak256(bytes(name)), keccak256(bytes(version)), block.chainid, verifyingContract
            )
        );
    }

    function _digest(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _attestationDigest(Attestation attestation, Attestation.Record memory r) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                attestation.RECORD_TYPEHASH(),
                r.receivableId,
                r.seller,
                r.faceValue,
                r.grade,
                r.advanceRate,
                r.expectedSettlement,
                r.confidence,
                r.evidenceRef,
                r.agent,
                r.approved
            )
        );
        return _digest(_domainSeparator("Kreda Attestation", "1", address(attestation)), structHash);
    }

    function _payoutDigest(address settlementContract, address vault, uint256 amount) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(PAYOUT_TYPEHASH, vault, amount));
        return _digest(_domainSeparator("Kreda Settlement", "1", settlementContract), structHash);
    }
}
