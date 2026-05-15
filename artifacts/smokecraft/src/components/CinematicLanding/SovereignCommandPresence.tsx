/**
 * SovereignCommandPresence — NOVEE OS · Sovereign Command · Profound Innovations
 *
 * Master command hub E.A.T. cinematic entry frame.
 * Links Hospitality (CraftHub), Performance (SARV), Presence (Lexi Visuals),
 * and Supply (Sovereign Supply) under a single executive cockpit.
 *
 * Material architecture (locked spec):
 *   — Massive obsidian glass rgba(10,8,6,0.93), 32px blur, 0.6 saturation
 *   — Brushed titanium outer rail with carbon fiber internal structural dividers
 *   — Smoked chrome bolt accents at every structural intersection
 *   — 135° angular amber/bronze chrome border with sharp inset top highlight
 *   — 4-pillar macro photography convergence grid inside the panel
 *   — Volumetric amber radial glow at 60bpm physiological heartbeat
 *   — Hero bg: Maduro cigar oily texture at 18% brightness / 28px blur
 *   — 4-tile strip: CRAFTHUB | SARV | LEXI VISUALS | SOVEREIGN SUPPLY
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;
const AMBER = "rgba(212,175,55,";
const CHROME = "rgba(180,160,110,";

interface Props {
  onComplete: () => void;
}

/* ── Macro photography — 4 pillar convergence zones ─────────────── */
const MACRO = {
  /* Ritual — oily Maduro cigar texture */
  ritual:   "https://media.gettyimages.com/id/458635861/photo/cuban-cigar.jpg?s=612x612&w=0&k=20&c=NivIMmHqW8o3oiVZMJWFsEV2CyGbOhZE1pN5fDEkw0k=",
  /* Performance — amber / carbon fiber (SARV pulse reference) */
  perf:     "https://thumbs.dreamstime.com/b/high-tech-carbon-fiber-weave-texture-detailed-macro-photograph-captures-intricate-twill-performance-composite-glossy-415462336.jpg",
  /* Presence — caustic obsidian light refraction */
  presence: "https://media.gettyimages.com/id/2191335804/photo/abstract-light-reflection-on-water-with-a-glass-surface.jpg?s=612x612&w=0&k=20&c=qgtpC7usHfjg2TJXsTeqGtzYJ1VRTbH0mlhBoiQ4Fmk=",
  /* Supply — brushed titanium ledger surface */
  supply:   "https://t3.ftcdn.net/jpg/19/96/35/22/360_F_1996352231_ng1GElEjYHEZH2m4wPv0TPI8DwdgAi6V.jpg",
};

/* ── 4 pillar convergence zones (inside glass panel) ─────────────── */
const PILLARS = [
  {
    id: "ritual",
    label: "RITUAL",
    sub: "CRAFTHUB · HOSPITALITY",
    img: MACRO.ritual,
    accent: "rgba(191,149,63,",
  },
  {
    id: "perf",
    label: "PERFORMANCE",
    sub: "SARV · H.S.I. ENGINE",
    img: MACRO.perf,
    accent: "rgba(255,176,50,",
  },
  {
    id: "presence",
    label: "PRESENCE",
    sub: "LEXI VISUALS · OPTICS",
    img: MACRO.presence,
    accent: "rgba(160,180,210,",
  },
  {
    id: "supply",
    label: "SUPPLY",
    sub: "SOVEREIGN SUPPLY",
    img: MACRO.supply,
    accent: "rgba(170,160,140,",
  },
];

/* ── 4-tile navigation strip ──────────────────────────────────────── */
const TILES = [
  { id: "crafthub", label: "CRAFTHUB",         sub: "Hospitality Engine",  img: MACRO.ritual,   delay: 0.08 },
  { id: "sarv",     label: "SARV",             sub: "Recovery Vault",      img: MACRO.perf,     delay: 0.20 },
  { id: "lexi",     label: "LEXI VISUALS",     sub: "Presence Protocol",   img: MACRO.presence, delay: 0.32 },
  { id: "supply",   label: "SOVEREIGN SUPPLY", sub: "Distribution Layer",  img: MACRO.supply,   delay: 0.44 },
];

