"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { parseUnits } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { formatBps, formatCurrency, formatDate, formatNumber } from "@/lib/dashboard/format";
import { estimateInvestorPosition } from "@/lib/dashboard/calc";
import type { VaultOffering } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/ui/icons";
import { erc20Abi, receivableVaultAbi } from "@/lib/contracts/abis";
import { TESTNET_CHAIN_ID, TESTNET_VAULTS } from "@/lib/contracts/addresses";
import { botChainTestnet } from "@/lib/chains";

type Stage = "idle" | "approving" | "approved" | "depositing" | "deposited";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function DepositPanel({ vault }: { vault: VaultOffering }) {
  // Look up by address rather than assuming a single real vault — see
  // TESTNET_VAULTS, which now holds several. A fixture vault's address
  // never matches any real deployment.
  const realVaultConfig = TESTNET_VAULTS.find(
    (v) => v.vault.toLowerCase() === vault.vaultAddress.toLowerCase(),
  );
  const isRealVault = !!realVaultConfig;
  // Real vaults are backed by testnet USDT (see contracts/deployments/
  // testnet-vaults.json); fixture vaults keep the placeholder USDC label
  // they always had.
  const currencyLabel = isRealVault ? "USDT" : "USDC";

  const remaining = Math.max(0, vault.targetAmount - vault.raisedAmount);
  const [amount, setAmount] = useState(remaining);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);

  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TESTNET_CHAIN_ID });

  const position = estimateInvestorPosition(vault.faceValue);
  // First deposit into an empty ERC-4626 vault mints shares 1:1 against
  // principal — no separate share-price model needed for a single-vault
  // funding round.
  const shareOfPrincipal = position.principal > 0 ? amount / position.principal : 0;
  const expectedPayout = shareOfPrincipal * position.payout;
  const disabled = amount <= 0 || amount > remaining;

  async function handleApproveReal() {
    if (!address || !realVaultConfig) return;
    setErrorMessage(null);
    setStage("approving");
    try {
      const amountRaw = parseUnits(amount.toString(), realVaultConfig.assetDecimals);
      const hash = await writeContractAsync({
        address: realVaultConfig.asset as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [realVaultConfig.vault as `0x${string}`, amountRaw],
        chainId: TESTNET_CHAIN_ID,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setStage("approved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Approval failed.");
      setStage("idle");
    }
  }

  async function handleDepositReal() {
    if (!address || !realVaultConfig) return;
    setErrorMessage(null);
    setStage("depositing");
    try {
      const amountRaw = parseUnits(amount.toString(), realVaultConfig.assetDecimals);
      const hash = await writeContractAsync({
        address: realVaultConfig.vault as `0x${string}`,
        abi: receivableVaultAbi,
        functionName: "deposit",
        args: [amountRaw, address],
        chainId: TESTNET_CHAIN_ID,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setDepositTxHash(hash);
      setStage("deposited");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Deposit failed.");
      setStage("idle");
    }
  }

  function handleApprove() {
    if (isRealVault) {
      void handleApproveReal();
      return;
    }
    setStage("approving");
    setTimeout(() => setStage("approved"), 800);
  }

  function handleDeposit() {
    if (isRealVault) {
      void handleDepositReal();
      return;
    }
    setStage("depositing");
    setTimeout(() => setStage("deposited"), 1000);
  }

  if (isRealVault && (!isConnected || chainId !== TESTNET_CHAIN_ID)) {
    return (
      <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Connect a wallet on {botChainTestnet.name} to deposit into this vault.
        </p>
        {isConnected && (
          <Button
            type="button"
            className="mt-4"
            onClick={() => switchChain({ chainId: TESTNET_CHAIN_ID })}
            disabled={switching}
            aria-busy={switching}
          >
            {switching ? "Switching…" : `Switch to ${botChainTestnet.name}`}
          </Button>
        )}
      </div>
    );
  }

  if (stage === "deposited") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <IconCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Deposited</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {formatCurrency(amount)} deposited for receivable #{vault.receivableId}. Redeemable
              for {formatCurrency(expectedPayout)} at settlement.
            </p>
            {depositTxHash && (
              <a
                href={`${botChainTestnet.blockExplorers.default.url}/tx/${depositTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-xs text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
              >
                View transaction
              </a>
            )}
          </div>
        </div>
        <Link
          href="/investor/portfolio"
          className="mt-4 inline-block text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
        >
          View in portfolio
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="deposit-amount" className="text-sm font-medium text-foreground">
          Deposit amount
        </label>
        <button
          type="button"
          onClick={() => setAmount(remaining)}
          disabled={stage !== "idle"}
          className="text-xs font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary disabled:pointer-events-none disabled:opacity-50"
        >
          Max
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
        <span className="font-mono text-sm text-muted-foreground">$</span>
        <input
          id="deposit-amount"
          type="number"
          min={0}
          max={remaining}
          value={amount}
          onChange={(event) =>
            setAmount(Math.min(remaining, Math.max(0, Number(event.target.value))))
          }
          disabled={stage !== "idle"}
          className="w-full bg-transparent font-mono text-lg text-foreground focus-visible:outline-none disabled:opacity-50"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{currencyLabel}</span>
      </div>

      <dl className="mt-4 divide-y divide-border border-t border-border">
        <Row label="Shares received">{formatNumber(amount)}</Row>
        <Row label="Target yield">{formatBps(position.returnBps)}</Row>
        <Row label="Settlement">{formatDate(vault.expectedSettlementAt)}</Row>
        <Row label="Fee">None</Row>
      </dl>

      {errorMessage && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleApprove}
          disabled={stage !== "idle" || disabled}
          aria-busy={stage === "approving"}
        >
          {stage === "approving"
            ? "Approving…"
            : stage === "approved" || stage === "depositing"
              ? "Approved"
              : `Approve ${currencyLabel}`}
        </Button>
        <Button
          type="button"
          onClick={handleDeposit}
          disabled={stage !== "approved" || disabled}
          aria-busy={stage === "depositing"}
        >
          {stage === "depositing" ? "Depositing…" : "Deposit"}
        </Button>
      </div>
    </div>
  );
}
