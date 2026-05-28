import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#D4AF37";
const CHROME_HI = "#C8CDD2";
const CHROME_MID = "#9BA5AE";
const CHROME_LO = "#5F6368";
const SOFT_BLUE = "#5BB8FF";
const OBSIDIAN = "#010101";
const TRUE_WHITE = "#F8F8F8";

const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const EASE_CINEMA = [0.22, 1, 0.36, 1] as const;

function playActivationTone() {
  try {
    const ctx = new AudioContext();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.frequency.value = 1840; o1.type = "sine";
    o2.frequency.value = 920; o2.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    o1.start(); o2.start();
    o1.stop(ctx.currentTime + 0.24); o2.stop(ctx.currentTime + 0.24);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* */ }
}

function playCraftHubTone() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 220; o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    o.start(); o.stop(ctx.currentTime + 2.2);
    setTimeout(() => ctx.close().catch(() => {}), 3000);
  } catch { /* */ }
}

/* ─── Geometric Chrome SVG — Profound Innovations ─── */
function ProfoundGeometry() {
  const HEX_OUTER = "200,22 347,107 347,273 200,358 53,273 53,107";
  const HEX_MID   = "200,62 321,132 321,248 200,318 79,248 79,132";
  const HEX_INNER = "200,108 278,153 278,227 200,272 122,227 122,153";

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.80, ease: EASE_CINEMA, delay: 0.15 }}
      viewBox="0 0 400 380"
      width={340} height={320}
      style={{ display: "block", margin: "0 auto", filter: `drop-shadow(0 0 32px ${CHROME_MID}33)` }}
    >
      <defs>
        <linearGradient id="chromeG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={CHROME_HI} stopOpacity="0.90" />
          <stop offset="50%"  stopColor={CHROME_MID} stopOpacity="0.65" />
          <stop offset="100%" stopColor={CHROME_LO} stopOpacity="0.40" />
        </linearGradient>
        <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={GOLD} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#8B6914" stopOpacity="0.50" />
        </linearGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={GOLD} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.00" />
        </radialGradient>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={CHROME_MID} stopOpacity="0.08" />
          <stop offset="100%" stopColor={CHROME_MID} stopOpacity="0.00" />
        </radialGradient>
      </defs>

      {/* Background ambient glow */}
      <ellipse cx="200" cy="190" rx="180" ry="170" fill="url(#bgGlow)" />

      {/* Outer hex */}
      <polygon points={HEX_OUTER} fill="none" stroke="url(#chromeG)" strokeWidth="1.5" />
      {/* Mid hex */}
      <polygon points={HEX_MID} fill="none" stroke={CHROME_MID} strokeWidth="0.9" opacity="0.55" />
      {/* Inner hex */}
      <polygon points={HEX_INNER} fill="none" stroke={CHROME_LO} strokeWidth="0.7" opacity="0.40" />

      {/* Outer node circles */}
      {["200,22","347,107","347,273","200,358","53,273","53,107"].map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={5} fill={CHROME_MID} opacity={0.70} />;
      })}

      {/* Spokes from center to outer nodes */}
      {[
        [200,190,200,22],[200,190,347,107],[200,190,347,273],
        [200,190,200,358],[200,190,53,273],[200,190,53,107],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={CHROME_MID} strokeWidth="0.6" opacity="0.28" />
      ))}

      {/* Diagonal cross-links (alternating outer nodes) */}
      {[
        [200,22,347,273],[347,107,53,273],[347,273,53,107],
      ].map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={CHROME_LO} strokeWidth="0.5" opacity="0.18" />
      ))}

      {/* Core glow */}
      <circle cx="200" cy="190" r="55" fill="url(#coreGlow)" />

      {/* Central diamond (gold) */}
      <polygon points="200,155 222,190 200,225 178,190" fill="url(#goldG)" opacity="0.80" />
      <polygon points="200,165 212,190 200,215 188,190" fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.60" />

      {/* Center dot */}
      <circle cx="200" cy="190" r="4" fill={GOLD} opacity="0.95" />

      {/* Titanium brushed texture lines */}
      {[80,120,160,220,260,300].map((y, i) => (
        <line key={i} x1={70} y1={y} x2={330} y2={y} stroke={CHROME_HI} strokeWidth="0.3" opacity="0.08" />
      ))}
    </motion.svg>
  );
}

