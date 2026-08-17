import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WalletGate } from "@/components/wallet/wallet-gate";

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletGate description="Kreda needs a connected wallet to fund receivables and sign deposits on BOT Chain. Your wallet never needs a gas token balance.">
      <DashboardShell role="investor">{children}</DashboardShell>
    </WalletGate>
  );
}
