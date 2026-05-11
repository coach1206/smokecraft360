/**
 * RitualGate — Strict sequencer for the craft ritual.
 *
 * Enforces the immutable gate:
 *   INTRO → (user clicks "Enter") → BLACKOUT (3 s) → CHAMBER → SWIPE
 *
 * Nothing from the next phase can render until the current phase
 * explicitly advances. EFE step drives the initial phase so returning
 * mid-session starts at the correct point.
 *
 * When phase reaches SWIPE, the gate unmounts and calls onChamberBegin()
 * so ExperiencePage can navigate to the Synchronization route.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { CraftCinematicOpening }  from "@/components/CraftCinematicOpening";
import { CraftEntryChamber }      from "@/components/CraftEntryChamber";
import AmberCorePulse             from "@/components/AmberCorePulse";
import EmberHeartbeat             from "@/components/EmberHeartbeat";
import { ExperienceFlowEngine }   from "@/lib/experienceFlowEngine";
import type { CraftTheme }        from "@/lib/craftThemes";

type RitualPhase = "INTRO" | "BLACKOUT" | "CHAMBER" | "SWIPE";

const PAST_INTRO_STEPS = new Set([
  "CHALLENGE_SELECTION", "MENTOR_REVEAL", "IDENTITY_ENROLLMENT",
  "SYNCHRONIZATION", "SWIPE_RITUAL", "SPIRIT_CONSTRUCTION", "LEGACY_HANDOFF",
]);
const SWIPE_STEPS = new Set([
  "SWIPE_RITUAL", "SPIRIT_CONSTRUCTION", "LEGACY_HANDOFF",
]);

function derivePhase(): RitualPhase {
  const step = ExperienceFlowEngine.currentStep;
  if (SWIPE_STEPS.has(step))      return "SWIPE";
  if (PAST_INTRO_STEPS.has(step)) return "CHAMBER";
  return "INTRO";
}

interface Props {
  craftType:       string;
  theme:           CraftTheme;
  /** Called when chamber dismisses — ExperiencePage handles navigation + setRitualComplete */
  onChamberBegin:  () => void;
  onBack:          () => void;
}

export default function RitualGate({ craftType, theme, onChamberBegin, onBack }: Props) {
  const [phase, setPhase] = useState<RitualPhase>(derivePhase);
  const blackoutX = useMotionValue(0); // propagate-able drag x for ambient components
  const doneRef   = useRef(false);

  // ── BLACKOUT phase: 3-second timer + audio ────────────────────────────────
  useEffect(() => {
    if (phase !== "BLACKOUT") return;

    // BLACKOUT audio ritual — ice crack + liquid swirl for all crafts
    ["/audio/ice_crack_resonance.mp3", "/audio/liquid_swirl_01.mp3"].forEach(src => {
      try { const a = new Audio(src); a.volume = 0.42; a.play().catch(() => {}); } catch { /* no audio */ }
    });

    // telemetry_status → ARMED after 3 s; advance to CHAMBER
    const t = setTimeout(() => setPhase("CHAMBER"), 3000);
    return () => clearTimeout(t);
  }, [phase, craftType]);

  // ── Already at SWIPE — gate is inert ────────────────────────────────────
  if (phase === "SWIPE") return null;

  return (
    // Gate layer: positioned fixed above everything, covers full viewport
    <div style={{ position: "fixed", inset: 0, zIndex: 180 }}>
      <AnimatePresence mode="wait">

        {/* ── Step 2: CINEMATIC INTRO ────────────────────────────────────── */}
        {phase === "INTRO" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <CraftCinematicOpening
              type={craftType}
              onComplete={() => setPhase("BLACKOUT")}
            />
          </motion.div>
        )}

        {/* ── Step 3: PITCH-BLACK BLACKOUT (telemetry_status: ARMED) ─────── */}
        {phase === "BLACKOUT" && (
          <motion.div
            key="blackout"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            style={{
              position:       "absolute",
              inset:          0,
              background:     "#000",
              cursor:         "none",
              zIndex:         10,
              display:        "flex",
              alignItems:     "flex-end",
              justifyContent: "flex-start",
              padding:        44,
            }}
          >
            {/* Ambient presence during blackout */}
            {craftType === "pour"
              ? <AmberCorePulse corner="bottom-left" size={11} />
              : <EmberHeartbeat color={theme.accent} corner="bottom-left" size={11} dragX={blackoutX} />
            }

            {/* telemetry readout — monospace bottom-right */}
            <div style={{
              position:      "absolute",
              bottom:        48, right: 28,
              fontFamily:    "monospace",
              fontSize:      9,
              letterSpacing: "0.22em",
              color:         `${theme.accent}55`,
              textTransform: "uppercase",
              pointerEvents: "none",
            }}>
              <motion.span
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                TELEMETRY ARMED
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: INITIATION CHAMBER ────────────────────────────────── */}
        {phase === "CHAMBER" && (
          <motion.div
            key="chamber"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <CraftEntryChamber
              type={craftType}
              theme={theme}
              onBegin={() => {
                if (doneRef.current) return;
                doneRef.current = true;
                setPhase("SWIPE");
                onChamberBegin();
              }}
              onBack={onBack}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