/* ─── Animated NOVEE OS Geometric Icon ─── */
function NoveeGeometricIcon() {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.70 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.20, ease: EASE_CINEMA, delay: 0.30 }}
      viewBox="0 0 120 120" width={96} height={96}
      style={{ display: "block", margin: "0 auto" }}
    >
      <defs>
        <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SOFT_BLUE} stopOpacity="0.30" />
          <stop offset="100%" stopColor={SOFT_BLUE} stopOpacity="0.00" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="url(#blueGlow)" />
      <motion.polygon
        points="60,10 103,35 103,85 60,110 17,85 17,35"
        fill="none" stroke={SOFT_BLUE} strokeWidth="1.8" opacity="0.75"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      <motion.polygon
        points="60,22 93,42 93,78 60,98 27,78 27,42"
        fill="none" stroke={SOFT_BLUE} strokeWidth="1.0" opacity="0.45"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      <circle cx="60" cy="60" r="14" fill="none" stroke={SOFT_BLUE} strokeWidth="1.2" opacity="0.60" />
      <motion.circle cx="60" cy="60" r="6"
        fill={SOFT_BLUE} opacity="0.90"
        animate={{ opacity: [0.9, 0.45, 0.9] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* 6 outer dots */}
      {[0,60,120,180,240,300].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180;
        return (
          <circle key={i}
            cx={60 + 38 * Math.cos(rad)} cy={60 + 38 * Math.sin(rad)}
            r={3} fill={SOFT_BLUE} opacity={0.65}
          />
        );
      })}
    </motion.svg>
  );
}

/* ─── Biometric ring ─── */
function BiometricRing() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.4" opacity="0.70" />
      <circle cx="12" cy="12" r="5" stroke={GOLD} strokeWidth="0.9" opacity="0.45" />
      <circle cx="12" cy="12" r="2" fill={GOLD} opacity="0.85" />
    </svg>
  );
}

/* ─── Intelligence data items ─── */
const INTEL_ITEMS = [
  { label: "environment intelligence",       sub: "Atmosphere / Lighting telemetry" },
  { label: "pairing intelligence",           sub: "Chemical match analytics" },
  { label: "inventory awareness",            sub: "Physical humidor stock count" },
  { label: "lounge atmosphere status",       sub: "Table spend triggers" },
  { label: "guest preference analytics",     sub: "Mentor tracking" },
  { label: "recommendation engine",          sub: "Spend multipliers" },
  { label: "venue intelligence",             sub: "POS transaction log" },
];

/* ─── Module tiles ─── */
const MODULES = [
  { id: "smoke", label: "SmokeCraft 360", accent: GOLD,      live: true,  img: "cigar_hero.jpg",   tag: "SC" },
  { id: "pour",  label: "PourCraft 360",  accent: "#C87941", live: false, img: "pourcraft-card.jpg", tag: "PC" },
  { id: "beer",  label: "BeerCraft 360",  accent: "#C8A041", live: false, img: "brewcraft-card.jpg",  tag: "BC" },
  { id: "vape",  label: "VapeCraft 360",  accent: "#6A9FD8", live: false, img: "",                  tag: "VC" },
];

