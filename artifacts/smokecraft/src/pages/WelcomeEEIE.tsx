/**
 * WelcomeEEIE — Sovereign Intelligence Engine gate page.
 * Handles session restoration, PIN entry, and electric-cyan ripple transition.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Session memory ───────────────────────────────────────────
export const SovereignMemory = {
  save: (path: string) => {
    try {
      localStorage.setItem("eeie_memory_core", JSON.stringify({ path, time: Date.now() }));
    } catch { /* storage unavailable */ }
  },
  restore: (): string | null => {
    try {
      const raw = localStorage.getItem("eeie_memory_core");
      if (!raw) return null;
      const data: { path: string; time: number } = JSON.parse(raw);
      if (Date.now() - data.time < 4 * 60 * 60 * 1000) return data.path;
      return null;
    } catch { return null; }
  },
  clear: () => { try { localStorage.removeItem("eeie_memory_core"); } catch { /* noop */ } },
};

// ── PIN numpad layout ────────────────────────────────────────
const NUMPAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"] as const;
type PadKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null | "⌫";

export default function WelcomeEEIE() {
  const [, navigate] = useLocation();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [ripple, setRipple] = useState(false);
  const savedPath = SovereignMemory.restore();

  const handleKey = (k: PadKey) => {
    if (k === null) return;
    if (k === "⌫") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + String(k);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        setRipple(true);
        setTimeout(() => {
          navigate(savedPath ?? "/eeie-command");
          SovereignMemory.clear();
        }, 750);
      }, 180);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(circle at top, #0f172a 0%, #010409 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", fontFamily: "'Inter',sans-serif",
      position: "relative", overflow: "hidden",
    }}>

      {/* Atmospheric sheen */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 130,
        background: "linear-gradient(180deg, rgba(240,244,248,0.04) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Corner ambient */}
      <div style={{
        position: "fixed", top: -60, right: -60, width: 340, height: 340,
        background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Electric Cyan Ripple — inverse contract on enter */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            key="ripple-enter"
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={{ clipPath: "circle(160% at 50% 50%)" }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", inset: 0,
              background: "linear-gradient(145deg, rgba(0,212,255,0.22) 0%, rgba(0,100,180,0.18) 100%)",
              backdropFilter: "blur(30px)",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Main gate card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{
          width: "100%", maxWidth: 440,
          padding: "48px 40px 40px",
          background: "linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,1) 100%)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 20,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.4), 0 48px 96px rgba(0,0,0,0.85)",
          backdropFilter: "blur(30px)",
          textAlign: "center",
          position: "relative", zIndex: 1,
        }}
      >
        {/* Vault icon */}
        <div style={{
          width: 60, height: 60, borderRadius: 17, margin: "0 auto 24px",
          background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 32px rgba(0,212,255,0.16)",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="#00d4ff" strokeWidth="1.5" fill="rgba(0,212,255,0.09)" />
            <path d="M12 7v10M3 7l9 5 9-5" stroke="#00d4ff" strokeWidth="1" opacity="0.55" />
          </svg>
        </div>

        {/* Brand header */}
        <div style={{
          fontSize: 20, fontWeight: 700, color: "rgba(240,244,248,0.85)",
          fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.22rem",
          lineHeight: 1.2, marginBottom: 8,
        }}>EEIE</div>
        <div style={{
          fontSize: 10, color: "rgba(0,212,255,0.65)", fontFamily: "'Orbitron',sans-serif",
          letterSpacing: "0.18em", marginBottom: 22,
        }}>SOVEREIGN INTELLIGENCE ENGINE</div>

        {/* Mission statement */}
        <p style={{
          fontSize: 13, color: "rgba(200,215,235,0.50)", fontFamily: "'Inter',sans-serif",
          fontWeight: 400, lineHeight: 1.85, maxWidth: 310, margin: "0 auto 28px",
        }}>
          Experience Enhancement Intelligence Engine — venue command infrastructure
          for elite operators. Real-time guest intelligence, spatial telemetry,
          and commerce orchestration.
        </p>

        {/* Session memory notice */}
        {savedPath && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 24, padding: "10px 16px", borderRadius: 10,
              background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)",
            }}
          >
            <div style={{ fontSize: 8, color: "rgba(0,212,255,0.65)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.14em", marginBottom: 3 }}>
              SESSION MEMORY ACTIVE
            </div>
            <div style={{ fontSize: 11, color: "rgba(200,215,235,0.55)", fontFamily: "'Inter',sans-serif" }}>
              Previous workspace detected. Enter PIN to restore.
            </div>
          </motion.div>
        )}

        {/* PIN indicator dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.28 }}
              style={{
                width: 12, height: 12, borderRadius: "50%",
                background: i < pin.length ? "#00d4ff" : "rgba(255,255,255,0.10)",
                boxShadow: i < pin.length ? "0 0 14px rgba(0,212,255,0.65)" : "none",
                transition: "background 0.14s, box-shadow 0.14s",
              }}
            />
          ))}
        </div>

        {/* Numpad */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
          maxWidth: 240, margin: "0 auto 30px",
        }}>
          {NUMPAD.map((k, i) => (
            <motion.button
              key={i}
              whileTap={k !== null ? { scale: 0.88, y: 2 } : {}}
              onClick={() => handleKey(k)}
              disabled={k === null}
              style={{
                height: 54, borderRadius: 11,
                background: k === null ? "transparent" : "rgba(255,255,255,0.04)",
                border: k === null ? "none" : "1px solid rgba(255,255,255,0.07)",
                color: k === "⌫" ? "rgba(0,212,255,0.70)" : "rgba(240,244,248,0.85)",
                fontSize: k === "⌫" ? 17 : 20, fontWeight: 600,
                fontFamily: "'Inter',sans-serif",
                cursor: k === null ? "default" : "pointer",
                transition: "background 0.10s",
                boxShadow: k !== null ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3)" : "none",
              }}
              onMouseEnter={e => { if (k !== null) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (k !== null) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
            >
              {k ?? ""}
            </motion.button>
          ))}
        </div>

        {/* Enter without restoring */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/eeie-command")}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 11,
            background: "rgba(0,212,255,0.09)", border: "1px solid rgba(0,212,255,0.20)",
            color: "rgba(0,212,255,0.75)", fontSize: 10, fontWeight: 700,
            fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.16em",
            cursor: "pointer", transition: "background 0.14s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.09)")}
        >
          ENTER NEW SESSION
        </motion.button>

        {/* Footer */}
        <div style={{ marginTop: 24, fontSize: 8, color: "rgba(150,180,220,0.28)", fontFamily: "'Orbitron',sans-serif", letterSpacing: "0.12em" }}>
          NOVEE OS · TITAN V · 360 ENTERPRISES SERVICES LLC
        </div>
      </motion.div>
    </div>
  );
}
