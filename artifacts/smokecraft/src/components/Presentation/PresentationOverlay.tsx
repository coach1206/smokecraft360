/**
 * PresentationOverlay — visual layer for Guided Presentation Mode.
 *
 * Renders:
 *  1. A spotlight "cutout" effect over the current target element
 *     (transparent div + outward box-shadow creates the dark backdrop with a glowing window)
 *  2. A pulsing amber glow ring around the spotlight
 *  3. A floating tooltip card with step title, subtitle, and navigation
 *  4. Progress dots + step counter
 *  5. Optional auto-play progress bar
 *
 * Target elements are identified by [data-tour="xxx"] attributes on DOM nodes.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import {
  X, ChevronRight, ChevronLeft,
  Play, Pause, Presentation,
} from "lucide-react";
import { usePresentation, PRESENTATION_STEPS } from "@/contexts/PresentationContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAD          = 14;   // spotlight padding around target element
const TOOLTIP_W    = 340;
const AUTO_PLAY_MS = 5000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return {
      position: "fixed",
      top:      "50%",
      left:     "50%",
      transform: "translate(-50%, -50%)",
      width:    TOOLTIP_W,
      zIndex:   56,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const targetCenterX = rect.left + rect.width / 2;
  const rawLeft       = targetCenterX - TOOLTIP_W / 2;
  const left          = Math.max(16, Math.min(rawLeft, vw - TOOLTIP_W - 16));

  const isUpperHalf = rect.top + rect.height / 2 < vh * 0.55;
  const topPos      = isUpperHalf
    ? rect.bottom + PAD + 16
    : rect.top - PAD - 220;  // approximate tooltip height

  return {
    position: "fixed",
    top:      Math.max(16, Math.min(topPos, vh - 240)),
    left,
    width:    TOOLTIP_W,
    zIndex:   56,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PresentationOverlay() {
  const {
    isActive, currentStep, step, totalSteps,
    autoPlay, next, prev, exit, toggleAutoPlay,
  } = usePresentation();

  const [rect,       setRect]       = useState<DOMRect | null>(null);
  const [autoProgress, setAutoProgress] = useState(0);
  const measureRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Measure target element ───────────────────────────────────────────────────
  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  }, [step?.target]);

  useEffect(() => {
    if (!isActive || !step) { setRect(null); return; }
    if (!step.target) { setRect(null); return; }

    // Scroll target into view, then measure after scroll settles
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: step.scrollBlock ?? "center" });
    }
    if (measureRef.current) clearTimeout(measureRef.current);
    measureRef.current = setTimeout(measure, 450);

    // Re-measure on resize/scroll
    window.addEventListener("resize",  measure, { passive: true });
    window.addEventListener("scroll",  measure, { passive: true });
    return () => {
      if (measureRef.current) clearTimeout(measureRef.current);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [isActive, step, currentStep, measure]);

  // ── Auto-play progress bar ───────────────────────────────────────────────────
  useEffect(() => {
    setAutoProgress(0);
    if (!autoPlay || !isActive || step?.phase === "loading") return;
    if (progressRef.current) clearInterval(progressRef.current);
    const tick = 50;
    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += tick;
      setAutoProgress(Math.min(1, elapsed / AUTO_PLAY_MS));
    }, tick);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [autoPlay, isActive, currentStep, step?.phase]);

  if (!isActive || !step) return null;

  const isLoading  = step.phase === "loading";
  const isFirst    = currentStep === 0;
  const isLast     = currentStep === totalSteps - 1;
  const nextLabel  = step.nextLabel ?? "Next";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* ── Backdrop fade (only shown when no spotlight / loading step) ── */}
          {isLoading && (
            <motion.div
              key="backdrop"
              className="fixed inset-0"
              style={{ background: "rgba(26,26,27,0.34)", zIndex: 50, pointerEvents: "none" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}

          {/* ── Spotlight: transparent + massive box-shadow creates dark backdrop with cutout ── */}
          <AnimatePresence mode="wait">
            {!isLoading && rect && (
              <>
                {/* Outer glow aura (pulsing) */}
                <motion.div
                  key={`aura-${currentStep}`}
                  style={{
                    position:      "fixed",
                    top:           rect.top    - PAD - 6,
                    left:          rect.left   - PAD - 6,
                    width:         rect.width  + (PAD + 6) * 2,
                    height:        rect.height + (PAD + 6) * 2,
                    borderRadius:  18,
                    border:        "1px solid rgba(212,139,0,0.28)",
                    boxShadow:     "0 0 28px rgba(212,139,0,0.22), inset 0 0 28px rgba(212,139,0,0.04)",
                    pointerEvents: "none",
                    zIndex:        51,
                  }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: [0.35, 0.85, 0.35], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.4 } }}
                />

                {/* Main spotlight — box-shadow creates the dim backdrop everywhere outside */}
                <motion.div
                  key={`spot-${currentStep}`}
                  style={{
                    position:      "fixed",
                    top:           rect.top    - PAD,
                    left:          rect.left   - PAD,
                    width:         rect.width  + PAD * 2,
                    height:        rect.height + PAD * 2,
                    borderRadius:  14,
                    background:    "transparent",
                    boxShadow:     "0 0 0 9999px rgba(26,26,27,0.34)",
                    border:        "1.5px solid rgba(212,139,0,0.55)",
                    pointerEvents: "none",
                    zIndex:        52,
                  }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}
          </AnimatePresence>

          {/* ── Tooltip card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`tooltip-${currentStep}`}
              style={tooltipStyle(rect)}
              initial={{ opacity: 0, y: isLoading ? 0 : 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  background: "linear-gradient(155deg, rgba(22,14,5,0.97), rgba(12,7,2,0.98))",
                  border:     "1px solid rgba(212,139,0,0.22)",
                  boxShadow:  "0 16px 56px rgba(26,26,27,0.32), 0 0 0 1px rgba(212,139,0,0.06) inset",
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                {/* Auto-play progress bar */}
                {autoPlay && !isLoading && (
                  <div className="h-0.5 w-full" style={{ background: "rgba(26,26,27,0.06)" }}>
                    <motion.div
                      className="h-full"
                      style={{
                        background: "linear-gradient(90deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                        width: `${autoProgress * 100}%`,
                      }}
                    />
                  </div>
                )}

                <div className="px-5 pt-5 pb-4">

                  {/* Step counter + icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.2)" }}>
                        <Presentation size={9} style={{ color: "rgba(212,139,0,0.7)" }} />
                        <span className="text-[8px] uppercase tracking-[0.22em]"
                          style={{ color: "rgba(212,139,0,0.65)" }}>
                          Guided Tour
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={exit}
                      className="p-1.5 rounded-full transition-colors duration-200"
                      style={{ background: "rgba(26,26,27,0.06)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(26,26,27,0.11)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(26,26,27,0.06)")}
                      title="Exit Presentation"
                    >
                      <X size={12} style={{ color: "rgba(180,155,100,0.55)" }} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="mb-5">
                    {isLoading && (
                      <div className="flex items-center gap-2 mb-3">
                        <motion.div
                          className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                          style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.75)" }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    )}
                    <h3
                      className="font-serif leading-snug mb-2"
                      style={{ fontSize: 18, fontWeight: 300, color: "rgba(235,215,175,0.94)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(180,155,100,0.62)" }}>
                      {step.subtitle}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="mb-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.16), transparent)" }} />

                  {/* Progress dots */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 items-center">
                      {PRESENTATION_STEPS.map((_, i) => (
                        <motion.div
                          key={i}
                          className="rounded-full"
                          animate={{
                            width:      i === currentStep ? 16 : 5,
                            background: i === currentStep
                              ? "rgba(212,139,0,0.75)"
                              : i < currentStep
                                ? "rgba(212,139,0,0.3)"
                                : "rgba(26,26,27,0.14)",
                          }}
                          style={{ height: 5 }}
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] tabular-nums" style={{ color: "rgba(180,155,100,0.35)" }}>
                      {currentStep + 1} / {totalSteps}
                    </span>
                  </div>
                </div>

                {/* Navigation footer */}
                {!isLoading && (
                  <div className="flex items-center gap-2 px-5 pb-4">
                    {/* Prev */}
                    <motion.button
                      onClick={prev}
                      disabled={isFirst}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.15em] transition-all"
                      style={isFirst ? {
                        background: "rgba(26,26,27,0.04)",
                        border:     "1px solid rgba(26,26,27,0.07)",
                        color:      "rgba(180,155,100,0.2)",
                        cursor:     "not-allowed",
                      } : {
                        background: "rgba(26,26,27,0.06)",
                        border:     "1px solid rgba(26,26,27,0.10)",
                        color:      "rgba(180,155,100,0.5)",
                      }}
                      whileHover={!isFirst ? { borderColor: "rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.65)" } : {}}
                      whileTap={!isFirst ? { scale: 0.96 } : {}}
                    >
                      <ChevronLeft size={11} />Back
                    </motion.button>

                    {/* Auto-play toggle */}
                    <motion.button
                      onClick={toggleAutoPlay}
                      className="p-2 rounded-xl transition-all"
                      style={autoPlay ? {
                        background: "rgba(212,139,0,0.1)",
                        border:     "1px solid rgba(212,139,0,0.25)",
                        color:      "rgba(212,139,0,0.7)",
                      } : {
                        background: "rgba(26,26,27,0.05)",
                        border:     "1px solid rgba(26,26,27,0.09)",
                        color:      "rgba(180,155,100,0.35)",
                      }}
                      whileHover={{ borderColor: "rgba(212,139,0,0.3)", color: "rgba(212,139,0,0.65)" }}
                      whileTap={{ scale: 0.95 }}
                      title={autoPlay ? "Pause auto-play" : "Enable auto-play (5s per step)"}
                    >
                      {autoPlay ? <Pause size={11} /> : <Play size={11} />}
                    </motion.button>

                    {/* Next / Finish */}
                    <motion.button
                      onClick={next}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] uppercase tracking-[0.15em] relative overflow-hidden"
                      style={{
                        background: isLast
                          ? "linear-gradient(135deg, rgba(212,139,0,0.25), rgba(180,130,30,0.18))"
                          : "linear-gradient(135deg, hsl(43 75% 40%), hsl(45 85% 50%))",
                        border: isLast ? "1px solid rgba(212,139,0,0.4)" : "none",
                        color: isLast ? "rgba(212,139,0,0.9)" : "hsl(22 18% 6%)",
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {nextLabel}
                      {!isLast && <ChevronRight size={11} />}
                    </motion.button>
                  </div>
                )}

                {/* Exit button for loading state */}
                {isLoading && (
                  <div className="flex justify-center pb-4">
                    <button
                      onClick={exit}
                      className="text-[9px] uppercase tracking-[0.2em] transition-colors duration-200"
                      style={{ color: "rgba(180,155,100,0.3)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,139,0,0.55)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.3)")}
                    >
                      Exit Presentation
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
