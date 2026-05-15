/**
 * SovereignCommand — NOVEE OS · Master Command Hub
 *
 * Executive cockpit linking Hospitality, Performance, Presence, and Supply.
 * Entry gate: SovereignCommandPresence (E.A.T. cinematic boot) → command dashboard.
 */

import { useState } from "react";
import { motion }   from "framer-motion";
import { useLocation } from "wouter";
import SovereignCommandPresence from "@/components/CinematicLanding/SovereignCommandPresence";

const AMBER  = "rgba(212,175,55,";
const CHROME = "rgba(175,160,120,";
const silk   = [0.22, 1, 0.36, 1] as const;

/* ── Command pillars — navigation targets ─────────────────────────── */
const PILLARS = [
  {
    id: "crafthub",
    label: "CRAFTHUB",
    sub: "HOSPITALITY ENGINE",
    desc: "SmokeCraft 360 · Cigar, Spirit, Beer & Wine craft experiences. AI-driven recommendation, POS, and loyalty.",
    route: "/",
    accent: AMBER,
    macro: "https://media.gettyimages.com/id/458635861/photo/cuban-cigar.jpg?s=612x612&w=0&k=20&c=NivIMmHqW8o3oiVZMJWFsEV2CyGbOhZE1pN5fDEkw0k=",
  },
  {
    id: "sarv",
    label: "SARV",
    sub: "RECOVERY VAULT",
    desc: "Sovereign Athletic Recovery Vault · H.S.I. Engine · Biometric intelligence, neural load, and muscular recovery.",
    route: "/sarv",
    accent: "rgba(255,176,50,",
    macro: "https://thumbs.dreamstime.com/b/high-tech-carbon-fiber-weave-texture-detailed-macro-photograph-captures-intricate-twill-performance-composite-glossy-415462336.jpg",
  },
  {
    id: "lexi",
    label: "LEXI VISUALS",
    sub: "PRESENCE PROTOCOL",
    desc: "Obsidian light refraction engine. Visual intelligence and optic identity for the sovereign estate.",
    route: "/",
    accent: "rgba(160,180,215,",
    macro: "https://media.gettyimages.com/id/2191335804/photo/abstract-light-reflection-on-water-with-a-glass-surface.jpg?s=612x612&w=0&k=20&c=qgtpC7usHfjg2TJXsTeqGtzYJ1VRTbH0mlhBoiQ4Fmk=",
  },
  {
    id: "supply",
    label: "SOVEREIGN SUPPLY",
    sub: "DISTRIBUTION LAYER",
    desc: "Brushed titanium ledger infrastructure. Vendor management, inventory distribution, and brand partnerships.",
    route: "/vendors",
    accent: "rgba(170,160,140,",
    macro: "https://t3.ftcdn.net/jpg/19/96/35/22/360_F_1996352231_ng1GElEjYHEZH2m4wPv0TPI8DwdgAi6V.jpg",
  },
];

export default function SovereignCommand() {
  const [showPresence, setShowPresence] = useState(true);
  const [, navigate] = useLocation();

  if (showPresence) {
    return <SovereignCommandPresence onComplete={() => setShowPresence(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.65, ease: silk }}
      style={{
        position: "fixed", inset: 0,
        background: "#010101",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        overflow: "auto", display: "flex", flexDirection: "column",
      }}
    >
      {/* carbon fiber twill bg */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.05, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px)",
      }} />

      {/* ambient amber glow */}
      <motion.div
        animate={{ opacity: [0.05, 0.12, 0.05] }}
        transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 900, height: 200, pointerEvents: "none", zIndex: 0,
          background: `radial-gradient(ellipse 55% 100% at 50% 0%, ${AMBER}0.8), transparent)`,
        }}
      />

      {/* titanium header */}
      <div style={{
        position: "relative", zIndex: 10, height: 52, flexShrink: 0,
        background: "linear-gradient(180deg, #2E2E2E 0%, #1E1E1E 28%, #262626 60%, #1A1A1A 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #C8C8C8 0%, #686868 55%, #383838 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.28)",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.5em", color: `${AMBER}0.82)` }}>
            NOVEE OS · SOVEREIGN COMMAND · ACTIVE SESSION
          </span>
        </div>
        <motion.div
          animate={{ opacity: [1, 0.15, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: `${AMBER}0.9)`,
            boxShadow: `0 0 8px ${AMBER}0.6)`,
          }}
        />
      </div>

      {/* command content */}
      <div style={{ flex: 1, position: "relative", zIndex: 1, padding: "36px 28px 48px" }}>

        {/* section label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: silk }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}
        >
          <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${AMBER}0.38))` }} />
          <span style={{ fontSize: 8.5, letterSpacing: "0.5em", color: `${AMBER}0.62)` }}>
            CONVERGENCE MAP · FOUR PILLARS
          </span>
          <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, ${AMBER}0.14), transparent)` }} />
        </motion.div>

        {/* pillar command grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {PILLARS.map(({ id, label, sub, desc, route, accent, macro }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: silk }}
              onClick={() => navigate(route)}
              whileHover={{
                borderColor: `${accent}0.42)`,
                boxShadow: `0 0 0 1px ${accent}0.3), 0 24px 64px rgba(0,0,0,0.75), 0 0 60px ${accent}0.10)`,
              }}
              whileTap={{ scale: 0.985 }}
              style={{
                position: "relative", overflow: "hidden",
                background: "rgba(10,8,6,0.90)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: `1px solid ${accent}0.22)`,
                borderRadius: 3, cursor: "pointer",
                boxShadow: `0 0 0 1px ${accent}0.10), 0 8px 32px rgba(0,0,0,0.7)`,
              }}
            >
              {/* macro photography hero */}
              <div style={{
                height: 110,
                backgroundImage: `url(${macro})`,
                backgroundSize: "cover",
                backgroundPosition: id === "crafthub" ? "center 30%" : "center",
                filter: "brightness(0.32) saturate(0.45)",
              }} />
              {/* gradient fade into content */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 110,
                background: "linear-gradient(to bottom, transparent 30%, rgba(10,8,6,0.85))",
              }} />
              {/* accent top rule */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${accent}0.55) 50%, transparent)`,
              }} />
              {/* corner bolt */}
              <div style={{
                position: "absolute", top: 7, right: 7,
                width: 5, height: 5, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(200,185,135,0.9) 0%, rgba(65,50,18,0.8) 55%, rgba(12,9,3,0.95) 100%)",
                boxShadow: "0 0 3px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.2)",
              }} />

              <div style={{ padding: "14px 22px 22px" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.45em", color: `${accent}0.82)`, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 7.5, letterSpacing: "0.35em", color: `${CHROME}0.45)`, marginBottom: 12, fontStyle: "italic" }}>
                  {sub}
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.02em", color: "rgba(185,170,145,0.68)", lineHeight: 1.55, fontWeight: 300 }}>
                  {desc}
                </div>
                {/* bottom accent rule */}
                <div style={{
                  marginTop: 16, height: 1,
                  background: `linear-gradient(90deg, ${accent}0.28), transparent)`,
                }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* command identifier */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.65, ease: silk }}
          style={{ marginTop: 52, textAlign: "center" }}
        >
          <span style={{ fontSize: 7.5, letterSpacing: "0.5em", color: "rgba(100,82,48,0.35)" }}>
            NOVEE OS · SOVEREIGN COMMAND · PROFOUND INNOVATIONS · MASTER CONTROL PROTOCOL · ACTIVE
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
