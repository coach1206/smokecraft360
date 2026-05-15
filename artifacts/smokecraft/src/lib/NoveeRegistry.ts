/**
 * NoveeRegistry — NOVEE OS Persistence & Sync Engine
 * Authority: Profound Innovations LLC
 * Framework: E.A.T. (Environment · Asset · Transaction)
 *
 * Commits ritual state to a sovereign localStorage ledger that survives
 * browser refreshes. Every transaction carries gate-verification status,
 * authority metadata, and a full E.A.T. snapshot so sessions can be
 * resumed at the exact step where the guest left off.
 *
 * Storage key:  NOVEE_EAT_RITUAL_LEDGER
 * Schema ver:   1.0
 */

import type { EATState } from "@/components/CinematicLanding/EATController";
import type { RitualData } from "@/components/CinematicLanding/RitualConfig";

/* ── Types ───────────────────────────────────────────────────────── */

export type RitualPhase = "ritual" | "draw_engineering" | "ritual_post";

export type LedgerStatus = "IN_PROGRESS" | "GATE_VERIFIED" | "COMPLETE";

export interface NoveePersistedState {
  eatState:     EATState;
  phase:        RitualPhase;
  absoluteStep: number;       // 2–13: global ritual step number
  stepIndex:    number;       // 0-based index within the current engine block
  ritualData:   RitualData;
  timestamp:    string;       // ISO-8601
  authority:    string;       // "Profound Innovations"
  version:      string;       // "1.0"
  status:       LedgerStatus;
  gateVerified: boolean;
}

/* ── Theme config per step ───────────────────────────────────────── */

export interface RitualTheme {
  depth:       number;   // 0–1: how deep into Obsidian Glass we are
  borderRgba:  string;   // Brushed Titanium border color
  glowRgba:    string;   // Smoked Chrome ambient glow
  chromeTone:  string;   // hex accent for interactive elements
}

/* ── Derived constants ───────────────────────────────────────────── */

const LEDGER_KEY = "NOVEE_EAT_RITUAL_LEDGER";
const AUTHORITY  = "Profound Innovations";
const VERSION    = "1.0";

/* ── NoveeRegistry ───────────────────────────────────────────────── */

export const NoveeRegistry = {

  /**
   * Commit current ritual state to the sovereign ledger.
   * Only persists when the browser supports localStorage.
   * Checks for an active gate session before setting status to GATE_VERIFIED.
   */
  commitToLedger(
    eatState:     EATState,
    phase:        RitualPhase,
    absoluteStep: number,
    stepIndex:    number,
    ritualData:   RitualData,
  ): void {
    const gateVerified =
      typeof localStorage !== "undefined" &&
      !!(
        localStorage.getItem("axiom_token") ||
        localStorage.getItem("axiom_jwt")
      );

    const entry: NoveePersistedState = {
      eatState,
      phase,
      absoluteStep,
      stepIndex,
      ritualData,
      timestamp:   new Date().toISOString(),
      authority:   AUTHORITY,
      version:     VERSION,
      status:      gateVerified ? "GATE_VERIFIED" : "IN_PROGRESS",
      gateVerified,
    };

    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(entry));
    } catch {
      /* Storage quota exceeded — ritual continues uninterrupted */
    }
  },

  /**
   * Retrieve the last persisted ritual state.
   * Returns null if no state exists or if the entry is malformed.
   */
  recoverState(): NoveePersistedState | null {
    try {
      const raw = typeof localStorage !== "undefined"
        ? localStorage.getItem(LEDGER_KEY)
        : null;
      if (!raw) return null;

      const data = JSON.parse(raw) as NoveePersistedState;

      // Schema validation — guard against stale/corrupted entries
      if (
        !data.eatState ||
        !data.phase ||
        typeof data.absoluteStep !== "number" ||
        !data.ritualData
      ) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  /**
   * Mark the ritual as complete and erase the ledger.
   * Called after a successful discover() call or when the guest
   * explicitly chooses "Begin Anew".
   */
  clearLedger(): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(LEDGER_KEY);
      }
    } catch { /* noop */ }
  },

  /**
   * Derive the engine-relative (0-based) step index from an absolute
   * ritual step number and phase.
   */
  stepIndexFor(phase: RitualPhase, absoluteStep: number): number {
    if (phase === "ritual")           return Math.max(0, absoluteStep - 2);
    if (phase === "ritual_post")      return Math.max(0, absoluteStep - 9);
    return 0;
  },

  /**
   * Per-step theme intensity config.
   * depth 0 = standard Obsidian Glass baseline
   * depth 1 = maximum Smoked Chrome / deep Obsidian
   */
  themeForStep(step: number): RitualTheme {
    if (step <= 3) return {
      depth:      0.15,
      borderRgba: "rgba(200,200,210,0.13)",
      glowRgba:   "rgba(200,200,215,0.07)",
      chromeTone: "#B4B4C0",
    };
    if (step <= 5) return {
      depth:      0.32,
      borderRgba: "rgba(175,175,188,0.15)",
      glowRgba:   "rgba(180,180,195,0.09)",
      chromeTone: "#9A9AAA",
    };
    if (step <= 7) return {
      depth:      0.52,
      borderRgba: "rgba(150,150,165,0.17)",
      glowRgba:   "rgba(155,155,172,0.11)",
      chromeTone: "#828292",
    };
    if (step === 8) return {
      depth:      0.67,
      borderRgba: "rgba(130,130,145,0.19)",
      glowRgba:   "rgba(135,135,152,0.13)",
      chromeTone: "#6E6E80",
    };
    if (step <= 10) return {
      depth:      0.78,
      borderRgba: "rgba(115,115,132,0.21)",
      glowRgba:   "rgba(118,118,136,0.15)",
      chromeTone: "#5E5E72",
    };
    if (step <= 12) return {
      depth:      0.89,
      borderRgba: "rgba(100,100,118,0.23)",
      glowRgba:   "rgba(102,102,120,0.17)",
      chromeTone: "#505064",
    };
    return {
      depth:      1.00,
      borderRgba: "rgba(88,88,106,0.26)",
      glowRgba:   "rgba(90,90,108,0.20)",
      chromeTone: "#42425A",
    };
  },

  /**
   * Apply the current step's theme to CSS custom properties on
   * document.documentElement so any component can consume them.
   */
  applyTheme(step: number): void {
    if (typeof document === "undefined") return;
    const t = NoveeRegistry.themeForStep(step);
    const el = document.documentElement;
    el.style.setProperty("--novee-ritual-depth",  String(t.depth));
    el.style.setProperty("--novee-border-rgba",   t.borderRgba);
    el.style.setProperty("--novee-glow-rgba",     t.glowRgba);
    el.style.setProperty("--novee-chrome-tone",   t.chromeTone);
  },

  /** Remove theme variables when leaving the ritual. */
  clearTheme(): void {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    el.style.removeProperty("--novee-ritual-depth");
    el.style.removeProperty("--novee-border-rgba");
    el.style.removeProperty("--novee-glow-rgba");
    el.style.removeProperty("--novee-chrome-tone");
  },
};
