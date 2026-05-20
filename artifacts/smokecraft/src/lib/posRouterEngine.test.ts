import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Socket mock ────────────────────────────────────────────────────────────────

const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

vi.mock("@/lib/socket", () => ({
  socket: {
    emit: vi.fn(),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter(h => h !== handler);
      }
    },
  },
}));

function emit(event: string, payload: unknown): void {
  (handlers[event] ?? []).forEach(h => h(payload));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

import { posRouterEngine as POSRouterEngine } from "./posRouterEngine";
import type { POSRouterCallbacks } from "./posRouterEngine";

function makeCallbacks() {
  return {
    onSynergyXP:          vi.fn(),
    onInventoryDecrement: vi.fn(),
    onLiveEvent:          vi.fn(),
  } satisfies POSRouterCallbacks;
}

function orderEvent(overrides: Partial<{
  guestSessionId: string;
  timestamp: string;
  totalCents: number;
}> = {}) {
  return {
    eventType:      "ORDER_PLACED" as const,
    venueId:        "venue-1",
    lineItems:      [{ name: "Padron 1964", productId: "p1", qty: 1, priceCents: 2500 }],
    totalCents:     overrides.totalCents ?? 2500,
    guestSessionId: overrides.guestSessionId ?? "session-abc",
    timestamp:      overrides.timestamp      ?? new Date().toISOString(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POSRouterEngine — order dedup", () => {
  beforeEach(() => {
    // Clear all handlers between tests
    for (const k of Object.keys(handlers)) delete handlers[k];
    POSRouterEngine.destroy();
  });

  it("processes two distinct orders from the same session within 30s", () => {
    const cbs = makeCallbacks();
    POSRouterEngine.subscribe("venue-1", cbs);

    const t1 = new Date(Date.now()).toISOString();
    const t2 = new Date(Date.now() + 1000).toISOString();

    emit("pos:ORDER_PLACED", orderEvent({ timestamp: t1 }));
    emit("pos:ORDER_PLACED", orderEvent({ timestamp: t2 }));

    expect(cbs.onInventoryDecrement).toHaveBeenCalledTimes(2);
    expect(cbs.onSynergyXP).toHaveBeenCalledTimes(2);
  });

  it("deduplicates an exact retry of the same event (same sessionId + same timestamp)", () => {
    const cbs = makeCallbacks();
    POSRouterEngine.subscribe("venue-1", cbs);

    const ev = orderEvent({ timestamp: new Date().toISOString() });
    emit("pos:ORDER_PLACED", ev);
    emit("pos:ORDER_PLACED", ev); // exact retry

    expect(cbs.onInventoryDecrement).toHaveBeenCalledTimes(1);
  });

  it("tracks cumulative spend across multiple orders in the same session", () => {
    const cbs = makeCallbacks();
    // Use a unique session ID so this test is isolated from the persistent sessions map
    const sessionId = `spend-test-${Date.now()}`;
    POSRouterEngine.subscribe("venue-1", cbs);

    emit("pos:ORDER_PLACED", orderEvent({ guestSessionId: sessionId, timestamp: new Date(Date.now()).toISOString(),       totalCents: 1000 }));
    emit("pos:ORDER_PLACED", orderEvent({ guestSessionId: sessionId, timestamp: new Date(Date.now() + 500).toISOString(), totalCents: 2000 }));

    const sessions = POSRouterEngine.getActiveSessions();
    const mine = sessions.find(s => s.sessionId === sessionId);
    expect(mine).toBeDefined();
    expect(mine!.totalSpent).toBe(3000);
  });

  it("always forwards analytics onLiveEvent even for exact duplicates", () => {
    const cbs = makeCallbacks();
    POSRouterEngine.subscribe("venue-1", cbs);

    const ev = orderEvent({ timestamp: new Date().toISOString() });
    emit("pos:ORDER_PLACED", ev);
    emit("pos:ORDER_PLACED", ev);

    // Analytics callback fires for both — dedup only blocks side effects
    expect(cbs.onLiveEvent).toHaveBeenCalledTimes(2);
  });

  it("ignores events from a different venue", () => {
    const cbs = makeCallbacks();
    POSRouterEngine.subscribe("venue-1", cbs);

    emit("pos:ORDER_PLACED", { ...orderEvent(), venueId: "venue-999" });

    expect(cbs.onInventoryDecrement).not.toHaveBeenCalled();
  });
});
