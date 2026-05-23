/**
 * InitiationChamber — 8-Scene Cinematic Pre-Swipe Ritual
 *
 * Scene 1 — The Origin          "SmokeCraft is ritual construction."
 * Scene 2 — The Levels          Curious Guest → Master of Smoke, one by one
 * Scene 3 — The Golden Box      Silhouette + gold particle emitters. Never clearly shown.
 * Scene 4 — The Ritual Scoring  Dynamic SVG XP rings — 5 scoring categories
 * Scene 5 — Mentor Philosophy   Smoke silhouettes drift. Mentor is coming.
 * Scene 6 — Challenge Path      3 paths with per-path lighting shift
 * Scene 7 — Identity Calibration Psychological questions. No forms. Pure instinct.
 * Scene 8 — Synchronization     Telemetry checks → ENTER THE SMOKE.
 *
 * Transition physics: 1.5s cross-fade + scale(1.08→1.0) on every scene change.
 * Text overlays: rgba(0,0,0,0.95) + blur(60px) brightness(0.15) + gold border.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import type { CraftTheme } from "@/lib/craftThemes";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:    "#060402",
  gold:  "#D4AF37",
  ink:   "rgba(245,242,237,0.92)",
  muted: "rgba(245,242,237,0.45)",
  dim:   "rgba(245,242,237,0.18)",
  serif: "'Cormorant Garamond', Georgia, serif",
  mono:  "'JetBrains Mono', 'Courier New', monospace",
};

// Smoked-glass text panel — per spec
const GLASS: React.CSSProperties = {
  background:           "rgba(0,0,0,0.95)",
  backdropFilter:       "blur(60px) brightness(0.15)",
  WebkitBackdropFilter: "blur(60px) brightness(0.15)",
  border:               "1px solid rgba(212,175,55,0.4)",
  borderRadius:         16,
  padding:              "32px 40px",
};

// Scene enter / animate / exit — 1.5s scale zoom-in per spec
const SE = { opacity: 0, scale: 1.08 } as const;
const SA = { opacity: 1, scale: 1.00 } as const;
const SX = { opacity: 0, scale: 0.96 } as const;
const ST = { duration: 1.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };

// ── Shared: floating amber particles ──────────────────────────────────────────

function Particles({ accent, n = 14 }: { accent: string; n?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: n }, (_, i) => (
        <motion.div key={i}
          style={{ position: "absolute", left: `${6 + i * (88 / n)}%`, bottom: -4, width: 1 + (i % 3) * 0.6, height: 1 + (i % 3) * 0.6, borderRadius: "50%", background: accent, opacity: 0.35 }}
          animate={{ y: [0, -(200 + i * 16)], opacity: [0.35, 0] }}
          transition={{ duration: 5 + (i % 5) * 1.1, delay: i * 0.38 + (i % 3) * 0.6, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── Shared: progress dots ──────────────────────────────────────────────────────

function SceneDots({ scene, accent }: { scene: number; accent: string }) {
  return (
    <div style={{ position: "absolute", top: 24, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 20, pointerEvents: "none" }}>
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div key={i}
          animate={{ opacity: i + 1 === scene ? 1 : i + 1 < scene ? 0.5 : 0.18, width: i + 1 === scene ? 16 : 6 }}
          transition={{ duration: 0.4 }}
          style={{ height: 5, borderRadius: 3, background: accent }}
        />
      ))}
    </div>
  );
}

// ── Shared: continue button ────────────────────────────────────────────────────

function ContinueBtn({ label = "CONTINUE ›", onClick, delay = 0, color }: { label?: string; onClick: () => void; delay?: number; color: string }) {
  return (
    <motion.button
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.7 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{ marginTop: 28, padding: "14px 44px", background: `${color}15`, border: `1px solid ${color}50`, borderRadius: 8, color, fontFamily: C.mono, fontSize: 11, letterSpacing: "0.24em", cursor: "pointer" }}
    >
      {label}
    </motion.button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 1 — The Origin
// ══════════════════════════════════════════════════════════════════════════════

const ORIGIN_LINES = [
  "SmokeCraft is not simply smoking.",
  "It is ritual construction.",
  "Balance.\u2003Pacing.\u2003Harmony.\u2003Legacy.",
];

function Scene1({ onNext, accent }: { onNext: () => void; accent: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= ORIGIN_LINES.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 2200);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <motion.div key="s1" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
      <Particles accent={accent} />

      {/* Smoke wisps */}
      {[0.12, 0.20, 0.14].map((op, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.18 + i * 0.06, 1], opacity: [op, op * 1.6, op] }}
          transition={{ duration: 9 + i * 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: `${14 + i * 28}%`, top: "18%", width: 300 + i * 80, height: 300 + i * 80, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22 0%, transparent 72%)`, filter: "blur(52px)", pointerEvents: "none" }}
        />
      ))}

      <div style={{ ...GLASS, maxWidth: 580, textAlign: "center", zIndex: 10 }}>
        {ORIGIN_LINES.map((line, i) => (
          <AnimatePresence key={i}>
            {shown > i && (
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily:    C.serif,
                  fontSize:      i === 2 ? "clamp(13px,2.4vw,19px)" : "clamp(18px,3.5vw,30px)",
                  fontWeight:    i === 0 ? 600 : 300,
                  color:         i === 2 ? C.muted : C.ink,
                  letterSpacing: "0.06em",
                  lineHeight:    1.55,
                  marginBottom:  i < 2 ? 20 : 0,
                }}
              >
                {line}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {shown >= ORIGIN_LINES.length && (
        <ContinueBtn label="ENTER THE RITUAL ›" onClick={onNext} delay={0.3} color={accent} />
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 2 — The Levels (one-by-one reveal)
// ══════════════════════════════════════════════════════════════════════════════

const LEVELS = [
  { name: "CURIOUS GUEST",   sub: "The beginning of the journey."   },
  { name: "EXPLORER",        sub: "Discovering the craft."           },
  { name: "BLENDER",         sub: "Creating with intention."         },
  { name: "ARTISAN",         sub: "Mastery through practice."        },
  { name: "MASTER OF SMOKE", sub: "The pinnacle. The legend."        },
];

function Scene2({ onNext, accent }: { onNext: () => void; accent: string }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= LEVELS.length) return;
    const t = setTimeout(() => setRevealed(r => r + 1), 1350);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <motion.div key="s2" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <Particles accent={accent} n={10} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.4 }}
        style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.38em", color: accent, textTransform: "uppercase", marginBottom: 28 }}>
        THE LEVELS OF MASTERY
      </motion.div>

      <div style={{ ...GLASS, width: "100%", maxWidth: 500, zIndex: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {LEVELS.map((lv, i) => (
            <AnimatePresence key={i}>
              {revealed > i && (
                <motion.div
                  initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <motion.div
                    animate={{ boxShadow: [`0 0 0px ${accent}00`, `0 0 16px ${accent}99`, `0 0 6px ${accent}44`] }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    style={{ width: 8, height: 8, borderRadius: "50%", background: i === LEVELS.length - 1 ? C.gold : accent, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: "0.2em", color: i === LEVELS.length - 1 ? C.gold : C.ink }}>
                      {lv.name}
                    </div>
                    <div style={{ fontFamily: C.serif, fontSize: 13, color: C.muted, marginTop: 3 }}>
                      {lv.sub}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>

      {revealed >= LEVELS.length && (
        <ContinueBtn onClick={onNext} delay={0.4} color={accent} />
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 3 — The Golden Box
// ══════════════════════════════════════════════════════════════════════════════

function GoldParticle({ i }: { i: number }) {
  const angle  = (i / 28) * Math.PI * 2;
  const radius = 56 + (i % 5) * 22;
  const ox = Math.cos(angle) * radius;
  const oy = Math.sin(angle) * radius;
  return (
    <motion.div
      style={{ position: "absolute", left: "50%", top: "50%", width: 3, height: 3, borderRadius: "50%", background: C.gold, marginLeft: -1.5, marginTop: -1.5 }}
      animate={{ opacity: [0, 0.95, 0], scale: [0, 1.3, 0], x: [ox, ox + (Math.random() - 0.5) * 36], y: [oy, oy - 28 - Math.random() * 44] }}
      transition={{ duration: 1.8 + (i % 5) * 0.4, delay: i * 0.11, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

function Scene3({ onNext, accent }: { onNext: () => void; accent: string }) {
  return (
    <motion.div key="s3" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>

      {/* Ambient gold radial */}
      <motion.div animate={{ opacity: [0.10, 0.24, 0.10] }} transition={{ duration: 4.2, repeat: Infinity }}
        style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 46%, rgba(212,175,55,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Box silhouette + orbiting gold particles */}
      <div style={{ position: "relative", marginBottom: 40, zIndex: 10 }}>
        {Array.from({ length: 28 }, (_, i) => <GoldParticle key={i} i={i} />)}
        <motion.div
          animate={{ boxShadow: [`0 0 18px rgba(212,175,55,0.12)`, `0 0 56px rgba(212,175,55,0.28)`, `0 0 18px rgba(212,175,55,0.12)`] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 76, height: 76, background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 8 }}
        />
      </div>

      <div style={{ ...GLASS, maxWidth: 500, textAlign: "center", zIndex: 10 }}>
        <div style={{ fontFamily: C.serif, fontSize: "clamp(14px,2.8vw,22px)", color: C.gold, letterSpacing: "0.14em", marginBottom: 14 }}>
          THE GOLDEN BOX
        </div>
        <div style={{ fontFamily: C.serif, fontSize: "clamp(13px,2.2vw,17px)", color: C.muted, letterSpacing: "0.06em", lineHeight: 1.65 }}>
          Reveals itself only to exceptional blend instinct<br />and rare harmony. It cannot be forced.
        </div>
      </div>

      <ContinueBtn onClick={onNext} delay={2.8} color={C.gold} />
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 4 — Ritual Scoring Rings
// ══════════════════════════════════════════════════════════════════════════════

const SCORING = [
  { label: "BALANCE",              value: 0.82, delay: 0.2 },
  { label: "COMPLEXITY",           value: 0.75, delay: 0.5 },
  { label: "PAIRING INTELLIGENCE", value: 0.91, delay: 0.8 },
  { label: "FLAVOR HARMONY",       value: 0.68, delay: 1.1 },
  { label: "PACING DECISIONS",     value: 0.78, delay: 1.4 },
];

function ScoringRing({ label, value, delay, accent }: { label: string; value: number; delay: number; accent: string }) {
  const r    = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - value) }}
            transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
            style={{ strokeDasharray: circ }}
          />
        </svg>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 1.0 }}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 9, color: accent }}>
          {Math.round(value * 100)}
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.3 }}
        style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.18em", color: C.muted }}>
        {label}
      </motion.div>
    </div>
  );
}

function Scene4({ onNext, accent }: { onNext: () => void; accent: string }) {
  return (
    <motion.div key="s4" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <Particles accent={accent} n={8} />

      <div style={{ ...GLASS, width: "100%", maxWidth: 480, zIndex: 10 }}>
        <div style={{ fontFamily: C.serif, fontSize: "clamp(13px,2.4vw,18px)", color: C.gold, letterSpacing: "0.14em", textAlign: "center", marginBottom: 28 }}>
          YOUR RITUAL WILL BE SHAPED BY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {SCORING.map(s => <ScoringRing key={s.label} {...s} accent={accent} />)}
        </div>
      </div>

      <ContinueBtn label="UNDERSTOOD ›" onClick={onNext} delay={2.8} color={accent} />
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 5 — Mentor Philosophy (smoke silhouettes)
// ══════════════════════════════════════════════════════════════════════════════

const SILHOUETTES = [
  { left: "16%", delay: 0.0, scale: 0.80 },
  { left: "50%", delay: 0.5, scale: 1.00 },
  { left: "82%", delay: 1.0, scale: 0.72 },
];

function Scene5({ onNext, accent }: { onNext: () => void; accent: string }) {
  return (
    <motion.div key="s5" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <Particles accent={accent} n={12} />

      {/* Smoke silhouettes */}
      {SILHOUETTES.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 0.16 + i * 0.06, y: [0, -10, 0] }}
          transition={{ opacity: { duration: 1.4, delay: s.delay }, y: { duration: 5 + i * 1.4, repeat: Infinity, ease: "easeInOut", delay: s.delay } }}
          style={{ position: "absolute", left: s.left, top: "14%", transform: "translateX(-50%)", width: 80 * s.scale, height: 200 * s.scale, background: `radial-gradient(ellipse at 50% 25%, ${accent}22 0%, transparent 65%)`, filter: `blur(${14 * s.scale}px)`, pointerEvents: "none" }}
        />
      ))}

      <div style={{ ...GLASS, maxWidth: 540, textAlign: "center", zIndex: 10 }}>
        <div style={{ fontFamily: C.serif, fontSize: "clamp(16px,3vw,26px)", fontWeight: 300, color: C.ink, letterSpacing: "0.08em", lineHeight: 1.6, marginBottom: 14 }}>
          "Every guest is guided by a mentor philosophy."
        </div>
        <div style={{ fontFamily: C.serif, fontSize: "clamp(12px,2vw,15px)", color: C.muted, letterSpacing: "0.06em", lineHeight: 1.55 }}>
          Your mentor will be assigned after calibration.<br />
          They will shape your blend, your pairings, and your journey.
        </div>
      </div>

      <ContinueBtn label="MEET MY MENTOR ›" onClick={onNext} delay={2.0} color={accent} />
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 6 — The Private Lounge (atmospheric intention, no choices)
// ══════════════════════════════════════════════════════════════════════════════

const LOUNGE_LINES = [
  "This is not an app.",
  "It is a private lounge.",
  "Your pace.\u2003Your instinct.\u2003Your ritual.",
];

function Scene6({ onNext, accent }: { onNext: (mode: string) => void; accent: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= LOUNGE_LINES.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 2000);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <motion.div key="s6" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
      <Particles accent={accent} n={12} />

      {/* Slow amber radial breath */}
      <motion.div
        animate={{ opacity: [0.06, 0.18, 0.06] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 55%, ${accent}20 0%, transparent 68%)`, pointerEvents: "none" }}
      />

      <div style={{ ...GLASS, maxWidth: 560, textAlign: "center", zIndex: 10 }}>
        {LOUNGE_LINES.map((line, i) => (
          <AnimatePresence key={i}>
            {shown > i && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily:    C.serif,
                  fontSize:      i === 0 ? "clamp(18px,3.5vw,30px)" : i === 2 ? "clamp(13px,2.2vw,19px)" : "clamp(15px,2.8vw,24px)",
                  fontWeight:    i === 0 ? 600 : 300,
                  color:         i === 2 ? accent : C.ink,
                  letterSpacing: i === 2 ? "0.14em" : "0.06em",
                  lineHeight:    1.6,
                  marginBottom:  i < 2 ? 22 : 0,
                }}
              >
                {line}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {shown >= LOUNGE_LINES.length && (
        <ContinueBtn label="I AM READY ›" onClick={() => onNext("guided")} delay={0.4} color={accent} />
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 7 — Identity Calibration (psychological questions, no forms)
// ══════════════════════════════════════════════════════════════════════════════

const CAL_QUESTIONS = [
  {
    id:      "presence",
    prompt:  "When you enter a room, your instinct is to...",
    options: [
      { value: "observer",  label: "Observe. Study. Then move with precision." },
      { value: "commander", label: "Command the space immediately."            },
    ],
  },
  {
    id:      "palate",
    prompt:  "Your palate is drawn toward...",
    options: [
      { value: "complexity", label: "Layered complexity — the long finish."    },
      { value: "intensity",  label: "Raw intensity — power you feel in full."  },
    ],
  },
  {
    id:      "ritual",
    prompt:  "You approach a new ritual by...",
    options: [
      { value: "cautious", label: "Exploring carefully. Let it reveal itself." },
      { value: "bold",     label: "Committing fully. No hesitation."           },
    ],
  },
  {
    id:      "mastery",
    prompt:  "What defines mastery to you?",
    options: [
      { value: "patience",  label: "Patience and refinement over time."      },
      { value: "instinct",  label: "Instinct sharpened through repetition."  },
    ],
  },
];

function Scene7({ onComplete, accent }: { onComplete: (a: Record<string, string>) => void; accent: string }) {
  const [qIdx,    setQIdx]    = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [chosen,  setChosen]  = useState<string | null>(null);
  const q = CAL_QUESTIONS[qIdx];

  const handleSelect = (val: string) => {
    if (chosen) return;
    setChosen(val);
    const next = { ...answers, [q.id]: val };
    setAnswers(next);
    setTimeout(() => {
      setChosen(null);
      if (qIdx < CAL_QUESTIONS.length - 1) setQIdx(i => i + 1);
      else onComplete(next);
    }, 620);
  };

  return (
    <motion.div key="s7" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <Particles accent={accent} n={10} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.2 }}
        style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.38em", color: accent, textTransform: "uppercase", marginBottom: 10, zIndex: 10 }}>
        IDENTITY CALIBRATION · {qIdx + 1} / {CAL_QUESTIONS.length}
      </motion.div>

      <div style={{ width: "100%", maxWidth: 500, zIndex: 10 }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, marginBottom: 32, overflow: "hidden" }}>
          <motion.div animate={{ width: `${(qIdx / CAL_QUESTIONS.length) * 100}%` }} transition={{ duration: 0.5 }}
            style={{ height: "100%", background: accent, borderRadius: 1 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={qIdx}
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -22 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{ ...GLASS, marginBottom: 16 }}>
              <div style={{ fontFamily: C.serif, fontSize: "clamp(16px,3vw,24px)", color: C.ink, letterSpacing: "0.06em", lineHeight: 1.5 }}>
                {q.prompt}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {q.options.map(opt => (
                <motion.button key={opt.value}
                  whileHover={{ x: 5, borderColor: accent + "55" }}
                  whileTap={{ scale: 0.97 }}
                  animate={chosen === opt.value ? { background: `${accent}18`, borderColor: `${accent}70` } : {}}
                  onClick={() => handleSelect(opt.value)}
                  style={{ padding: "20px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: C.serif, fontSize: "clamp(13px,2.2vw,17px)", color: C.muted, letterSpacing: "0.04em", transition: "border-color 0.2s, background 0.25s" }}>
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 8 — Synchronization (telemetry checks → ENTER THE SMOKE)
// ══════════════════════════════════════════════════════════════════════════════

const SYNC_CHECKS = [
  { label: "SSE CONNECTION",      result: "CONFIRMED" },
  { label: "TELEMETRY STREAM",    result: "RECEIVING"  },
  { label: "MENTOR CALIBRATION",  result: "COMPLETE"  },
  { label: "RITUAL INTELLIGENCE", result: "ARMED"     },
];

function Scene8({ onComplete, accent }: { onComplete: () => void; accent: string }) {
  const [checks,     setChecks]     = useState(0);
  const [revealed,   setRevealed]   = useState(false);
  const [exiting,    setExiting]    = useState(false);

  useEffect(() => {
    SYNC_CHECKS.forEach((_, i) => {
      setTimeout(() => setChecks(c => c + 1), 900 * (i + 1));
    });
    setTimeout(() => setRevealed(true), 900 * SYNC_CHECKS.length + 600);
  }, []);

  const handleEnter = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onComplete, 860);
  };

  return (
    <motion.div key="s8" initial={SE} animate={SA} exit={SX} transition={ST}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>

      {/* Slow top-edge strobe */}
      <motion.div animate={{ opacity: [0, 0.18, 0, 0.08, 0] }} transition={{ duration: 5, repeat: Infinity }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, pointerEvents: "none" }} />

      {/* Smoke blobs */}
      {[0.14, 0.10, 0.12].map((op, i) => (
        <motion.div key={i}
          animate={{ x: [0, 18 - i * 5, 0], y: [0, 12 + i * 4, 0], opacity: [op, op * 1.4, op] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: `${14 + i * 30}%`, top: "12%", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, ${accent}18 0%, transparent 72%)`, filter: "blur(52px)", pointerEvents: "none" }}
        />
      ))}

      <div style={{ ...GLASS, width: "100%", maxWidth: 460, zIndex: 10 }}>
        <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: "0.38em", color: `${accent}70`, textAlign: "center", marginBottom: 28, textTransform: "uppercase" }}>
          SYNCHRONIZATION
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 4 }}>
          {SYNC_CHECKS.map((ch, i) => {
            const done = checks > i;
            return (
              <motion.div key={ch.label} initial={{ opacity: 0.18 }} animate={{ opacity: done ? 1 : 0.18 }} transition={{ duration: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <motion.div animate={done ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.5 }}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: done ? C.gold : "rgba(255,255,255,0.18)", flexShrink: 0, boxShadow: done ? `0 0 9px ${C.gold}` : "none", transition: "background 0.3s, box-shadow 0.3s" }} />
                <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "0.16em", color: done ? C.ink : C.dim }}>{ch.label}</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: done ? C.gold : C.dim, marginLeft: "auto" }}>{done ? ch.result : "—"}</span>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}
              style={{ textAlign: "center", paddingTop: 28, borderTop: "1px solid rgba(212,175,55,0.15)", marginTop: 20 }}>
              <div style={{ fontFamily: C.serif, fontSize: "clamp(16px,3vw,24px)", color: C.gold, letterSpacing: "0.1em", marginBottom: 6 }}>
                THE RITUAL IS ARMED
              </div>
              <div style={{ fontFamily: C.serif, fontSize: "clamp(12px,2vw,15px)", color: C.muted }}>
                Enter the smoke.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {revealed && !exiting && (
          <motion.button
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnter}
            style={{ marginTop: 28, width: 148, height: 148, borderRadius: "50%", background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, border: `1px solid ${accent}55`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 0 44px ${accent}20`, zIndex: 10 }}>
            <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ fontSize: 26 }}>
              
            </motion.span>
            <span style={{ fontFamily: C.mono, fontSize: 8, color: accent, letterSpacing: "0.2em" }}>ENTER THE SMOKE</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Black-out exit */}
      <AnimatePresence>
        {exiting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 200, pointerEvents: "none" }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — InitiationChamber orchestrator
// ══════════════════════════════════════════════════════════════════════════════

interface InitiationChamberProps {
  craftType:  string;
  theme:      CraftTheme;
  onComplete: () => void;
}

export default function InitiationChamber({ craftType, theme, onComplete }: InitiationChamberProps) {
  const [scene,         setScene]         = useState(1);
  const [challengeMode, setChallengeMode] = useState("guided");
  const { enroll }                        = useGuestProfile();
  const accent                            = theme.accent;

  const advance = useCallback(() => setScene(s => Math.min(s + 1, 8)), []);

  async function handleCalibration(answers: Record<string, string>) {
    try {
      await enroll({
        firstName:            "Guest",
        atmospherePreference: answers.presence === "observer" ? "atmospheric" : "social",
        boldnessPreference:   answers.palate   === "complexity" ? "balanced" : "bold",
        experienceLevel:      answers.ritual   === "bold" ? "experienced" : "new",
        craftType:            (["smoke","pour","brew","vape"].includes(craftType)
                                ? craftType : "smoke") as "smoke"|"pour"|"brew"|"vape",
      });
    } catch { /* non-fatal — guest anonymous mode */ }
    advance();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.bg, overflow: "hidden" }}>
      {/* Persistent ambient glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 82%, rgba(212,139,0,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Scene progress dots */}
      <SceneDots scene={scene} accent={accent} />

      <AnimatePresence mode="wait">
        {scene === 1 && <Scene1 key="s1" onNext={advance} accent={accent} />}
        {scene === 2 && <Scene2 key="s2" onNext={advance} accent={accent} />}
        {scene === 3 && <Scene3 key="s3" onNext={advance} accent={accent} />}
        {scene === 4 && <Scene4 key="s4" onNext={advance} accent={accent} />}
        {scene === 5 && <Scene5 key="s5" onNext={advance} accent={accent} />}
        {scene === 6 && <Scene6 key="s6" onNext={(mode) => { setChallengeMode(mode); advance(); }} accent={accent} />}
        {scene === 7 && <Scene7 key="s7" onComplete={handleCalibration} accent={accent} />}
        {scene === 8 && <Scene8 key="s8" onComplete={onComplete} accent={accent} />}
      </AnimatePresence>
    </div>
  );
}
