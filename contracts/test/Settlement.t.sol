// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";
import {Settlement} from "../src/Settlement.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Eip712} from "./helpers/Eip712.sol";

contract SettlementTest is Test, Eip712 {
    AgentRegistry registry;
    Attestation attestation;
    Settlement settlement;
    MockERC20 usdc;
    ReceivableVault vault;

    address owner = address(this);
    address agent;
    uint256 agentKey;
    address oracleSigner;
    uint256 oracleKey;
    address seller = address(0x5E11E5);
    address treasury = address(0x7Ea5e2);

    bytes32 receivableId = keccak256("receivable-1");
    uint256 constant TARGET = 100e18;
    uint256 constant PAYOUT = 112e18;

    function setUp() public {
        (agent, agentKey) = makeAddrAndKey("agent");
        (oracleSigner, oracleKey) = makeAddrAndKey("oracle");

        registry = new AgentRegistry(owner);
        attestation = new Attestation(address(registry));
        registry.setAttestationContract(address(attestation));
        registry.registerAgent(agent, "Kreda Underwriter v1");

        settlement = new Settlement(owner, address(registry), address(attestation), oracleSigner);
        registry.setSettlementContract(address(settlement));

        Attestation.Record memory r = Attestation.Record({
            receivableId: receivableId,
            seller: seller,
            faceValue: 125e18,
            grade: 1,
            advanceRate: 8_000,
            expectedSettlement: uint64(block.timestamp + 30 days),
            confidence: 9_000,
            evidenceRef: keccak256("evidence"),
            agent: agent,
            approved: true
        });
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(agentKey, _attestationDigest(attestation, r));
        attestation.submit(r, abi.encodePacked(rr, s, v));

        usdc = new MockERC20();
        vault = new ReceivableVault(
            usdc,
            "Kreda Receivable #1",
            "kRCV-1",
            attestation,
            receivableId,
            TARGET,
            1_200,
            uint64(block.timestamp + 30 days),
            200,
            treasury,
            address(settlement)
        );

        address investor = address(0x1111);
        usdc.mint(investor, TARGET);
        vm.startPrank(investor);
        usdc.approve(address(vault), TARGET);
        vault.deposit(TARGET, investor);
        vm.stopPrank();
        vault.fundSeller();

        usdc.mint(owner, 1_000e18);
        usdc.approve(address(settlement), type(uint256).max);
    }

    function _sign(address vaultAddress, uint256 amount, uint256 privateKey) internal view returns (bytes memory) {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(privateKey, _payoutDigest(address(settlement), vaultAddress, amount));
        return abi.encodePacked(rr, s, v);
    }

    function test_confirmPayout_movesFundsIntoVaultAndSettles() public {
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, oracleKey));

        assertEq(usdc.balanceOf(address(vault)), PAYOUT);
        assertTrue(settlement.settled(address(vault)));
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Settled));
    }

    function test_confirmPayout_recordsAgentOutcome() public {
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, oracleKey));

        (,,, uint64 accurate) = registry.agentStats(agent);
        assertEq(accurate, 1);
    }

    function test_confirmPayout_emitsSignerAndAgent() public {
        vm.expectEmit(true, true, true, true);
        emit Settlement.PayoutConfirmed(address(vault), PAYOUT, oracleSigner, agent);
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, oracleKey));
    }

    function test_confirmPayout_revertsIfAlreadySettled() public {
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, oracleKey));

        vm.expectRevert(Settlement.AlreadySettled.selector);
        settlement.confirmPayout(address(vault), 1e18, _sign(address(vault), 1e18, oracleKey));
    }

    function test_confirmPayout_revertsOnReplayedSignature() public {
        bytes memory sig = _sign(address(vault), PAYOUT, oracleKey);
        settlement.confirmPayout(address(vault), PAYOUT, sig);

        // Same signature, replayed verbatim — still blocked by settled[vault].
        vm.expectRevert(Settlement.AlreadySettled.selector);
        settlement.confirmPayout(address(vault), PAYOUT, sig);
    }

    function test_confirmPayout_revertsOnWrongSigner() public {
        (, uint256 wrongKey) = makeAddrAndKey("wrong");
        vm.expectRevert(Settlement.InvalidSignature.selector);
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, wrongKey));
    }

    function test_confirmPayout_revertsIfAmountTamperedAfterSigning() public {
        bytes memory sig = _sign(address(vault), PAYOUT, oracleKey);
        vm.expectRevert(Settlement.InvalidSignature.selector);
        settlement.confirmPayout(address(vault), PAYOUT + 1, sig);
    }

    function test_setOracleSigner_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        settlement.setOracleSigner(address(0xC0FFEE));
    }

    function test_setOracleSigner_rotatesSigner() public {
        (address newSigner, uint256 newKey) = makeAddrAndKey("newOracle");
        settlement.setOracleSigner(newSigner);

        // Old key no longer authorizes.
        vm.expectRevert(Settlement.InvalidSignature.selector);
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, oracleKey));

        // New key does.
        settlement.confirmPayout(address(vault), PAYOUT, _sign(address(vault), PAYOUT, newKey));
        assertTrue(settlement.settled(address(vault)));
    }
}
