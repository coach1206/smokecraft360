/**
 * SARV — Sovereign Athletic Recovery Vault
 *
 * Entry point: SARVPresence (E.A.T. cinematic boot screen) → vault dashboard stub.
 */

import { useState } from "react";
import { motion }   from "framer-motion";
import SARVPresence from "@/components/CinematicLanding/SARVPresence";

const BIO = "rgba(255,176,50,";
const silk = [0.22, 1, 0.36, 1] as const;

const METRICS = [
  { label: "HYDRATION INDEX",       value: "94%",    note: "Optimal cellular matrix" },
  { label: "OXYGEN SATURATION",     value: "100%",   note: "Peak respiratory load" },
  { label: "NEURAL LOAD CLEARANCE", value: "78%",    note: "Cortical recovery in progress" },
  { label: "MUSCULAR RECOVERY",     value: "62%",    note: "Fiber regeneration active" },
  { label: "HEART RATE",            value: "60 BPM", note: "Resting biometric baseline" },
  { label: "RECOVERY TIER",         value: "TIER 1", note: "Sovereign athlete protocol" },
];

export default function SARV() {
  const [showPresence, setShowPresence] = useState(true);

  if (showPresence) {
    return <SARVPresence onComplete={() => setShowPresence(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: silk }}
      style={{
        position: "fixed", inset: 0,
        background: "#010101",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        overflow: "auto",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* carbon fiber twill bg texture */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.05, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px)",
      }} />

      {/* titanium header */}
      <div style={{
        position: "relative", zIndex: 10, height: 52, flexShrink: 0,
        background: "linear-gradient(180deg, #282828 0%, #1A1A1A 28%, #222222 60%, #181818 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "radial-gradient(circle, #B8B8B8 0%, #606060 55%, #303030 100%)",
            boxShadow: "0 0 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.5em", color: `${BIO}0.82)` }}>
            SARV · RECOVERY VAULT · ACTIVE SESSION
          </span>
        </div>
        <motion.div
          animate={{ opacity: [1, 0.15, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: `${BIO}0.9)`,
            boxShadow: `0 0 6px ${BIO}0.6)`,
          }}
        />
      </div>

      {/* vault content */}
      <div style={{ flex: 1, position: "relative", zIndex: 1, padding: "40px 32px" }}>

        {/* section label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: silk }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}
        >
          <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${BIO}0.4))` }} />
          <span style={{ fontSize: 8.5, letterSpacing: "0.5em", color: `${BIO}0.65)` }}>
            BIOMETRIC INTELLIGENCE FEED
          </span>
          <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, ${BIO}0.15), transparent)` }} />
        </motion.div>

        {/* metric grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {METRICS.map(({ label, value, note }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: silk }}
              style={{
                background: "rgba(10,8,6,0.88)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: `1px solid ${BIO}0.18)`,
                borderRadius: 3,
                padding: "24px 28px",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* corner bolt */}
              <div style={{
                position: "absolute", top: 7, right: 7,
                width: 5, height: 5, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(150,130,90,0.9) 0%, rgba(45,35,15,0.8) 60%, rgba(8,6,2,0.95) 100%)",
                boxShadow: "0 0 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18)",
              }} />
              <div style={{
                fontSize: 8, letterSpacing: "0.42em",
                color: "rgba(140,120,82,0.62)", marginBottom: 10,
              }}>
                {label}
              </div>
              <div style={{
                fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 300,
                letterSpacing: "0.06em",
                color: `${BIO}0.92)`,
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{
                fontSize: 9, letterSpacing: "0.3em",
                color: "rgba(120,105,72,0.5)", marginTop: 8,
                fontStyle: "italic",
              }}>
                {note}
              </div>
              {/* bottom edge rule */}
              <div style={{
                position: "absolute", bottom: 0, left: "10%", right: "10%", height: 1,
                background: `linear-gradient(90deg, transparent, ${BIO}0.25) 50%, transparent)`,
              }} />
            </motion.div>
          ))}
        </div>

        {/* vault identifier */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: silk }}
          style={{ marginTop: 52, textAlign: "center" }}
        >
          <span style={{ fontSize: 7.5, letterSpacing: "0.5em", color: "rgba(100,82,50,0.38)" }}>
            NOVEE OS · SOVEREIGN ATHLETIC RECOVERY VAULT · HUMAN STATE INTELLIGENCE ENGINE · TIER 1
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
