// Shared formatting utilities. Import from here rather than duplicating in components.

/** Format a number as USD with no decimal places. "$1,200" */
export function formatCurrency(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

/** Format a nullable number as a decimal string, or "—" when null. */
export function formatCurrencyNullable(n: number | null, decimals = 2): string {
  if (n === null) return "—";
  return n.toFixed(decimals);
}

/** Format a number as a percentage string. "6.0%" */
export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/** Format an ISO date string as "Jan 5, 2025". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Abbreviated axis label for chart Y-axes. "$1.2M", "$500k", "$250" */
export function formatAxisValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

/** Parse a string input to a non-negative number; returns 0 for invalid/negative. */
export function clampInput(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

/** Round a number to the nearest multiple of 25. */
export function roundToNearest25(n: number): number {
  return Math.round(n / 25) * 25;
}
