/**
 * ResumeSessionModal — NOVEE OS Cinematic Session Recovery
 * Authority: Profound Innovations LLC
 *
 * Renders when a ritual was in progress at last browser close.
 * Offers the guest a cinematic morph back into their exact ritual step
 * or a clean slate via "Begin Anew".
 *
 * Visual language: Obsidian Glass card · Brushed Titanium divider ·
 * Smoked Chrome CTAs · amber authority header.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { NoveePersistedState } from "@/lib/NoveeRegistry";

interface Props {
  saved:     NoveePersistedState;
  visible:   boolean;
  onResume:  () => void;
  onDiscard: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  ritual:           "PRE-DRAW RITUAL",
  draw_engineering: "DRAW ENGINEERING",
  ritual_post:      "SENSORY CALIBRATION",
};

export function ResumeSessionModal({ saved, visible, onResume, onDiscard }: Props) {
  const phaseLabel   = PHASE_LABEL[saved.phase] ?? saved.phase.toUpperCase();
  const lastSession  = saved.eatState.ledger.at(-1)?.session ?? "SESSION IN PROGRESS";
  const ledgerCount  = saved.eatState.ledger.length;
  const ageMs        = Date.now() - new Date(saved.timestamp).getTime();
  const ageMin       = Math.round(ageMs / 60_000);
  const ageLabel     = ageMin < 1 ? "Moments ago" : ageMin < 60
    ? `${ageMin} minute${ageMin === 1 ? "" : "s"} ago`
    : `${Math.round(ageMin / 60)} hours ago`;

  const env = saved.eatState.environment;
  const envLabel = [env.lighting, env.ambiance, env.spatial]
    .filter((v) => v && v !== "neutral" && v !== "estate")
    .join(" · ") || "Initialising";

  const assetValues = Object.values(saved.eatState.asset).filter(Boolean);
  const assetLabel  = assetValues.length
    ? assetValues.slice(0, 3).join(" · ")
    : "Blueprint pending";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="resume-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.32 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed", inset: 0, zIndex: 350,
            background: "rgba(1,1,1,0.93)",
            backdropFilter: "blur(48px) saturate(0.3)",
            WebkitBackdropFilter: "blur(48px) saturate(0.3)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Inter', 'SF Pro Display', monospace",
          }}
        >
          {/* Ambient amber corona — slow pulse */}
          <motion.div
            animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.08, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
            style={{
              position: "absolute",
              width: 440, height: 440, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 68%)",
              pointerEvents: "none",
            }}
          />

          {/* Authority line */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            style={{
              fontSize: 8, letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "rgba(212,175,55,0.45)",
              marginBottom: 28,
            }}
          >
            NOVEE OS · PROFOUND INNOVATIONS · E.A.T. LEDGER
          </motion.p>

          {/* ── Main card ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.91, filter: "blur(14px)" }}
            animate={{ opacity: 1, scale: 1,    filter: "blur(0px)"  }}
            transition={{ delay: 0.08, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(255,255,255,0.035)",
              backdropFilter: "blur(28px) saturate(0.5)",
              WebkitBackdropFilter: "blur(28px) saturate(0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: "1px solid rgba(212,175,55,0.28)",
              borderRadius: 2,
              padding: "52px 58px 46px",
              width: "min(460px, 92vw)",
              boxShadow: "0 48px 96px -24px rgba(0,0,0,0.78)",
              position: "relative",
            }}
          >
            {/* Phase tag */}
            <p style={{
              fontSize: 8, letterSpacing: "0.34em",
              color: "rgba(212,175,55,0.5)",
              textTransform: "uppercase", marginBottom: 10,
            }}>
              {phaseLabel} · STEP {String(saved.absoluteStep).padStart(2, "0")} / 13
            </p>

            {/* Session name */}
            <h2 style={{
              fontSize: 21, fontWeight: 300, letterSpacing: "0.14em",
              color: "rgba(240,237,232,0.92)",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              {lastSession}
            </h2>

            {/* Age + ledger count */}
            <p style={{
              fontSize: 10, color: "rgba(195,190,180,0.42)",
              letterSpacing: "0.07em", marginBottom: 30,
            }}>
              {ageLabel} · {ledgerCount} transaction{ledgerCount !== 1 ? "s" : ""} committed
            </p>

            {/* ── Brushed Titanium divider ── */}
            <div style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(175,175,192,0.32), transparent)",
              marginBottom: 28,
            }} />

            {/* ── E.A.T. Summary ── */}
            <div style={{ marginBottom: 34 }}>
              {([
                ["ENVIRONMENT", envLabel],
                ["ASSET",       assetLabel],
                ["LEDGER",      `${ledgerCount} entries · ${saved.status}`],
              ] as [string, string][]).map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 9,
                    gap: 16,
                  }}
                >
                  <span style={{
                    fontSize: 8, letterSpacing: "0.26em",
                    color: "rgba(212,175,55,0.4)",
                    textTransform: "uppercase",
                    flexShrink: 0, paddingTop: 1,
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 9, color: "rgba(195,190,180,0.5)",
                    textAlign: "right", letterSpacing: "0.04em",
                    textTransform: "lowercase",
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* ── CTAs ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {/* Resume */}
              <motion.button
                whileHover={{ borderColor: "rgba(212,175,55,0.8)" }}
                whileTap={{ scale: 0.978 }}
                onClick={onResume}
                style={{
                  width: "100%", padding: "15px 0",
                  background: "none",
                  border: "1px solid rgba(212,175,55,0.52)",
                  color: "rgba(212,175,55,0.88)",
                  fontSize: 9, letterSpacing: "0.30em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'Inter', monospace",
                  transition: "border-color 0.25s",
                }}
              >
                RESUME RITUAL
              </motion.button>

              {/* Begin Anew */}
              <motion.button
                whileHover={{ borderColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.978 }}
                onClick={onDiscard}
                style={{
                  width: "100%", padding: "13px 0",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(175,170,160,0.46)",
                  fontSize: 9, letterSpacing: "0.24em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'Inter', monospace",
                  transition: "border-color 0.25s",
                }}
              >
                BEGIN ANEW
              </motion.button>
            </div>
          </motion.div>

          {/* Gate status */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            style={{
              marginTop: 22,
              fontSize: 8, letterSpacing: "0.3em",
              color: saved.gateVerified
                ? "rgba(212,175,55,0.32)"
                : "rgba(160,155,145,0.25)",
              textTransform: "uppercase",
            }}
          >
            {saved.gateVerified
              ? "● GATE VERIFIED · E.A.T. LEDGER INTACT"
              : "○ GATE UNVERIFIED · PIN REQUIRED ON RESUME"}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
