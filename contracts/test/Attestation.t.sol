// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {Eip712} from "./helpers/Eip712.sol";

contract AttestationTest is Test, Eip712 {
    AgentRegistry registry;
    Attestation attestation;

    address owner = address(this);
    address agent;
    uint256 agentKey;
    address seller = address(0x5E11E5);

    function setUp() public {
        (agent, agentKey) = makeAddrAndKey("agent");

        registry = new AgentRegistry(owner);
        attestation = new Attestation(address(registry));
        registry.setAttestationContract(address(attestation));
        registry.registerAgent(agent, "Kreda Underwriter v1");
    }

    function _sign(Attestation.Record memory r, uint256 privateKey) internal view returns (bytes memory) {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(privateKey, _attestationDigest(attestation, r));
        return abi.encodePacked(rr, s, v);
    }

    function _approvedRecord(bytes32 receivableId) internal view returns (Attestation.Record memory) {
        return Attestation.Record({
            receivableId: receivableId,
            seller: seller,
            faceValue: 10_000e6,
            grade: 1,
            advanceRate: 8_000,
            expectedSettlement: uint64(block.timestamp + 30 days),
            confidence: 9_000,
            evidenceRef: keccak256("evidence"),
            agent: agent,
            approved: true
        });
    }

    function test_submit_approved() public {
        bytes32 receivableId = keccak256("receivable-1");
        Attestation.Record memory r = _approvedRecord(receivableId);
        bytes memory sig = _sign(r, agentKey);

        bytes32 attestationId = attestation.submit(r, sig);
        assertEq(attestationId, receivableId);

        Attestation.Record memory stored = attestation.get(receivableId);
        assertEq(stored.seller, seller);
        assertEq(stored.agent, agent);
        assertTrue(stored.approved);

        (uint64 decisions, uint64 approvals, uint64 declines,) = registry.agentStats(agent);
        assertEq(decisions, 1);
        assertEq(approvals, 1);
        assertEq(declines, 0);
    }

    function test_submit_declineIsFirstClass() public {
        bytes32 receivableId = keccak256("receivable-2");
        Attestation.Record memory r = _approvedRecord(receivableId);
        r.approved = false;
        r.advanceRate = 0;
        bytes memory sig = _sign(r, agentKey);

        attestation.submit(r, sig);

        Attestation.Record memory stored = attestation.get(receivableId);
        assertFalse(stored.approved);
        assertEq(stored.advanceRate, 0);

        (uint64 decisions, uint64 approvals, uint64 declines,) = registry.agentStats(agent);
        assertEq(decisions, 1);
        assertEq(approvals, 0);
        assertEq(declines, 1);
    }

    function test_submit_revertsForUnregisteredAgent() public {
        (address rogueAgent, uint256 rogueKey) = makeAddrAndKey("rogue");
        bytes32 receivableId = keccak256("receivable-3");
        Attestation.Record memory r = _approvedRecord(receivableId);
        r.agent = rogueAgent;
        bytes memory sig = _sign(r, rogueKey);

        vm.expectRevert(Attestation.AgentNotRegistered.selector);
        attestation.submit(r, sig);
    }

    function test_submit_revertsIfAlreadySubmitted() public {
        bytes32 receivableId = keccak256("receivable-4");
        Attestation.Record memory r = _approvedRecord(receivableId);
        bytes memory sig = _sign(r, agentKey);
        attestation.submit(r, sig);

        vm.expectRevert(Attestation.AlreadySubmitted.selector);
        attestation.submit(r, sig);
    }

    function test_submit_revertsOnWrongSigner() public {
        (, uint256 wrongKey) = makeAddrAndKey("wrong");
        bytes32 receivableId = keccak256("receivable-5");
        Attestation.Record memory r = _approvedRecord(receivableId);
        bytes memory sig = _sign(r, wrongKey);

        vm.expectRevert(Attestation.InvalidSignature.selector);
        attestation.submit(r, sig);
    }

    function test_submit_revertsOnTamperedRecord() public {
        bytes32 receivableId = keccak256("receivable-6");
        Attestation.Record memory r = _approvedRecord(receivableId);
        bytes memory sig = _sign(r, agentKey);

        r.faceValue = 999_999e6;
        vm.expectRevert(Attestation.InvalidSignature.selector);
        attestation.submit(r, sig);
    }

    function test_submit_revertsOnZeroReceivableId() public {
        Attestation.Record memory r = _approvedRecord(bytes32(0));
        bytes memory sig = _sign(r, agentKey);

        vm.expectRevert(Attestation.ZeroReceivableId.selector);
        attestation.submit(r, sig);
    }

    function test_get_returnsEmptyRecordWhenMissing() public view {
        Attestation.Record memory stored = attestation.get(keccak256("never-submitted"));
        assertEq(stored.seller, address(0));
        assertEq(stored.agent, address(0));
    }
}
