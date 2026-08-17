// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @notice The underwriting record — approvals and declines committed with
/// the same struct. A decline carries advanceRate zero and never gets a
/// vault, but the record and its evidence reference persist. See
/// CLAUDE.md: the decline path is a first-class output, not an error case.
///
/// @dev submit() is deliberately not access-gated by msg.sender — anyone
/// may relay a record, including a sponsored/gasless relayer. What gates
/// it is a valid EIP-712 signature from a registered agent over the exact
/// record being committed.
contract Attestation is EIP712 {
    using ECDSA for bytes32;

    struct Record {
        bytes32 receivableId;
        address seller;
        uint256 faceValue;
        uint8 grade;
        uint16 advanceRate; // basis points
        uint64 expectedSettlement;
        uint16 confidence; // basis points
        bytes32 evidenceRef; // blob commitment
        address agent;
        bool approved;
    }

    bytes32 public constant RECORD_TYPEHASH = keccak256(
        "Record(bytes32 receivableId,address seller,uint256 faceValue,uint8 grade,uint16 advanceRate,uint64 expectedSettlement,uint16 confidence,bytes32 evidenceRef,address agent,bool approved)"
    );

    AgentRegistry public immutable agentRegistry;

    /// @dev Keyed by receivableId, which doubles as the attestationId
    /// returned from submit() — at most one attestation per receivable,
    /// ever, which is also the anti-replay check.
    mapping(bytes32 => Record) private records;
    mapping(bytes32 => bool) public submitted;

    event AttestationSubmitted(
        bytes32 indexed attestationId, address indexed agent, address indexed seller, bool approved
    );

    error AgentNotRegistered();
    error AlreadySubmitted();
    error InvalidSignature();
    error ZeroReceivableId();

    constructor(address agentRegistryAddress) EIP712("Kreda Attestation", "1") {
        agentRegistry = AgentRegistry(agentRegistryAddress);
    }

    /// @notice Commits a signed underwriting decision on-chain.
    /// @dev attestationId is the record's receivableId — dedup and lookup
    /// share one key, so a receivableId can only ever be attested once.
    /// @param r The decision, approved or declined.
    /// @param signature EIP-712 signature over `r` from `r.agent`.
    /// @return attestationId The id the record was stored under.
    function submit(Record calldata r, bytes calldata signature) external returns (bytes32 attestationId) {
        if (r.receivableId == bytes32(0)) revert ZeroReceivableId();
        if (submitted[r.receivableId]) revert AlreadySubmitted();
        if (!agentRegistry.isRegistered(r.agent)) revert AgentNotRegistered();

        bytes32 structHash = keccak256(
            abi.encode(
                RECORD_TYPEHASH,
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
        address signer = _hashTypedDataV4(structHash).recoverCalldata(signature);
        if (signer != r.agent) revert InvalidSignature();

        submitted[r.receivableId] = true;
        records[r.receivableId] = r;

        agentRegistry.recordDecision(r.agent, r.approved);

        emit AttestationSubmitted(r.receivableId, r.agent, r.seller, r.approved);
        return r.receivableId;
    }

    function get(bytes32 attestationId) external view returns (Record memory) {
        return records[attestationId];
    }
}
