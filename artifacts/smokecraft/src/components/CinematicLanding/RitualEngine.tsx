/**
 * RitualEngine — Generic orchestrator for any block of Sovereign Ritual sessions
 * NOVEE OS · E.A.T. Framework · Profound Innovations
 *
 * Used twice in the ritual flow:
 *   Phase "ritual"      → PRE_DRAW_STEPS  (Sessions 02–07)
 *   Phase "ritual_post" → POST_DRAW_STEPS (Sessions 09–13)
 *
 * On each step completion the engine:
 *   1. Updates E.A.T. environment state via the option's `eatEnv` field
 *   2. Appends a Transaction entry to the ledger
 *   3. Calls onStepChange(absoluteStep) so the parent can sync theme + persist
 *   4. Advances to the next step with a GPU-composited morph overlay
 *
 * Session recovery: initialStepIndex resumes from an in-progress step.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RitualStep } from "./RitualStep";
import { PRE_DRAW_STEPS } from "./RitualConfig";
import type { RitualStepConfig, RitualOption } from "./RitualConfig";
import { eatApplyStep } from "./EATController";
import type { EATState } from "./EATController";

interface RitualEngineProps {
  /** Step configs to sequence through. Defaults to PRE_DRAW_STEPS. */
  steps?:            RitualStepConfig[];
  /** 0-based index to resume from (for session recovery). */
  initialStepIndex?: number;
  /** Current E.A.T. state passed in from the parent. */
  eatState?:         EATState;
  /** Called whenever a step updates the E.A.T. state. */
  onEATUpdate?:      (state: EATState) => void;
  /**
   * Called after each step lock with the absolute ritual step number (2–13).
   * Parent uses this for Theme Sync and ledger commits.
   */
  onStepChange?:     (absoluteStep: number) => void;
  /** Called when all steps in this block are locked, with the collected data. */
  onComplete:        (data: Record<string, string>) => void;
}

export function RitualEngine({
  steps            = PRE_DRAW_STEPS,
  initialStepIndex = 0,
  eatState,
  onEATUpdate,
  onStepChange,
  onComplete,
}: RitualEngineProps) {
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(0, initialStepIndex), steps.length - 1)
  );
  const [localData, setLocalData] = useState<Record<string, string>>({});
  const [morphing,  setMorphing]  = useState(false);

  const config = steps[stepIndex];

  function applyEAT(selection: RitualOption, cfg: RitualStepConfig) {
    if (!eatState || !onEATUpdate) return;
    const next = eatApplyStep(eatState, {
      step:        cfg.step,
      session:     cfg.session,
      field:       cfg.field,
      value:       selection.id,
      environment: selection.eatEnv,
    });
    onEATUpdate(next);
  }

  function advance(newData: Record<string, string>, nextIndex: number) {
    if (nextIndex < steps.length) {
      setMorphing(true);
      setTimeout(() => {
        setStepIndex(nextIndex);
        setMorphing(false);
        onStepChange?.(steps[nextIndex].step);
      }, 460);
    } else {
      setMorphing(true);
      setTimeout(() => onComplete(newData), 480);
    }
  }

  function handleStepComplete(selection: RitualOption) {
    applyEAT(selection, config);
    const newData = { ...localData, [config.field]: selection.id };
    setLocalData(newData);
    advance(newData, stepIndex + 1);
  }

  function handleBack() {
    if (stepIndex === 0) return;
    setMorphing(true);
    setTimeout(() => {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      setMorphing(false);
      onStepChange?.(steps[prev].step);
    }, 380);
  }

  const nextSession = steps[Math.min(stepIndex + 1, steps.length - 1)]?.session;

  return (
    <>
      <AnimatePresence mode="wait">
        {!morphing && (
          <RitualStep
            key={config.step}
            config={config}
            onComplete={handleStepComplete}
            onBack={stepIndex > 0 ? handleBack : undefined}
          />
        )}
      </AnimatePresence>

      {/* ── Inter-session morph overlay — GPU-composited only ── */}
      <AnimatePresence>
        {morphing && (
          <motion.div
            key="ritual-morph"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(6,4,2,0.97)",
              backdropFilter: "blur(32px) saturate(0.4)",
              WebkitBackdropFilter: "blur(32px) saturate(0.4)",
              willChange: "transform, opacity",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.14, 1], opacity: [0.35, 0.88, 0.35] }}
              transition={{ duration: 0.44, ease: "easeInOut" }}
              style={{
                width: 3, height: 3, borderRadius: "50%",
                background: "rgba(212,175,55,0.92)",
                boxShadow: [
                  "0 0 80px 40px rgba(212,175,55,0.09)",
                  "0 0 28px 12px rgba(212,175,55,0.18)",
                ].join(", "),
                willChange: "transform, opacity",
              }}
            />
            <p style={{
              position: "absolute", bottom: 36,
              fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase",
              color: "rgba(212,175,55,0.38)", fontFamily: "monospace",
            }}>
              {stepIndex < steps.length - 1 ? nextSession : "SEALING RITUAL"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
