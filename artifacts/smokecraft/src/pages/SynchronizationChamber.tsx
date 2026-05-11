/**
 * SynchronizationChamber — Step 7: SYNCHRONIZATION
 * Route: /synchronization/:type
 *
 * Full-screen smoke ritual. Three timed system checks, then
 * "RITUAL CALIBRATED. ENTER THE SMOKE." CTA fires completeSynchronization().
 *
 * Visual: smoke blobs at opacity 0.9, slow strobe lighting, amber text.
 * Audio: "whisper_layer" env payload already sent by EFE.enterSynchronization().
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getCraftTheme } from "@/lib/craftThemes";
import { ExperienceFlowEngine } from "@/lib/experienceFlowEngine";
import EmberHeartbeat from "@/components/EmberHeartbeat";

// ── Smoke blob config ─────────────────────────────────────────────────────────

const BLOBS = Array.from({ length: 8 }, (_, i) => ({
  id:  i,
  x:   `${[12, 68, 38, 82, 22, 58, 44, 76][i]}%`,
  y:   `${[18, 12, 55, 42, 78, 70, 28, 85][i]}%`,
  w:   260 + (i % 3) * 80,
  dur: 8 + i * 1.4,
  del: i * 0.6,
  op:  0.72 + (i % 3) * 0.08,
}));

// ── System checks per spec ────────────────────────────────────────────────────

const CHECKS = [
  { id: "sse",      label: "SSE CONNECTION",         result: "CONFIRMED"   },
  { id: "telem",    label: "TELEMETRY STREAM",        result: "RECEIVING"   },
  { id: "mentor",   label: "MENTOR CALIBRATION",      result: "COMPLETE"    },
];

const CHECK_INTERVAL_MS = 1100;
const REVEAL_DELAY_MS   = CHECK_INTERVAL_MS * CHECKS.length + 600;

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:    "#020100",
  gold:  "#D4AF37",
  amber: "#D48B00",
  ink:   "rgba(240,232,212,0.92)",
  muted: "rgba(240,232,212,0.42)",
  dim:   "rgba(240,232,212,0.20)",
  mono:  "'JetBrains Mono','Courier New',monospace",
  serif: "'Cormorant Garamond',serif",
};

// ── Typewriter text ───────────────────────────────────────────────────────────

function Typewriter({ text, delay = 0, color = C.ink }: { text: string; delay?: number; color?: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 38);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  return (
    <span style={{ color, fontFamily: C.mono, letterSpacing: "0.14em" }}>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ color }}
        >▌</motion.span>
      )}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SynchronizationChamber() {
  const params   = useParams<{ type: string }>();
  const type     = params.type ?? "smoke";
  const [, navigate] = useLocation();
  const theme    = getCraftTheme(type);
  const accent   = theme.accent;

  const [completedChecks, setCompletedChecks] = useState(0);
  const [revealed,        setRevealed]        = useState(false);
  const [transitioning,   setTransitioning]   = useState(false);

  // Wire EFE on mount
  useEffect(() => {
    ExperienceFlowEngine.goTo("SYNCHRONIZATION");
    ExperienceFlowEngine.setCraft(type);
  }, [type]);

  // Timed system check sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    CHECKS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCompletedChecks(i + 1);
      }, CHECK_INTERVAL_MS * (i + 1)));
    });

    timers.push(setTimeout(() => setRevealed(true), REVEAL_DELAY_MS));

    return () => timers.forEach(clearTimeout);
  }, []);

  function handleEnter() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      const route = ExperienceFlowEngine.completeSynchronization();
      navigate(route);
    }, 600);
  }

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      background: C.bg,
      overflow:   "hidden",
      display:    "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex:     100,
    }}>

      {/* ── Smoke blobs — high opacity per spec ── */}
      {BLOBS.map(b => (
        <motion.div
          key={b.id}
          animate={{
            x:       [0, 22 - b.id * 3, 0],
            y:       [0, 14 + b.id * 2, 0],
            opacity: [b.op * 0.7, b.op, b.op * 0.75],
            scale:   [1, 1.08, 1],
          }}
          transition={{ duration: b.dur, delay: b.del, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            left:         b.x,
            top:          b.y,
            width:        b.w,
            height:       b.w,
            borderRadius: "50%",
            background:   `radial-gradient(circle, ${accent}22 0%, rgba(6,4,2,0) 72%)`,
            filter:       "blur(48px)",
            pointerEvents: "none",
            transform:    "translate(-50%,-50%)",
          }}
        />
      ))}

      {/* Slow strobe lighting — thin top bar */}
      <motion.div
        animate={{ opacity: [0, 0.18, 0, 0.10, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:   "fixed",
          top:        0, left: 0, right: 0,
          height:     3,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          pointerEvents: "none",
        }}
      />

      {/* ── Central panel ── */}
      <div style={{
        position:      "relative",
        zIndex:        10,
        width:         "100%",
        maxWidth:      480,
        padding:       "0 28px",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           0,
      }}>

        {/* Sigil — pulsing ring */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0px ${accent}00`,
              `0 0 60px ${accent}50`,
              `0 0 0px ${accent}00`,
            ],
          }}
          transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width:        72, height: 72,
            borderRadius: "50%",
            border:       `1px solid ${accent}50`,
            background:   `${accent}08`,
            display:      "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 32,
          }}
        >
          {/* SVG cigar cut sigil */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" stroke={accent} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />
            <line x1="16" y1="6" x2="16" y2="26" stroke={accent} strokeWidth="1" opacity="0.5" />
            <line x1="6" y1="16" x2="26" y2="16" stroke={accent} strokeWidth="1" opacity="0.5" />
            <circle cx="16" cy="16" r="3" fill={accent} opacity="0.9" />
          </svg>
        </motion.div>

        {/* Step label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ fontSize: 8, color: `${accent}70`, letterSpacing: "0.32em", textTransform: "uppercase", fontFamily: C.mono, marginBottom: 20 }}
        >
          STEP 7 OF 8 · SYNCHRONIZATION
        </motion.div>

        {/* System checks */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
          {CHECKS.map((check, i) => {
            const done = completedChecks > i;
            return (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: done ? 1 : 0.22, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                {/* Status dot */}
                <motion.div
                  animate={done ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                  transition={{ duration: 0.6 }}
                  style={{
                    width:        7, height: 7,
                    borderRadius: "50%",
                    background:   done ? C.gold : "rgba(240,232,212,0.18)",
                    flexShrink:   0,
                    boxShadow:    done ? `0 0 8px ${C.gold}` : "none",
                    transition:   "background 0.3s, box-shadow 0.3s",
                  }}
                />
                <span style={{ fontSize: 10, color: done ? C.ink : C.dim, fontFamily: C.mono, letterSpacing: "0.16em" }}>
                  {check.label}
                </span>
                <span style={{ fontSize: 10, color: done ? C.gold : C.dim, fontFamily: C.mono, marginLeft: "auto", letterSpacing: "0.12em" }}>
                  {done ? check.result : "—"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* "RITUAL CALIBRATED. ENTER THE SMOKE." */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: "center", marginBottom: 40 }}
            >
              <div style={{
                fontFamily:    C.serif,
                fontSize:      "clamp(20px,4vw,30px)",
                fontWeight:    700,
                color:         C.gold,
                letterSpacing: "0.08em",
                lineHeight:    1.3,
                marginBottom:  12,
              }}>
                <Typewriter text="RITUAL CALIBRATED." color={C.gold} />
              </div>
              <div style={{
                fontFamily:    C.serif,
                fontSize:      "clamp(14px,2.8vw,20px)",
                fontWeight:    400,
                color:         C.ink,
                letterSpacing: "0.12em",
              }}>
                <Typewriter text="ENTER THE SMOKE." delay={900} color={C.ink} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enter CTA — only after reveal */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "relative" }}
            >
              {/* Ember flare ring on transitioning */}
              {transitioning && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: 3.5, opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  style={{
                    position:     "absolute",
                    inset:        0,
                    borderRadius: "50%",
                    background:   `radial-gradient(circle, ${accent}50 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                animate={transitioning ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.4 }}
                onClick={handleEnter}
                style={{
                  width:         220, height: 220,
                  borderRadius:  "50%",
                  background:    `radial-gradient(circle, ${accent}20 0%, ${accent}08 60%, transparent 100%)`,
                  border:        `1px solid ${accent}60`,
                  cursor:        "pointer",
                  display:       "flex",
                  flexDirection: "column",
                  alignItems:    "center",
                  justifyContent:"center",
                  gap:           8,
                  boxShadow:     `0 0 60px ${accent}25, inset 0 0 40px ${accent}10`,
                  WebkitTapHighlightColor: "transparent",
                  touchAction:   "manipulation",
                } as React.CSSProperties}
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ fontSize: 28 }}
                >
                  🔥
                </motion.div>
                <span style={{ fontSize: 9, color: accent, fontFamily: C.mono, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                  ENTER THE SMOKE
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Ember persists */}
      <EmberHeartbeat color={accent} corner="bottom-left" size={7} />

      {/* Exit transition overlay */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            key="exit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            style={{ position: "fixed", inset: 0, background: "#020100", zIndex: 200, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
