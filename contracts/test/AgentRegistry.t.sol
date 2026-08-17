// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address owner = address(this);
    address agent = address(0xA6E4);
    address attestationCaller = address(0xA771);
    address settlementCaller = address(0x5E77E);

    function setUp() public {
        registry = new AgentRegistry(owner);
        registry.setAttestationContract(attestationCaller);
        registry.setSettlementContract(settlementCaller);
    }

    function test_registerAgent() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");
        assertTrue(registry.isRegistered(agent));
    }

    function test_registerAgent_revertsIfAlreadyRegistered() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");
        vm.expectRevert(AgentRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent(agent, "Kreda Underwriter v1");
    }

    function test_registerAgent_revertsOnZeroAddress() public {
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        registry.registerAgent(address(0), "Nobody");
    }

    function test_registerAgent_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.registerAgent(agent, "Kreda Underwriter v1");
    }

    function test_setAttestationContract_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.setAttestationContract(attestationCaller);
    }

    function test_setSettlementContract_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.setSettlementContract(settlementCaller);
    }

    function test_recordDecision_onlyAttestationContract() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");
        vm.expectRevert(AgentRegistry.Unauthorized.selector);
        registry.recordDecision(agent, true);
    }

    function test_recordDecision_revertsIfNotRegistered() public {
        vm.prank(attestationCaller);
        vm.expectRevert(AgentRegistry.AgentNotRegistered.selector);
        registry.recordDecision(agent, true);
    }

    function test_recordOutcome_onlySettlementContract() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");
        vm.expectRevert(AgentRegistry.Unauthorized.selector);
        registry.recordOutcome(agent, true);
    }

    function test_recordOutcome_revertsIfNotRegistered() public {
        vm.prank(settlementCaller);
        vm.expectRevert(AgentRegistry.AgentNotRegistered.selector);
        registry.recordOutcome(agent, true);
    }

    function test_agentStats_tracksDecisionsApprovalsAndDeclines() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");

        vm.startPrank(attestationCaller);
        registry.recordDecision(agent, true);
        registry.recordDecision(agent, true);
        registry.recordDecision(agent, false);
        registry.recordDecision(agent, true);
        vm.stopPrank();

        (uint64 decisions, uint64 approvals, uint64 declines, uint64 accurate) = registry.agentStats(agent);
        assertEq(decisions, 4);
        assertEq(approvals, 3);
        assertEq(declines, 1);
        assertEq(accurate, 0);
    }

    function test_agentStats_tracksAccurateOutcomes() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");

        vm.startPrank(settlementCaller);
        registry.recordOutcome(agent, true);
        registry.recordOutcome(agent, true);
        registry.recordOutcome(agent, false);
        vm.stopPrank();

        (,,, uint64 accurate) = registry.agentStats(agent);
        assertEq(accurate, 2);
    }

    function test_agentStats_isZeroWithNoHistory() public {
        registry.registerAgent(agent, "Kreda Underwriter v1");
        (uint64 decisions, uint64 approvals, uint64 declines, uint64 accurate) = registry.agentStats(agent);
        assertEq(decisions, 0);
        assertEq(approvals, 0);
        assertEq(declines, 0);
        assertEq(accurate, 0);
    }
}
