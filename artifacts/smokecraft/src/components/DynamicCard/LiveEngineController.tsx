/**
 * LiveEngineController — headless POS-feed sync component.
 *
 * In production this would subscribe to a WebSocket / SSE stream from the
 * POS system. In the current demo environment it simulates a live order
 * coming in every 5 seconds, which updates `lastOrderType` in UserProfileContext.
 * This triggers a re-rank of all DynamicCard scene queues via the weighted engine.
 *
 * Mount once at the top of the CraftHub tree. Renders nothing.
 */

import { useEffect } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";

const ORDER_TYPES = ["cigar", "whiskey", "beer", "vape"] as const;
type OrderType = typeof ORDER_TYPES[number];

const ORDER_LABELS: Record<OrderType, string> = {
  cigar:   "🚬 Cigar order",
  whiskey: "🥃 Whiskey pour",
  beer:    "🍺 Beer flight",
  vape:    "💨 Vape session",
};

export default function LiveEngineController() {
  const { recordOrder } = useUserProfile();

  useEffect(() => {
    // Initial signal on mount so scenes rank immediately
    const initial = ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];
    recordOrder(initial);

    const interval = setInterval(() => {
      const orderType = ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];
      recordOrder(orderType);
      // Non-blocking dev hint — safe to remove in prod
      if (import.meta.env.DEV) {
        console.debug(`[LiveEngine] POS signal: ${ORDER_LABELS[orderType]}`);
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [recordOrder]);

  return null;
}
