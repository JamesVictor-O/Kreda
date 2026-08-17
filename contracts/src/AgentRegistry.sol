// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Identity and track record for underwriter agents.
/// @dev Stands in for AIDID — BOT Chain's announced AI agent identity
/// protocol has no SDK or contract address in the developer docs. Migrate
/// to an AIDID registry if one ships; see CLAUDE.md.
///
/// Registration is owner-gated for v1, one team running one underwriter.
/// Permissionless registration — any address staking a bond, say — is the
/// intended direction once there is more than one agent to admit.
contract AgentRegistry is Ownable {
    struct Agent {
        bool registered;
        string name;
        uint64 decisionsTotal;
        uint64 declinesTotal;
        uint64 accurateTotal;
    }

    mapping(address => Agent) public agents;

    /// @dev The only two contracts allowed to write decision/outcome
    /// history, wired in post-deploy once they exist — see script/Deploy.s.sol.
    address public attestationContract;
    address public settlementContract;

    event AgentRegistered(address indexed agent, string name);
    event AttestationContractSet(address indexed attestationContract);
    event SettlementContractSet(address indexed settlementContract);
    event DecisionRecorded(address indexed agent, bool approved);
    event OutcomeRecorded(address indexed agent, bool accurate);

    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error Unauthorized();
    error ZeroAddress();

    modifier onlyAttestation() {
        if (msg.sender != attestationContract) revert Unauthorized();
        _;
    }

    modifier onlySettlement() {
        if (msg.sender != settlementContract) revert Unauthorized();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Admits an agent address, allowing it to sign attestations.
    function registerAgent(address agent, string calldata name) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        if (agents[agent].registered) revert AgentAlreadyRegistered();
        agents[agent].registered = true;
        agents[agent].name = name;
        emit AgentRegistered(agent, name);
    }

    /// @notice Wires in the Attestation contract, the only caller allowed
    /// to invoke {recordDecision}.
    function setAttestationContract(address attestationContract_) external onlyOwner {
        if (attestationContract_ == address(0)) revert ZeroAddress();
        attestationContract = attestationContract_;
        emit AttestationContractSet(attestationContract_);
    }

    /// @notice Wires in the Settlement contract, the only caller allowed
    /// to invoke {recordOutcome}.
    function setSettlementContract(address settlementContract_) external onlyOwner {
        if (settlementContract_ == address(0)) revert ZeroAddress();
        settlementContract = settlementContract_;
        emit SettlementContractSet(settlementContract_);
    }

    /// @notice Records one underwriting decision, approved or declined.
    /// @dev Called once per Attestation.submit(), including declines — an
    /// accuracy figure without a decline count is meaningless. See
    /// CLAUDE.md: the decline path is a first-class output.
    function recordDecision(address agent, bool approved) external onlyAttestation {
        Agent storage a = agents[agent];
        if (!a.registered) revert AgentNotRegistered();
        a.decisionsTotal += 1;
        if (!approved) a.declinesTotal += 1;
        emit DecisionRecorded(agent, approved);
    }

    /// @notice Records whether a settled receivable's outcome matched the
    /// decision made on it.
    /// @dev Declined receivables never reach settlement, so this is only
    /// ever called for approved-and-settled ones — accuracy is measured
    /// against decisions that actually resolved, not against every
    /// decision made. Defaults (see ReceivableVault.State.Defaulted) have
    /// no automated call path to this function in v1; a defaulted
    /// receivable's outcome is recorded manually by the owner until an
    /// on-chain default trigger exists.
    function recordOutcome(address agent, bool accurate) external onlySettlement {
        Agent storage a = agents[agent];
        if (!a.registered) revert AgentNotRegistered();
        if (accurate) a.accurateTotal += 1;
        emit OutcomeRecorded(agent, accurate);
    }

    function isRegistered(address agent) external view returns (bool) {
        return agents[agent].registered;
    }

    /// @notice Raw decision/outcome counters. Accuracy is derived by the
    /// caller (accurate / decisions) rather than stored as a single
    /// mutable score, so the underlying history stays inspectable instead
    /// of being collapsed into one number that can silently drift.
    /// @return decisions Total decisions made, approved or declined.
    /// @return approvals Decisions that approved a receivable.
    /// @return declines Decisions that declined a receivable.
    /// @return accurate Settled receivables whose outcome matched the decision.
    function agentStats(address agent)
        external
        view
        returns (uint64 decisions, uint64 approvals, uint64 declines, uint64 accurate)
    {
        Agent storage a = agents[agent];
        decisions = a.decisionsTotal;
        declines = a.declinesTotal;
        approvals = decisions - declines;
        accurate = a.accurateTotal;
    }
}
