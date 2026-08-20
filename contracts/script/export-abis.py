#!/usr/bin/env python3
"""Exports ABIs from forge build artifacts (contracts/out/) into
apps/web/lib/contracts/abis/*.ts as `as const` arrays, for wagmi/viem's
type inference. Mechanical extraction only — never hand-edit the ABI
arrays this writes. Run after `forge build` whenever a contract's
interface changes:

    cd contracts && forge build && python3 script/export-abis.py
"""

from __future__ import annotations

import json
from pathlib import Path

CONTRACTS_DIR = Path(__file__).parent.parent
OUT_DIR = CONTRACTS_DIR / "out"
DEST_DIR = CONTRACTS_DIR.parent / "apps" / "web" / "lib" / "contracts" / "abis"

# (contract name, source file, exported const name)
TARGETS = [
    ("AgentRegistry", "AgentRegistry.sol", "agentRegistryAbi"),
    ("Attestation", "Attestation.sol", "attestationAbi"),
    ("Settlement", "Settlement.sol", "settlementAbi"),
    ("ReceivableVault", "ReceivableVault.sol", "receivableVaultAbi"),
    ("IERC20", "IERC20.sol", "erc20Abi"),
]


def main() -> None:
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    index_lines = []

    for contract_name, source_file, const_name in TARGETS:
        artifact_path = OUT_DIR / source_file / f"{contract_name}.json"
        artifact = json.loads(artifact_path.read_text())
        abi = artifact["abi"]

        ts_path = DEST_DIR / f"{contract_name}.ts"
        ts_path.write_text(
            "// GENERATED — do not hand-edit. Source of truth is the Solidity\n"
            f"// contract; regenerate with contracts/script/export-abis.py after\n"
            f"// `forge build` whenever {contract_name}.sol's interface changes.\n\n"
            f"export const {const_name} = {json.dumps(abi, indent=2)} as const;\n"
        )
        index_lines.append(f'export {{ {const_name} }} from "./{contract_name}";')
        print(f"wrote {ts_path.relative_to(CONTRACTS_DIR.parent)}")

    index_path = DEST_DIR / "index.ts"
    index_path.write_text(
        "// GENERATED — do not hand-edit. See export-abis.py.\n\n" + "\n".join(index_lines) + "\n"
    )
    print(f"wrote {index_path.relative_to(CONTRACTS_DIR.parent)}")


if __name__ == "__main__":
    main()
