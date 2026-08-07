// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @notice Records a signed underwriting decision and a reference to the
/// off-chain evidence blob behind it. The decline path is a first-class
/// record here, not an error case — declines write a decision with no
/// vault or funding attached.
contract Attestation is Ownable {
    enum Outcome {
        Declined,
        Approved
    }

    struct Decision {
        address agent;
        address seller;
        Outcome outcome;
        uint16 confidenceBps; // 0-10000
        bytes32 evidenceHash; // hash of the evidence blob (checks run, inputs seen)
        string evidenceURI; // pointer to the evidence blob
        uint64 timestamp;
    }

    AgentRegistry public immutable agentRegistry;

    mapping(bytes32 => Decision) public decisions;

    event DecisionCommitted(
        bytes32 indexed receivableId, address indexed agent, address indexed seller, Outcome outcome
    );

    error AgentNotRegistered();
    error DecisionAlreadyCommitted();

    constructor(address initialOwner, address agentRegistryAddress) Ownable(initialOwner) {
        agentRegistry = AgentRegistry(agentRegistryAddress);
    }

    function commitDecision(
        bytes32 receivableId,
        address agent,
        address seller,
        Outcome outcome,
        uint16 confidenceBps,
        bytes32 evidenceHash,
        string calldata evidenceURI
    ) external {
        if (!agentRegistry.isRegistered(agent)) revert AgentNotRegistered();
        if (decisions[receivableId].timestamp != 0) revert DecisionAlreadyCommitted();

        decisions[receivableId] = Decision({
            agent: agent,
            seller: seller,
            outcome: outcome,
            confidenceBps: confidenceBps,
            evidenceHash: evidenceHash,
            evidenceURI: evidenceURI,
            timestamp: uint64(block.timestamp)
        });

        emit DecisionCommitted(receivableId, agent, seller, outcome);
    }

    function getDecision(bytes32 receivableId) external view returns (Decision memory) {
        return decisions[receivableId];
    }
}
