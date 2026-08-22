import type {
  Advance,
  CashPositionMonth,
  DeclinedApplication,
  Decision,
  OverviewStats,
  PersonAccount,
  ShopifyOrder,
  StoreConnection,
  VaultOffering,
} from "./types";
import { estimateInvestorPosition } from "./calc";

export const SELLER: PersonAccount = {
  name: "Ada Chen",
  email: "ada@adacommerce.co",
  walletAddress: "0xd7555dcdf6f25d096da2d5b88edf2a89c9911c43",
};

export const INVESTOR: PersonAccount = {
  name: "Marcus Webb",
  email: "marcus@northlight.capital",
  walletAddress: "0x9e2c4a7f1d3b6805c2e9f4a7c1e5b3d8f0a4c2e7",
};

export const STORE: StoreConnection = {
  platform: "shopify",
  storeName: "Ada Commerce Store",
  domain: "ada-commerce.myshopify.com",
  connected: true,
  connectedAt: "2026-04-02",
  lastSyncedAt: "2026-08-16T09:12:00",
  scopes: ["read_orders", "read_fulfillments"],
};

export const OVERVIEW_STATS: OverviewStats = {
  availableToAdvance: 40_000,
  activeAdvancesTotal: 39_200,
  nextSettlementInDays: 12,
  advancesCompleted: 3,
};

export const CASH_POSITION: CashPositionMonth[] = [
  { month: "Jan", amountReceived: 18_000, isCurrent: false },
  { month: "Feb", amountReceived: 22_000, isCurrent: false },
  { month: "Mar", amountReceived: 15_000, isCurrent: false },
  { month: "Apr", amountReceived: 28_000, isCurrent: false },
  { month: "May", amountReceived: 24_000, isCurrent: false },
  { month: "Jun", amountReceived: 39_200, isCurrent: true },
];

const APPROVED_DECISION: Decision = {
  receivableId: "2847",
  outcome: "approved",
  confidenceBps: 10_000,
  advanceRateBps: 8_000,
  checks: [
    { name: "Order history", passed: true, detail: "312 orders in the last 90 days" },
    { name: "Fulfilment rate", passed: true, detail: "306/312 orders fulfilled (98%)" },
  ],
  evidenceHash: "0x272a7d339bf4900681ea6f1d2687899d02fad9bb5081cd90d1691785a2369dc5",
  attestationTx: "0x6dc5da0aeea240af50b527accddae9bd9ec17e8ebbbc58f4f2aa82d8aa1dff14",
  decisionBlobHash: "0x272a7d339bf4900681ea6f1d2687899d02fad9bb5081cd90d1691785a2369dc5",
};

export const DECLINED_DECISION: Decision = {
  receivableId: "2903",
  outcome: "declined",
  confidenceBps: 5_000,
  advanceRateBps: null,
  checks: [
    { name: "Order history", passed: true, detail: "289 orders in the last 90 days" },
    {
      name: "Fulfilment rate",
      passed: false,
      detail: "201/289 orders fulfilled (70%, below 80% bar)",
    },
  ],
  evidenceHash: "0xb77b56b41813a47bf6e669167b42eedc125d760f387ee37df1f65d1b0af6c4c2",
  attestationTx: null,
  decisionBlobHash: "0xd4e1ee363333b1e8c71381d1522ec3401d23a30e4a559f37d6e258074ce17770",
  declineReason: "Fulfilment rate fell below the 80% threshold required to underwrite.",
};

export const ACTIVE_ADVANCES: Advance[] = [
  {
    id: "adv_2847",
    receivableId: "2847",
    storeName: STORE.storeName,
    faceValue: 50_000,
    advanceRateBps: 8_000,
    feeBps: 200,
    amountReceived: 39_200,
    status: "active",
    createdAt: "2026-07-26",
    expectedSettlementAt: "2026-08-20",
    vaultAddress: "0x2b5d8f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e69b2",
    decision: APPROVED_DECISION,
  },
];

export const SETTLED_ADVANCES: Advance[] = [
  {
    id: "adv_2791",
    receivableId: "2791",
    storeName: STORE.storeName,
    faceValue: 32_000,
    advanceRateBps: 8_000,
    feeBps: 200,
    amountReceived: 25_088,
    status: "settled",
    createdAt: "2026-06-02",
    expectedSettlementAt: "2026-07-16",
    settledAt: "2026-07-15",
    vaultAddress: "0x4f1b3a7c9e2d5860a1c4f7e9b2d6a8c3e5f7091b",
    settlementTxHash: "0x9a1c4e7b2d5f8093a6c1e4b7d9f2a5c8e0b3d6f9a2c5e8b1d4f7a0c3e6b9d2f5",
    decision: {
      ...APPROVED_DECISION,
      receivableId: "2791",
      checks: [
        { name: "Order history", passed: true, detail: "204 orders in the last 90 days" },
        { name: "Fulfilment rate", passed: true, detail: "197/204 orders fulfilled (97%)" },
      ],
    },
  },
  {
    id: "adv_2810",
    receivableId: "2810",
    storeName: STORE.storeName,
    faceValue: 18_500,
    advanceRateBps: 8_000,
    feeBps: 200,
    amountReceived: 14_504,
    status: "settled",
    createdAt: "2026-06-20",
    expectedSettlementAt: "2026-07-30",
    settledAt: "2026-07-29",
    vaultAddress: "0x7c2e5a8b1d4f6093c6a9e2b5d8f1a4c7e0b3d6f8",
    settlementTxHash: "0x3e6b9d2f5a8c1e4b7d0f3a6c9e2b5d8f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e69",
    decision: {
      ...APPROVED_DECISION,
      receivableId: "2810",
      checks: [
        { name: "Order history", passed: true, detail: "158 orders in the last 90 days" },
        { name: "Fulfilment rate", passed: true, detail: "151/158 orders fulfilled (96%)" },
      ],
    },
  },
  {
    id: "adv_2755",
    receivableId: "2755",
    storeName: STORE.storeName,
    faceValue: 21_000,
    advanceRateBps: 8_000,
    feeBps: 200,
    amountReceived: 16_464,
    status: "settled",
    createdAt: "2026-05-10",
    expectedSettlementAt: "2026-06-18",
    settledAt: "2026-06-17",
    vaultAddress: "0x1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e69b2d5f8a1",
    settlementTxHash: "0xc5e8b1d4f7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e",
    decision: {
      ...APPROVED_DECISION,
      receivableId: "2755",
      checks: [
        { name: "Order history", passed: true, detail: "176 orders in the last 90 days" },
        { name: "Fulfilment rate", passed: true, detail: "168/176 orders fulfilled (95%)" },
      ],
    },
  },
];

