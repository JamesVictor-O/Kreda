const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** For tight spaces (chart bar labels) where "$39,200" would overflow its
 *  column — "$39.2K" instead. */
export function formatCurrencyCompact(amount: number): string {
  return compactCurrencyFormatter.format(amount);
}

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** For unitless figures like vault shares — formatCurrency without the $. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(0)}%`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function truncateHash(hash: string, prefix = 10, suffix = 7): string {
  return `${hash.slice(0, prefix)}…${hash.slice(-suffix)}`;
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Fixed reference "today" so mock advance timelines stay internally
 *  consistent instead of drifting relative to the real clock. */
export const MOCK_NOW = new Date("2026-08-08T00:00:00");

export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const diffMs = target.getTime() - MOCK_NOW.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