/* ── Boot ticker ──────────────────────────────────────────────────── */
const BOOT_LINES = [
  "INITIALIZING GLOBAL PRESENCE…",
  "SYNCING E.A.T. ENGINE…",
  "CALIBRATING H.S.I. MATRIX…",
  "COMMAND ESTABLISHED",
];

export default function SovereignCommandPresence({ onComplete }: Props) {
  const [bootStep, setBootStep] = useState(0);
  const [ready,    setReady]    = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const panelCtrl               = useAnimation();
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 720);
    return () => clearInterval(iv);
  }, []);

  /* 60bpm panel heartbeat */
  useEffect(() => {
    if (!ready) return;
    panelCtrl.start({
      boxShadow: [
        `0 0 0 1px ${AMBER}0.22), 0 0 100px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)`,
        `0 0 0 1px ${AMBER}0.6),  0 0 180px ${AMBER}0.10), inset 0 1px 0 rgba(255,255,255,0.07)`,
        `0 0 0 1px ${AMBER}0.22), 0 0 100px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)`,
      ],
      transition: { duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] },
    });
  }, [ready, panelCtrl]);

  useEffect(() => {
    timerRef.current = setTimeout(handleProceed, 6500);
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
      key="sovereign-command-presence"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: silk }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#010101",
        display: "flex", flexDirection: "column",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        overflow: "hidden",
      }}
    >
      {/* ── Hero bg — oily Maduro cigar, 18% brightness, 28px blur ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${MACRO.ritual})`,
        backgroundSize: "cover", backgroundPosition: "center 35%",
        filter: "blur(28px) brightness(0.18) saturate(0.5)",
        transform: "scale(1.10)",
      }} />

      {/* ── Sovereign obsidian vignette ───────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(8,5,2,0.4) 0%, rgba(1,1,1,0.80) 60%, #010101 100%)",
      }} />

      {/* ── Carbon fiber twill — structural texture overlay ──────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, opacity: 0.055, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px)",
      }} />

      {/* ── Volumetric amber radial glow — 60bpm ─────────────────── */}
      <motion.div
        animate={{ opacity: [0.07, 0.22, 0.07], scale: [1, 1.03, 1] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 1100, height: 280,
          background: `radial-gradient(ellipse 55% 100% at 50% 0%, ${AMBER}0.85), transparent)`,
          zIndex: 3, pointerEvents: "none",
        }}
      />

      {/* ── Secondary floor accent ───────────────────────────────── */}
      <motion.div
        animate={{ opacity: [0.02, 0.07, 0.02] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1], delay: 0.5 }}
        style={{
          position: "absolute", bottom: 95, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 130,
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${AMBER}0.6), transparent)`,
          zIndex: 3, pointerEvents: "none",
        }}
      />

      {/* ════════════════════════════════════════════════════════════
          BRUSHED TITANIUM OUTER RAIL — 52px
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: silk }}
        style={{
          position: "relative", zIndex: 10, height: 52,
          background: "linear-gradient(180deg, #2E2E2E 0%, #1E1E1E 28%, #262626 60%, #1A1A1A 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.065)",
          display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
        }}
      >
        {/* horizontal grain — brushed titanium */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.17,
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.055) 0px, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 3px)",
        }} />

        {/* left — smoked chrome bolt + sovereign designation */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #C8C8C8 0%, #686868 55%, #383838 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.28)",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.5em", color: `${AMBER}0.88)`, fontWeight: 300 }}>
            NOVEE OS · SOVEREIGN COMMAND · PROFOUND INNOVATIONS
          </span>
        </div>

        {/* right — status cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <span style={{ fontSize: 8, letterSpacing: "0.4em", color: `${CHROME}0.45)`, fontStyle: "italic" }}>
            COMMAND ESTABLISHED
          </span>
          <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />
          <motion.div
            animate={{ opacity: [1, 0.15, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: `${AMBER}0.9)`,
              boxShadow: `0 0 8px ${AMBER}0.6)`,
            }}
          />
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #C8C8C8 0%, #686868 55%, #383838 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.28)",
          }} />
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════
          MAIN COMMAND PANEL — obsidian glass
          ════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10, padding: "20px 24px",
      }}>

        {/* left depth strip */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 0.30, x: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: silk }}
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 180, height: 480,
            backgroundImage: `url(${MACRO.ritual})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(5px) brightness(0.38) saturate(0.45)",
            WebkitMaskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
            maskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
          }}
        />

        {/* right depth strip */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.22, x: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: silk }}
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 180, height: 480,
            backgroundImage: `url(${MACRO.supply})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(5px) brightness(0.28) saturate(0.3)",
            WebkitMaskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
            maskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
          }}
        />

        {/* ── Obsidian glass panel ──────────────────────────────── */}
        <motion.div
          animate={panelCtrl}
          initial={{ boxShadow: `0 0 0 1px ${AMBER}0.18), 0 0 100px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)` }}
          style={{
            position: "relative", width: "100%", maxWidth: 680,
            background: "rgba(10,8,6,0.93)",
            backdropFilter: "blur(32px) saturate(0.6)",
            WebkitBackdropFilter: "blur(32px) saturate(0.6)",
            borderRadius: 3, overflow: "hidden",
          }}
        >
          {/* 135° angular gradient border — amber/bronze chrome */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 3,
            border: "1px solid transparent",
            background: `linear-gradient(rgba(10,8,6,0.93), rgba(10,8,6,0.93)) padding-box,
              linear-gradient(135deg,
                ${AMBER}0.6) 0%,
                ${CHROME}0.22) 20%,
                rgba(60,45,15,0.08) 45%,
                ${CHROME}0.22) 75%,
                ${AMBER}0.55) 100%
              ) border-box`,
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* inset top highlight — machined chrome edge */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${AMBER}0.65) 15%, rgba(255,245,190,0.98) 50%, ${AMBER}0.65) 85%, transparent)`,
          }} />

          {/* smoked chrome bolt accents at all 4 vertices */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              top: pos.t, bottom: pos.b, left: pos.l, right: pos.r,
              width: 7, height: 7, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(215,195,135,0.95) 0%, rgba(90,70,25,0.8) 55%, rgba(18,13,4,0.95) 100%)",
              boxShadow: "0 0 4px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.22)",
              zIndex: 3,
            }} />
          ))}

          <div style={{ padding: "36px 44px 40px", position: "relative", zIndex: 1 }}>

            {/* eyebrow rule */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: silk }}
              style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}
            >
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${AMBER}0.42))` }} />
              <span style={{ fontSize: 9, letterSpacing: "0.5em", color: `${AMBER}0.68)`, fontWeight: 300 }}>
                MASTER COMMAND · CONVERGENCE PROTOCOL · ACTIVE
              </span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${AMBER}0.42))` }} />
            </motion.div>

            {/* hero heading */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.30, ease: silk }}
              style={{
                fontSize: "clamp(22px, 3.8vw, 36px)", fontWeight: 300,
                letterSpacing: "0.09em", color: "rgba(232,222,202,0.97)",
                lineHeight: 1.1, margin: 0, marginBottom: 6, textAlign: "center",
              }}
            >
              SOVEREIGN COMMAND
              <br />
              <span style={{ color: `${AMBER}0.58)`, fontSize: "0.55em", letterSpacing: "0.17em" }}>
                PROFOUND INNOVATIONS · EXECUTIVE COCKPIT
              </span>
            </motion.h1>

            {/* boot ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              style={{ textAlign: "center", margin: "18px 0 28px" }}
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
                    color: ready ? "rgba(34,216,110,0.85)" : `${AMBER}0.62)`,
                  }}
                >
                  {BOOT_LINES[bootStep]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* ── 4-PILLAR CONVERGENCE GRID — inside the glass panel ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45, ease: silk }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "auto auto",
                gap: 6,
                marginBottom: 28,
              }}
            >
              {PILLARS.map((pillar, i) => (
                <motion.div
                  key={pillar.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.10, ease: silk }}
                  style={{
                    position: "relative", height: 88, overflow: "hidden", borderRadius: 2,
                    border: `1px solid ${pillar.accent}0.20)`,
                  }}
                >
                  {/* macro photography — sharp focus zone */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${pillar.img})`,
                    backgroundSize: "cover",
                    backgroundPosition: i === 0 ? "center 30%" : "center",
                    filter: "brightness(0.35) saturate(0.5)",
                  }} />
                  {/* internal carbon fiber structural divider texture */}
                  <div style={{
                    position: "absolute", inset: 0, opacity: 0.07,
                    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px)",
                  }} />
                  {/* gradient overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(135deg, rgba(1,1,1,0.55), rgba(1,1,1,0.25) 50%, rgba(1,1,1,0.50))`,
                  }} />
                  {/* accent corner rule */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 1,
                    background: `linear-gradient(90deg, ${pillar.accent}0.6), transparent)`,
                  }} />
                  {/* smoked chrome intersection bolt — structural accent */}
                  <div style={{
                    position: "absolute", top: 6, right: 6,
                    width: 4, height: 4, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(200,185,140,0.9) 0%, rgba(60,48,20,0.8) 60%, rgba(8,6,2,0.95) 100%)",
                    boxShadow: "0 0 3px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }} />
                  {/* pillar label */}
                  <div style={{ position: "absolute", bottom: 10, left: 12 }}>
                    <div style={{ fontSize: 8, letterSpacing: "0.45em", color: `${pillar.accent}0.88)` }}>
                      {pillar.label}
                    </div>
                    <div style={{ fontSize: 6.5, letterSpacing: "0.3em", color: "rgba(130,115,80,0.52)", marginTop: 2 }}>
                      {pillar.sub}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

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
                    background: `${AMBER}0.10)`,
                    boxShadow: `0 0 0 1px ${AMBER}0.65), 0 20px 60px rgba(0,0,0,0.7), 0 0 80px ${AMBER}0.18)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", height: 52, borderRadius: 2,
                    border: `1px solid ${AMBER}0.42)`,
                    background: `${AMBER}0.07)`,
                    cursor: "pointer",
                    fontSize: 11, letterSpacing: "0.55em",
                    color: `${AMBER}0.96)`,
                    textTransform: "uppercase",
                    fontFamily: "'Cormorant Garamond', serif",
                    boxShadow: `0 0 0 1px ${AMBER}0.18), 0 8px 40px rgba(0,0,0,0.75)`,
                  }}
                >
                  ENTER SOVEREIGN COMMAND
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* bottom chrome rule */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${AMBER}0.42) 25%, rgba(255,245,180,0.65) 50%, ${AMBER}0.42) 75%, transparent)`,
          }} />
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          4-TILE NAVIGATION STRIP — CRAFTHUB | SARV | LEXI | SUPPLY
          Brushed titanium dividers between each zone
          ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.5, ease: silk }}
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
            transition={{ duration: 0.7, delay: tile.delay + 0.55 }}
            style={{
              flex: 1, position: "relative", overflow: "hidden",
              borderRight: i < TILES.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${tile.img})`,
              backgroundSize: "cover",
              backgroundPosition: i === 0 ? "center 30%" : "center",
              filter: "brightness(0.28) saturate(0.4)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(1,1,1,0.2), rgba(1,1,1,0.62))",
            }} />
            {/* brushed titanium top-edge rule per tile */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, rgba(170,150,95,0.08), ${AMBER}0.32) 50%, rgba(170,150,95,0.08))`,
            }} />
            {/* carbon fiber structural divider sub-texture */}
            <div style={{
              position: "absolute", inset: 0, opacity: 0.07,
              backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 6px)",
            }} />
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.45em", color: `${AMBER}0.78)` }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 6.5, letterSpacing: "0.3em", color: "rgba(130,112,72,0.5)", marginTop: 2 }}>
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
        <span style={{ fontSize: 7, letterSpacing: "0.5em", color: "rgba(110,90,50,0.35)" }}>
          NOVEE OS · SOVEREIGN COMMAND · PROFOUND INNOVATIONS · MASTER CONTROL PROTOCOL
        </span>
      </div>
    </motion.div>
  );
}