export const ALL_ADVANCES: Advance[] = [...ACTIVE_ADVANCES, ...SETTLED_ADVANCES];

export function getAdvanceById(id: string): Advance | undefined {
  return ALL_ADVANCES.find((advance) => advance.id === id);
}

const CUSTOMER_NAMES = [
  "M. Alvarez",
  "J. Okafor",
  "S. Patel",
  "L. Kowalski",
  "R. Tanaka",
  "E. Muller",
  "T. Nguyen",
  "C. Dubois",
  "A. Silva",
  "K. Andersen",
];

function buildOrders(): ShopifyOrder[] {
  const orders: ShopifyOrder[] = [];
  const baseDate = new Date("2026-07-01");

  for (let i = 0; i < 24; i++) {
    const amount = 180 + ((i * 137) % 640);
    const fulfilled = i % 11 !== 0;
    const placedAt = new Date(baseDate);
    placedAt.setDate(baseDate.getDate() + i);

    orders.push({
      id: `order_${4200 + i}`,
      orderNumber: `#${4200 + i}`,
      placedAt: placedAt.toISOString().slice(0, 10),
      customerName: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length]!,
      amount,
      fulfilled,
      deliveryScan: fulfilled,
    });
  }

  return orders;
}

export const CONFIRMED_ORDERS: ShopifyOrder[] = buildOrders();

const VAULT_A_DECISION: Decision = {
  receivableId: "2918",
  outcome: "approved",
  confidenceBps: 9_400,
  advanceRateBps: 8_000,
  checks: [
    { name: "Order history", passed: true, detail: "231 orders in the last 90 days" },
    { name: "Fulfilment rate", passed: true, detail: "224/231 orders fulfilled (97%)" },
  ],
  evidenceHash: "0xe1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7",
  attestationTx: "0xa4c7e0b3d6f9a2c5e8b1d4f7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c",
  decisionBlobHash: "0xe1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7",
};

const VAULT_B_DECISION: Decision = {
  receivableId: "2944",
  outcome: "approved",
  confidenceBps: 7_800,
  advanceRateBps: 8_000,
  checks: [
    { name: "Order history", passed: true, detail: "94 orders in the last 90 days" },
    { name: "Fulfilment rate", passed: true, detail: "88/94 orders fulfilled (94%)" },
  ],
  evidenceHash: "0xb3d6f9a2c5e8b1d4f7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d",
  attestationTx: "0x5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e69b2d5f8a1",
  decisionBlobHash: "0xb3d6f9a2c5e8b1d4f7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6d",
};

/** Receivables currently open for investor funding — underwritten and
 *  attested, still short of their raise target. Deliberately just two:
 *  early on there will genuinely only be one or two open at a time. */
export const OPEN_VAULTS: VaultOffering[] = [
  {
    receivableId: VAULT_A_DECISION.receivableId,
    storeName: STORE.storeName,
    vaultAddress: "0xf0a4c2e79e2c4a7f1d3b6805c2e9f4a7c1e5b3d8",
    faceValue: 28_000,
    targetAmount: estimateInvestorPosition(28_000).principal,
    raisedAmount: Math.round(estimateInvestorPosition(28_000).principal * 0.75),
    expectedSettlementAt: "2026-09-14",
    decision: VAULT_A_DECISION,
  },
  {
    receivableId: VAULT_B_DECISION.receivableId,
    storeName: "Fernway Supply Co.",
    vaultAddress: "0xa2c5e8b1d4f7a0c3e69b2d5f8a1c4e7b0d3f6a9c",
    faceValue: 41_000,
    targetAmount: estimateInvestorPosition(41_000).principal,
    raisedAmount: 0,
    expectedSettlementAt: "2026-10-02",
    decision: VAULT_B_DECISION,
  },
];

export function getVaultById(receivableId: string): VaultOffering | undefined {
  return OPEN_VAULTS.find((vault) => vault.receivableId === receivableId);
}

/** Declines never become vaults, so they don't appear in OPEN_VAULTS — but
 *  the record is published, not discarded. See CLAUDE.md: the decline path
 *  is a first-class output. */
export const DECLINED_APPLICATIONS: DeclinedApplication[] = [
  {
    storeName: STORE.storeName,
    declinedAt: "2026-07-19",
    decision: DECLINED_DECISION,
  },
];
