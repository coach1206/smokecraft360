/**
 * UnifiedCognitiveContext — Phase 1 Continuity Wrapper
 *
 * Bridges the three live engines into a single reactive global state:
 *   lounge_mood      — MEDITATIVE / FOCUSED / HIGH_ENERGY (from GroupEnergyEngine)
 *   guest_confidence — 0–1 scalar derived from GuestTier (CrossSessionMemory)
 *   ritual_pacing    — "slow" / "steady" / "swift" (composite)
 *   atmospheric_delta — 0–1 magnitude of last mood shift (drives transition intensity)
 *
 * Every craft (Smoke, Pour, Brew, Vape) shares this context so all modules
 * respond to the same lounge pulse without independent polling.
 */

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from "react";
import { groupEnergyEngine, type LoungeMood } from "@/lib/groupEnergyEngine";
import { crossSessionMemory } from "@/lib/crossSessionMemory";

// ── Types ──────────────────────────────────────────────────────────────────────

export type RitualPacing = "slow" | "steady" | "swift";

export interface UnifiedCognitiveState {
  lounge_mood:        LoungeMood;
  guest_confidence:   number;        // 0–1
  ritual_pacing:      RitualPacing;
  atmospheric_delta:  number;        // 0–1, magnitude of last mood shift
}

export interface UnifiedCognitiveContextValue extends UnifiedCognitiveState {
  recordInteraction:  (craft?: string) => void;
  updateLoungeMood:   (mood: LoungeMood) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOOD_INDEX: Record<LoungeMood, number> = {
  MEDITATIVE:  0,
  FOCUSED:     1,
  HIGH_ENERGY: 2,
};

function deriveConfidence(): number {
  const memory = crossSessionMemory.getMemory();
  const sessions = memory.totalSessions ?? 0;
  // Approximate tier from session count (mirrors CrossSessionMemory tier logic)
  if (sessions >= 20) return 1.00;
  if (sessions >= 10) return 0.75;
  if (sessions >= 4)  return 0.45;
  if (sessions >= 1)  return 0.25;
  return 0.15;
}

function derivePacing(mood: LoungeMood, confidence: number): RitualPacing {
  if (mood === "MEDITATIVE" || confidence < 0.35) return "slow";
  if (mood === "HIGH_ENERGY" && confidence > 0.65) return "swift";
  return "steady";
}

function buildState(mood: LoungeMood, prevMood: LoungeMood): UnifiedCognitiveState {
  const confidence = deriveConfidence();
  const delta      = Math.abs(MOOD_INDEX[mood] - MOOD_INDEX[prevMood]) / 2;
  return {
    lounge_mood:       mood,
    guest_confidence:  confidence,
    ritual_pacing:     derivePacing(mood, confidence),
    atmospheric_delta: delta,
  };
}

// ── Context ────────────────────────────────────────────────────────────────────

const UnifiedCognitiveContext = createContext<UnifiedCognitiveContextValue | null>(null);

export function useUnifiedCognitive(): UnifiedCognitiveContextValue {
  const ctx = useContext(UnifiedCognitiveContext);
  if (!ctx) {
    return {
      lounge_mood:       "FOCUSED",
      guest_confidence:  0.5,
      ritual_pacing:     "steady",
      atmospheric_delta: 0,
      recordInteraction: () => {},
      updateLoungeMood:  () => {},
    };
  }
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function UnifiedCognitiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UnifiedCognitiveState>(() => {
    const energy = groupEnergyEngine.getState();
    return buildState(energy.mood, energy.mood);
  });

  useEffect(() => {
    const unsubEnergy = groupEnergyEngine.subscribe((energyState) => {
      setState(prev => buildState(energyState.mood, prev.lounge_mood));
    });

    const unsubMemory = crossSessionMemory.subscribe(() => {
      setState(prev => buildState(prev.lounge_mood, prev.lounge_mood));
    });

    return () => {
      unsubEnergy();
      unsubMemory();
    };
  }, []);

  const recordInteraction = useCallback((craft?: string) => {
    groupEnergyEngine.recordActivity();
    if (craft) crossSessionMemory.recordCraftVisit(craft);
  }, []);

  const updateLoungeMood = useCallback((mood: LoungeMood) => {
    groupEnergyEngine.setMood(mood);
  }, []);

  return (
    <UnifiedCognitiveContext.Provider value={{ ...state, recordInteraction, updateLoungeMood }}>
      {children}
    </UnifiedCognitiveContext.Provider>
  );
}
