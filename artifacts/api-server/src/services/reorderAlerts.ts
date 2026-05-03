/**
 * Reorder Alerts — surfaces low-stock items per venue.
 *
 * Pure function over the inventory snapshot, keeping policy (the
 * threshold) out of the cache layer. Default threshold is 5 units;
 * caller can pass a tighter value for high-margin items they refuse
 * to run out of, or a looser one for slow-movers.
 *
 * Returns the items sorted by urgency (lowest stock first) so a
 * dashboard can render a meaningful "needs attention" feed without
 * extra sorting on the client.
 */

export interface ReorderableItem {
  productId: string;
  name?:     string;
  quantity:  number;
  threshold?: number;
}

export interface ReorderAlert {
  productId: string;
  name:      string;
  quantity:  number;
  threshold: number;
  /** Higher = more urgent. 1.0 = at threshold; >1 = below threshold. */
  urgency:   number;
}

export const DEFAULT_REORDER_THRESHOLD = 5;

export function checkReorder(
  items: ReorderableItem[],
  defaultThreshold: number = DEFAULT_REORDER_THRESHOLD,
): ReorderAlert[] {
  const alerts: ReorderAlert[] = [];
  for (const item of items) {
    const threshold = item.threshold ?? defaultThreshold;
    if (item.quantity < threshold) {
      alerts.push({
        productId: item.productId,
        name:      item.name ?? item.productId,
        quantity:  item.quantity,
        threshold,
        // +1 so an item at 0 stock is treated as fully urgent (not infinite).
        urgency:   threshold / Math.max(0.5, item.quantity + 0.5),
      });
    }
  }
  return alerts.sort((a, b) => b.urgency - a.urgency);
}
