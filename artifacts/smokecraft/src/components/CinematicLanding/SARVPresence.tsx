/**
 * SARVPresence — NOVEE OS · Sovereign Athletic Recovery Vault
 *
 * E.A.T. cinematic entry screen for the SARV module.
 *
 * Material architecture (locked spec):
 *   — Obsidian glass rgba(10,8,6,0.90), backdropFilter blur 32px sat 0.6
 *   — Carbon fiber twill weave texture at structural layers
 *   — 52px brushed titanium header rail with horizontal grain
 *   — Smoked chrome bolt accents at logic board vertices
 *   — 135° angular chrome border
 *   — Hero bg: titanium recovery pod interior, 18% brightness / 28px blur
 *   — Bioluminescent amber pulse glow synchronized to resting heart rate (60bpm)
 *   — 4-tile strip: HYDRATION · OXYGEN · NEURAL · MUSCULAR
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;

interface Props {
  onComplete: () => void;
}

/* ── Macro photography — SARV ─────────────────────────────────────── */
const MACRO = {
  pod:      "https://thumbs.dreamstime.com/b/high-tech-carbon-fiber-weave-texture-detailed-macro-photograph-captures-intricate-twill-performance-composite-glossy-415462336.jpg",
  titanium: "https://t3.ftcdn.net/jpg/19/96/35/22/360_F_1996352231_ng1GElEjYHEZH2m4wPv0TPI8DwdgAi6V.jpg",
  neural:   "https://media.gettyimages.com/id/1283589374/photo/bubbles-in-dark-beer.jpg?s=612x612&w=0&k=20&c=nrE_iCkHa5sC8lcq3oX3dxLEhDcKKV1gvLk0r7ZSMf4=",
  carbon:   "https://thumbs.dreamstime.com/b/high-tech-carbon-fiber-weave-texture-detailed-macro-photograph-captures-intricate-twill-performance-composite-glossy-415462336.jpg",
};

/* ── 4-tile material strip ────────────────────────────────────────── */
const TILES = [
  { id: "hydration", label: "HYDRATION", sub: "Cellular Matrix",    img: MACRO.neural,   delay: 0.10 },
  { id: "oxygen",    label: "OXYGEN",    sub: "Respiratory Load",   img: MACRO.titanium, delay: 0.22 },
  { id: "neural",    label: "NEURAL",    sub: "Cortical Recovery",  img: MACRO.carbon,   delay: 0.34 },
  { id: "muscular",  label: "MUSCULAR",  sub: "Fiber Regeneration", img: MACRO.pod,      delay: 0.46 },
];

/* ── Boot ticker ──────────────────────────────────────────────────── */
const BOOT_LINES = [
  "CALIBRATING NEURAL LOAD…",
  "SYNCING BIOMETRIC FEED…",
  "OPTIMIZING RECOVERY VECTORS…",
  "HSI ENGINE ONLINE",
];

/* ── System gauges ────────────────────────────────────────────────── */
const GAUGES = [
  { label: "HYDRATION INDEX",       pct: 94  },
  { label: "OXYGEN SATURATION",     pct: 100 },
  { label: "NEURAL LOAD CLEARANCE", pct: 78  },
  { label: "MUSCULAR RECOVERY",     pct: 62  },
];

/* ── Bioluminescent amber — 60bpm heart rate period = 1000ms ───────── */
const BIO = "rgba(255,176,50,";

