/**
 * IMAGE 10 — STEP 8/14: THE ENGINEERING OF THE DRAW
 *
 * Macro cross-section inspection of the completed cigar bunch (filler +
 * binder) on an obsidian inspection surface. A real-time Draw Flow Simulation
 * (DFS) panel overlays the view. The user taps five amber pressure nodes to
 * confirm Entubado density for the 47-ring-gauge specification. When all five
 * nodes are confirmed the DFS pulses gold and the PROCEED button unlocks.
 *
 * Voice: Leo (Clyde — smoke persona) via POST /api/voice/speak.
 *        Audio plays on mount (coaching intro) and on completion.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Props {
  onComplete: () => void;
  onExit: () => void;
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const TIMER_SECS = 300; // 5-minute validation window

const NODES = [
  { id: 0, label: "CORE",    cx: "50%", cy: "50%", spec: "LIGERO CORE · 0.82 g/cm³"       },
  { id: 1, label: "UPR-L",   cx: "35%", cy: "35%", spec: "SECO UPPER-L · 0.74 g/cm³"      },
  { id: 2, label: "UPR-R",   cx: "65%", cy: "35%", spec: "SECO UPPER-R · 0.76 g/cm³"      },
  { id: 3, label: "LWR-L",   cx: "33%", cy: "65%", spec: "VOLADO LOWER-L · 0.69 g/cm³"    },
  { id: 4, label: "LWR-R",   cx: "67%", cy: "65%", spec: "VOLADO LOWER-R · 0.71 g/cm³"    },
] as const;

const DFS_STAGES = [
  "DFS INACTIVE — AWAITING NODE INPUT",
  "CALCULATING · 1 OF 5 NODES CONFIRMED",
  "CALCULATING · 2 OF 5 NODES CONFIRMED",
  "VALIDATING · 3 OF 5 NODES CONFIRMED",
  "VALIDATING · 4 OF 5 NODES CONFIRMED",
  "OPTIMAL AIRFLOW · 47 RG CONFIRMED ✓",
];

const VOICE_INTRO =
  "J.C., this is the core of your craft. The cross-section before you shows " +
  "the Entubado — five filler leaves, now fully bound. Confirm each amber " +
  "pressure node to validate density. Your forty-seven ring gauge requires " +
  "precise airflow.";

const VOICE_COMPLETE =
  "Draw flow simulation complete. Airflow confirmed at specification. " +
  "The forty-seven ring gauge is optimal. You may proceed to the Final Roll.";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const silk = [0.22, 1, 0.36, 1] as const;

async function speakVoice(text: string): Promise<void> {
  try {
    const res = await fetch("/api/voice/speak", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, persona: "smoke" }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    /* audio unavailable — silent fallback */
  }
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function DrawEngineeringScene({ onComplete, onExit }: Props) {
  const [confirmed, setConfirmed]   = useState<Set<number>>(new Set());
  const [lastNode,  setLastNode]    = useState<number | null>(null);
  const [elapsed,   setElapsed]     = useState(0);
  const [done,      setDone]        = useState(false);
  const [speaking,  setSpeaking]    = useState(false);
  const goldControls = useAnimation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Countdown timer */
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  /* Voice intro on mount */
  useEffect(() => {
    setSpeaking(true);
    speakVoice(VOICE_INTRO).finally(() => setSpeaking(false));
  }, []);

  /* Node tap handler */
  const tapNode = useCallback(async (id: number) => {
    if (confirmed.has(id) || done) return;
    const next = new Set(confirmed);
    next.add(id);
    setConfirmed(next);
    setLastNode(id);

    if (next.size === NODES.length) {
      /* All confirmed — gold pulse + voice */
      if (timerRef.current) clearInterval(timerRef.current);
      setDone(true);
      goldControls.start({
        boxShadow: [
          "0 0 0px rgba(191,149,63,0)",
          "0 0 80px rgba(191,149,63,0.70)",
          "0 0 120px rgba(191,149,63,0.45)",
          "0 0 60px rgba(191,149,63,0.30)",
        ],
        transition: { duration: 1.6, ease: "easeOut" },
      });
      setSpeaking(true);
      speakVoice(VOICE_COMPLETE).finally(() => setSpeaking(false));
    }
  }, [confirmed, done, goldControls]);

  const progress     = (confirmed.size / NODES.length) * 100;
  const remaining    = Math.max(0, TIMER_SECS - elapsed);
  const dfsLabel     = DFS_STAGES[confirmed.size] ?? DFS_STAGES[5];
  const airflow      = (confirmed.size / NODES.length * 47.2).toFixed(1);

  return (
    <motion.div
      key="draw-engineering"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: silk } }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed", inset: 0, zIndex: 180,
        background: "#010101",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px 14px",
        borderBottom: "1px solid rgba(191,149,63,0.12)",
      }}>
        <div>
          <p style={{
            fontSize: 9, letterSpacing: "0.40em", fontWeight: 700,
            color: "rgba(191,149,63,0.50)", fontFamily: "monospace",
            textTransform: "uppercase", margin: 0,
          }}>
            ARCHITECT · STEP 8 / 14 — SOVEREIGN ASCENSION
          </p>
          <h1 style={{
            fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
            fontSize: "clamp(1.4rem, 2.8vw, 2rem)",
            fontWeight: 300, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(232,222,208,0.95)",
            margin: "4px 0 0",
          }}>
            The Engineering of the Draw
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Timer */}
          <div style={{ textAlign: "right" }}>
            <p style={{
              fontSize: 8, letterSpacing: "0.30em", fontWeight: 700,
              color: "rgba(191,149,63,0.38)", fontFamily: "monospace",
              textTransform: "uppercase", margin: "0 0 3px",
            }}>
              VALIDATION WINDOW
            </p>
            <motion.p
              animate={remaining < 60 ? { color: ["rgba(191,149,63,0.75)", "rgba(220,80,60,0.85)", "rgba(191,149,63,0.75)"] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                fontSize: 22, letterSpacing: "0.16em", fontWeight: 300,
                color: done ? "rgba(191,149,63,0.60)" : "rgba(191,149,63,0.75)",
                fontFamily: "monospace", margin: 0,
              }}
            >
              {done ? "LOCKED" : formatTime(remaining)}
            </motion.p>
          </div>

          {/* Exit */}
          <button
            onClick={onExit}
            style={{
              background: "transparent",
              border: "1px solid rgba(191,149,63,0.18)",
              borderRadius: 3,
              color: "rgba(191,149,63,0.40)",
              fontSize: 9, letterSpacing: "0.28em", fontWeight: 600,
              fontFamily: "monospace", textTransform: "uppercase",
              padding: "8px 16px", cursor: "pointer",
            }}
          >
            CANCEL
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", gap: 0, overflow: "hidden", minHeight: 0,
      }}>

        {/* LEFT — Inspection surface + cross-section ─────────────────── */}
        <motion.div
          animate={goldControls}
          style={{
            flex: "0 0 58%", position: "relative",
            borderRight: "1px solid rgba(191,149,63,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Obsidian inspection surface tile pattern */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "linear-gradient(rgba(191,149,63,0.025) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(191,149,63,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          {/* Surface label */}
          <div style={{
            position: "absolute", top: 16, left: 20,
            fontSize: 8, letterSpacing: "0.30em", fontWeight: 700,
            color: "rgba(191,149,63,0.28)", fontFamily: "monospace",
            textTransform: "uppercase",
          }}>
            OBSIDIAN INSPECTION SURFACE · 47 RG CROSS-SECTION
          </div>

          {/* The cross-section container */}
          <div style={{
            position: "relative",
            width: "min(420px, 70%)", height: "min(420px, 70%)",
          }}>
            {/* SVG cross-section art */}
            <svg
              viewBox="0 0 440 440"
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              {/* Outer shadow */}
              <defs>
                <radialGradient id="binderGrad" cx="40%" cy="35%" r="65%">
                  <stop offset="0%"   stopColor="#2A1A08" />
                  <stop offset="100%" stopColor="#120900" />
                </radialGradient>
                <radialGradient id="fillerGrad" cx="45%" cy="40%" r="60%">
                  <stop offset="0%"   stopColor="#0E0905" />
                  <stop offset="100%" stopColor="#070503" />
                </radialGradient>
                <filter id="leafShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Outer binder ring */}
              <circle cx="220" cy="220" r="204" fill="#0A0602" />
              <circle cx="220" cy="220" r="200" fill="url(#binderGrad)" />
              {/* Binder grain lines */}
              <circle cx="220" cy="220" r="200" fill="none" stroke="rgba(139,85,40,0.12)" strokeWidth="5" />
              <circle cx="220" cy="220" r="194" fill="none" stroke="rgba(100,60,22,0.08)" strokeWidth="2" />
              <circle cx="220" cy="220" r="190" fill="none" stroke="rgba(80,45,15,0.06)" strokeWidth="1" />

              {/* Inner filler cavity */}
              <circle cx="220" cy="220" r="182" fill="url(#fillerGrad)" />

              {/* Filler leaves — 5 lobes */}
              {/* Core / Ligero */}
              <ellipse cx="220" cy="220" rx="60" ry="90"
                fill="#1E1208" filter="url(#leafShadow)"
                transform="rotate(12 220 220)" />
              <ellipse cx="220" cy="220" rx="57" ry="86"
                fill="#201308" transform="rotate(12 220 220)" />

              {/* Upper-Left / Seco */}
              <ellipse cx="152" cy="155" rx="52" ry="78"
                fill="#1C1107" filter="url(#leafShadow)"
                transform="rotate(-30 152 155)" />
              <ellipse cx="152" cy="155" rx="49" ry="74"
                fill="#1E1208" transform="rotate(-30 152 155)" />

              {/* Upper-Right / Seco */}
              <ellipse cx="288" cy="155" rx="54" ry="76"
                fill="#1D1108" filter="url(#leafShadow)"
                transform="rotate(28 288 155)" />
              <ellipse cx="288" cy="155" rx="51" ry="72"
                fill="#1F1208" transform="rotate(28 288 155)" />

              {/* Lower-Left / Volado */}
              <ellipse cx="145" cy="286" rx="53" ry="72"
                fill="#1B1007" filter="url(#leafShadow)"
                transform="rotate(22 145 286)" />
              <ellipse cx="145" cy="286" rx="50" ry="68"
                fill="#1D1107" transform="rotate(22 145 286)" />

              {/* Lower-Right / Volado */}
              <ellipse cx="295" cy="286" rx="51" ry="74"
                fill="#1C1108" filter="url(#leafShadow)"
                transform="rotate(-22 295 286)" />
              <ellipse cx="295" cy="286" rx="48" ry="70"
                fill="#1E1208" transform="rotate(-22 295 286)" />

              {/* Leaf vein lines — very subtle */}
              <line x1="220" y1="140" x2="220" y2="300"
                stroke="rgba(139,85,40,0.06)" strokeWidth="1" />
              <line x1="140" y1="110" x2="195" y2="195"
                stroke="rgba(139,85,40,0.05)" strokeWidth="1" />
              <line x1="300" y1="110" x2="245" y2="195"
                stroke="rgba(139,85,40,0.05)" strokeWidth="1" />
              <line x1="120" y1="310" x2="188" y2="248"
                stroke="rgba(139,85,40,0.05)" strokeWidth="1" />
              <line x1="320" y1="310" x2="252" y2="248"
                stroke="rgba(139,85,40,0.05)" strokeWidth="1" />

              {/* DFS air-flow lines (animated paths between nodes) */}
              {confirmed.size >= 2 && (
                <line x1="152" y1="155" x2="220" y2="220"
                  stroke="rgba(191,149,63,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              )}
              {confirmed.size >= 3 && (
                <line x1="288" y1="155" x2="220" y2="220"
                  stroke="rgba(191,149,63,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              )}
              {confirmed.size >= 4 && (
                <line x1="145" y1="286" x2="220" y2="220"
                  stroke="rgba(191,149,63,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              )}
              {confirmed.size >= 5 && (
                <line x1="295" y1="286" x2="220" y2="220"
                  stroke="rgba(191,149,63,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              )}
            </svg>

            {/* Pressure nodes — absolutely positioned HTML buttons */}
            {NODES.map((node) => {
              const isConfirmed = confirmed.has(node.id);
              const isLast      = lastNode === node.id;
              return (
                <motion.button
                  key={node.id}
                  onClick={() => tapNode(node.id)}
                  initial={false}
                  animate={isConfirmed
                    ? { scale: 1, backgroundColor: "rgba(191,149,63,0.90)" }
                    : { scale: [1, 1.06, 1], backgroundColor: "rgba(191,149,63,0.70)" }
                  }
                  transition={isConfirmed
                    ? { duration: 0.25 }
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  }
                  whileHover={!isConfirmed ? { scale: 1.25, backgroundColor: "rgba(212,170,50,0.95)" } : {}}
                  whileTap={!isConfirmed ? { scale: 0.88 } : {}}
                  style={{
                    position: "absolute",
                    left: node.cx, top: node.cy,
                    transform: "translate(-50%, -50%)",
                    width: 22, height: 22,
                    borderRadius: "50%",
                    border: isConfirmed
                      ? "2px solid rgba(255,215,80,0.90)"
                      : "2px solid rgba(191,149,63,0.65)",
                    cursor: isConfirmed ? "default" : "pointer",
                    zIndex: 10,
                    boxShadow: isConfirmed
                      ? "0 0 18px rgba(191,149,63,0.70), 0 0 40px rgba(191,149,63,0.30)"
                      : "0 0 10px rgba(191,149,63,0.45)",
                  }}
                >
                  {/* Ripple on confirmation */}
                  <AnimatePresence>
                    {isLast && isConfirmed && (
                      <motion.span
                        key="ripple"
                        initial={{ scale: 1, opacity: 0.7 }}
                        animate={{ scale: 4.5, opacity: 0 }}
                        exit={{}}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        style={{
                          position: "absolute", inset: 0,
                          borderRadius: "50%",
                          border: "1px solid rgba(191,149,63,0.55)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Node labels below cross-section */}
          <div style={{
            position: "absolute", bottom: 18, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 8,
          }}>
            {NODES.map(n => (
              <span key={n.id} style={{
                fontSize: 8, letterSpacing: "0.22em", fontWeight: 700,
                fontFamily: "monospace", textTransform: "uppercase",
                color: confirmed.has(n.id)
                  ? "rgba(191,149,63,0.80)"
                  : "rgba(191,149,63,0.25)",
                transition: "color 0.3s ease",
              }}>
                {confirmed.has(n.id) ? "✓ " : "○ "}{n.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — DFS panel ───────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "24px 28px",
          gap: 22, overflow: "auto",
        }}>

          {/* DFS header */}
          <div>
            <p style={{
              fontSize: 8, letterSpacing: "0.38em", fontWeight: 700,
              color: "rgba(191,149,63,0.40)", fontFamily: "monospace",
              textTransform: "uppercase", margin: "0 0 8px",
            }}>
              DRAW FLOW SIMULATION · REAL-TIME
            </p>
            <div style={{
              padding: "14px 18px",
              background: "rgba(191,149,63,0.04)",
              border: `1px solid ${done ? "rgba(191,149,63,0.45)" : "rgba(191,149,63,0.12)"}`,
              borderRadius: 4,
              transition: "border-color 0.5s ease",
            }}>
              <motion.p
                key={dfsLabel}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  fontSize: 10, letterSpacing: "0.22em", fontWeight: 700,
                  color: done ? "rgba(191,149,63,0.90)" : "rgba(191,149,63,0.55)",
                  fontFamily: "monospace", textTransform: "uppercase", margin: 0,
                }}
              >
                {dfsLabel}
              </motion.p>
            </div>
          </div>

          {/* Airflow meter */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 8, letterSpacing: "0.28em", fontWeight: 700,
                color: "rgba(191,149,63,0.38)", fontFamily: "monospace",
                textTransform: "uppercase",
              }}>
                AIRFLOW
              </span>
              <span style={{
                fontSize: 8, letterSpacing: "0.22em", fontWeight: 700,
                color: "rgba(191,149,63,0.55)", fontFamily: "monospace",
              }}>
                {airflow} / 47.2 CFM
              </span>
            </div>
            <div style={{
              height: 6, background: "rgba(191,149,63,0.10)",
              borderRadius: 3, overflow: "hidden",
            }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: silk }}
                style={{
                  height: "100%",
                  background: done
                    ? "linear-gradient(90deg, #bf953f, #fcf6ba, #bf953f)"
                    : "linear-gradient(90deg, rgba(191,149,63,0.55), rgba(191,149,63,0.80))",
                  borderRadius: 3,
                  boxShadow: done ? "0 0 12px rgba(191,149,63,0.60)" : "none",
                }}
              />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 5,
            }}>
              <span style={{
                fontSize: 7, letterSpacing: "0.18em", fontWeight: 600,
                color: "rgba(191,149,63,0.22)", fontFamily: "monospace",
              }}>
                0.0
              </span>
              <span style={{
                fontSize: 7, letterSpacing: "0.18em", fontWeight: 600,
                color: "rgba(191,149,63,0.22)", fontFamily: "monospace",
              }}>
                TARGET: 47.2 CFM
              </span>
            </div>
          </div>

          {/* Node status grid */}
          <div>
            <p style={{
              fontSize: 8, letterSpacing: "0.30em", fontWeight: 700,
              color: "rgba(191,149,63,0.35)", fontFamily: "monospace",
              textTransform: "uppercase", margin: "0 0 10px",
            }}>
              NODE STATUS — {confirmed.size} / {NODES.length} CONFIRMED
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {NODES.map(node => {
                const ok = confirmed.has(node.id);
                return (
                  <motion.div
                    key={node.id}
                    animate={ok
                      ? { borderColor: "rgba(191,149,63,0.35)" }
                      : { borderColor: "rgba(191,149,63,0.10)" }
                    }
                    transition={{ duration: 0.3 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px",
                      background: ok ? "rgba(191,149,63,0.06)" : "rgba(191,149,63,0.02)",
                      border: "1px solid rgba(191,149,63,0.10)",
                      borderRadius: 3,
                      transition: "background 0.3s ease",
                    }}
                  >
                    <motion.div
                      animate={ok
                        ? { backgroundColor: "rgba(191,149,63,0.90)", boxShadow: "0 0 10px rgba(191,149,63,0.50)" }
                        : { backgroundColor: "rgba(191,149,63,0.18)", boxShadow: "none" }
                      }
                      transition={{ duration: 0.35 }}
                      style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 8, letterSpacing: "0.22em", fontWeight: 700,
                        color: ok ? "rgba(191,149,63,0.80)" : "rgba(191,149,63,0.30)",
                        fontFamily: "monospace", textTransform: "uppercase",
                        margin: "0 0 2px",
                        transition: "color 0.3s ease",
                      }}>
                        NODE {node.id + 1} — {node.label}
                      </p>
                      <p style={{
                        fontSize: 7, letterSpacing: "0.16em",
                        color: ok ? "rgba(191,149,63,0.45)" : "rgba(191,149,63,0.18)",
                        fontFamily: "monospace",
                        margin: 0,
                        transition: "color 0.3s ease",
                      }}>
                        {ok ? node.spec : "AWAITING CONFIRMATION"}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: ok ? "rgba(191,149,63,0.85)" : "rgba(191,149,63,0.18)",
                      transition: "color 0.3s ease",
                    }}>
                      {ok ? "✓" : "○"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Ring gauge spec */}
          <div style={{
            padding: "14px 16px",
            background: "rgba(191,149,63,0.03)",
            border: "1px solid rgba(191,149,63,0.10)",
            borderRadius: 4,
          }}>
            <p style={{
              fontSize: 8, letterSpacing: "0.30em", fontWeight: 700,
              color: "rgba(191,149,63,0.35)", fontFamily: "monospace",
              textTransform: "uppercase", margin: "0 0 10px",
            }}>
              SPECIFICATION — ENTUBADO CONFIGURATION
            </p>
            {[
              ["RING GAUGE",   "47 / 64 IN · 18.5 MM"],
              ["CONFIGURATION","ENTUBADO — 5 FILLER LEAVES"],
              ["BINDER",       "SINGLE WRAP · NICARAGUAN"],
              ["TARGET DRAW",  "2.5–3.2 IN H₂O"],
              ["DENSITY",      "0.70–0.84 g/cm³ PER LOBE"],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 6,
              }}>
                <span style={{
                  fontSize: 7, letterSpacing: "0.20em", fontWeight: 600,
                  color: "rgba(191,149,63,0.30)", fontFamily: "monospace",
                  textTransform: "uppercase",
                }}>
                  {k}
                </span>
                <span style={{
                  fontSize: 7, letterSpacing: "0.16em", fontWeight: 600,
                  color: "rgba(191,149,63,0.55)", fontFamily: "monospace",
                }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Voice bar */}
          <div style={{
            padding: "12px 16px",
            background: "rgba(191,149,63,0.03)",
            border: "1px solid rgba(191,149,63,0.10)",
            borderRadius: 4,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(191,149,63,0.12)",
              border: "1px solid rgba(191,149,63,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11 }}>🎙</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 7, letterSpacing: "0.24em", fontWeight: 700,
                color: "rgba(191,149,63,0.40)", fontFamily: "monospace",
                textTransform: "uppercase", margin: "0 0 4px",
              }}>
                LEO · VOICE COACH · SMOKE PERSONA
              </p>
              {/* Waveform bars */}
              <div style={{ display: "flex", gap: 2, alignItems: "center", height: 14 }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={speaking
                      ? { scaleY: [0.3, 1, 0.5, 0.9, 0.2, 0.7, 1, 0.4][i % 8] }
                      : { scaleY: 0.15 }
                    }
                    transition={{
                      duration: 0.4 + (i % 3) * 0.15,
                      repeat: speaking ? Infinity : 0,
                      ease: "easeInOut",
                      delay: i * 0.05,
                    }}
                    style={{
                      width: 2, height: 14,
                      background: speaking
                        ? "rgba(191,149,63,0.70)"
                        : "rgba(191,149,63,0.20)",
                      borderRadius: 1,
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* PROCEED button */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: silk }}
              >
                <motion.button
                  onClick={onComplete}
                  animate={{
                    boxShadow: [
                      "0 0 0 1px rgba(191,149,63,0.35), 0 0 20px rgba(191,149,63,0.10)",
                      "0 0 0 1px rgba(191,149,63,0.65), 0 0 45px rgba(191,149,63,0.25)",
                      "0 0 0 1px rgba(191,149,63,0.35), 0 0 20px rgba(191,149,63,0.10)",
                    ],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", height: 52,
                    background: "linear-gradient(135deg, hsl(43 75% 28%), hsl(45 85% 40%), hsl(43 75% 30%))",
                    border: "none",
                    borderRadius: 4,
                    color: "#0A0602",
                    fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                    fontSize: 13, fontWeight: 700,
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  PROCEED TO FINAL ROLL →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
