/**
 * PresenceEnvironment — NOVEE OS · E.A.T. Engine · Environmental Adaptation Interface
 *
 * Ritual Moment 2.5 of the ritual (between PIN Gate and Terroir).
 * Renders after PIN authentication succeeds, before SESSION 01 begins.
 *
 * Design brief: photorealistic luxury UI — obsidian glass, brushed titanium
 * structural rails, smoked chrome interactive borders, macro-photography depth
 * layers, Apple-meets-automotive-cockpit minimalism.
 *
 * zIndex: 165 (above PinGate 170 exits, below TerroirArchitecture 170)
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;

interface Props {
  onComplete: () => void;
}

/* ── Photorealistic macro-photography sources ─────────────────────── */
const MACRO = {
  cigar:
    "https://h7.alamy.com/comp/KNN67J/vintage-textured-macro-details-of-luxury-havana-cigar-KNN67J.jpg",
  whiskey:
    "https://media.istockphoto.com/id/526826672/photo/glass-of-whiskey-on-dark-table.jpg?s=612x612&w=0&k=20&c=T9Rr3CK9FtXdwM8ED5zA5eVBToc3EYIkjgAT-o8lL20=",
  carbon:
    "https://thumbs.dreamstime.com/b/high-tech-carbon-fiber-weave-texture-detailed-macro-photograph-captures-intricate-twill-performance-composite-glossy-415462336.jpg",
  wine:
    "https://thumbs.dreamstime.com/b/close-up-wine-glass-condensation-119473406.jpg",
};

/* ── Craft material tiles ─────────────────────────────────────────── */
const TILES = [
  { id: "smoke",   label: "SMOKECRAFT",  sub: "Tobacco Origin",   img: MACRO.cigar,   delay: 0.1  },
  { id: "pour",    label: "POURCRAFT",   sub: "Spirit Selection",  img: MACRO.whiskey, delay: 0.22 },
  { id: "brew",    label: "BREWCRAFT",   sub: "Craft Pour",        img: MACRO.carbon,  delay: 0.34 },
  { id: "wine",    label: "WINECRAFT",   sub: "Wine Selection",    img: MACRO.wine,    delay: 0.46 },
];

/* ── Telemetry boot sequence labels ───────────────────────────────── */
const BOOT_LINES = [
  "LOADING PALATE MATRIX…",
  "CALIBRATING TASTE VECTORS…",
  "SYNCING TERROIR DATABASE…",
  "E.A.T. ENGINE INITIALIZED",
];

