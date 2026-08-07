// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Investor deposits and share accounting for a single funded
/// receivable. Settlement proceeds are deposited back into the vault by the
/// Settlement contract for pro-rata redemption. Share math is OpenZeppelin's,
/// not hand-rolled.
contract ReceivableVault is ERC4626, Ownable {
    address public settlement;

    error OnlySettlement();

    modifier onlySettlement() {
        if (msg.sender != settlement) revert OnlySettlement();
        _;
    }

    constructor(IERC20 asset_, string memory name_, string memory symbol_, address initialOwner)
        ERC20(name_, symbol_)
        ERC4626(asset_)
        Ownable(initialOwner)
    {}

    function setSettlement(address settlementAddress) external onlyOwner {
        settlement = settlementAddress;
    }
}