export default function SARVPresence({ onComplete }: Props) {
  const [bootStep, setBootStep] = useState(0);
  const [ready,    setReady]    = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const panelCtrl               = useAnimation();
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* boot sequence */
  useEffect(() => {
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step >= BOOT_LINES.length) {
        clearInterval(iv);
        setBootStep(BOOT_LINES.length - 1);
        setTimeout(() => setReady(true), 500);
      } else {
        setBootStep(step);
      }
    }, 680);
    return () => clearInterval(iv);
  }, []);

  /* heartbeat panel glow — 60bpm */
  useEffect(() => {
    if (!ready) return;
    panelCtrl.start({
      boxShadow: [
        `0 0 0 1px ${BIO}0.22), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03)`,
        `0 0 0 1px ${BIO}0.55), 0 0 140px ${BIO}0.10), inset 0 1px 0 rgba(255,255,255,0.06)`,
        `0 0 0 1px ${BIO}0.22), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03)`,
      ],
      transition: { duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] },
    });
  }, [ready, panelCtrl]);

  /* auto-advance at 5.5s */
  useEffect(() => {
    timerRef.current = setTimeout(handleProceed, 5500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleProceed() {
    if (exiting) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(onComplete, 700);
  }

  return (
    <motion.div
      key="sarv-presence"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: silk }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#010101",
        display: "flex", flexDirection: "column",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        overflow: "hidden",
      }}
    >
      {/* ── Carbon fiber twill hero bg — recovery pod interior ─────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${MACRO.pod})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(28px) brightness(0.18) saturate(0.4)",
        transform: "scale(1.08)",
      }} />

      {/* ── Deep obsidian radial vignette ──────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(12,6,2,0.5) 0%, rgba(1,1,1,0.78) 60%, #010101 100%)",
      }} />

      {/* ── Carbon fiber twill overlay — structural texture ─────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, opacity: 0.06,
        backgroundImage: `
          repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px,
            transparent 1px, transparent 8px
          ),
          repeating-linear-gradient(
            -45deg,
            rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px,
            transparent 1px, transparent 8px
          )
        `,
        pointerEvents: "none",
      }} />

      {/* ── Bioluminescent amber pulse — 60bpm heartbeat ────────────── */}
      <motion.div
        animate={{ opacity: [0.05, 0.22, 0.05], scale: [1, 1.04, 1] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 900, height: 240,
          background: `radial-gradient(ellipse 55% 100% at 50% 0%, ${BIO}0.9), transparent)`,
          zIndex: 3, pointerEvents: "none",
        }}
      />

      {/* ── Secondary biometric pulse — ambient floor glow ───────────── */}
      <motion.div
        animate={{ opacity: [0.02, 0.08, 0.02] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1], delay: 0.5 }}
        style={{
          position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 120,
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${BIO}0.7), transparent)`,
          zIndex: 3, pointerEvents: "none",
        }}
      />

      {/* ════════════════════════════════════════════════════════════
          BRUSHED TITANIUM HEADER RAIL — 52px
          Rank: SOVEREIGN ATHLETE · RECOVERY TIER 1 etched right
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: silk }}
        style={{
          position: "relative", zIndex: 10,
          height: 52,
          background: "linear-gradient(180deg, #282828 0%, #1A1A1A 28%, #222222 60%, #181818 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
        }}
      >
        {/* horizontal grain — brushed titanium finish */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.16,
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)",
        }} />

        {/* left — smoked chrome bolt + system designation */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #B8B8B8 0%, #606060 55%, #303030 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.5em", color: `${BIO}0.85)`, fontWeight: 300 }}>
            SARV · HUMAN STATE INTELLIGENCE ENGINE
          </span>
        </div>

        {/* right — rank etched into smoked chrome rail */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <span style={{
            fontSize: 8, letterSpacing: "0.38em",
            color: "rgba(185,165,120,0.48)", fontStyle: "italic",
          }}>
            SOVEREIGN ATHLETE
          </span>
          <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />
          <span style={{
            fontSize: 8, letterSpacing: "0.38em",
            color: "rgba(185,165,120,0.48)", fontStyle: "italic",
          }}>
            RECOVERY TIER 1
          </span>
          {/* biometric pulse indicator — 60bpm */}
          <motion.div
            animate={{ opacity: [1, 0.15, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: `${BIO}0.9)`,
              boxShadow: `0 0 6px ${BIO}0.6)`,
              marginLeft: 6,
            }}
          />
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #B8B8B8 0%, #606060 55%, #303030 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          }} />
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════
          MAIN PRESENCE PANEL
          ════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10, padding: "28px 24px",
      }}>

        {/* left depth strip — carbon fiber close-up */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 0.32, x: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: silk }}
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 440,
            backgroundImage: `url(${MACRO.carbon})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(4px) brightness(0.38) saturate(0.3)",
            WebkitMaskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.55) 65%, transparent)",
            maskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.55) 65%, transparent)",
          }}
        />

        {/* right depth strip — brushed titanium surface */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.25, x: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: silk }}
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 440,
            backgroundImage: `url(${MACRO.titanium})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(5px) brightness(0.3) saturate(0.25)",
            WebkitMaskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.55) 65%, transparent)",
            maskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.55) 65%, transparent)",
          }}
        />

        {/* ── Biometric pulse wave — glass tube simulation ─────────── */}
        <motion.div
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 580, height: 2,
            background: `linear-gradient(90deg,
              transparent 0%,
              ${BIO}0.0) 10%,
              ${BIO}0.6) 25%,
              ${BIO}0.9) 35%,
              rgba(255,240,200,1.0) 50%,
              ${BIO}0.9) 65%,
              ${BIO}0.6) 75%,
              ${BIO}0.0) 90%,
              transparent 100%
            )`,
            boxShadow: `0 0 12px ${BIO}0.5), 0 0 32px ${BIO}0.2)`,
            zIndex: 1,
            borderRadius: 2,
          }}
        />

        {/* ── Obsidian glass panel ───────────────────────────────────── */}
        <motion.div
          animate={panelCtrl}
          initial={{ boxShadow: `0 0 0 1px ${BIO}0.15), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03)` }}
          style={{
            position: "relative", width: "100%", maxWidth: 580,
            background: "rgba(10,8,6,0.92)",
            backdropFilter: "blur(32px) saturate(0.6)",
            WebkitBackdropFilter: "blur(32px) saturate(0.6)",
            borderRadius: 3, overflow: "hidden",
            zIndex: 2,
          }}
        >
          {/* 135° angular gradient border — smoked chrome */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 3,
            border: "1px solid transparent",
            background: `linear-gradient(rgba(10,8,6,0.92), rgba(10,8,6,0.92)) padding-box,
              linear-gradient(135deg,
                ${BIO}0.5) 0%,
                rgba(60,45,18,0.18) 25%,
                rgba(100,85,50,0.0) 50%,
                rgba(100,85,50,0.18) 75%,
                ${BIO}0.45) 100%
              ) border-box`,
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* inset top rule — machined titanium edge */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${BIO}0.6) 18%, rgba(255,230,150,0.9) 50%, ${BIO}0.6) 82%, transparent)`,
          }} />

          {/* smoked chrome corner bolts — logic board vertices */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              top: pos.t, bottom: pos.b, left: pos.l, right: pos.r,
              width: 7, height: 7, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(160,145,115,0.9) 0%, rgba(65,55,30,0.8) 55%, rgba(15,12,5,0.95) 100%)",
              boxShadow: "0 0 4px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.2)",
              zIndex: 3,
            }} />
          ))}

          <div style={{ padding: "40px 48px 44px", position: "relative", zIndex: 1 }}>

            {/* eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: silk }}
              style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
            >
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${BIO}0.45))` }} />
              <span style={{ fontSize: 9, letterSpacing: "0.5em", color: `${BIO}0.7)`, fontWeight: 300 }}>
                H.S.I. ENGINE · BIOMETRIC RECOVERY PROTOCOL
              </span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${BIO}0.45))` }} />
            </motion.div>

            {/* hero heading */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.32, ease: silk }}
              style={{
                fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 300,
                letterSpacing: "0.09em", color: "rgba(228,218,198,0.97)",
                lineHeight: 1.1, margin: 0, marginBottom: 6, textAlign: "center",
              }}
            >
              SOVEREIGN ATHLETIC
              <br />RECOVERY VAULT
              <br />
              <span style={{ color: `${BIO}0.55)`, fontSize: "0.52em", letterSpacing: "0.16em" }}>
                OBSIDIAN TITANIUM SERIES · TIER 1 PROTOCOL
              </span>
            </motion.h1>

            {/* boot ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              style={{ textAlign: "center", margin: "20px 0 32px" }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={bootStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    fontSize: 9, letterSpacing: "0.45em", fontFamily: "monospace",
                    color: ready ? "rgba(34,216,110,0.85)" : `${BIO}0.62)`,
                  }}
                >
                  {BOOT_LINES[bootStep]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* system gauges — 4 biometric channels */}
            {GAUGES.map(({ label, pct }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.45 + i * 0.1, ease: silk }}
                style={{ marginBottom: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 8.5, letterSpacing: "0.4em", color: "rgba(148,130,98,0.72)" }}>
                    {label}
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 + i * 0.1 }}
                    style={{ fontSize: 8.5, letterSpacing: "0.2em", color: `${BIO}0.88)`, fontFamily: "monospace" }}
                  >
                    {pct}%
                  </motion.span>
                </div>
                <div style={{
                  height: 2, width: "100%", borderRadius: 1,
                  background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden",
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.1, delay: 0.55 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 1,
                      background: pct === 100
                        ? "linear-gradient(90deg, rgba(34,216,110,0.7), rgba(34,216,110,0.95))"
                        : `linear-gradient(90deg, ${BIO}0.65), rgba(255,210,80,0.92))`,
                    }}
                  />
                </div>
              </motion.div>
            ))}

            {/* CTA */}
            <AnimatePresence>
              {ready && (
                <motion.button
                  key="cta"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: silk }}
                  onClick={handleProceed}
                  whileHover={{
                    background: `${BIO}0.09)`,
                    boxShadow: `0 0 0 1px ${BIO}0.6), 0 16px 48px rgba(0,0,0,0.7), 0 0 60px ${BIO}0.16)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    marginTop: 28, width: "100%", height: 52, borderRadius: 2,
                    border: `1px solid ${BIO}0.4)`,
                    background: `${BIO}0.06)`,
                    cursor: "pointer",
                    fontSize: 11, letterSpacing: "0.5em",
                    color: `${BIO}0.95)`,
                    textTransform: "uppercase",
                    fontFamily: "'Cormorant Garamond', serif",
                    boxShadow: `0 0 0 1px ${BIO}0.18), 0 8px 32px rgba(0,0,0,0.7)`,
                  }}
                >
                  ENTER THE VAULT
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* bottom chrome rule */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${BIO}0.4) 28%, rgba(255,230,150,0.65) 50%, ${BIO}0.4) 72%, transparent)`,
          }} />
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          4-TILE MATERIAL STRIP — HYDRATION / OXYGEN / NEURAL / MUSCULAR
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: silk }}
        style={{
          position: "relative", zIndex: 10,
          display: "flex", height: 96,
          borderTop: "1px solid rgba(255,255,255,0.045)",
        }}
      >
        {TILES.map((tile, i) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: tile.delay + 0.5 }}
            style={{
              flex: 1, position: "relative", overflow: "hidden",
              borderRight: i < TILES.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${tile.img})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "brightness(0.28) saturate(0.35)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(1,1,1,0.2), rgba(1,1,1,0.62))",
            }} />
            {/* top rule — machined chrome edge */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, rgba(140,120,75,0.08), ${BIO}0.3) 50%, rgba(140,120,75,0.08))`,
            }} />
            {/* carbon fiber weave sub-texture */}
            <div style={{
              position: "absolute", inset: 0, opacity: 0.08,
              backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 6px)",
            }} />
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.45em", color: `${BIO}0.78)` }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 6.5, letterSpacing: "0.3em", color: "rgba(130,110,72,0.52)", marginTop: 2 }}>
                {tile.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* bottom watermark */}
      <div style={{
        position: "absolute", bottom: 104, left: 0, right: 0,
        textAlign: "center", zIndex: 11, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 7, letterSpacing: "0.5em", color: "rgba(110,90,55,0.38)" }}>
          NOVEE OS · SARV · SOVEREIGN ATHLETIC RECOVERY VAULT · TIER 1
        </span>
      </div>
    </motion.div>
  );
}
