// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReceivableVault} from "./ReceivableVault.sol";

/// @notice Confirms a receivable payout and moves proceeds into its vault
/// for pro-rata redemption by investors.
///
/// KNOWN WEAK POINT: payout confirmation currently comes from a signed
/// attestation read from the connected store, not a decentralized oracle.
/// This is a named trust assumption, not a Chainlink-style oracle — see
/// README.
contract Settlement is Ownable {
    using SafeERC20 for IERC20;

    mapping(address => bool) public settled;

    event PayoutSettled(address indexed vault, uint256 amount);

    error AlreadySettled();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @param vault The ReceivableVault to settle.
    /// @param amount The confirmed payout amount, denominated in the vault's asset.
    function confirmPayout(address vault, uint256 amount) external onlyOwner {
        if (settled[vault]) revert AlreadySettled();
        settled[vault] = true;

        IERC20 asset = IERC20(ReceivableVault(vault).asset());
        asset.safeTransferFrom(msg.sender, vault, amount);

        emit PayoutSettled(vault, amount);
    }
}
