/**
 * usePosIntegration — POS handoff hook for Novee OS SmokeCraft experiences.
 *
 * Wires the cinematic transition layer (smoke vortex + velvet slide tone) to
 * the server-side ledger injection and pgPubSub broadcast pipeline.
 *
 * Now also subscribes to live POS order events via socket.io for real-time
 * flavor synergy XP computation and inventory state binding.
 */

import { useState, useCallback, useEffect } from "react";
import { noveePosRouterEngine, type SynergyResult } from "@/lib/posRouterEngine";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Velvet slide transition tone (Web Audio API — no external file required) ──
function _playVelvetSlide(): void {
  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx   = new AudioCtx();
    const osc   = ctx.createOscillator();
    const gain  = ctx.createGain();
    osc.type    = "sine";
    osc.frequency.setValueAtTime(210, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* AudioContext unavailable or blocked */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandoffPayload {
  blendSelected:   string;
  vitola:          string;
  customEngraving: string;
  guestId:         string;
}

export interface HandoffResult {
  transactionId: string;
  status:        string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePosIntegration() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastResult,      setLastResult]       = useState<HandoffResult | null>(null);
  const [error,           setError]            = useState<string | null>(null);
  const [synergyXP,       setSynergyXP]        = useState<SynergyResult | null>(null);
  const [lastOrderVendor, setLastOrderVendor]  = useState<string | null>(null);

  // ── Subscribe to live POS order events on mount ───────────────────────────
  useEffect(() => {
    noveePosRouterEngine.subscribe({
      onSynergyXP: (result) => {
        if (result.xpAwarded > 0) setSynergyXP(result);
      },
      onInventoryDecrement: (_itemNames) => {
        // NOVEE manages inventory via inventoryState.ts — signal update
        window.dispatchEvent(new CustomEvent("novee:inventory_decrement", {
          detail: { itemNames: _itemNames },
        }));
      },
      onOrderReceived: (vendor, _totalCents) => {
        if (vendor) setLastOrderVendor(vendor);
      },
    });
    return () => noveePosRouterEngine.destroy();
  }, []);

  const dismissSynergyXP = useCallback(() => setSynergyXP(null), []);

  /**
   * executePosHandoff
   *
   * 1. Triggers the smoke vortex dissolve centred on the user's touch point.
   * 2. Plays the velvet slide audio transition tone (synthesised).
   * 3. POSTs the payload to /api/novee/transaction/submit.
   * 4. The backend writes to the ledger and broadcasts via pgPubSub → Socket.IO
   *    so the 9-tab Command Center receives the event in real time.
   */
  const executePosHandoff = useCallback(async (
    payload:  HandoffPayload,
    touchX:   number,
    touchY:   number,
  ): Promise<HandoffResult | null> => {
    setIsTransitioning(true);
    setError(null);

    window.accelerateSmokeVortex?.(touchX, touchY);
    _playVelvetSlide();

    try {
      const res = await fetch(`${BASE}/api/novee/transaction/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          status:    "PENDING_POS_FULFILLMENT",
        }),
      });
      if (!res.ok) throw new Error(`Ledger injection failed: ${res.status}`);
      const data = (await res.json()) as HandoffResult;
      setLastResult(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown handoff error";
      setError(msg);
      return null;
    } finally {
      setIsTransitioning(false);
    }
  }, []);

  return {
    executePosHandoff,
    isTransitioning,
    lastResult,
    error,
    synergyXP,
    dismissSynergyXP,
    lastOrderVendor,
  };
}
