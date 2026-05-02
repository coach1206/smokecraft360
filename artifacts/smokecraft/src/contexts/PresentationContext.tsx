/**
 * PresentationContext — Guided Presentation Mode for SmokeCraft 360.
 *
 * Manages a 7-step self-guided tour that highlights key UI areas,
 * explains value, and drives the discover + order flow automatically.
 *
 * Steps:
 *  0 — Preferences (form)
 *  1 — Discover button (form, Next triggers discover)
 *  2 — Loading (auto-advances when results are ready)
 *  3 — First recommendation card (results)
 *  4 — Pairing section (results)
 *  5 — Swipe hint (results)
 *  6 — Order button (results, last step)
 */

import {
  createContext, useContext, useState, useCallback,
  useRef, useEffect, type ReactNode,
} from "react";

// ── Step definitions ──────────────────────────────────────────────────────────

export interface PresentationStep {
  id:         string;
  phase:      "form" | "loading" | "results";
  target:     string | null;   // [data-tour] value; null → centered overlay
  title:      string;
  subtitle:   string;
  nextLabel?: string;          // override the default "Next" label
  scrollBlock?: ScrollLogicalPosition;
}

export const PRESENTATION_STEPS: PresentationStep[] = [
  {
    id:       "preferences",
    phase:    "form",
    target:   "tour-preferences",
    title:    "Tell us what you're in the mood for",
    subtitle: "Select your flavor notes, strength, and atmosphere to begin your experience",
  },
  {
    id:        "discover",
    phase:     "form",
    target:    "tour-discover",
    title:     "We translate preferences into premium selections",
    subtitle:  "One tap — our algorithm matches your exact palate to the finest products in the cellar",
    nextLabel: "Discover Now",
    scrollBlock: "center",
  },
  {
    id:       "loading",
    phase:    "loading",
    target:   null,
    title:    "Crafting your experience…",
    subtitle: "Analyzing 200+ premium products against your exact preferences",
  },
  {
    id:          "recommendation",
    phase:       "results",
    target:      "tour-card-stack",
    title:       "This is what you should enjoy",
    subtitle:    "Curated to your exact palate — premium selections, never generic",
    scrollBlock: "start",
  },
  {
    id:          "pairings",
    phase:       "results",
    target:      "tour-pairings",
    title:       "The perfect complement",
    subtitle:    "Every great cigar deserves the right spirit — automatically matched",
    scrollBlock: "center",
  },
  {
    id:          "swipe",
    phase:       "results",
    target:      "tour-card-stack",
    title:       "Swipe to explore more options",
    subtitle:    "Browse your full curated selection — each one a perfect match for your palate",
    scrollBlock: "start",
  },
  {
    id:          "order",
    phase:       "results",
    target:      "tour-order-btn",
    title:       "Where experience becomes revenue",
    subtitle:    "One tap from discovery to delivered — fully integrated ordering with zero friction",
    nextLabel:   "Finish Tour",
    scrollBlock: "center",
  },
];

// ── Context ───────────────────────────────────────────────────────────────────

interface PresentationContextValue {
  isActive:              boolean;
  currentStep:           number;
  step:                  PresentationStep | null;
  totalSteps:            number;
  autoPlay:              boolean;
  shouldTriggerDiscover: boolean;
  clearTriggerDiscover:  () => void;
  start:                 () => void;
  next:                  () => void;
  prev:                  () => void;
  exit:                  () => void;
  toggleAutoPlay:        () => void;
  onResultsReady:        () => void;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [isActive,              setIsActive]              = useState(false);
  const [currentStep,           setCurrentStep]           = useState(0);
  const [autoPlay,              setAutoPlay]              = useState(false);
  const [shouldTriggerDiscover, setShouldTriggerDiscover] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const exit = useCallback(() => {
    clearTimer();
    setIsActive(false);
    setCurrentStep(0);
    setAutoPlay(false);
    setShouldTriggerDiscover(false);
  }, []);

  const next = useCallback(() => {
    clearTimer();
    setCurrentStep((s) => {
      const n = s + 1;
      if (n >= PRESENTATION_STEPS.length) {
        // Last step — end presentation after a short pause
        setTimeout(() => { setIsActive(false); setCurrentStep(0); setAutoPlay(false); }, 400);
        return s;
      }
      // Step 1 → 2: Home component listens to shouldTriggerDiscover
      if (s === 1) setShouldTriggerDiscover(true);
      return n;
    });
  }, []);

  const prev = useCallback(() => {
    clearTimer();
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setCurrentStep(0);
    setShouldTriggerDiscover(false);
    setIsActive(true);
  }, []);

  const toggleAutoPlay = useCallback(() => setAutoPlay((a) => !a), []);

  const clearTriggerDiscover = useCallback(() => setShouldTriggerDiscover(false), []);

  // Home calls this when phase transitions from loading → results (step 2 → 3)
  const onResultsReady = useCallback(() => {
    setCurrentStep((s) => (s === 2 ? 3 : s));
  }, []);

  // Auto-play: 5 s per step (skips loading — that auto-advances via onResultsReady)
  useEffect(() => {
    if (!isActive || !autoPlay) return;
    const step = PRESENTATION_STEPS[currentStep];
    if (!step || step.phase === "loading") return;
    timerRef.current = setTimeout(next, 5000);
    return clearTimer;
  }, [isActive, autoPlay, currentStep, next]);

  const step = isActive ? (PRESENTATION_STEPS[currentStep] ?? null) : null;

  return (
    <PresentationContext.Provider value={{
      isActive, currentStep, step, totalSteps: PRESENTATION_STEPS.length,
      autoPlay, shouldTriggerDiscover, clearTriggerDiscover,
      start, next, prev, exit, toggleAutoPlay, onResultsReady,
    }}>
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentation() {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error("usePresentation must be used inside PresentationProvider");
  return ctx;
}
