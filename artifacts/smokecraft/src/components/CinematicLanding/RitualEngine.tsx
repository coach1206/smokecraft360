/**
 * RitualEngine — Orchestrator for Sessions 02–07
 * NOVEE OS · E.A.T. Framework · Profound Innovations
 *
 * Sequences RitualStep panels with the same obsidian morph overlay used
 * by the Home.tsx Terroir → Draw transition. Manages step state and
 * calls onComplete(RitualData) when all six sessions are locked.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RitualStep } from "./RitualStep";
import { RITUAL_STEPS } from "./RitualConfig";
import type { RitualData, RitualOption } from "./RitualConfig";

interface RitualEngineProps {
  onComplete: (data: RitualData) => void;
}

export function RitualEngine({ onComplete }: RitualEngineProps) {
  const [stepIndex, setStepIndex] = useState(0);       // 0–5 → sessions 02–07
  const [ritualData, setRitualData] = useState<RitualData>({});
  const [morphing,   setMorphing]   = useState(false);

  const config = RITUAL_STEPS[stepIndex];

  function advance(newData: RitualData) {
    if (stepIndex < RITUAL_STEPS.length - 1) {
      setMorphing(true);
      setTimeout(() => {
        setStepIndex((i) => i + 1);
        setMorphing(false);
      }, 460);
    } else {
      // Final session complete — morph out, then surface the data
      setMorphing(true);
      setTimeout(() => onComplete(newData), 480);
    }
  }

  function handleStepComplete(selection: RitualOption) {
    const newData: RitualData = { ...ritualData, [config.field]: selection.id };
    setRitualData(newData);
    advance(newData);
  }

  function handleBack() {
    if (stepIndex === 0) return;
    setMorphing(true);
    setTimeout(() => {
      setStepIndex((i) => i - 1);
      setMorphing(false);
    }, 380);
  }

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

      {/* Inter-session morph overlay — same GPU-only pattern as Home.tsx */}
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
            {/* Amber pulse core */}
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
            {/* Session counter — shows next step */}
            <p style={{
              position: "absolute", bottom: 36,
              fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase",
              color: "rgba(212,175,55,0.38)", fontFamily: "monospace",
            }}>
              {RITUAL_STEPS[Math.min(stepIndex + 1, RITUAL_STEPS.length - 1)]?.session ?? "FINALISING"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