/* ──────────────────────────────────────────
   STAGE 0 — Initial Black
────────────────────────────────────────── */
function Stage0() {
  return (
    <motion.div key="s0"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.80 }}
      style={{ position: "absolute", inset: 0, background: OBSIDIAN,
        backgroundImage: "repeating-linear-gradient(0deg,transparent 0px,rgba(255,255,255,0.012) 1px,transparent 2px,transparent 6px)" }}
    >
      {/* Scan-line sweep */}
      <motion.div
        initial={{ top: "-4%", opacity: 0 }}
        animate={{ top: "104%", opacity: [0, 0.28, 0.28, 0] }}
        transition={{ duration: 1.0, delay: 0.20, ease: "linear" }}
        style={{ position: "absolute", left: 0, right: 0, height: 2,
          background: "rgba(100,200,255,0.45)", boxShadow: "0 0 12px rgba(100,200,255,0.60)" }}
      />
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   STAGE 1 — Profound Innovations LLC
────────────────────────────────────────── */
function Stage1() {
  return (
    <motion.div key="s1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.95, ease: EASE_CINEMA }}
      style={{ position: "absolute", inset: 0, background: OBSIDIAN,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 32,
        backgroundImage: "repeating-linear-gradient(0deg,transparent 0px,rgba(255,255,255,0.010) 1px,transparent 2px,transparent 8px)",
      }}
    >
      {/* Corner accent lines */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 120,
        borderTop: `1px solid ${CHROME_MID}33`, borderLeft: `1px solid ${CHROME_MID}33` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 120, height: 120,
        borderBottom: `1px solid ${CHROME_MID}33`, borderRight: `1px solid ${CHROME_MID}33` }} />

      <ProfoundGeometry />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.20, delay: 0.60, ease: EASE_CINEMA }}
        style={{ textAlign: "center" }}
      >
        {/* Gold top rule */}
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD}55,transparent)`,
          width: 280, margin: "0 auto 20px" }} />

        <div style={{
          fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 44, fontWeight: 700, letterSpacing: "0.16em",
          color: GOLD, textTransform: "uppercase",
          textShadow: `0 0 60px ${GOLD}55, 0 0 100px ${GOLD}22`,
          lineHeight: 1.1,
        }}>
          Profound<br />Innovations LLC
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD}33,transparent)`,
          width: 200, margin: "18px auto 0" }} />
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   STAGE 2 — NOVEE OS POWERED
────────────────────────────────────────── */
function Stage2() {
  return (
    <motion.div key="s2"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50, filter: "blur(4px)" }}
      transition={{ duration: 0.90, ease: EASE_CINEMA }}
      style={{ position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #000000 0%, #030508 60%, #000610 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 28,
        backgroundImage: "repeating-linear-gradient(90deg,transparent 0px,rgba(91,184,255,0.012) 1px,transparent 2px,transparent 14px)",
      }}
    >
      {/* Top-left: biometric ring + SYSTEM ACTIVE */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.70, delay: 0.40, ease: EASE_CINEMA }}
        style={{
          position: "absolute", top: 28, left: 36,
          display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
          padding: "8px 16px",
          background: "rgba(91,184,255,0.07)",
          border: `1px solid rgba(91,184,255,0.22)`,
          borderRadius: 8,
        }}
      >
        <BiometricRing />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.30em",
            color: SOFT_BLUE, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
            SYSTEM ACTIVE
          </span>
          <span style={{ fontSize: 8.5, letterSpacing: "0.20em", color: `${SOFT_BLUE}66`,
            fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
            NOVEE OS · KIOSK EDITION
          </span>
        </div>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 6, height: 6, borderRadius: "50%",
            background: "#32B45A", boxShadow: "0 0 8px #32B45A" }}
        />
      </motion.div>

      {/* Central group */}
      <NoveeGeometricIcon />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.20, ease: EASE_CINEMA }}
        style={{ textAlign: "center" }}
      >
        <div style={{
          fontFamily: "'Inter',-apple-system,sans-serif",
          fontSize: 76, fontWeight: 900, letterSpacing: "0.12em",
          color: TRUE_WHITE, lineHeight: 1.0,
          textShadow: `0 0 80px ${SOFT_BLUE}22`,
        }}>
          NOVEE OS
        </div>
        <div style={{
          fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 300,
          letterSpacing: "0.60em", color: `${TRUE_WHITE}88`,
          textTransform: "uppercase", marginTop: 10,
        }}>
          POWERED
        </div>
      </motion.div>

      {/* Bottom: boot progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.80, duration: 0.60 }}
        style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)",
          width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
      >
        <div style={{ width: "100%", height: 2, background: "rgba(91,184,255,0.12)", borderRadius: 1 }}>
          <motion.div
            initial={{ width: "0%" }} animate={{ width: "100%" }}
            transition={{ duration: 2.6, ease: "easeOut", delay: 0.20 }}
            style={{ height: "100%", background: `linear-gradient(90deg,${SOFT_BLUE}88,${SOFT_BLUE})`,
              borderRadius: 1, boxShadow: `0 0 8px ${SOFT_BLUE}55` }}
          />
        </div>
        <span style={{ fontSize: 9, letterSpacing: "0.30em", color: `${SOFT_BLUE}55`,
          fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
          INITIALIZING MODULES
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   STAGE 3 — CraftHub Init Overview
────────────────────────────────────────── */
function Stage3() {
  return (
    <motion.div key="s3"
      initial={{ opacity: 0, filter: "blur(16px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 1.10, ease: EASE_CINEMA }}
      style={{ position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0A0602 0%, #040200 50%, #070400 100%)",
        display: "flex", flexDirection: "row", overflow: "hidden",
      }}
    >
      {/* Smoke ambiance */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(180,100,20,0.08) 0%, transparent 65%)",
      }} />

      {/* Left mini OS rail */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.60, duration: 0.70, ease: EASE_CINEMA }}
        style={{
          width: 56, flexShrink: 0,
          background: "rgba(5,3,1,0.95)",
          backdropFilter: "blur(24px)",
          borderRight: `1px solid rgba(212,175,55,0.16)`,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 24, paddingBottom: 24, gap: 8,
        }}
      >
        {[{ abbr: "HUB", icon: "⊹", active: true }, { abbr: "SC", icon: "◈" }, { abbr: "EAT", icon: "⊞" }].map(item => (
          <div key={item.abbr}
            style={{
              width: 40, height: 50, borderRadius: 9,
              background: item.active ? `rgba(212,175,55,0.18)` : "rgba(255,255,255,0.02)",
              border: `1px solid ${item.active ? GOLD + "77" : "rgba(255,255,255,0.07)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 15, color: item.active ? GOLD : `${GOLD}40` }}>{item.icon}</span>
            <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.12em",
              color: item.active ? GOLD : `${GOLD}35`, fontFamily: "'Inter',sans-serif",
              textTransform: "uppercase" }}>{item.abbr}</span>
          </div>
        ))}
      </motion.div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>

        {/* Header ornament */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, duration: 0.80, ease: EASE_CINEMA }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.50em",
            color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase",
            marginBottom: 12 }}>
            CRAFTHUB · INITIALIZATION
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: 88, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.0,
            textShadow: `0 0 80px rgba(212,175,55,0.22)` }}>
            CraftHub
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD}55,transparent)`,
            width: 300, margin: "16px auto 0" }} />
        </motion.div>

        {/* Intelligence data list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.60, duration: 0.90, ease: EASE_CINEMA }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 64px", width: "100%", maxWidth: 860 }}
        >
          {INTEL_ITEMS.map((item, i) => (
            <motion.div key={item.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.70 + i * 0.08, duration: 0.50, ease: EASE_CINEMA }}
              style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 14,
                padding: "10px 0", borderBottom: `1px solid rgba(212,175,55,0.08)` }}
            >
              <motion.div
                animate={{ opacity: [1, 0.40, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.28 }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD,
                  boxShadow: `0 0 6px ${GOLD}`, marginTop: 5, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#F0E8D4",
                  fontFamily: "'Inter',sans-serif", letterSpacing: "0.04em", textTransform: "lowercase" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: `${GOLD}60`, fontFamily: "'Inter',sans-serif",
                  letterSpacing: "0.10em", marginTop: 2 }}>
                  {item.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   STAGE 4 — Module Switch Matrix
────────────────────────────────────────── */
function Stage4Content({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #080402 0%, #030100 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 48px", gap: 32,
      opacity: dimmed ? 0.38 : 1,
      filter: dimmed ? "blur(3px)" : "none",
      transition: "opacity 0.60s, filter 0.60s",
    }}>
      {/* Smoke layer */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 50% at 50% 100%, rgba(180,100,20,0.06) 0%, transparent 60%)" }} />

      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: dimmed ? 0.60 : 1, y: 0 }}
        transition={{ duration: 0.70, ease: EASE_CINEMA }}
        style={{ textAlign: "center" }}
      >
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.50em",
          color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 8 }}>
          MODULE SELECTION MATRIX
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
          fontSize: 52, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.0 }}>
          Select Your Craft
        </div>
      </motion.div>

      {/* 4 module tiles in a row */}
      <div style={{ display: "flex", flexDirection: "row", gap: 20, width: "100%", maxWidth: 1100 }}>
        {MODULES.map((mod, i) => (
          <motion.div key={mod.id}
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.70,
              type: "spring", mass: 0.9, stiffness: 260, damping: 28 }}
            style={{
              flex: 1, minHeight: 340, position: "relative", borderRadius: 14, overflow: "hidden",
              border: `1.5px solid ${mod.live ? mod.accent + "66" : "rgba(255,255,255,0.09)"}`,
              boxShadow: mod.live ? `0 0 32px ${mod.accent}22, 0 8px 32px rgba(0,0,0,0.55)` : "0 4px 16px rgba(0,0,0,0.40)",
              opacity: mod.live ? 1 : 0.52,
            }}
          >
            {/* BG image */}
            {mod.img && (
              <img src={IMG(mod.img)} alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center 30%" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            {!mod.img && (
              <div style={{ position: "absolute", inset: 0,
                background: `radial-gradient(circle at 40% 40%, ${mod.accent}18 0%, rgba(0,0,0,0.85) 70%)` }} />
            )}

            {/* Overlay */}
            <div style={{ position: "absolute", inset: 0,
              background: `linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.50) 55%, rgba(0,0,0,0.22) 100%)` }} />

            {/* Content */}
            <div style={{ position: "absolute", inset: 0, padding: "20px 18px",
              display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Top: tag badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8,
                  background: mod.live ? `${mod.accent}22` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${mod.live ? mod.accent + "55" : "rgba(255,255,255,0.10)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: mod.live ? mod.accent : "rgba(255,255,255,0.45)" }}>
                    {mod.tag}
                  </span>
                </div>
                {mod.live ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5,
                    background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "4px 9px",
                    border: `1px solid ${mod.accent}44` }}>
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      style={{ width: 5, height: 5, borderRadius: "50%",
                        background: "#32B45A", boxShadow: "0 0 6px #32B45A" }}
                    />
                    <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: "0.22em",
                      color: "#32B45A", fontFamily: "'Inter',sans-serif" }}>LIVE</span>
                  </div>
                ) : (
                  <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "4px 9px",
                    border: "1px solid rgba(255,255,255,0.10)" }}>
                    <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em",
                      color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif" }}>COMING SOON</span>
                  </div>
                )}
              </div>

              {/* Bottom: name */}
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: 28, fontWeight: 700, color: mod.live ? "#F0E8D4" : "rgba(240,232,212,0.50)",
                  lineHeight: 1.1, marginBottom: 4 }}>
                  {mod.label}
                </div>
                {mod.live && (
                  <div style={{ height: 2, width: 48, background: mod.accent,
                    borderRadius: 1, boxShadow: `0 0 8px ${mod.accent}` }} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Stage4() {
  return (
    <motion.div key="s4"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.90, ease: EASE_CINEMA }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Stage4Content />
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   STAGE 5 — E.A.T Systems Pop-Up
────────────────────────────────────────── */
function Stage5({ onDismiss }: { onDismiss: () => void }) {
  const [temp,     setTemp]     = useState(68);
  const [humidity, setHumidity] = useState(72);
  const [count,    setCount]    = useState(145);
  const [spend,    setSpend]    = useState(186);

  useEffect(() => {
    const id = setInterval(() => {
      setTemp(t      => Math.round(Math.min(74, Math.max(64, t + (Math.random() - 0.5) * 0.6))));
      setHumidity(h  => Math.round(Math.min(80, Math.max(65, h + (Math.random() - 0.5) * 0.4))));
      setCount(c     => Math.max(120, c - (Math.random() > 0.97 ? 1 : 0)));
      setSpend(s     => Math.round(Math.min(280, Math.max(140, s + (Math.random() - 0.5) * 4))));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const EAT_PANELS = [
    {
      title: "Environment Intelligence",
      accent: "#5BB8FF",
      rows: [
        { label: "Lounge Temperature", value: `${temp}°F`, status: temp > 71 ? "ELEVATED" : "OPTIMAL" },
        { label: "Relative Humidity",  value: `${humidity}%`, status: humidity > 76 ? "HIGH" : "OPTIMAL" },
        { label: "Ambiance Mode",      value: "ACTIVE", status: "LIVE" },
        { label: "Lighting Profile",   value: "Warm Evening", status: null },
      ],
    },
    {
      title: "Asset Intelligence",
      accent: GOLD,
      rows: [
        { label: "Humidor Stock",      value: `${count} Puros`, status: "IN-HOUSE" },
        { label: "Humidor Climate",    value: "68°F / 72%", status: "OPTIMAL" },
        { label: "Reserve Stock",      value: "12 Units", status: "SOVEREIGN" },
        { label: "Reorder Threshold",  value: "115 Puros", status: null },
      ],
    },
    {
      title: "Transaction Intelligence",
      accent: "#32B45A",
      rows: [
        { label: "Avg Guest Spend",    value: `$${spend}`, status: "TONIGHT" },
        { label: "Spend Tier",         value: "Sovereign", status: "2×" },
        { label: "POS Status",         value: "POS Connected", status: "LIVE" },
        { label: "Multiplier Active",  value: "Revenue ×2", status: "ON" },
      ],
    },
  ];

  return (
    <motion.div key="s5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.70, ease: EASE_CINEMA }}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Dimmed module matrix bg */}
      <Stage4Content dimmed />

      {/* Amber pulse overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0] }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${GOLD}66 0%, transparent 70%)`,
          pointerEvents: "none" }}
      />

      {/* Scrim */}
      <div style={{ position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.62)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />

      {/* Pop-up card */}
      <div style={{ position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: EASE_CINEMA, delay: 0.15 }}
          style={{
            width: "min(940px, 90vw)",
            background: "linear-gradient(145deg, rgba(14,10,4,0.98) 0%, rgba(8,5,1,0.99) 100%)",
            border: `1px solid rgba(212,175,55,0.40)`,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: `0 0 60px rgba(212,175,55,0.16), 0 24px 80px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.06)`,
            position: "relative",
          }}
        >
          {/* Titanium brush grain */}
          <div style={{ position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(96deg,transparent 0px,rgba(255,255,255,0.012) 1px,transparent 2px,transparent 16px)",
            pointerEvents: "none" }} />

          {/* Top accent bar */}
          <div style={{ height: 2,
            background: `linear-gradient(90deg,transparent,${GOLD}88,${GOLD},${GOLD}88,transparent)`,
            boxShadow: `0 0 20px ${GOLD}44` }} />

          {/* Header */}
          <div style={{ padding: "24px 32px 20px",
            display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            borderBottom: `1px solid rgba(212,175,55,0.14)` }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.50em",
                color: `${GOLD}66`, fontFamily: "'Inter',sans-serif", textTransform: "uppercase", marginBottom: 4 }}>
                NOVEE OS · LIVE FEED
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 38, fontWeight: 700, color: GOLD, letterSpacing: "0.06em",
                textShadow: `0 0 40px ${GOLD}44` }}>
                E.A.T SYSTEMS
              </div>
              <div style={{ fontSize: 11, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif",
                letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 4 }}>
                Environment · Asset · Transaction
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                width: 42, height: 42, borderRadius: 11,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: TRUE_WHITE, fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Inter',sans-serif", lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Three intelligence panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {EAT_PANELS.map((panel, pi) => (
              <div key={panel.title}
                style={{
                  padding: "24px 26px 28px",
                  borderRight: pi < 2 ? `1px solid rgba(212,175,55,0.10)` : "none",
                }}
              >
                {/* Panel header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7,
                    background: `${panel.accent}18`,
                    border: `1px solid ${panel.accent}44`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%",
                      background: panel.accent, boxShadow: `0 0 6px ${panel.accent}` }} />
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif",
                    fontSize: 18, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.1 }}>
                    {panel.title}
                  </div>
                </div>

                {/* Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {panel.rows.map(row => (
                    <div key={row.label}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 11, color: "rgba(240,232,212,0.45)",
                        fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>
                        {row.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <motion.span
                          key={row.value}
                          initial={{ opacity: 0.5, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.30 }}
                          style={{ fontSize: 13, fontWeight: 800, color: panel.accent,
                            fontFamily: "'Inter',sans-serif", letterSpacing: "0.04em",
                            textShadow: `0 0 10px ${panel.accent}44` }}
                        >
                          {row.value}
                        </motion.span>
                        {row.status && (
                          <span style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: "0.22em",
                            color: panel.accent, fontFamily: "'Inter',sans-serif",
                            background: `${panel.accent}14`,
                            border: `1px solid ${panel.accent}33`,
                            borderRadius: 3, padding: "2px 6px" }}>
                            {row.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ padding: "14px 32px",
            borderTop: `1px solid rgba(212,175,55,0.10)`,
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%",
                  background: "#32B45A", boxShadow: "0 0 8px #32B45A" }}
              />
              <span style={{ fontSize: 9.5, letterSpacing: "0.26em", color: "#32B45A99",
                fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
                TELEMETRY LIVE — Updating every 1.4s
              </span>
            </div>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", color: `${GOLD}40`,
              fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>
              NOVEE OS · E.A.T v2.4
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────
   Root boot sequencer
────────────────────────────────────────── */
export default function KioskBootSequence({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const tapCount = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const advance = (s: number, delay: number) =>
      setTimeout(() => setStage(s), delay);

    const tTone = setTimeout(playActivationTone, 520);
    const t1    = advance(1, 1500);
    const t2    = advance(2, 4500);
    const t3    = advance(3, 7500);
    const tTone2 = setTimeout(playCraftHubTone, 7600);
    const t4    = advance(4, 9500);
    const t5    = advance(5, 12000);
    const tDone = setTimeout(() => onCompleteRef.current(), 15000);

    return () => {
      clearTimeout(tTone); clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(tTone2); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(tDone);
    };
  }, []);

  function handleTap() {
    tapCount.current += 1;
    if (tapCount.current >= 3) onCompleteRef.current();
  }

  function handleEATDismiss() {
    onCompleteRef.current();
  }

  return (
    <div
      onClick={handleTap}
      style={{ position: "fixed", inset: 0, zIndex: 99999,
        background: OBSIDIAN, overflow: "hidden", cursor: "none" }}
    >
      <AnimatePresence mode="wait">
        {stage === 0 && <Stage0 key="s0" />}
        {stage === 1 && <Stage1 key="s1" />}
        {stage === 2 && <Stage2 key="s2" />}
        {stage === 3 && <Stage3 key="s3" />}
        {stage === 4 && <Stage4 key="s4" />}
        {stage === 5 && <Stage5 key="s5" onDismiss={handleEATDismiss} />}
      </AnimatePresence>

      {/* Version watermark */}
      <div style={{ position: "absolute", bottom: 16, right: 20, zIndex: 10,
        fontSize: 8.5, letterSpacing: "0.22em", color: "rgba(212,175,55,0.18)",
        fontFamily: "'Inter',sans-serif", textTransform: "uppercase", pointerEvents: "none" }}>
        NOVEE OS · KIOSK EDITION · v2.4
      </div>

      {/* Triple-tap skip hint (faint) */}
      {stage > 0 && (
        <div style={{ position: "absolute", bottom: 16, left: 20, zIndex: 10,
          fontSize: 8, letterSpacing: "0.16em", color: "rgba(255,255,255,0.07)",
          fontFamily: "'Inter',sans-serif", pointerEvents: "none" }}>
          tap ×3 to skip
        </div>
      )}
    </div>
  );
}
