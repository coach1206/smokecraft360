/**
 * BeerCraftPresence — NOVEE OS · BEERCRAFT · Vessel Architecture Interface
 *
 * E.A.T. cinematic entry screen for the BeerCraft experience.
 * Renders before DesignPlayground / CraftFlow on first mount.
 *
 * Material architecture (locked spec):
 *   — Obsidian glass rgba(10,8,6,0.90), backdropFilter blur 32px sat 0.6
 *   — 52px brushed titanium header with horizontal grain sub-pixel texture
 *   — 8px smoked chrome bolt accents at corner vertices
 *   — 135° angular gradient border (amber/copper chrome highlights)
 *   — Inset top rule simulating machined edge overhead reflection
 *   — Hero bg: dark stout foam macro at 18% brightness / 28px blur
 *   — Low-ambient warmth — private cellar / luxury lounge lighting
 *   — Rank markers: ZYTHOPHILE / SOVEREIGN INNKEEPER in smoked chrome border
 *   — 4-tile material strip: ORIGIN / HOP PROFILE / MALT BODY / VESSEL TYPE
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;

interface Props {
  onComplete: () => void;
}

/* ── Macro photography — BeerCraft ───────────────────────────────── */
const MACRO = {
  foam:        "https://media.gettyimages.com/id/1283589374/photo/bubbles-in-dark-beer.jpg?s=612x612&w=0&k=20&c=nrE_iCkHa5sC8lcq3oX3dxLEhDcKKV1gvLk0r7ZSMf4=",
  condensation:"https://adaptalux.com/wp-content/uploads/2025/04/beer-glass-close-up-with-condensation.jpg",
  crema:       "https://static.vecteezy.com/system/resources/thumbnails/072/986/611/small/close-up-macro-view-of-rich-brown-coffee-foam-with-large-and-small-bubbles-against-a-dark-background-photo.jpg",
  titanium:    "https://t3.ftcdn.net/jpg/19/96/35/22/360_F_1996352231_ng1GElEjYHEZH2m4wPv0TPI8DwdgAi6V.jpg",
};

/* ── 4-tile material strip ────────────────────────────────────────── */
const TILES = [
  { id: "origin",  label: "ORIGIN",       sub: "Grain Source",           img: MACRO.foam,         delay: 0.10 },
  { id: "hop",     label: "HOP PROFILE",  sub: "Bitterness Matrix",      img: MACRO.condensation, delay: 0.22 },
  { id: "malt",    label: "MALT BODY",    sub: "Fermentation Depth",     img: MACRO.crema,        delay: 0.34 },
  { id: "vessel",  label: "VESSEL TYPE",  sub: "Container Architecture", img: MACRO.titanium,     delay: 0.46 },
];

/* ── Boot ticker ──────────────────────────────────────────────────── */
const BOOT_LINES = [
  "LOADING VESSEL SCHEMA…",
  "CALIBRATING HOP MATRIX…",
  "SYNCING FERMENTATION VAULT…",
  "VESSEL ARCHITECTURE SYNCED",
];

/* ── System gauges ────────────────────────────────────────────────── */
const GAUGES = [
  { label: "IBU MATRIX",           pct: 100 },
  { label: "MALT DEPTH",           pct: 85  },
  { label: "FERMENTATION PROFILE", pct: 71  },
];

/* ── Accent colour — copper warmth of BeerCraft ──────────────────── */
const COPPER = "rgba(184,115,51,";
const COPPER_GOLD = "rgba(200,140,60,";

