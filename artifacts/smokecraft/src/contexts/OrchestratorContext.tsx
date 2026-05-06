/**
 * OrchestratorContext — Predictive Experience Orchestrator for client-side behavioral scoring.
 *
 * Accumulates swipe signals per session and computes an OrchestrationProfile in real-time.
 * No network calls for scoring — pure client-side math mirrors the server algorithm.
 * Syncs to server every 5 signals (fire-and-forget) for analytics persistence.
 *
 * Profile drives:
 *   - EnvironmentEngine (atmosphere, motion, pacing)
 *   - RevealPage (cinematic intensity, card stagger)
 *   - Add-to-Order (confirmation style)
 *
 * Performance: no re-renders from accumulation. Profile updates are debounced 150ms.
 */

import React, {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, useMemo,
} from "react";
import { environmentEngine } from "@/lib/environmentEngine";
import type { CraftType } from "@/lib/environmentEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionMood = "immersed" | "exploratory" | "social" | "focused" | "disengaged";
export type OrchestratorPacing = "slow-cinematic" | "balanced" | "fast-fluid" | "energetic";

export interface OrchestrationProfile {
  mood:                   SessionMood;
  pacing:                 OrchestratorPacing;
  confidence:             number;   // 0–100
  premiumIntent:          number;   // 0–100
  socialEnergy:           number;   // 0–100
  recommendationPressure: number;   // 0–100
  atmosphereIntensity:    number;   // 0–100
  sessionDepth:           number;
  computedAt:             string;
}

export interface SwipeSignalInput {
  direction:    "add" | "skip";
  swipeMs:      number;
  hesitationMs: number;
  tags:         string[];
  marginPct:    number;
  isPremium:    boolean;
}

interface StoredSignal extends SwipeSignalInput {
  t: number; // timestamp
}

interface OrchestratorContextValue {
  profile:                OrchestrationProfile | null;
  addSignal:              (sig: SwipeSignalInput) => void;
  resetSession:           (craft?: CraftType) => void;
  isImmersive:            boolean;
  isPremium:              boolean;
  isFastUser:             boolean;
  cinemaIntensity:        number;   // atmosphereIntensity or 65
  recommendationPressure: number;   // 0–100
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: OrchestrationProfile = {
  mood:                   "focused",
  pacing:                 "balanced",
  confidence:             40,
  premiumIntent:          30,
  socialEnergy:           40,
  recommendationPressure: 50,
  atmosphereIntensity:    65,
  sessionDepth:           0,
  computedAt:             new Date().toISOString(),
};

// ── Premium tag vocabulary ────────────────────────────────────────────────────

const PREMIUM_TAGS = new Set([
  "bold", "reserve", "aged", "single malt", "limited", "rare", "vintage",
  "premium", "luxury", "full body", "rich", "complex", "oaky", "robust",
]);

// ── Pure local scoring function (mirrors server predictiveOrchestrator) ───────

function scoreSignals(signals: StoredSignal[], craftType: CraftType): OrchestrationProfile {
  const depth = signals.length;
  if (depth === 0) return { ...DEFAULT_PROFILE };

  const swipeMsArr      = signals.map(s => s.swipeMs).filter(v => v > 0);
  const hesitationMsArr = signals.map(s => s.hesitationMs).filter(v => v > 0);
  const addCount        = signals.filter(s => s.direction === "add").length;
  const skipCount       = signals.filter(s => s.direction === "skip").length;
  const premiumTagHits  = signals.flatMap(s => s.tags).filter(t => PREMIUM_TAGS.has(t.toLowerCase())).length;
  const premiumHits     = signals.filter(s => s.isPremium && s.direction === "add").length;
  const uniqueTags      = new Set(signals.flatMap(s => s.tags)).size;
  const marginArr       = signals.filter(s => s.direction === "add").map(s => s.marginPct);

  const avgSwipeMs      = swipeMsArr.length > 0      ? swipeMsArr.reduce((a,b) => a+b,0) / swipeMsArr.length : 2000;
  const avgHesitMs      = hesitationMsArr.length > 0 ? hesitationMsArr.reduce((a,b) => a+b,0) / hesitationMsArr.length : 1500;
  const avgMargin       = marginArr.length > 0        ? marginArr.reduce((a,b) => a+b,0) / marginArr.length : 50;
  const skipRatio       = depth > 0 ? skipCount / depth : 0.5;

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  // Premium Intent
  let premiumIntent = 30;
  premiumIntent += clamp(premiumHits * 8, 0, 40);
  premiumIntent += clamp(premiumTagHits * 5, 0, 25);
  premiumIntent += clamp((avgHesitMs - 1000) / 400, 0, 12);
  premiumIntent += clamp((avgMargin - 50) / 5, -10, 10);
  if (avgSwipeMs < 700) premiumIntent -= 12;
  if (craftType === "pour" || craftType === "smoke") premiumIntent += 5;
  premiumIntent = clamp(premiumIntent, 0, 100);

  // Social Energy
  let socialEnergy = 40;
  if (avgSwipeMs < 700)  socialEnergy += 20;
  if (avgSwipeMs > 2800) socialEnergy -= 15;
  if (craftType === "brew" || craftType === "vape") socialEnergy += 8;
  if (uniqueTags > 8) socialEnergy += 10;
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 2) socialEnergy += 12;
  if (hour >= 6 && hour < 11) socialEnergy -= 8;
  socialEnergy = clamp(socialEnergy, 0, 100);

