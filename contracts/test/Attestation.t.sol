// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";

contract AttestationTest is Test {
    AgentRegistry registry;
    Attestation attestation;

    address owner = address(this);
    address agent = address(0xA6E4);
    address seller = address(0x5E11E5);

    function setUp() public {
        registry = new AgentRegistry(owner);
        attestation = new Attestation(owner, address(registry));
        registry.registerAgent(agent);
    }

    function test_commitDecision_approved() public {
        bytes32 receivableId = keccak256("receivable-1");
        attestation.commitDecision(
            receivableId, agent, seller, Attestation.Outcome.Approved, 8_500, keccak256("evidence"), "ipfs://evidence"
        );

        Attestation.Decision memory d = attestation.getDecision(receivableId);
        assertEq(d.agent, agent);
        assertEq(d.seller, seller);
        assertEq(uint8(d.outcome), uint8(Attestation.Outcome.Approved));
        assertEq(d.confidenceBps, 8_500);
    }

    function test_commitDecision_declineIsFirstClass() public {
        bytes32 receivableId = keccak256("receivable-2");
        attestation.commitDecision(
            receivableId, agent, seller, Attestation.Outcome.Declined, 9_200, keccak256("evidence"), "ipfs://evidence"
        );

        Attestation.Decision memory d = attestation.getDecision(receivableId);
        assertEq(uint8(d.outcome), uint8(Attestation.Outcome.Declined));
        assertGt(d.timestamp, 0);
    }

    function test_commitDecision_revertsForUnregisteredAgent() public {
        bytes32 receivableId = keccak256("receivable-3");
        vm.expectRevert(Attestation.AgentNotRegistered.selector);
        attestation.commitDecision(
            receivableId,
            address(0xBAD),
            seller,
            Attestation.Outcome.Approved,
            8_000,
            keccak256("evidence"),
            "ipfs://evidence"
        );
    }

    function test_commitDecision_revertsIfAlreadyCommitted() public {
        bytes32 receivableId = keccak256("receivable-4");
        attestation.commitDecision(
            receivableId, agent, seller, Attestation.Outcome.Approved, 8_500, keccak256("evidence"), "ipfs://evidence"
        );

        vm.expectRevert(Attestation.DecisionAlreadyCommitted.selector);
        attestation.commitDecision(
            receivableId, agent, seller, Attestation.Outcome.Approved, 8_500, keccak256("evidence"), "ipfs://evidence"
        );
    }
}