export default function BeerCraftPresence({ onComplete }: Props) {
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
    }, 680);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!ready) return;
    panelCtrl.start({
      boxShadow: [
        `0 0 0 1px ${COPPER}0.25), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)`,
        `0 0 0 1px ${COPPER}0.6), 0 0 120px ${COPPER}0.14), inset 0 1px 0 rgba(255,255,255,0.06)`,
        `0 0 0 1px ${COPPER}0.25), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)`,
      ],
      transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    });
  }, [ready, panelCtrl]);

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
      key="beercraft-presence"
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
      {/* ── Hero bg — dark stout foam, 18% brightness, 28px blur ────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${MACRO.foam})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(28px) brightness(0.18) saturate(0.55)",
        transform: "scale(1.08)",
      }} />

      {/* ── Low-ambient warmth vignette — private cellar atmosphere ──── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse 75% 75% at 50% 60%, rgba(50,25,5,0.45) 0%, rgba(1,1,1,0.72) 55%, #010101 100%)",
      }} />

      {/* ── Copper radial glow heartbeat ─────────────────────────────── */}
      <motion.div
        animate={{ opacity: [0.06, 0.16, 0.06] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 180,
          background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${COPPER}0.8), transparent)`,
          zIndex: 2, pointerEvents: "none",
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          BRUSHED TITANIUM HEADER RAIL — 52px
          Rank markers: ZYTHOPHILE / SOVEREIGN INNKEEPER etched in chrome
          ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: silk }}
        style={{
          position: "relative", zIndex: 10,
          height: 52,
          background: "linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 30%, #252525 60%, #1A1A1A 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
        }}
      >
        {/* horizontal grain */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.18,
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)",
        }} />

        {/* left */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #D0D0D0 0%, #707070 60%, #404040 100%)",
            boxShadow: "0 0 4px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.5em", color: `${COPPER_GOLD}0.9)`, fontWeight: 300 }}>
            BEERCRAFT · VESSEL ARCHITECTURE SYNCED
          </span>
        </div>

        {/* right — rank markers etched into smoked chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <span style={{
            fontSize: 8, letterSpacing: "0.35em",
            color: "rgba(190,160,110,0.5)", fontStyle: "italic",
          }}>
            ZYTHOPHILE
          </span>
          <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
          <span style={{
            fontSize: 8, letterSpacing: "0.35em",
            color: "rgba(190,160,110,0.5)", fontStyle: "italic",
          }}>
            SOVEREIGN INNKEEPER
          </span>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#22D86E", marginLeft: 6 }}
          />
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #D0D0D0 0%, #707070 60%, #404040 100%)",
            boxShadow: "0 0 4px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          }} />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════
          MAIN PRESENCE PANEL
          ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10, padding: "32px 24px",
      }}>

        {/* left depth strip — dark foam */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 0.35, x: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: silk }}
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 440,
            backgroundImage: `url(${MACRO.foam})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(4px) brightness(0.4) saturate(0.5)",
            WebkitMaskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
            maskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
          }}
        />

        {/* right depth strip — frost condensation (frost-beaded growler) */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.28, x: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: silk }}
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 440,
            backgroundImage: `url(${MACRO.condensation})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(6px) brightness(0.35) saturate(0.4)",
            WebkitMaskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
            maskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.6) 65%, transparent)",
          }}
        />

        {/* ── Obsidian glass panel ── */}
        <motion.div
          animate={panelCtrl}
          initial={{ boxShadow: `0 0 0 1px ${COPPER}0.18), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)` }}
          style={{
            position: "relative", width: "100%", maxWidth: 560,
            background: "rgba(10,8,6,0.90)",
            backdropFilter: "blur(32px) saturate(0.6)",
            WebkitBackdropFilter: "blur(32px) saturate(0.6)",
            borderRadius: 4, overflow: "hidden",
          }}
        >
          {/* 135° angular gradient border — copper/bronze chrome */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 4,
            border: "1px solid transparent",
            background: `linear-gradient(rgba(10,8,6,0.9), rgba(10,8,6,0.9)) padding-box, linear-gradient(135deg, ${COPPER}0.55) 0%, rgba(60,35,10,0.2) 30%, rgba(120,80,30,0.4) 60%, ${COPPER_GOLD}0.55) 100%) border-box`,
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* inset top rule */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${COPPER}0.7) 20%, rgba(230,190,120,0.9) 50%, ${COPPER}0.7) 80%, transparent)`,
          }} />

          {/* corner bolts */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              top: pos.t, bottom: pos.b, left: pos.l, right: pos.r,
              width: 6, height: 6, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(200,160,90,0.9) 0%, rgba(90,55,20,0.7) 60%, rgba(30,18,6,0.9) 100%)",
              boxShadow: "0 0 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.25)",
              zIndex: 3,
            }} />
          ))}

          <div style={{ padding: "44px 48px 48px", position: "relative", zIndex: 1 }}>

            {/* eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: silk }}
              style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}
            >
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${COPPER}0.5))` }} />
              <span style={{ fontSize: 9, letterSpacing: "0.5em", color: `${COPPER_GOLD}0.75)`, fontWeight: 300 }}>
                E.A.T. ENGINE · VESSEL ARCHITECTURE
              </span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${COPPER}0.5))` }} />
            </motion.div>

            {/* hero heading */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: silk }}
              style={{
                fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 300,
                letterSpacing: "0.08em", color: "rgba(230,215,195,0.97)",
                lineHeight: 1.1, margin: 0, marginBottom: 8, textAlign: "center",
              }}
            >
              BEERCRAFT<br />
              <span style={{ color: `${COPPER}0.65)`, fontSize: "0.6em", letterSpacing: "0.14em" }}>
                VESSEL ARCHITECTURE · PRIVATE CELLAR PROTOCOL
              </span>
            </motion.h1>

            {/* boot ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              style={{ textAlign: "center", marginBottom: 40 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={bootStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    fontSize: 9, letterSpacing: "0.45em", fontFamily: "monospace",
                    color: ready ? "rgba(34,216,110,0.8)" : `${COPPER_GOLD}0.65)`,
                  }}
                >
                  {BOOT_LINES[bootStep]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* gauges */}
            {GAUGES.map(({ label, pct }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.12, ease: silk }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(155,135,105,0.7)" }}>
                    {label}
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.12 }}
                    style={{ fontSize: 9, letterSpacing: "0.2em", color: `${COPPER_GOLD}0.9)`, fontFamily: "monospace" }}
                  >
                    {pct}%
                  </motion.span>
                </div>
                <div style={{
                  height: 2, width: "100%", borderRadius: 1,
                  background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden",
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.1, delay: 0.6 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 1,
                      background: pct === 100
                        ? "linear-gradient(90deg, rgba(34,216,110,0.7), rgba(34,216,110,0.95))"
                        : `linear-gradient(90deg, ${COPPER}0.7), ${COPPER_GOLD}0.95))`,
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
                    background: `${COPPER}0.12)`,
                    boxShadow: `0 0 0 1px ${COPPER_GOLD}0.65), 0 16px 48px rgba(0,0,0,0.6), 0 0 60px ${COPPER}0.2)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    marginTop: 32, width: "100%", height: 52, borderRadius: 2,
                    border: `1px solid ${COPPER}0.45)`,
                    background: `${COPPER}0.07)`,
                    cursor: "pointer",
                    fontSize: 11, letterSpacing: "0.5em",
                    color: `${COPPER_GOLD}0.95)`,
                    textTransform: "uppercase",
                    fontFamily: "'Cormorant Garamond', serif",
                    boxShadow: `0 0 0 1px ${COPPER}0.2), 0 8px 32px rgba(0,0,0,0.6)`,
                  }}
                >
                  OPEN THE CELLAR
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* bottom chrome rule */}
          <div style={{
            height: 1, width: "100%",
            background: `linear-gradient(90deg, transparent, ${COPPER}0.45) 30%, ${COPPER_GOLD}0.7) 50%, ${COPPER}0.45) 70%, transparent)`,
          }} />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4-TILE MATERIAL STRIP
          ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: silk }}
        style={{
          position: "relative", zIndex: 10,
          display: "flex", height: 100,
          borderTop: "1px solid rgba(255,255,255,0.05)",
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
              borderRight: i < TILES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${tile.img})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "brightness(0.30) saturate(0.45)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(1,1,1,0.25), rgba(1,1,1,0.58))",
            }} />
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, rgba(180,155,110,0.1), ${COPPER}0.35) 50%, rgba(180,155,110,0.1))`,
            }} />
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.45em", color: `${COPPER_GOLD}0.8)` }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 7, letterSpacing: "0.3em", color: "rgba(135,110,75,0.55)", marginTop: 2 }}>
                {tile.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* bottom watermark */}
      <div style={{
        position: "absolute", bottom: 108, left: 0, right: 0,
        textAlign: "center", zIndex: 11, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 7.5, letterSpacing: "0.5em", color: "rgba(115,90,55,0.4)" }}>
          NOVEE OS · BEERCRAFT · VESSEL INTELLIGENCE PROTOCOL
        </span>
      </div>
    </motion.div>
  );
}
