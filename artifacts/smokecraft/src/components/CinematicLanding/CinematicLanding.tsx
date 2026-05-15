/**
 * SMOKECRAFT 360 — Cinematic OS Landing
 *
 * SCENE 1 · THE AWAKENING
 *   True obsidian field. Slow-motion smoke volumes drift upward.
 *   Amber ember particles float from the floor. Floating telemetry
 *   data ghosts in/out. "WELCOME TO SMOKECRAFT 360" breathes
 *   centre-screen. An ENTER button pulses with three concentric rings.
 *
 * SCENE 2 · TOUCH ACTIVATION
 *   On ENTER: smoke disperses outward (scale + opacity exit).
 *   An expanding ring burst marks the click point. A rapid-fire
 *   system handshake sequence prints boot lines. Final line
 *   "WELCOME." blooms in serif. Then onActivate() is called.
 *
 * Audio: triggerSound("enter_activation") stub — wire to Howler.js
 *        when audio assets are ready (see visualPrompts.ts SOUND_HOOKS).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Pre-computed particle tables (stable — defined outside component) ─── */

const SMOKE_VOLS = [
  { left: "6%",  top: "60%", w: 540, h: 350, blur: 95,  op: 0.10, dur: 9,  ph: 0.0 },
  { left: "52%", top: "70%", w: 640, h: 430, blur: 115, op: 0.07, dur: 13, ph: 1.5 },
  { left: "28%", top: "44%", w: 450, h: 295, blur: 78,  op: 0.07, dur: 10, ph: 3.0 },
  { left: "74%", top: "54%", w: 410, h: 265, blur: 85,  op: 0.05, dur: 8,  ph: 2.0 },
  { left: "16%", top: "80%", w: 370, h: 235, blur: 72,  op: 0.09, dur: 12, ph: 0.5 },
  { left: "62%", top: "28%", w: 310, h: 200, blur: 68,  op: 0.05, dur: 11, ph: 4.0 },
  { left: "88%", top: "72%", w: 280, h: 180, blur: 60,  op: 0.06, dur: 14, ph: 2.5 },
];

const EMBERS = [
  { left: "11%", delay: 0.2,  dur: 6.5, size: 2.5, drift:  25 },
  { left: "22%", delay: 1.8,  dur: 8.0, size: 2.0, drift: -18 },
  { left: "34%", delay: 0.5,  dur: 5.5, size: 3.0, drift:  30 },
  { left: "46%", delay: 2.5,  dur: 7.5, size: 1.5, drift: -22 },
  { left: "57%", delay: 0.9,  dur: 6.0, size: 2.5, drift:  15 },
  { left: "68%", delay: 3.2,  dur: 9.0, size: 2.0, drift: -28 },
  { left: "80%", delay: 1.2,  dur: 7.0, size: 3.5, drift:  20 },
  { left: "17%", delay: 4.0,  dur: 5.0, size: 1.5, drift:  35 },
  { left: "41%", delay: 2.8,  dur: 8.5, size: 2.5, drift: -15 },
  { left: "72%", delay: 0.3,  dur: 6.8, size: 2.0, drift:  28 },
  { left: "87%", delay: 3.5,  dur: 7.2, size: 3.0, drift: -20 },
  { left: "5%",  delay: 1.6,  dur: 5.8, size: 1.5, drift:  18 },
  { left: "51%", delay: 4.5,  dur: 9.5, size: 2.0, drift: -32 },
  { left: "30%", delay: 0.8,  dur: 6.2, size: 2.5, drift:  22 },
  { left: "63%", delay: 2.1,  dur: 7.8, size: 1.5, drift: -12 },
  { left: "92%", delay: 3.8,  dur: 8.2, size: 2.0, drift:  16 },
  { left: "3%",  delay: 5.0,  dur: 5.2, size: 1.5, drift: -24 },
  { left: "76%", delay: 1.4,  dur: 7.4, size: 3.0, drift:  30 },
];

const TELEMETRY = [
  { text: "TEMP · 72°F",                   x: "7%",  y: "14%", dur: 4.5, delay: 1.0 },
  { text: "HUMIDITY · 68%",                x: "79%", y: "19%", dur: 5.5, delay: 2.5 },
  { text: "AI ENGINE · ONLINE",            x: "5%",  y: "79%", dur: 6.0, delay: 0.8 },
  { text: "STOCK · 247 UNITS ACTIVE",      x: "75%", y: "73%", dur: 4.5, delay: 3.5 },
  { text: "FLAVOR VECTORS · CALIBRATING",  x: "67%", y: "9%",  dur: 7.0, delay: 1.5 },
  { text: "SESSION · AWAITING INPUT",      x: "9%",  y: "59%", dur: 5.0, delay: 4.2 },
  { text: "CONCIERGE · READY",             x: "77%", y: "45%", dur: 6.5, delay: 0.3 },
  { text: "NOVEE OS v2026.05",             x: "35%", y: "86%", dur: 4.0, delay: 2.0 },
  { text: "BLEND MATRIX · LOADED",         x: "5%",  y: "35%", dur: 5.5, delay: 3.0 },
  { text: "PAIRING ENGINE · ARMED",        x: "72%", y: "58%", dur: 6.0, delay: 1.8 },
];

