/**
 * Formats a number as currency (USD)
 */
export function formatDollar(n: number | undefined | null): string {
  if (n == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Formats a number as a percentage
 */
export function formatPercent(n: number | undefined | null): string {
  if (n == null) return "N/A";
  return `${n.toFixed(2)}%`;
}

/**
 * Formats a ratio with 2 decimal places
 */
export function formatRatio(n: number | undefined | null): string {
  if (n == null) return "N/A";
  return n.toFixed(2);
}

/**
 * Formats a price with appropriate decimal places
 */
export function formatPrice(n: number | undefined | null): string {
  if (n == null) return "N/A";
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(2);
  return n.toFixed(2);
}

/**
 * Formats large numbers in compact form (K, M, B, T)
 */
export function formatCompact(n: number | undefined | null): string {
  if (n == null) return "N/A";

  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;

  return n.toFixed(0);
}

/**
 * Formats a number with commas for thousands
 */
export function formatNumber(n: number | undefined | null): string {
  if (n == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(n);
}
