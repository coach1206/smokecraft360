/**
 * Profit Engine — pure functions, no I/O.
 *
 * `cost_cents` lives on `products` and `menu_items`. When a row has no
 * cost recorded we return null instead of guessing — operators can
 * decide whether to surface the row as "cost not set" or hide it.
 *
 * All values are in cents; conversion to dollars happens at the UI layer.
 */

export interface ProfitItem {
  priceCents: number;
  costCents?: number | null;
}

export interface ProfitResult {
  priceCents:    number;
  costCents:     number;
  profitCents:   number;
  /** Margin as a 0..1 fraction. 0.42 → 42% margin. */
  marginRatio:   number;
}

/**
 * Compute profit + margin for a single item. Returns null when the
 * item has no cost recorded so callers can branch instead of getting
 * a misleading 100%-margin number.
 */
export function calculateProfit(item: ProfitItem): ProfitResult | null {
  if (item.costCents == null || item.priceCents <= 0) return null;
  const profit = item.priceCents - item.costCents;
  return {
    priceCents:  item.priceCents,
    costCents:   item.costCents,
    profitCents: profit,
    marginRatio: profit / item.priceCents,
  };
}

/** Same, batched. Items without cost are filtered out of the result. */
export function calculateProfits<T extends ProfitItem>(items: T[]): Array<T & ProfitResult> {
  const out: Array<T & ProfitResult> = [];
  for (const item of items) {
    const p = calculateProfit(item);
    if (p) out.push({ ...item, ...p });
  }
  return out;
}
