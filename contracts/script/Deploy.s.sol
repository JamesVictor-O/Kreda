// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {Settlement} from "../src/Settlement.sol";

/// @notice Deploys the protocol-level contracts shared across all receivables.
/// ReceivableVault instances are deployed per-receivable by the agent service,
/// not here.
contract Deploy is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast();

        AgentRegistry agentRegistry = new AgentRegistry(deployer);
        Attestation attestation = new Attestation(deployer, address(agentRegistry));
        Settlement settlement = new Settlement(deployer);

        vm.stopBroadcast();

        console.log("AgentRegistry:", address(agentRegistry));
        console.log("Attestation:", address(attestation));
        console.log("Settlement:", address(settlement));
    }
}
