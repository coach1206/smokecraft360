/**
 * AxiomIntelligenceContext — Intelligence Engine runtime
 *
 * Ticks every 90 seconds. On each tick:
 *   1. Builds a VenueSnapshot from PosContext + CommandCenterContext
 *   2. Passes it to evaluateRules()
 *   3. Appends new TriggerEvents to the live queue
 *   4. Auto-fires events where firingMode === "auto"
 *
 * Also seeds an initial evaluation on mount so the UI isn't empty.
 *
 * Exposed API:
 *   events        — full event queue (all statuses)
 *   pending       — events awaiting approval
 *   autoFired     — auto-executed events log
 *   approve(id)   — approve + fire a pending event
 *   dismiss(id)   — dismiss without firing
 *   clearFired()  — clear the auto-fired log
 *   snapshot      — latest VenueSnapshot
 *   lastTick      — ISO timestamp of last evaluation
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from "react";
import { usePosContext }      from "@/contexts/PosContext";
import { useCommandCenter }  from "@/contexts/CommandCenterContext";
import {
  evaluateRules, buildVenueSnapshot, resetIntelligenceCooldowns,
  type TriggerEvent, type VenueSnapshot,
} from "@/lib/axiomIntelligence";
import { fetchCampaigns }    from "@/services/api";

// ── Tick interval ──────────────────────────────────────────────────────────────

const TICK_MS = 90_000; // 90 seconds

// ── Context interface ──────────────────────────────────────────────────────────

interface IntelligenceState {
  events:      TriggerEvent[];
  pending:     TriggerEvent[];
  autoFired:   TriggerEvent[];
  snapshot:    VenueSnapshot | null;
  lastTick:    string | null;
  approve:     (id: string) => void;
  dismiss:     (id: string) => void;
  clearFired:  () => void;
  forceEval:   () => void;       // manual trigger (demo / debug)
}

const Ctx = createContext<IntelligenceState | null>(null);

export function useAxiomIntelligence(): IntelligenceState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAxiomIntelligence must be inside AxiomIntelligenceProvider");
  return ctx;
}

export function useAxiomIntelligenceSafe(): IntelligenceState | null {
  return useContext(Ctx);
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AxiomIntelligenceProvider({ children }: { children: ReactNode }) {
  const pos = usePosContext();
  const cc  = useCommandCenter();

  const [events,   setEvents]   = useState<TriggerEvent[]>([]);
  const [snapshot, setSnapshot] = useState<VenueSnapshot | null>(null);
  const [lastTick, setLastTick] = useState<string | null>(null);

  // Cache campaign counts to avoid re-fetching on every tick
  const campaignCacheRef = useRef<{ count: number; active: number; ts: number }>({
    count: 0, active: 0, ts: 0,
  });

  const runEval = useCallback(async () => {
    // Refresh campaign cache at most every 5 minutes
    const now = Date.now();
    if (now - campaignCacheRef.current.ts > 5 * 60_000) {
      try {
        const camps = await fetchCampaigns();
        campaignCacheRef.current = {
          count:  camps.length,
          active: camps.filter(c => c.status === "active").length,
          ts:     now,
        };
      } catch { /* retain old cache */ }
    }

    const snap = buildVenueSnapshot({
      hourlyRevenue:  cc.hourlyRevenue,
      orders:         pos.orders,
      products:       pos.products,
      activeGuests:   cc.activeGuests,
      onlineDevices:  cc.devices.filter(d => d.status === "online").length,
      totalDevices:   cc.devices.length,
      campaignCount:  campaignCacheRef.current.count,
      activeCampaigns: campaignCacheRef.current.active,
    });

    setSnapshot(snap);
    setLastTick(new Date().toISOString());

    setEvents(prev => {
      const newEvts = evaluateRules(snap, prev);
      if (newEvts.length === 0) return prev;
      return [...newEvts, ...prev].slice(0, 100); // cap at 100
    });
  }, [cc, pos]);

  // Initial evaluation on mount — reset cooldowns so first load always shows
  useEffect(() => {
    resetIntelligenceCooldowns();
    void runEval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recurring tick
  useEffect(() => {
    const id = setInterval(() => { void runEval(); }, TICK_MS);
    return () => clearInterval(id);
  }, [runEval]);

  // Derived views
  const pending   = events.filter(e => e.status === "pending");
  const autoFired = events.filter(e => e.status === "fired");

  const approve = useCallback((id: string) => {
    setEvents(prev => prev.map(e =>
      e.id === id ? { ...e, status: "approved", autoFiredAt: new Date().toISOString() } : e,
    ));
  }, []);

  const dismiss = useCallback((id: string) => {
    setEvents(prev => prev.map(e =>
      e.id === id ? { ...e, status: "dismissed" } : e,
    ));
  }, []);

  const clearFired = useCallback(() => {
    setEvents(prev => prev.filter(e => e.status !== "fired"));
  }, []);

  const forceEval = useCallback(() => {
    resetIntelligenceCooldowns();
    void runEval();
  }, [runEval]);

  return (
    <Ctx.Provider value={{
      events, pending, autoFired,
      snapshot, lastTick,
      approve, dismiss, clearFired, forceEval,
    }}>
      {children}
    </Ctx.Provider>
  );
}
