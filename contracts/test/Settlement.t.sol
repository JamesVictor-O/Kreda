// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Settlement} from "../src/Settlement.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract SettlementTest is Test {
    MockERC20 usdc;
    ReceivableVault vault;
    Settlement settlement;

    address owner = address(this);

    function setUp() public {
        usdc = new MockERC20();
        vault = new ReceivableVault(usdc, "Receivable #1", "rUSDC-1", owner);
        settlement = new Settlement(owner);

        usdc.mint(owner, 1_000e18);
        usdc.approve(address(settlement), type(uint256).max);
    }

    function test_confirmPayout_movesFundsIntoVault() public {
        settlement.confirmPayout(address(vault), 50e18);
        assertEq(usdc.balanceOf(address(vault)), 50e18);
        assertTrue(settlement.settled(address(vault)));
    }

    function test_confirmPayout_revertsIfAlreadySettled() public {
        settlement.confirmPayout(address(vault), 50e18);
        vm.expectRevert(Settlement.AlreadySettled.selector);
        settlement.confirmPayout(address(vault), 10e18);
    }

    function test_confirmPayout_onlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        settlement.confirmPayout(address(vault), 50e18);
    }
}
