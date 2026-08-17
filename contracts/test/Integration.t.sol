// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";
import {Settlement} from "../src/Settlement.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Eip712} from "./helpers/Eip712.sol";

/// @notice End-to-end coverage across all four contracts, matching the
/// actual product loop: an agent underwrites a receivable, investors fund
/// it, the seller gets paid, the marketplace pays out, and investors
/// redeem. Balances are asserted at every step, not just the end state.
contract IntegrationTest is Test, Eip712 {
    AgentRegistry registry;
    Attestation attestation;
    Settlement settlement;
    MockERC20 usdc;

    address owner = address(this);
    address agent;
    uint256 agentKey;
    address oracleSigner;
    uint256 oracleKey;
    address seller = address(0x5E11E5);
    address treasury = address(0x7Ea5e2);
    address investorA = address(0xA1);
    address investorB = address(0xB2);

    function setUp() public {
        (agent, agentKey) = makeAddrAndKey("agent");
        (oracleSigner, oracleKey) = makeAddrAndKey("oracle");

        usdc = new MockERC20();
        registry = new AgentRegistry(owner);
        attestation = new Attestation(address(registry));
        settlement = new Settlement(owner, address(registry), address(attestation), oracleSigner);

        registry.setAttestationContract(address(attestation));
        registry.setSettlementContract(address(settlement));
        registry.registerAgent(agent, "Kreda Underwriter v1");
    }

    function _sign(Attestation.Record memory r, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(key, _attestationDigest(attestation, r));
        return abi.encodePacked(rr, s, v);
    }

    function _signPayout(address vault, uint256 amount, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(key, _payoutDigest(address(settlement), vault, amount));
        return abi.encodePacked(rr, s, v);
    }

    /// Face value $10,000, 80% advance, 2% fee, ~13% APR over 30 days —
    /// the exact worked example from the PRD's unit economics section.
    function test_happyPath_attestationToRedemption() public {
        bytes32 receivableId = keccak256("receivable-happy-path");
        uint256 faceValue = 10_000e18;
        uint256 targetAmount = 8_000e18; // 80% advance rate
        uint16 feeBps = 200; // 2%
        uint256 payoutAmount = 10_085e18; // face value + ~$85 investor yield
        uint64 maturity = uint64(block.timestamp + 30 days);

        // ── 1. Agent underwrites and attests on-chain ──────────────────
        Attestation.Record memory record = Attestation.Record({
            receivableId: receivableId,
            seller: seller,
            faceValue: faceValue,
            grade: 1, // B+
            advanceRate: 8_000,
            expectedSettlement: uint64(block.timestamp + 30 days),
            confidence: 9_000,
            evidenceRef: keccak256("evidence-blob"),
            agent: agent,
            approved: true
        });
        bytes32 attestationId = attestation.submit(record, _sign(record, agentKey));
        assertEq(attestationId, receivableId);

        (uint64 decisions, uint64 approvals, uint64 declines,) = registry.agentStats(agent);
        assertEq(decisions, 1);
        assertEq(approvals, 1);
        assertEq(declines, 0);

        // ── 2. Vault opens for the approved receivable ─────────────────
        ReceivableVault vault = new ReceivableVault(
            usdc,
            "Kreda Receivable #happy-path",
            "kRCV-HP",
            attestation,
            attestationId,
            targetAmount,
            1_300, // 13% target yield, informational
            maturity,
            feeBps,
            treasury,
            address(settlement)
        );
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Open));
        assertEq(vault.seller(), seller);

        // ── 3. Two investors fund it ────────────────────────────────────
        usdc.mint(investorA, 5_000e18);
        usdc.mint(investorB, 5_000e18);
        vm.prank(investorA);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(investorB);
        usdc.approve(address(vault), type(uint256).max);

        vm.prank(investorA);
        uint256 sharesA = vault.deposit(5_000e18, investorA);
        assertEq(sharesA, 5_000e18);
        assertEq(vault.maxDeposit(investorB), 3_000e18);

        vm.prank(investorB);
        uint256 sharesB = vault.deposit(3_000e18, investorB);
        assertEq(sharesB, 3_000e18);
        assertEq(usdc.balanceOf(investorB), 2_000e18); // deposited 3,000 of their 5,000

        assertEq(usdc.balanceOf(address(vault)), targetAmount);
        assertEq(vault.totalSupply(), targetAmount);

        // ── 4. Target reached — seller gets funded ─────────────────────
        uint256 sellerBalanceBefore = usdc.balanceOf(seller);
        vault.fundSeller();

        uint256 expectedFee = (targetAmount * feeBps) / 10_000;
        assertEq(usdc.balanceOf(treasury), expectedFee);
        assertEq(usdc.balanceOf(seller), sellerBalanceBefore + targetAmount - expectedFee);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Funded));

        // Deposits are closed now — even under target, since target is 0 remaining.
        vm.prank(investorA);
        vm.expectRevert();
        vault.deposit(1, investorA);

        // Redemptions aren't open yet either.
        vm.prank(investorA);
        vm.expectRevert();
        vault.redeem(sharesA, investorA, investorA);

        // ── 5. Marketplace pays out; oracle confirms settlement ─────────
        usdc.mint(owner, payoutAmount);
        usdc.approve(address(settlement), payoutAmount);
        settlement.confirmPayout(address(vault), payoutAmount, _signPayout(address(vault), payoutAmount, oracleKey));

        assertEq(usdc.balanceOf(address(vault)), payoutAmount);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Settled));

        (,,, uint64 accurate) = registry.agentStats(agent);
        assertEq(accurate, 1);

        // ── 6. Investors redeem pro-rata ────────────────────────────────
        vm.prank(investorA);
        uint256 assetsA = vault.redeem(sharesA, investorA, investorA);
        vm.prank(investorB);
        uint256 assetsB = vault.redeem(sharesB, investorB, investorB);

        // 5,000/8,000 and 3,000/8,000 pro-rata shares of the payout.
        assertApproxEqAbs(assetsA, (payoutAmount * 5_000e18) / targetAmount, 1);
        assertApproxEqAbs(assetsB, (payoutAmount * 3_000e18) / targetAmount, 1);
        assertLe(assetsA + assetsB, payoutAmount);
        assertEq(usdc.balanceOf(address(vault)), payoutAmount - assetsA - assetsB);
        assertEq(vault.balanceOf(investorA), 0);
        assertEq(vault.balanceOf(investorB), 0);
    }

    /// A decline never becomes a vault — the record is published, not
    /// discarded. See CLAUDE.md: the decline path is a first-class output.
    function test_declinedAttestation_writesRecordButNoVaultIsImplied() public {
        bytes32 receivableId = keccak256("receivable-declined");
        Attestation.Record memory record = Attestation.Record({
            receivableId: receivableId,
            seller: seller,
            faceValue: 4_200e18,
            grade: 4,
            advanceRate: 0,
            expectedSettlement: 0,
            confidence: 3_500,
            evidenceRef: keccak256("evidence-declined"),
            agent: agent,
            approved: false
        });

        bytes32 attestationId = attestation.submit(record, _sign(record, agentKey));

        Attestation.Record memory stored = attestation.get(attestationId);
        assertFalse(stored.approved);
        assertEq(stored.advanceRate, 0);
        assertEq(stored.evidenceRef, keccak256("evidence-declined"));

        (uint64 decisions, uint64 approvals, uint64 declines,) = registry.agentStats(agent);
        assertEq(decisions, 1);
        assertEq(approvals, 0);
        assertEq(declines, 1);

        // Attempting to open a vault against a declined attestation reverts
        // — there is no on-chain way to fund a decline.
        vm.expectRevert(ReceivableVault.AttestationNotApproved.selector);
        new ReceivableVault(
            usdc,
            "x",
            "x",
            attestation,
            attestationId,
            1_000e18,
            1_000,
            uint64(block.timestamp + 30 days),
            200,
            treasury,
            address(settlement)
        );
    }
}
