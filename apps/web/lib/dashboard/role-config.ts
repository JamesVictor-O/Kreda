import { INVESTOR, SELLER, STORE } from "./fixtures";
import { INVESTOR_NAV_ITEMS, SELLER_NAV_ITEMS, type NavItem } from "./nav";
import type { PersonAccount } from "./types";

export type DashboardRole = "seller" | "investor";

interface RoleConfig {
  navItems: NavItem[];
  brandLabel: string;
  identity: PersonAccount;
}

export const ROLE_CONFIG: Record<DashboardRole, RoleConfig> = {
  seller: { navItems: SELLER_NAV_ITEMS, brandLabel: STORE.storeName, identity: SELLER },
  investor: { navItems: INVESTOR_NAV_ITEMS, brandLabel: "Kreda", identity: INVESTOR },
};