export default function PresenceEnvironment({ onComplete }: Props) {
  const [bootStep, setBootStep]   = useState(0);
  const [ready, setReady]         = useState(false);
  const [exiting, setExiting]     = useState(false);
  const panelCtrl                 = useAnimation();
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* boot sequence — cycles every 700ms, then holds "ready" */
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

  /* pulse the center panel border on ready */
  useEffect(() => {
    if (!ready) return;
    panelCtrl.start({
      boxShadow: [
        "0 0 0 1px rgba(160,140,100,0.25), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)",
        "0 0 0 1px rgba(212,139,0,0.55), 0 0 120px rgba(212,139,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        "0 0 0 1px rgba(160,140,100,0.25), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)",
      ],
      transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    });
  }, [ready, panelCtrl]);

  /* auto-advance after 5.5s from mount */
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
      key="presence-environment"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: silk }}
      style={{
        position: "fixed", inset: 0, zIndex: 165,
        background: "#010101",
        display: "flex", flexDirection: "column",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        overflow: "hidden",
      }}
    >
      {/* ── Hero macro-photography background layer (depth-of-field blur) ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${MACRO.cigar})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(28px) brightness(0.18) saturate(0.5)",
        transform: "scale(1.08)",
      }} />

      {/* ── Vignette overlay ─────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(1,1,1,0.72) 65%, #010101 100%)",
      }} />

      {/* ── Ambient top glow ─────────────────────────────────────────── */}
      <motion.div
        animate={{ opacity: [0.06, 0.14, 0.06] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 180,
          background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(212,139,0,0.7), transparent)",
          zIndex: 2, pointerEvents: "none",
        }}
      />

      {/* ════════════════════════════════════════════════════════════════
          BRUSHED TITANIUM HEADER RAIL
          ════════════════════════════════════════════════════════════════ */}
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
          padding: "0 28px",
          justifyContent: "space-between",
        }}
      >
        {/* titanium brushed texture lines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.18,
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)",
          backgroundSize: "4px 100%",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          {/* Titanium bolt accent */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #D0D0D0 0%, #707070 60%, #404040 100%)",
            boxShadow: "0 0 4px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          }} />
          <span style={{
            fontSize: 10, letterSpacing: "0.5em", color: "rgba(200,190,175,0.9)",
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
            textTransform: "uppercase",
          }}>
            NOVEE OS · ENVIRONMENTAL ADAPTATION TECHNOLOGY
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#22D86E" }}
          />
          <span style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(160,150,130,0.7)" }}>
            SOVEREIGN · ACTIVE
          </span>
          {/* Chrome bolt accent */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #D0D0D0 0%, #707070 60%, #404040 100%)",
            boxShadow: "0 0 4px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          }} />
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════
          MAIN PRESENCE PANEL — smoked chrome border, obsidian glass
          ════════════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10, padding: "32px 24px",
      }}>

        {/* left macro detail strip — depth-of-field background element */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 0.35, x: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: silk }}
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 420,
            backgroundImage: `url(${MACRO.cigar})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(4px) brightness(0.5) saturate(0.6)",
            WebkitMaskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent)",
            maskImage: "linear-gradient(to right, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent)",
          }}
        />

        {/* right macro detail strip */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.28, x: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: silk }}
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 200, height: 420,
            backgroundImage: `url(${MACRO.whiskey})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(6px) brightness(0.4) saturate(0.5)",
            WebkitMaskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent)",
            maskImage: "linear-gradient(to left, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent)",
          }}
        />

        {/* CENTER GLASS PANEL — smoked chrome border */}
        <motion.div
          animate={panelCtrl}
          initial={{
            boxShadow: "0 0 0 1px rgba(160,140,100,0.18), 0 0 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          style={{
            position: "relative",
            width: "100%", maxWidth: 560,
            background: "rgba(10,8,6,0.90)",
            backdropFilter: "blur(32px) saturate(0.6)",
            WebkitBackdropFilter: "blur(32px) saturate(0.6)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {/* smoked chrome border gradient */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 4,
            border: "1px solid transparent",
            background: "linear-gradient(rgba(10,8,6,0.9), rgba(10,8,6,0.9)) padding-box, linear-gradient(135deg, rgba(180,160,120,0.5) 0%, rgba(80,70,55,0.2) 30%, rgba(120,110,90,0.4) 60%, rgba(200,180,140,0.5) 100%) border-box",
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* top chrome rule */}
          <div style={{
            height: 1, width: "100%",
            background: "linear-gradient(90deg, transparent, rgba(200,180,140,0.7) 20%, rgba(255,240,200,0.9) 50%, rgba(200,180,140,0.7) 80%, transparent)",
          }} />

          {/* corner bolts */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              top: pos.t, bottom: pos.b, left: pos.l, right: pos.r,
              width: 6, height: 6, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(220,200,160,0.9) 0%, rgba(100,85,60,0.7) 60%, rgba(40,35,25,0.9) 100%)",
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
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, rgba(212,139,0,0.5))" }} />
              <span style={{
                fontSize: 9, letterSpacing: "0.5em", color: "rgba(212,139,0,0.75)",
                fontFamily: "'Cormorant Garamond', serif", fontWeight: 300,
              }}>
                E.A.T. ENGINE · PRESENCE INTERFACE
              </span>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, rgba(212,139,0,0.5))" }} />
            </motion.div>

            {/* hero heading */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: silk }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 300, letterSpacing: "0.08em",
                color: "rgba(230,220,205,0.97)",
                lineHeight: 1.1, margin: 0, marginBottom: 8,
                textAlign: "center",
              }}
            >
              YOUR ENVIRONMENT<br />
              <span style={{ color: "rgba(160,145,120,0.7)", fontSize: "0.65em", letterSpacing: "0.12em" }}>
                IS BEING PREPARED
              </span>
            </motion.h1>

            {/* boot status line */}
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
                    fontSize: 9, letterSpacing: "0.45em",
                    color: ready ? "rgba(34,216,110,0.8)" : "rgba(180,160,120,0.6)",
                    fontFamily: "monospace",
                  }}
                >
                  {BOOT_LINES[bootStep]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            {/* 3 status gauges */}
            {[
              { label: "PALATE RECOGNITION", pct: 100 },
              { label: "EXPERIENCE PROFILE", pct: 88  },
              { label: "TERROIR MATRIX",      pct: 72  },
            ].map(({ label, pct }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.12, ease: silk }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(160,145,120,0.7)" }}>
                    {label}
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.12 }}
                    style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(212,139,0,0.8)", fontFamily: "monospace" }}
                  >
                    {pct}%
                  </motion.span>
                </div>
                <div style={{
                  height: 2, width: "100%", borderRadius: 1,
                  background: "rgba(255,255,255,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.1, delay: 0.6 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      position: "absolute", left: 0, top: 0, height: "100%",
                      background: pct === 100
                        ? "linear-gradient(90deg, rgba(34,216,110,0.7), rgba(34,216,110,0.95))"
                        : "linear-gradient(90deg, rgba(212,139,0,0.7), rgba(212,139,0,0.95))",
                      borderRadius: 1,
                    }}
                  />
                </div>
              </motion.div>
            ))}

            {/* CTA — appears only when boot is complete */}
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
                    background: "rgba(212,139,0,0.14)",
                    boxShadow: "0 0 0 1px rgba(212,139,0,0.65), 0 16px 48px rgba(0,0,0,0.6), 0 0 60px rgba(212,139,0,0.18)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    marginTop: 32, width: "100%",
                    height: 52, borderRadius: 2,
                    border: "1px solid rgba(212,139,0,0.45)",
                    background: "rgba(212,139,0,0.07)",
                    cursor: "pointer",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 11, letterSpacing: "0.5em",
                    color: "rgba(212,139,0,0.95)",
                    textTransform: "uppercase",
                    boxShadow: "0 0 0 1px rgba(212,139,0,0.2), 0 8px 32px rgba(0,0,0,0.6)",
                  }}
                >
                  ENTER ENVIRONMENT
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* bottom chrome rule */}
          <div style={{
            height: 1, width: "100%",
            background: "linear-gradient(90deg, transparent, rgba(120,100,70,0.5) 30%, rgba(180,150,100,0.7) 50%, rgba(120,100,70,0.5) 70%, transparent)",
          }} />
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MATERIAL TILE STRIP — photorealistic macro photography
          ════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: silk }}
        style={{
          position: "relative", zIndex: 10,
          display: "flex", gap: 0, height: 100,
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
            {/* macro photo layer */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${tile.img})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "brightness(0.32) saturate(0.5)",
              transition: "filter 0.4s",
            }} />

            {/* smoked chrome vignette */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(1,1,1,0.3), rgba(1,1,1,0.55))",
            }} />

            {/* brushed titanium top edge */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, rgba(180,170,150,0.1), rgba(220,210,190,0.4) 50%, rgba(180,170,150,0.1))",
            }} />

            {/* tile label */}
            <div style={{
              position: "absolute", bottom: 12, left: 0, right: 0,
              textAlign: "center",
            }}>
              <div style={{
                fontSize: 8, letterSpacing: "0.45em",
                color: "rgba(200,185,160,0.8)",
                fontFamily: "'Cormorant Garamond', serif",
              }}>
                {tile.label}
              </div>
              <div style={{
                fontSize: 7, letterSpacing: "0.3em",
                color: "rgba(140,125,100,0.55)",
                marginTop: 2,
              }}>
                {tile.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bottom watermark ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 108, left: 0, right: 0,
        textAlign: "center", zIndex: 11, pointerEvents: "none",
      }}>
        <span style={{
          fontSize: 7.5, letterSpacing: "0.5em",
          color: "rgba(120,105,80,0.4)",
        }}>
          NOVEE OS · 360 ENTERPRISE SERVICES · E.A.T. v2026
        </span>
      </div>
    </motion.div>
  );
}
