import { INVESTOR, SELLER } from "./fixtures";
import { INVESTOR_NAV_ITEMS, SELLER_NAV_ITEMS, type NavItem } from "./nav";
import type { PersonAccount } from "./types";
import { storeDisplayName } from "../agent-api-map";

// Same connected store as the rest of the seller flow — see
// /seller/receivables for why.
const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

export type DashboardRole = "seller" | "investor";

interface RoleConfig {
  navItems: NavItem[];
  brandLabel: string;
  identity: PersonAccount;
}

export const ROLE_CONFIG: Record<DashboardRole, RoleConfig> = {
  seller: { navItems: SELLER_NAV_ITEMS, brandLabel: storeDisplayName(CONNECTED_STORE_ID), identity: SELLER },
  investor: { navItems: INVESTOR_NAV_ITEMS, brandLabel: "Kreda", identity: INVESTOR },
};
