import type { ComponentType, SVGProps } from "react";
import {
  IconActivity,
  IconAdvance,
  IconHome,
  IconReceipt,
  IconSettings,
  IconSettlement,
  IconStore,
  IconVault,
} from "@/components/ui/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  enabled: boolean;
}

export const SELLER_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/seller", icon: IconHome, enabled: true },
  { label: "Receivables", href: "/seller/receivables", icon: IconReceipt, enabled: true },
  { label: "Advances", href: "/seller/advances", icon: IconAdvance, enabled: true },
  { label: "Settlement", href: "/seller/settlement", icon: IconSettlement, enabled: true },
  { label: "Store", href: "/seller/store", icon: IconStore, enabled: true },
  { label: "Settings", href: "/seller/settings", icon: IconSettings, enabled: false },
];

export const INVESTOR_NAV_ITEMS: NavItem[] = [
  { label: "Vaults", href: "/investor", icon: IconVault, enabled: true },
  { label: "Portfolio", href: "/investor/portfolio", icon: IconReceipt, enabled: true },
  { label: "Activity", href: "/investor/activity", icon: IconActivity, enabled: true },
  { label: "Settings", href: "/investor/settings", icon: IconSettings, enabled: false },
];
