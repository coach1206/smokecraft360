/**
 * NeuralBridgeOverlay — Global real-time cross-engine feed
 *
 * A collapsible fixed panel (bottom-right) that shows live Neural Bridge
 * events as they arrive. Visible only when the bridge has been active
 * (i.e. at least one event received). Collapses to a pulsing orb when closed.
 *
 * Renders on top of all pages — mounted once in App.tsx.
 * Zero performance impact when bridge is silent (no listeners active).
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useNeuralBridge }             from "@/hooks/useNeuralBridge";

const C = {
  bg:     "rgba(26,26,27,0.92)",
  border: "rgba(212,139,0,0.28)",
  gold:   "#D48B00",
  text:   "rgba(240,232,212,0.90)",
  muted:  "rgba(240,232,212,0.45)",
  dim:    "rgba(240,232,212,0.22)",
};

const ENGINE_ICONS: Record<string, string> = {
  interaction: "◎",
  energy:      "⚡",
  pressure:    "▲",
  identity:    "◈",
  network:     "◉",
};

function timeSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function NeuralBridgeOverlay() {
  const { feed, bridgeActive, lastRoomEnergy, lastPulse, lastPressure } = useNeuralBridge();
  const [open, setOpen]       = useState(false);
  const [pulse, setPulse]     = useState(false);
  const prevLen               = useRef(0);

  // Flash pulse indicator on new events
  useEffect(() => {
    if (feed.length > prevLen.current) {
      prevLen.current = feed.length;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [feed.length]);

  // Don't render at all until the bridge has fired at least once
  if (!bridgeActive && feed.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, pointerEvents: "none" }}>

      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              pointerEvents: "auto",
              width: 320,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,139,0,0.12)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid rgba(240,232,212,0.08)`, display: "flex", alignItems: "center", gap: 10 }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, flexShrink: 0 }}
              />
              <span style={{ fontSize: 10, color: C.gold, letterSpacing: "0.14em", fontFamily: "'Courier New', monospace", flex: 1 }}>
                NEURAL BRIDGE · LIVE
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Live KPI strip */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid rgba(240,232,212,0.06)` }}>
              {[
                { label: "ENERGY",   value: lastRoomEnergy ? `${lastRoomEnergy.energyScore}` : "—",   color: lastRoomEnergy?.status === "HIGH_MOMENTUM" ? "#4ade80" : "#fb923c" },
                { label: "CRITICAL", value: lastPressure ? `${lastPressure.criticalCount}` : "—",     color: "#f87171" },
                { label: "SESSIONS", value: lastPulse ? `${lastPulse.activeSessions}` : "—",          color: "#60a5fa" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, padding: "8px 0", textAlign: "center", borderRight: `1px solid rgba(240,232,212,0.06)` }}>
                  <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: "'Cormorant Garamond', serif" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Event feed */}
            <div style={{ maxHeight: 260, overflowY: "auto", scrollbarWidth: "none" }}>
              <AnimatePresence initial={false}>
                {feed.slice(0, 20).map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: 10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ padding: "8px 16px", borderBottom: `1px solid rgba(240,232,212,0.05)`, display: "flex", gap: 10, alignItems: "flex-start" }}
                  >
                    <span style={{ fontSize: 11, color: entry.color, flexShrink: 0, marginTop: 1 }}>
                      {ENGINE_ICONS[entry.engine] ?? "·"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: entry.color, letterSpacing: "0.1em", marginBottom: 2 }}>{entry.label}</div>
                      <div style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.value}</div>
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, flexShrink: 0, marginTop: 1 }}>{timeSince(entry.ts)}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {feed.length === 0 && (
                <div style={{ padding: "20px 16px", fontSize: 11, color: C.dim, textAlign: "center" }}>
                  Listening for guest interactions…
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "8px 16px", borderTop: `1px solid rgba(240,232,212,0.06)`, display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>
              <span>{feed.length} events received</span>
              <span>4 engines wired</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle orb ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={pulse ? { scale: [1, 1.18, 1], boxShadow: [`0 0 0 0 ${C.gold}00`, `0 0 0 10px ${C.gold}44`, `0 0 0 0 ${C.gold}00`] } : {}}
        transition={{ duration: 0.5 }}
        style={{
          pointerEvents: "auto",
          width: 44, height: 44,
          borderRadius: "50%",
          background: open ? "rgba(212,139,0,0.18)" : "rgba(26,26,27,0.88)",
          border: `1px solid ${open ? "rgba(212,139,0,0.6)" : "rgba(212,139,0,0.28)"}`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}
        title="Neural Bridge — live engine feed"
      >
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 16, color: C.gold, lineHeight: 1 }}
        >
          ◉
        </motion.div>
        {/* Unread badge */}
        {!open && feed.length > 0 && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            width: 14, height: 14, borderRadius: "50%",
            background: C.gold, border: "2px solid rgba(26,26,27,0.9)",
            fontSize: 8, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
          }}>
            {Math.min(feed.length, 99)}
          </div>
        )}
      </motion.button>
    </div>
  );
}
