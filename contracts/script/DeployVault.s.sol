// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Attestation} from "../src/Attestation.sol";
import {ReceivableVault} from "../src/ReceivableVault.sol";

/// @notice Deploys one ReceivableVault for one already-attested receivable.
/// Run after Deploy.s.sol and after the agent has submitted an approved
/// Attestation for ATTESTATION_ID — the constructor reverts otherwise.
///
/// Required env vars: ASSET_ADDRESS, ATTESTATION_ADDRESS, SETTLEMENT_ADDRESS,
/// TREASURY_ADDRESS, ATTESTATION_ID, TARGET_AMOUNT, YIELD_BPS,
/// MATURITY_TIMESTAMP, FEE_BPS, VAULT_NAME, VAULT_SYMBOL.
contract DeployVault is Script {
    function run() external {
        Attestation attestation = Attestation(vm.envAddress("ATTESTATION_ADDRESS"));
        address settlement = vm.envAddress("SETTLEMENT_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        bytes32 attestationId = vm.envBytes32("ATTESTATION_ID");

        vm.startBroadcast();
        ReceivableVault vault = _deployVault(attestation, attestationId, settlement, treasury);
        vm.stopBroadcast();

        require(vault.attestationId() == attestationId, "wiring: attestationId");
        require(vault.settlement() == settlement, "wiring: settlement");
        require(vault.treasury() == treasury, "wiring: treasury");
        require(vault.seller() == attestation.get(attestationId).seller, "wiring: seller");

        console.log("ReceivableVault:", address(vault));
        console.log("  seller:      ", vault.seller());
        console.log("  targetAmount:", vault.targetAmount());
        console.log("  maturity:    ", vault.maturity());
    }

    /// @dev Split out purely to keep run()'s local variable count under the
    /// legacy codegen's stack limit — see the constructor's own NatSpec for
    /// what each of these means.
    function _deployVault(Attestation attestation, bytes32 attestationId, address settlement, address treasury)
        internal
        returns (ReceivableVault)
    {
        return new ReceivableVault(
            IERC20(vm.envAddress("ASSET_ADDRESS")),
            vm.envString("VAULT_NAME"),
            vm.envString("VAULT_SYMBOL"),
            attestation,
            attestationId,
            vm.envUint("TARGET_AMOUNT"),
            uint16(vm.envUint("YIELD_BPS")),
            uint64(vm.envUint("MATURITY_TIMESTAMP")),
            uint16(vm.envUint("FEE_BPS")),
            treasury,
            settlement
        );
    }
}