const HANDSHAKE_LINES = [
  { text: "SMOKECRAFT OS · BOOTING",           mono: true },
  { text: "SENSOR ARRAY ─────────────── ONLINE",   mono: true },
  { text: "FLAVOR INTELLIGENCE ──────── ACTIVE",   mono: true },
  { text: "LUXURY CONCIERGE ─────────── READY",    mono: true },
  { text: "CONNOISSEUR LINK ──────── ESTABLISHED", mono: true },
  { text: "WELCOME.",                              mono: false },
];

/* ── Component ─────────────────────────────────────────────────────────── */

interface Props {
  onActivate: () => void;
}

export default function CinematicLanding({ onActivate }: Props) {
  const [activating, setActivating]     = useState(false);
  const [shownLines, setShownLines]     = useState<number[]>([]);

  const handleEnter = async () => {
    if (activating) return;
    setActivating(true);
    // triggerSound("enter_activation"); // Howler.js — wire when audio ready

    // Stagger handshake lines
    for (let i = 0; i < HANDSHAKE_LINES.length; i++) {
      await new Promise<void>(res =>
        setTimeout(res, i === HANDSHAKE_LINES.length - 1 ? 480 : 260)
      );
      setShownLines(prev => [...prev, i]);
    }
    await new Promise<void>(res => setTimeout(res, 700));
    onActivate();
  };

  /* shared ease */
  const silk = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      key="cinematic-landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: silk } }}
      transition={{ duration: 0.6 }}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "#010101",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* ── SCENE 1: IDLE LAYER ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!activating && (
          <motion.div
            key="idle-layer"
            exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.9, ease: silk } }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {/* Smoke volumes */}
            {SMOKE_VOLS.map((v, i) => (
              <motion.div
                key={`smoke-${i}`}
                style={{
                  position: "absolute",
                  left: v.left, top: v.top,
                  width: v.w, height: v.h,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(200,180,150,1) 0%, transparent 68%)",
                  filter: `blur(${v.blur}px)`,
                  opacity: v.op,
                  transform: "translate(-50%, -50%)",
                }}
                animate={{
                  y: [-18, -52, -18],
                  x: [-6, 7, -6],
                  scale: [1, 1.07, 1],
                  opacity: [v.op, v.op * 1.55, v.op],
                }}
                transition={{
                  duration: v.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: v.ph,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ember particles — separate exit so they spark out fast */}
      <AnimatePresence>
        {!activating && (
          <motion.div
            key="ember-layer"
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {EMBERS.map((e, i) => (
              <motion.div
                key={`ember-${i}`}
                style={{
                  position: "absolute",
                  left: e.left, bottom: "-4px",
                  width: e.size, height: e.size,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, #ffcc44 0%, #D48B00 55%, transparent 100%)",
                  boxShadow: `0 0 ${e.size * 3}px ${e.size}px rgba(212,139,0,0.50)`,
                }}
                animate={{
                  y:       [0, -(170 + e.size * 22)],
                  x:       [0, e.drift],
                  opacity: [0, 0.88, 0.88, 0],
                }}
                transition={{
                  duration: e.dur,
                  delay: e.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                  repeatDelay: 0.4,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry ghosts */}
      <AnimatePresence>
        {!activating && (
          <motion.div
            key="telemetry-layer"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {TELEMETRY.map((t, i) => (
              <motion.span
                key={`tel-${i}`}
                style={{
                  position: "absolute",
                  left: t.x, top: t.y,
                  fontSize: 9, letterSpacing: "0.26em", fontWeight: 600,
                  fontFamily: "monospace",
                  color: "rgba(191,149,63,0.28)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
                animate={{ opacity: [0, 0.42, 0.18, 0.42, 0] }}
                transition={{
                  duration: t.dur,
                  delay: t.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {t.text}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient gold vignette glow — bottom edge */}
      <div
        style={{
          position: "absolute", bottom: 0, left: "10%", right: "10%", height: 220,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(191,149,63,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Centre idle content ───────────────────────────────────────── */}
      <AnimatePresence>
        {!activating && (
          <motion.div
            key="idle-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.5, ease: silk } }}
            transition={{ duration: 0.9, delay: 0.1 }}
            style={{
              position: "relative", zIndex: 10,
              display: "flex", flexDirection: "column",
              alignItems: "center", textAlign: "center",
            }}
          >
            {/* System identifier */}
            <motion.p
              animate={{ opacity: [0.38, 0.65, 0.38] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontSize: 9, letterSpacing: "0.44em", fontWeight: 700,
                color: "rgba(191,149,63,0.50)",
                textTransform: "uppercase", fontFamily: "monospace",
                marginBottom: 32, marginTop: 0,
              }}
            >
              NOVEE OS · SMOKECRAFT 360 · EXPERIENCE ENGINE
            </motion.p>

            {/* Main title — breathing */}
            <motion.h1
              animate={{ opacity: [0.82, 1, 0.82], scale: [1, 1.0045, 1] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "clamp(2.2rem, 5.5vw, 4rem)",
                fontWeight: 300,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: "rgba(232,222,208,0.95)",
                lineHeight: 1.12,
                margin: 0,
              }}
            >
              WELCOME TO<br />SMOKECRAFT 360
            </motion.h1>

            {/* Breathing gold rule */}
            <motion.div
              animate={{
                scaleX:  [0.35, 1.0, 0.35],
                opacity: [0.25, 0.65, 0.25],
              }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              style={{
                height: 1, width: 160,
                background:
                  "linear-gradient(90deg, transparent, #bf953f, transparent)",
                margin: "20px 0",
              }}
            />

            {/* Subtitle */}
            <motion.p
              animate={{ opacity: [0.30, 0.55, 0.30] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}
              style={{
                fontSize: 10, letterSpacing: "0.32em", fontWeight: 600,
                color: "rgba(191,149,63,0.45)",
                textTransform: "uppercase", fontFamily: "monospace",
                marginBottom: 56, marginTop: 0,
              }}
            >
              Connoisseur Intelligence System
            </motion.p>

            {/* ENTER button + pulse rings */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Three staggered pulse rings */}
              {([0, 0.85, 1.7] as const).map((delay, i) => (
                <motion.div
                  key={`ring-${i}`}
                  style={{
                    position: "absolute",
                    width: 152, height: 56,
                    borderRadius: 3,
                    border: "1px solid rgba(191,149,63,0.38)",
                    pointerEvents: "none",
                  }}
                  animate={{ scale: [1, 1.55, 2.2], opacity: [0.32, 0.10, 0] }}
                  transition={{
                    duration: 2.8, delay,
                    repeat: Infinity, ease: "easeOut",
                  }}
                />
              ))}

              <motion.button
                data-testid="btn-cinematic-enter"
                onClick={handleEnter}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 0 1px rgba(191,149,63,0.65), 0 0 55px rgba(191,149,63,0.18)",
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: "0 56px", height: 54,
                  background: "transparent",
                  border: "1px solid rgba(191,149,63,0.55)",
                  borderRadius: 3,
                  color: "rgba(191,149,63,0.88)",
                  fontFamily:
                    "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: 14, fontWeight: 600,
                  letterSpacing: "0.44em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 28px rgba(191,149,63,0.07)",
                  transition: "box-shadow 0.25s ease, color 0.25s ease",
                }}
              >
                ENTER
              </motion.button>
            </div>

            {/* Idle attractor pulse */}
            <motion.p
              animate={{ opacity: [0, 0.42, 0] }}
              transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
              style={{
                marginTop: 20, fontSize: 9, letterSpacing: "0.36em",
                color: "rgba(191,149,63,0.40)",
                textTransform: "uppercase", fontFamily: "monospace",
              }}
            >
              Touch to begin your experience
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCENE 2: ACTIVATION HANDSHAKE ───────────────────────────────── */}
      <AnimatePresence>
        {activating && (
          <motion.div
            key="handshake"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 0,
            }}
          >
            {/* Expanding burst ring — marks the activation point */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 7, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{
                position: "absolute",
                width: 152, height: 56,
                border: "1px solid rgba(191,149,63,0.55)",
                borderRadius: 3,
                pointerEvents: "none",
              }}
            />

            {/* Secondary tighter ring */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0.45 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.75, ease: "easeOut", delay: 0.1 }}
              style={{
                position: "absolute",
                width: 152, height: 56,
                border: "1px solid rgba(191,149,63,0.35)",
                borderRadius: 3,
                pointerEvents: "none",
              }}
            />

            {/* Handshake text lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 13, alignItems: "flex-start" }}>
              {HANDSHAKE_LINES.map((line, i) => {
                const visible = shownLines.includes(i);
                const isLast  = i === HANDSHAKE_LINES.length - 1;
                return (
                  <motion.p
                    key={`hs-${i}`}
                    initial={{ opacity: 0, x: -14 }}
                    animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{
                      margin: 0,
                      fontSize:      isLast ? 30 : 10,
                      letterSpacing: isLast ? "0.38em" : "0.22em",
                      fontWeight:    isLast ? 300 : 600,
                      fontFamily:    isLast
                        ? "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)"
                        : "monospace",
                      color: isLast
                        ? "rgba(232,222,208,0.95)"
                        : "rgba(191,149,63,0.62)",
                      textTransform: "uppercase",
                      marginTop:     isLast ? 16 : 0,
                    }}
                  >
                    {line.text}
                  </motion.p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
