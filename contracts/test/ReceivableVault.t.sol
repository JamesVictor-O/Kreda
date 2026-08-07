// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ReceivableVaultTest is Test {
    MockERC20 usdc;
    ReceivableVault vault;

    address owner = address(this);
    address investor = address(0x1111);

    function setUp() public {
        usdc = new MockERC20();
        vault = new ReceivableVault(usdc, "Receivable #1", "rUSDC-1", owner);

        usdc.mint(investor, 1_000e18);
        vm.prank(investor);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_deposit_mintsShares1to1OnEmptyVault() public {
        vm.prank(investor);
        uint256 shares = vault.deposit(100e18, investor);

        assertEq(shares, 100e18);
        assertEq(vault.balanceOf(investor), 100e18);
        assertEq(usdc.balanceOf(address(vault)), 100e18);
    }

    function test_setSettlement_onlyOwner() public {
        vm.prank(investor);
        vm.expectRevert();
        vault.setSettlement(address(0xBEEF));
    }

    function test_settlementIncreasesShareValue() public {
        vm.prank(investor);
        vault.deposit(100e18, investor);

        // Simulate settlement proceeds landing in the vault (principal + yield).
        usdc.mint(address(vault), 20e18);

        // OZ's ERC4626 rounds down in the vault's favor (inflation-attack protection).
        assertApproxEqAbs(vault.convertToAssets(vault.balanceOf(investor)), 120e18, 1);
    }
}
