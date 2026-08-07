// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Identity and running accuracy score for underwriter agents.
/// Stands in for AIDID: BOT Chain's announced agent identity protocol has no
/// developer surface yet. Migrate to an AIDID SDK if one ships.
contract AgentRegistry is Ownable {
    struct Agent {
        bool registered;
        uint64 decisionsTotal;
        uint64 decisionsCorrect;
    }

    mapping(address => Agent) public agents;

    event AgentRegistered(address indexed agent);
    event AgentOutcomeRecorded(address indexed agent, bool correct);

    error AgentAlreadyRegistered();
    error AgentNotRegistered();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerAgent(address agent) external onlyOwner {
        if (agents[agent].registered) revert AgentAlreadyRegistered();
        agents[agent].registered = true;
        emit AgentRegistered(agent);
    }

    function recordOutcome(address agent, bool correct) external onlyOwner {
        Agent storage a = agents[agent];
        if (!a.registered) revert AgentNotRegistered();
        a.decisionsTotal += 1;
        if (correct) a.decisionsCorrect += 1;
        emit AgentOutcomeRecorded(agent, correct);
    }

    function isRegistered(address agent) external view returns (bool) {
        return agents[agent].registered;
    }

    /// @return accuracyBps Accuracy in basis points (0-10000). Returns 0 with no decisions.
    function accuracy(address agent) external view returns (uint256 accuracyBps) {
        Agent storage a = agents[agent];
        if (a.decisionsTotal == 0) return 0;
        return (uint256(a.decisionsCorrect) * 10_000) / a.decisionsTotal;
    }
}
