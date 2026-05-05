/**
 * LiveEngineController — real-time POS ↔ scene ranking bridge.
 *
 * Subscribes to `pos_order` events from the Socket.io server. When an order
 * arrives, it updates `lastOrderType` (and derives mood/intensity/setting)
 * in UserProfileContext, which triggers getWeightedScenes() to re-rank all
 * four DynamicCard scene queues instantly.
 *
 * Fallback: if the socket has not connected within FALLBACK_DELAY_MS, a local
 * simulated POS feed fires every SIMULATE_INTERVAL_MS so the engine keeps
 * cycling even when the backend is unreachable (e.g. dev with no server).
 *
 * The 2-second debounce prevents rapid POS bursts from thrashing the UI.
 *
 * Mount once at the root of the CraftHub tree. Renders nothing.
 */

import { useEffect, useRef } from "react";
import { socket }            from "@/lib/socket";
import { useUserProfile }    from "@/contexts/UserProfileContext";
import { PAIRING_MAP }       from "@/lib/weightedEngine";

const DEBOUNCE_MS        = 2_000;
const FALLBACK_DELAY_MS  = 8_000;  // wait this long for real socket before starting sim
const SIMULATE_INTERVAL_MS = 5_000;

const ORDER_TYPES = ["cigar", "whiskey", "beer", "vape"] as const;
type  OrderType   = typeof ORDER_TYPES[number];

const ORDER_LABELS: Record<OrderType, string> = {
  cigar:   "🚬 Cigar order",
  whiskey: "🥃 Whiskey pour",
  beer:    "🍺 Beer flight",
  vape:    "💨 Vape session",
};

function deriveProfile(orderType: OrderType) {
  const tags = PAIRING_MAP[orderType] ?? [];
  return {
    lastOrderType: orderType,
    mood:      tags.includes("social") ? "social" : "solo",
    intensity: tags.includes("premium") ? "premium" : tags.includes("strong") ? "strong" : "light",
    setting:   tags.includes("night") ? "night" : tags.includes("urban") ? "urban" : "day",
  };
}

export default function LiveEngineController() {
  const { recordOrder, updateProfile } = useUserProfile();
  const lastUpdateRef = useRef(0);
  const simulatorRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef  = useRef(false);

  const handleOrder = (orderType: string) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < DEBOUNCE_MS) return;
    lastUpdateRef.current = now;

    const type = ORDER_TYPES.includes(orderType as OrderType)
      ? (orderType as OrderType)
      : ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];

    recordOrder(type);
    updateProfile(deriveProfile(type));

    if (import.meta.env.DEV) {
      console.debug(`[LiveEngine] ${ORDER_LABELS[type]} → profile updated`);
    }
  };

  const startSimulator = () => {
    if (simulatorRef.current) return; // already running
    if (import.meta.env.DEV) {
      console.debug("[LiveEngine] No socket connection — starting local POS simulator");
    }
    // Fire immediately on start
    handleOrder(ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)]);
    simulatorRef.current = setInterval(() => {
      handleOrder(ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)]);
    }, SIMULATE_INTERVAL_MS);
  };

  const stopSimulator = () => {
    if (simulatorRef.current) {
      clearInterval(simulatorRef.current);
      simulatorRef.current = null;
    }
  };

  useEffect(() => {
    // ── Real-time socket handler ─────────────────────────────────────────────
    const onPosOrder = (data: { orderType: string }) => {
      connectedRef.current = true;
      stopSimulator(); // stop sim if socket delivers real data
      handleOrder(data.orderType);
    };

    socket.on("pos_order", onPosOrder);

    socket.on("connect", () => {
      connectedRef.current = true;
      stopSimulator();
    });

    // Server sends this immediately after handshake — confirms the real-time
    // pipeline is fully ready, stops the fallback simulator immediately.
    socket.on("connected", (data: { ok: boolean; ts: number }) => {
      if (data.ok) {
        connectedRef.current = true;
        stopSimulator();
        if (import.meta.env.DEV) {
          console.debug("[LiveEngine] server confirmed — real-time pipeline active");
        }
      }
    });

    // ── Fallback simulator ───────────────────────────────────────────────────
    // Start simulating after FALLBACK_DELAY_MS if no real connection yet.
    const fallbackTimer = setTimeout(() => {
      if (!connectedRef.current) startSimulator();
    }, FALLBACK_DELAY_MS);

    // If socket is already connected on mount, no fallback needed
    if (socket.connected) {
      connectedRef.current = true;
    }

    return () => {
      socket.off("pos_order", onPosOrder);
      socket.off("connect");
      clearTimeout(fallbackTimer);
      stopSimulator();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