  // Recommendation Pressure
  let recPressure = 50;
  if (depth < 4)          recPressure += 20;
  if (skipRatio > 0.7)    recPressure += 15;
  if (addCount > 3)       recPressure -= 15;
  if (premiumIntent > 70) recPressure -= 10;
  recPressure = clamp(recPressure, 20, 90);

  // Atmosphere Intensity
  let atmosphereIntensity = 65;
  atmosphereIntensity += (premiumIntent - 50) * 0.3;
  atmosphereIntensity += (100 - socialEnergy) * 0.12;
  atmosphereIntensity = clamp(atmosphereIntensity, 30, 95);

  // Mood
  let mood: SessionMood;
  if      (premiumIntent > 70 && avgSwipeMs > 1800)                   mood = "immersed";
  else if (socialEnergy > 65)                                          mood = "social";
  else if (depth < 3 && avgSwipeMs < 800 && skipRatio > 0.5)          mood = "disengaged";
  else if (uniqueTags > 8 && avgSwipeMs < 2200)                       mood = "exploratory";
  else                                                                  mood = "focused";

  // Pacing
  let pacing: OrchestratorPacing;
  if      (premiumIntent > 70 || avgSwipeMs > 2500) pacing = "slow-cinematic";
  else if (socialEnergy > 65 || avgSwipeMs < 700)   pacing = "fast-fluid";
  else if (avgSwipeMs < 1400)                        pacing = "energetic";
  else                                               pacing = "balanced";

  const confidence = clamp(40 + depth * 8, 40, 95);

  return {
    mood,
    pacing,
    confidence,
    premiumIntent:          Math.round(premiumIntent),
    socialEnergy:           Math.round(socialEnergy),
    recommendationPressure: Math.round(recPressure),
    atmosphereIntensity:    Math.round(atmosphereIntensity),
    sessionDepth:           depth,
    computedAt:             new Date().toISOString(),
  };
}

// ── Server sync (fire-and-forget analytics) ───────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function syncToServer(signals: StoredSignal[], craftType: CraftType): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const payload = {
    craftType,
    sessionStart: signals[0]?.t ?? Date.now(),
    signals: signals.map(({ t: _, ...s }) => s),
  };
  await fetch(`${BASE}/api/orchestrator/signal`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

// ── Context ───────────────────────────────────────────────────────────────────

const OrchestratorContext = createContext<OrchestratorContextValue | null>(null);

export function OrchestratorProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<OrchestrationProfile | null>(null);

  // Accumulator — stored in ref, never triggers re-renders on signal add
  const signalsRef   = useRef<StoredSignal[]>([]);
  const craftRef     = useRef<CraftType>("smoke");
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCountRef = useRef(0);

  // ── Debounced score-and-apply ───────────────────────────────────────────────
  const scheduleScore = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const scored = scoreSignals(signalsRef.current, craftRef.current);
      setProfile(scored);

      // Apply to environment engine (real-time atmosphere adaptation)
      environmentEngine.applyOrchestratorProfile(scored);

      // Sync to server every 5 signals for analytics
      syncCountRef.current++;
      if (syncCountRef.current % 5 === 0) {
        syncToServer([...signalsRef.current], craftRef.current).catch(() => {/* non-blocking */});
      }
    }, 150);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────

  const addSignal = useCallback((sig: SwipeSignalInput) => {
    signalsRef.current.push({ ...sig, t: Date.now() });
    // Keep buffer bounded to last 50 signals
    if (signalsRef.current.length > 50) {
      signalsRef.current = signalsRef.current.slice(-50);
    }
    scheduleScore();
  }, [scheduleScore]);

  const resetSession = useCallback((craft?: CraftType) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    signalsRef.current = [];
    syncCountRef.current = 0;
    if (craft) craftRef.current = craft;
    setProfile(null);
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const isImmersive            = profile?.mood === "immersed";
  const isPremium              = (profile?.premiumIntent ?? 30) > 65;
  const isFastUser             = profile?.pacing === "fast-fluid" || profile?.pacing === "energetic";
  const cinemaIntensity        = profile?.atmosphereIntensity ?? 65;
  const recommendationPressure = profile?.recommendationPressure ?? 50;

  const value = useMemo<OrchestratorContextValue>(() => ({
    profile,
    addSignal,
    resetSession,
    isImmersive,
    isPremium,
    isFastUser,
    cinemaIntensity,
    recommendationPressure,
  }), [profile, addSignal, resetSession, isImmersive, isPremium, isFastUser, cinemaIntensity, recommendationPressure]);

  return (
    <OrchestratorContext.Provider value={value}>
      {children}
    </OrchestratorContext.Provider>
  );
}

export function useOrchestrator(): OrchestratorContextValue {
  const ctx = useContext(OrchestratorContext);
  if (!ctx) throw new Error("useOrchestrator must be used inside <OrchestratorProvider>");
  return ctx;
}

export function useOrchestratorSafe(): OrchestratorContextValue | null {
  return useContext(OrchestratorContext);
}
