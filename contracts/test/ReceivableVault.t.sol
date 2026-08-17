// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Attestation} from "../src/Attestation.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Eip712} from "./helpers/Eip712.sol";

contract ReceivableVaultTest is Test, Eip712 {
    AgentRegistry registry;
    Attestation attestation;
    MockERC20 usdc;
    ReceivableVault vault;

    address owner = address(this);
    address agent;
    uint256 agentKey;
    address seller = address(0x5E11E5);
    address treasury = address(0x7Ea5e2);
    address settlementCaller = address(0x5E77E);
    address investor = address(0x1111);

    bytes32 receivableId = keccak256("receivable-1");
    uint256 constant TARGET = 100e18;
    uint16 constant YIELD_BPS = 1_200;
    uint16 constant FEE_BPS = 200; // 2%
    uint64 maturity;

    function setUp() public {
        (agent, agentKey) = makeAddrAndKey("agent");

        registry = new AgentRegistry(owner);
        attestation = new Attestation(address(registry));
        registry.setAttestationContract(address(attestation));
        registry.registerAgent(agent, "Kreda Underwriter v1");

        _submitApprovedAttestation(receivableId);

        maturity = uint64(block.timestamp + 30 days);
        usdc = new MockERC20();
        vault = new ReceivableVault(
            usdc,
            "Kreda Receivable #1",
            "kRCV-1",
            attestation,
            receivableId,
            TARGET,
            YIELD_BPS,
            maturity,
            FEE_BPS,
            treasury,
            settlementCaller
        );

        usdc.mint(investor, 1_000e18);
        vm.prank(investor);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _submitApprovedAttestation(bytes32 id) internal {
        Attestation.Record memory r = Attestation.Record({
            receivableId: id,
            seller: seller,
            faceValue: 125e18,
            grade: 1,
            advanceRate: 8_000,
            expectedSettlement: uint64(block.timestamp + 30 days),
            confidence: 9_000,
            evidenceRef: keccak256(abi.encodePacked("evidence", id)),
            agent: agent,
            approved: true
        });
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(agentKey, _attestationDigest(attestation, r));
        attestation.submit(r, abi.encodePacked(rr, s, v));
    }

    function _declinedAttestation(bytes32 id) internal {
        Attestation.Record memory r = Attestation.Record({
            receivableId: id,
            seller: seller,
            faceValue: 125e18,
            grade: 4,
            advanceRate: 0,
            expectedSettlement: 0,
            confidence: 3_000,
            evidenceRef: keccak256(abi.encodePacked("declined", id)),
            agent: agent,
            approved: false
        });
        (uint8 v, bytes32 rr, bytes32 s) = vm.sign(agentKey, _attestationDigest(attestation, r));
        attestation.submit(r, abi.encodePacked(rr, s, v));
    }

    // ── construction ──────────────────────────────────────────────────

    function test_constructor_revertsForDeclinedAttestation() public {
        bytes32 id = keccak256("declined-1");
        _declinedAttestation(id);

        vm.expectRevert(ReceivableVault.AttestationNotApproved.selector);
        new ReceivableVault(
            usdc, "x", "x", attestation, id, TARGET, YIELD_BPS, maturity, FEE_BPS, treasury, settlementCaller
        );
    }

    function test_constructor_revertsOnPastMaturity() public {
        bytes32 id = keccak256("receivable-past-maturity");
        _submitApprovedAttestation(id);

        vm.expectRevert(ReceivableVault.InvalidMaturity.selector);
        new ReceivableVault(
            usdc,
            "x",
            "x",
            attestation,
            id,
            TARGET,
            YIELD_BPS,
            uint64(block.timestamp),
            FEE_BPS,
            treasury,
            settlementCaller
        );
    }

    function test_constructor_revertsOnZeroTarget() public {
        bytes32 id = keccak256("receivable-zero-target");
        _submitApprovedAttestation(id);

        vm.expectRevert(ReceivableVault.InvalidTargetAmount.selector);
        new ReceivableVault(
            usdc, "x", "x", attestation, id, 0, YIELD_BPS, maturity, FEE_BPS, treasury, settlementCaller
        );
    }

    function test_constructor_revertsOnExcessiveFee() public {
        bytes32 id = keccak256("receivable-bad-fee");
        _submitApprovedAttestation(id);

        vm.expectRevert(ReceivableVault.InvalidFee.selector);
        new ReceivableVault(
            usdc, "x", "x", attestation, id, TARGET, YIELD_BPS, maturity, 10_001, treasury, settlementCaller
        );
    }

    function test_constructor_setsSellerFromAttestation() public view {
        assertEq(vault.seller(), seller);
    }

    // ── deposits ──────────────────────────────────────────────────────

    function test_state_startsOpen() public view {
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Open));
    }

    function test_deposit_mintsShares1to1OnEmptyVault() public {
        vm.prank(investor);
        uint256 shares = vault.deposit(40e18, investor);

        assertEq(shares, 40e18);
        assertEq(vault.balanceOf(investor), 40e18);
        assertEq(usdc.balanceOf(address(vault)), 40e18);
    }

    function test_deposit_revertsPastTarget() public {
        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(TARGET + 1, investor);
    }

    function test_maxDeposit_capsAtRemainingTarget() public {
        vm.prank(investor);
        vault.deposit(60e18, investor);
        assertEq(vault.maxDeposit(investor), 40e18);
    }

    function test_deposit_revertsOnceFunded() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);
        vault.fundSeller();

        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(1, investor);
    }

    // ── funding the seller ───────────────────────────────────────────

    function test_fundSeller_revertsBeforeTargetReached() public {
        vm.prank(investor);
        vault.deposit(TARGET - 1, investor);

        vm.expectRevert(ReceivableVault.TargetNotReached.selector);
        vault.fundSeller();
    }

    function test_fundSeller_paysNetToSellerAndFeeToTreasury() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);

        vault.fundSeller();

        uint256 expectedFee = (TARGET * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(treasury), expectedFee);
        assertEq(usdc.balanceOf(seller), TARGET - expectedFee);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Funded));
        assertTrue(vault.funded());
    }

    function test_fundSeller_revertsIfCalledTwice() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);
        vault.fundSeller();

        vm.expectRevert(ReceivableVault.NotOpen.selector);
        vault.fundSeller();
    }

    function test_fundSeller_callableByAnyone() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);

        vm.prank(address(0xC0FFEE));
        vault.fundSeller();
        assertTrue(vault.funded());
    }

    // ── settlement ────────────────────────────────────────────────────

    function _fundToTarget() internal {
        vm.prank(investor);
        vault.deposit(TARGET, investor);
        vault.fundSeller();
    }

    function test_receivePayout_onlySettlementCaller() public {
        _fundToTarget();
        usdc.mint(address(this), 112e18);
        usdc.approve(address(vault), 112e18);

        vm.expectRevert(ReceivableVault.OnlySettlement.selector);
        vault.receivePayout(112e18);
    }

    function test_receivePayout_marksSettledAndIncreasesShareValue() public {
        _fundToTarget();

        usdc.mint(settlementCaller, 112e18);
        vm.startPrank(settlementCaller);
        usdc.approve(address(vault), 112e18);
        vault.receivePayout(112e18);
        vm.stopPrank();

        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Settled));
        // OZ's ERC4626 rounds down in the vault's favor (inflation-attack protection).
        assertApproxEqAbs(vault.convertToAssets(vault.balanceOf(investor)), 112e18, 1);
    }

    function test_receivePayout_revertsIfAlreadySettled() public {
        _fundToTarget();
        usdc.mint(settlementCaller, 200e18);
        vm.startPrank(settlementCaller);
        usdc.approve(address(vault), 200e18);
        vault.receivePayout(112e18);

        vm.expectRevert(ReceivableVault.AlreadySettled.selector);
        vault.receivePayout(1e18);
        vm.stopPrank();
    }

    // ── redemption gating ────────────────────────────────────────────

    function test_redeem_revertsBeforeSettled() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);

        vm.prank(investor);
        vm.expectRevert();
        vault.redeem(TARGET, investor, investor);
    }

    function test_redeem_revertsWhileFundedButNotSettled() public {
        _fundToTarget();

        vm.prank(investor);
        vm.expectRevert();
        vault.redeem(1, investor, investor);
    }

    function test_redeem_succeedsAfterSettled() public {
        _fundToTarget();
        usdc.mint(settlementCaller, 112e18);
        vm.startPrank(settlementCaller);
        usdc.approve(address(vault), 112e18);
        vault.receivePayout(112e18);
        vm.stopPrank();

        uint256 shares = vault.balanceOf(investor);
        vm.prank(investor);
        uint256 assetsOut = vault.redeem(shares, investor, investor);

        assertApproxEqAbs(assetsOut, 112e18, 1);
        assertEq(vault.balanceOf(investor), 0);
    }

    // ── default ───────────────────────────────────────────────────────

    function test_state_defaultsAfterMaturityWithoutPayout() public {
        vm.prank(investor);
        vault.deposit(TARGET, investor);
        vault.fundSeller();

        vm.warp(maturity + 1);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Defaulted));
    }

    function test_state_defaultsEvenIfNeverFunded() public {
        vm.warp(maturity + 1);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Defaulted));
    }

    function test_deposit_revertsAfterDefault() public {
        vm.warp(maturity + 1);
        vm.prank(investor);
        vm.expectRevert();
        vault.deposit(1e18, investor);
    }

    function test_state_settledBeatsExpiredMaturity() public {
        _fundToTarget();
        usdc.mint(settlementCaller, 112e18);
        vm.startPrank(settlementCaller);
        usdc.approve(address(vault), 112e18);
        vault.receivePayout(112e18);
        vm.stopPrank();

        vm.warp(maturity + 1);
        assertEq(uint8(vault.state()), uint8(ReceivableVault.State.Settled));
    }

    // ── fuzz: deposit/redeem round trip ─────────────────────────────

    function testFuzz_depositRedeemRoundTrip(uint256 depositAmount, uint256 payoutAmount) public {
        depositAmount = bound(depositAmount, 1, TARGET);
        payoutAmount = bound(payoutAmount, 0, 1_000_000e18);

        usdc.mint(investor, depositAmount);
        vm.prank(investor);
        uint256 shares = vault.deposit(depositAmount, investor);

        if (depositAmount == TARGET) {
            vault.fundSeller();

            usdc.mint(settlementCaller, payoutAmount);
            vm.startPrank(settlementCaller);
            usdc.approve(address(vault), payoutAmount);
            vault.receivePayout(payoutAmount);
            vm.stopPrank();

            vm.prank(investor);
            uint256 assetsOut = vault.redeem(shares, investor, investor);

            // Full redemption of the sole depositor's shares must match
            // OZ's own virtual-offset formula exactly — this is what a
            // rounding fuzz test is actually verifying: that overriding
            // max*/withdraw/redeem didn't change the underlying math, and
            // that rounding always favors the vault, never the redeemer,
            // no matter how extreme the payout-to-principal ratio is.
            uint256 expectedAssets = Math.mulDiv(shares, payoutAmount + 1, TARGET + 1, Math.Rounding.Floor);
            assertEq(assetsOut, expectedAssets);
            assertLe(assetsOut, payoutAmount);
        } else {
            assertEq(vault.maxRedeem(investor), 0);
        }
    }
}
