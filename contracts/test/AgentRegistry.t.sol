// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address owner = address(this);
    address agent = address(0xA6E4);

    function setUp() public {
        registry = new AgentRegistry(owner);
    }

    function test_registerAgent() public {
        registry.registerAgent(agent);
        assertTrue(registry.isRegistered(agent));
    }

    function test_registerAgent_revertsIfAlreadyRegistered() public {
        registry.registerAgent(agent);
        vm.expectRevert(AgentRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent(agent);
    }

    function test_recordOutcome_revertsIfNotRegistered() public {
        vm.expectRevert(AgentRegistry.AgentNotRegistered.selector);
        registry.recordOutcome(agent, true);
    }

    function test_accuracy_tracksCorrectDecisions() public {
        registry.registerAgent(agent);
        registry.recordOutcome(agent, true);
        registry.recordOutcome(agent, true);
        registry.recordOutcome(agent, false);
        registry.recordOutcome(agent, true);

        assertEq(registry.accuracy(agent), 7_500);
    }

    function test_accuracy_isZeroWithNoDecisions() public {
        registry.registerAgent(agent);
        assertEq(registry.accuracy(agent), 0);
    }

    function test_onlyOwnerCanRegister() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        registry.registerAgent(agent);
    }
}
