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

  // ── Per-craft BLACKOUT audio ──────────────────────────────────────────────
  const BLACKOUT_AUDIO: Record<string, string[]> = {
    pour:  ["/audio/ice_crack_resonance.mp3", "/audio/liquid_swirl_01.mp3"],
    smoke: ["/audio/smoke_exhale_deep.mp3"],
    brew:  ["/audio/steam_hiss_01.mp3"],
    vape:  [],   // silent vacuum — the silence IS the luxury
  };

  // ── Per-craft BLACKOUT background tint ────────────────────────────────────
  const BLACKOUT_BG: Record<string, string> = {
    pour:  "radial-gradient(ellipse at 50% 60%, rgba(38,24,2,1) 0%, #000 68%)",
    smoke: "radial-gradient(ellipse at 50% 60%, rgba(14,10,6,1) 0%, #000 68%)",
    brew:  "radial-gradient(ellipse at 50% 60%, rgba(28,16,2,1) 0%, #000 68%)",
    vape:  "radial-gradient(ellipse at 50% 60%, rgba(8,2,22,1)  0%, #000 68%)",
  };

  // ── Per-craft telemetry label ─────────────────────────────────────────────
  const TELEMETRY_LABEL: Record<string, string> = {
    pour:  "RESERVE PROTOCOL ARMED",
    smoke: "SOVEREIGN LOUNGE ARMED",
    brew:  "TAPMASTER ENGINE ARMED",
    vape:  "FREQUENCY ARRAY ARMED",
  };

  // ── BLACKOUT phase: 3-second timer + audio ────────────────────────────────
  useEffect(() => {
    if (phase !== "BLACKOUT") return;

    const srcs = BLACKOUT_AUDIO[craftType] ?? BLACKOUT_AUDIO.pour!;
    srcs.forEach(src => {
      try { const a = new Audio(src); a.volume = 0.42; a.play().catch(() => {}); } catch { /* no audio */ }
    });

    // telemetry_status → ARMED after 3 s; advance to CHAMBER
    const t = setTimeout(() => setPhase("CHAMBER"), 3000);
    return () => clearTimeout(t);
  }, [phase, craftType]); // eslint-disable-line react-hooks/exhaustive-deps

  // CHAMBER exit duration — keep in sync with the chamber motion transition below
  const CHAMBER_EXIT_MS = 2800;

  return (
    // Gate layer: positioned fixed above everything, covers full viewport.
    // We keep this mounted even during the SWIPE phase so AnimatePresence can
    // run the CHAMBER exit dissolve before navigation occurs.
    <div style={{ position: "fixed", inset: 0, zIndex: 180, pointerEvents: phase === "SWIPE" ? "none" : undefined }}>
      <AnimatePresence mode="wait">

        {/* ── Cinematic Intro ───────────────────────────────────────────── */}
        {phase === "INTRO" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <CraftCinematicOpening
              type={craftType}
              onComplete={() => setPhase("BLACKOUT")}
            />
          </motion.div>
        )}

        {/* ── Pitch-black Blackout (telemetry armed) ───────────────────── */}
        {phase === "BLACKOUT" && (
          <motion.div
            key="blackout"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            style={{
              position:       "absolute",
              inset:          0,
              background:     BLACKOUT_BG[craftType] ?? "#000",
              cursor:         "none",
              zIndex:         10,
              display:        "flex",
              alignItems:     "flex-end",
              justifyContent: "flex-start",
              padding:        44,
            }}
          >
            {/* Craft-specific ambient pulse during blackout */}
            {craftType === "pour"
              ? <AmberCorePulse corner="bottom-left" size={11} />
              : <EmberHeartbeat color={theme.accent} corner="bottom-left" size={11} dragX={blackoutX} />
            }

            {/* Per-craft telemetry readout — monospace bottom-right */}
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
                {TELEMETRY_LABEL[craftType] ?? "TELEMETRY ARMED"}
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* ── Initiation Chamber ───────────────────────────────────────── */}
        {phase === "CHAMBER" && (
          <motion.div
            key="chamber"
            initial={{ opacity: 0, scale: 1.08, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
            transition={{ duration: 2.8, ease: [0.23, 1, 0.32, 1] }}
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <CraftEntryChamber
              type={craftType}
              theme={theme}
              onBegin={() => {
                if (doneRef.current) return;
                doneRef.current = true;
                // Advance phase to SWIPE — AnimatePresence runs the chamber
                // exit blur+scale dissolve (CHAMBER_EXIT_MS). Defer navigation
                // callback until after that dissolve completes.
                setPhase("SWIPE");
                setTimeout(onChamberBegin, CHAMBER_EXIT_MS);
              }}
              onBack={onBack}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
