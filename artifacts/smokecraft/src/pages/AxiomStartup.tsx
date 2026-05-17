/**
 * NoveeStartup — "The Machine Awakens"
 *
 * Cinematic OS boot sequence. Renders as a fixed overlay above all routes.
 * Shows exactly once per browser session (sessionStorage flag "axiom_booted").
 * Skippable by tap/click at any point after phase 1.
 *
 * Sequence:
 *   Phase 0 [0-700ms]    — Obsidian black
 *   Phase 1 [700-2600ms] — "PROFOUND INNOVATIONS" letter-by-letter reveal
 *   Phase 2 [2600-4000ms]— "Powered by NOVEE OS" + concentric rings + concentric rings
 *   Phase 3 [4000-6200ms]— Neural Bridge telemetry lines appear sequentially
 *   Phase 4 [6200-7000ms]— "SYSTEM READY" pulse
 *   Phase 5 [7000-7600ms]— Fade to black → unmount
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRAND_TEXT  = "PROFOUND INNOVATIONS";
const POWERED_SUB = "POWERED BY NOVEE OS";

const TELEMETRY_LINES = [
  "Neural Bridge Connected",
  "Mentor Intelligence Active",
  "Behavioral Systems Online",
  "Experience Engines Active",
  "Environmental Sync Complete",
  "Predictive Intelligence Ready",
];

const RING_COUNT = 5;

// ── Shared styles ─────────────────────────────────────────────────────────────

const GOLD: React.CSSProperties = {
  background:           "linear-gradient(180deg, #fff9e6 0%, #d4af37 48%, #8a6d3b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

const STARTUP_CSS = `
  @keyframes ring-radiate {
    0%   { transform: scale(0.18); opacity: 0.7; }
    70%  { opacity: 0.15; }
    100% { transform: scale(3.8); opacity: 0; }
  }
  @keyframes telem-scan {
    0%   { width: 0%; opacity: 0; }
    30%  { opacity: 1; }
    100% { width: 100%; opacity: 1; }
  }
  @keyframes ready-flash {
    0%,100% { opacity: 0; }
    40%,60% { opacity: 1; }
  }
  .axiom-ring {
    position: absolute;
    top: 50%; left: 50%;
    width: 180px; height: 180px;
    margin-left: -90px; margin-top: -90px;
    border-radius: 50%;
    border: 1px solid rgba(212,175,55,0.35);
    animation: ring-radiate 3.5s ease-out infinite;
    pointer-events: none;
  }
`;

// ── Letter reveal ─────────────────────────────────────────────────────────────

function LetterReveal({ text, delay = 0, color = "rgba(220,215,195,0.90)", size = 26, tracking = "0.55em" }: {
  text: string; delay?: number; color?: string; size?: number; tracking?: string;
}) {
  const letters = text.split("");
  return (
    <span style={{ display: "inline-block" }}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.055, duration: 0.28, ease: "easeOut" }}
          style={{
            display:       "inline-block",
            fontSize:      size,
            letterSpacing: char === " " ? "0.4em" : tracking,
            color,
            fontWeight:    600,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

// ── Concentric rings ──────────────────────────────────────────────────────────

function ConcentricRings({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {Array.from({ length: RING_COUNT }).map((_, i) => (
            <div
              key={i}
              className="axiom-ring"
              style={{ animationDelay: `${i * 0.6}s` }}
            />
          ))}
          {/* Core glow */}
          <motion.div
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:     "absolute",
              top:          "50%", left: "50%",
              width:        56, height: 56,
              marginLeft:   -28, marginTop: -28,
              borderRadius: "50%",
              background:   "radial-gradient(circle, rgba(212,175,55,0.55) 0%, transparent 70%)",
              filter:       "blur(6px)",
              pointerEvents:"none",
            }}
          />
          {/* Inner ring static */}
          <div style={{
            position:     "absolute",
            top:          "50%", left: "50%",
            width:        78, height: 78,
            marginLeft:   -39, marginTop: -39,
            borderRadius: "50%",
            border:       "1px solid rgba(212,175,55,0.50)",
            pointerEvents:"none",
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Telemetry line ────────────────────────────────────────────────────────────

function TelemLine({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: delay + 0.3 }}
        style={{
          display:      "inline-block",
          width:        5, height: 5,
          borderRadius: "50%",
          background:   "#d4af37",
          boxShadow:    "0 0 8px #d4af37",
          flexShrink:   0,
        }}
      />
      <span style={{
        fontSize:      11,
        letterSpacing: "0.30em",
        textTransform: "uppercase",
        color:         "rgba(200,190,160,0.70)",
        fontFamily:    "'Courier New', monospace",
      }}>
        {text}
      </span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.4 }}
        style={{
          fontSize:  10,
          color:     "rgba(212,175,55,0.55)",
          fontFamily:"'Courier New', monospace",
        }}
      >
        ✓
      </motion.span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AxiomStartup({ onComplete }: { onComplete: () => void }) {
  const [phase,    setPhase]    = useState(0);
  const [skipped,  setSkipped]  = useState(false);
  const timers                  = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const schedule = [
      [700,   () => setPhase(1)],  // brand reveal
      [2600,  () => setPhase(2)],  // rings + powered by
      [4000,  () => setPhase(3)],  // telemetry
      [6200,  () => setPhase(4)],  // system ready
      [7200,  () => { setPhase(5); setTimeout(onComplete, 600); }],
    ] as [number, () => void][];

    schedule.forEach(([ms, fn]) => {
      timers.current.push(setTimeout(fn, ms));
    });
    return () => timers.current.forEach(clearTimeout);
  }, [onComplete]);

  function skip() {
    if (phase < 1) return;
    timers.current.forEach(clearTimeout);
    setSkipped(true);
    setTimeout(onComplete, 500);
  }

  if (skipped) return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ position: "fixed", inset: 0, background: "#0A0808", zIndex: 99999, pointerEvents: "none" }}
    />
  );

  return (
    <AnimatePresence>
      {phase < 5 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          onClick={skip}
          style={{
            position:       "fixed",
            inset:          0,
            background:     [
              "#0A0808",
              "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(196,97,10,0.11) 0%, transparent 60%)",
              "radial-gradient(ellipse 50% 35% at 20% 90%, rgba(212,139,0,0.06) 0%, transparent 55%)",
              "radial-gradient(ellipse 40% 30% at 80% 70%, rgba(196,97,10,0.04) 0%, transparent 55%)",
            ].join(", "),
            zIndex:         99999,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         phase >= 1 ? "pointer" : "default",
            userSelect:     "none",
          }}
        >
          <style>{STARTUP_CSS}</style>

          {/* ── Concentric rings ── */}
          <ConcentricRings visible={phase >= 2} />

          {/* ── Star-field particles ── */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                position:     "fixed",
                left:         `${(i * 7.3 + 2) % 100}%`,
                top:          `${(i * 11.7 + 5) % 100}%`,
                width:        i % 5 === 0 ? 2 : 1,
                height:       i % 5 === 0 ? 2 : 1,
                borderRadius: "50%",
                background:   "rgba(255,255,255,0.25)",
                opacity:      0.05 + (i % 7) * 0.035,
                pointerEvents:"none",
              }}
            />
          ))}

          {/* ── Phase 1+: Brand wordmark ── */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", position: "relative", zIndex: 2 }}
              >
                {/* Company name */}
                <div style={{ marginBottom: 8 }}>
                  <LetterReveal
                    text={BRAND_TEXT}
                    delay={0}
                    color="rgba(220,215,195,0.88)"
                    size={22}
                    tracking="0.52em"
                  />
                </div>

                {/* Phase 2+: Powered by NOVEE OS */}
                <AnimatePresence>
                  {phase >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <div style={{
                        width:  "100%",
                        height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.40), transparent)",
                        margin: "16px 0",
                      }} />
                      <div style={{
                        ...GOLD,
                        fontSize:      32,
                        fontWeight:    900,
                        letterSpacing: "0.65em",
                        textTransform: "uppercase",
                        marginBottom:  6,
                      }}>
                        {POWERED_SUB.split("NOVEE OS").map((part, i) => (
                          i === 0
                            ? <span key={i} style={{ color: "rgba(180,170,150,0.55)", WebkitTextFillColor: "rgba(180,170,150,0.55)" }}>{part}</span>
                            : <span key={i} style={GOLD}>NOVEE OS</span>
                        ))}
                      </div>
                      <div style={{
                        fontSize:      8,
                        letterSpacing: "0.60em",
                        color:         "rgba(180,165,130,0.38)",
                        textTransform: "uppercase",
                      }}>
                        Sovereign Experience OS · v4.0
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Phase 3: Telemetry lines ── */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position:      "absolute",
                  bottom:        "18%",
                  left:          "50%",
                  transform:     "translateX(-50%)",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           12,
                  minWidth:      280,
                  zIndex:        2,
                }}
              >
                {TELEMETRY_LINES.map((line, i) => (
                  <TelemLine key={i} text={line} delay={i * 0.28} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Phase 4: System ready ── */}
          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0, 1, 0.7, 1], scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  position:  "absolute",
                  top:       "50%",
                  left:      "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex:    3,
                  textAlign: "center",
                }}
              >
                <div style={{
                  ...GOLD,
                  fontSize:      13,
                  letterSpacing: "0.8em",
                  fontWeight:    700,
                  textTransform: "uppercase",
                }}>
                  System Ready
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Skip hint ── */}
          {phase >= 2 && phase < 4 && (
            <div style={{
              position:      "fixed",
              bottom:        32,
              right:         32,
              fontSize:      9,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color:         "rgba(180,165,130,0.28)",
            }}>
              Tap to skip
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
