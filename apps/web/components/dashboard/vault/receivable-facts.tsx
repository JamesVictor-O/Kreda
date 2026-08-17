import { formatBps, formatCurrency, formatDate, daysUntil } from "@/lib/dashboard/format";
import { estimateInvestorPosition } from "@/lib/dashboard/calc";
import type { Decision } from "@/lib/dashboard/types";
import { VaultFillMeter } from "@/components/dashboard/vault/fill-meter";

export interface ReceivableFactsData {
  faceValue: number;
  targetAmount: number;
  raisedAmount: number;
  expectedSettlementAt: string;
  decision: Decision;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/** The receivable's core numbers — shared by the vault-detail and
 *  position-detail screens so the two never drift apart. */
export function ReceivableFacts({ vault }: { vault: ReceivableFactsData }) {
  const position = estimateInvestorPosition(vault.faceValue);
  const remaining = daysUntil(vault.expectedSettlementAt);

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <Fact label="Face value" value={formatCurrency(vault.faceValue)} />
        <Fact label="Advance" value={formatCurrency(vault.targetAmount)} />
        <Fact label="Target yield" value={formatBps(position.returnBps)} />
        <Fact
          label="Settlement"
          value={`${formatDate(vault.expectedSettlementAt)} · ${remaining > 0 ? `${remaining}d` : "settling"}`}
        />
      </div>
      <div className="mt-6">
        <VaultFillMeter raisedAmount={vault.raisedAmount} targetAmount={vault.targetAmount} />
      </div>
    </div>
  );
}
