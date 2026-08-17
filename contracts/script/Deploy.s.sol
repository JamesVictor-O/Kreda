// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {Settlement} from "../src/Settlement.sol";

/// @notice Deploys the protocol-level contracts shared across all
/// receivables — AgentRegistry, Attestation, Settlement — wires them
/// together, and registers the underwriter agent. ReceivableVault
/// instances are deployed per-receivable afterward, see DeployVault.s.sol.
///
/// Required env vars: DEPLOYER_ADDRESS, ORACLE_SIGNER_ADDRESS, AGENT_ADDRESS.
/// Optional: AGENT_NAME (defaults to "Kreda Underwriter v1").
contract Deploy is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address oracleSigner = vm.envAddress("ORACLE_SIGNER_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");
        string memory agentName = vm.envOr("AGENT_NAME", string("Kreda Underwriter v1"));

        vm.startBroadcast();

        AgentRegistry agentRegistry = new AgentRegistry(deployer);
        Attestation attestation = new Attestation(address(agentRegistry));
        Settlement settlement = new Settlement(deployer, address(agentRegistry), address(attestation), oracleSigner);

        agentRegistry.setAttestationContract(address(attestation));
        agentRegistry.setSettlementContract(address(settlement));
        agentRegistry.registerAgent(agent, agentName);

        vm.stopBroadcast();

        // Post-deploy verification — fail loudly here rather than
        // discovering a wiring mistake later against real funds.
        require(agentRegistry.attestationContract() == address(attestation), "wiring: attestationContract");
        require(agentRegistry.settlementContract() == address(settlement), "wiring: settlementContract");
        require(address(settlement.agentRegistry()) == address(agentRegistry), "wiring: settlement.agentRegistry");
        require(address(settlement.attestation()) == address(attestation), "wiring: settlement.attestation");
        require(settlement.oracleSigner() == oracleSigner, "wiring: oracleSigner");
        require(agentRegistry.isRegistered(agent), "wiring: agent not registered");

        console.log("AgentRegistry:", address(agentRegistry));
        console.log("Attestation:  ", address(attestation));
        console.log("Settlement:   ", address(settlement));
        console.log("Agent:        ", agent);
        console.log("OracleSigner: ", oracleSigner);

        string memory addressesJson = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(block.chainid),
            ",\n",
            '  "agentRegistry": "',
            vm.toString(address(agentRegistry)),
            '",\n',
            '  "attestation": "',
            vm.toString(address(attestation)),
            '",\n',
            '  "settlement": "',
            vm.toString(address(settlement)),
            '",\n',
            '  "agent": "',
            vm.toString(agent),
            '",\n',
            '  "oracleSigner": "',
            vm.toString(oracleSigner),
            '"\n',
            "}\n"
        );
        string memory outPath = string.concat("deployments/", _networkName(), ".json");
        vm.writeFile(outPath, addressesJson);
        console.log("Wrote", outPath);
        console.log("Update the README addresses table from this file - see README.md.");
    }

    function _networkName() internal view returns (string memory) {
        if (block.chainid == 677) return "mainnet";
        if (block.chainid == 968) return "testnet";
        return vm.toString(block.chainid);
    }
}
