import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WalletGate } from "@/components/wallet/wallet-gate";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletGate>
      <DashboardShell role="seller">{children}</DashboardShell>
    </WalletGate>
  );
}
