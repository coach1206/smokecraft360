/**
 * EnvironmentPulseOverlay — Fixed ambient atmosphere overlay for the kiosk.
 *
 * A collapsible bottom-right panel that shows live lounge vitality
 * from the Smart Humidor IoT sensor feed.
 *
 * - Collapsed: a pulsing ring chip showing OPTIMAL / DEVIANT / NO SENSOR
 * - Expanded:  full AtmospherePulse card with vitality ring, gauges,
 *              and compensatory pairing nudge
 * - When isDeviant: chip pulses amber, auto-expands for 8 seconds
 * - Socket.IO listener for "iot:compensatory_pairing" events to show
 *   real-time nudge banner without polling
 *
 * Usage: mount once in the root kiosk shell (CraftHub, etc.)
 *   <EnvironmentPulseOverlay venueId={venueId} />
 */

import { useState, useEffect, useRef }  from "react";
import { motion, AnimatePresence }      from "framer-motion";
import AtmospherePulse                  from "./AtmospherePulse";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

interface LiveNudge {
  deviationNote: string;
  pairing:       string;
  timestamp:     string;
}

interface Props {
  venueId?: string;
}

function getVenueId(): string | null {
  const keys = ["axiom_jwt", "auth_token", "axiom_token", "smokecraft_token"];
  for (const k of keys) {
    const t = localStorage.getItem(k);
    if (t) {
      try { return (JSON.parse(atob(t.split(".")[1]!)) as { venueId?: string }).venueId ?? null; }
      catch { /* try next */ }
    }
  }
  return null;
}

export default function EnvironmentPulseOverlay({ venueId: propVenueId }: Props) {
  const venueId = propVenueId ?? getVenueId();

  const [expanded,  setExpanded]  = useState(false);
  const [vitality,  setVitality]  = useState<number | null>(null);
  const [isDeviant, setIsDeviant] = useState(false);
  const [liveNudge, setLiveNudge] = useState<LiveNudge | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll atmosphere every 30s for chip indicator
  useEffect(() => {
    if (!venueId) return;
    const poll = () => {
      fetch(`${BASE}/api/iot/atmosphere/${venueId}`)
        .then(r => r.ok ? r.json() as Promise<{ vitality: number | null; isDeviant: boolean }> : null)
        .then(d => {
          if (!d) return;
          setVitality(d.vitality);
          const deviant = d.isDeviant;
          setIsDeviant(deviant);
          // Auto-expand on deviation, auto-collapse after 8s
          if (deviant && !expanded) {
            setExpanded(true);
            if (collapseTimer.current) clearTimeout(collapseTimer.current);
            collapseTimer.current = setTimeout(() => setExpanded(false), 8000);
          }
        })
        .catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 30_000);
    return () => { clearInterval(iv); if (collapseTimer.current) clearTimeout(collapseTimer.current); };
  }, [venueId]);

  // Socket.IO live nudge listener
  useEffect(() => {
    if (!venueId) return;
    // Dynamic import to avoid SSR issues
    import("socket.io-client")
      .then(({ io }) => {
        const socket = io({ path: `${BASE}/socket.io`, transports: ["websocket"] });
        socket.emit("join-venue", venueId);
        socket.on("iot:compensatory_pairing", (data: LiveNudge) => {
          setLiveNudge(data);
          setIsDeviant(true);
          setExpanded(true);
          if (collapseTimer.current) clearTimeout(collapseTimer.current);
          collapseTimer.current = setTimeout(() => {
            setExpanded(false);
            setLiveNudge(null);
          }, 12_000);
        });
        return () => { socket.disconnect(); };
      })
      .catch(() => { /* socket.io not available — polling covers it */ });
  }, [venueId]);

  if (!venueId) return null;

  const chipColor = isDeviant ? "#D48B00"
    : vitality !== null && vitality >= 80 ? "#4ade80"
    : vitality !== null ? "#3BBFA3"
    : "rgba(240,232,212,0.20)";

  const chipLabel = isDeviant ? "⚠ DEVIANT"
    : vitality !== null ? `${vitality}% VITALITY`
    : "MONITORING";

  return (
    <div style={{
      position:  "fixed",
      bottom:    expanded ? 44 : 44,   // sits just above TickerTape (36px)
      right:     16,
      zIndex:    35,
      display:   "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap:       8,
    }}>
      {/* Live nudge banner */}
      <AnimatePresence>
        {liveNudge && (
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            style={{
              maxWidth: 260, padding: "10px 14px", borderRadius: 10,
              background: "rgba(8,6,4,0.94)", border: "1px solid rgba(212,139,0,0.40)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 800, color: "#D48B00", letterSpacing: "0.12em", marginBottom: 4 }}>
              ◆ SAGE NUDGE — LIVE PAIRING
            </div>
            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.80)", lineHeight: 1.45 }}>
              {liveNudge.pairing}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded full panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1,  scale: 1,    y: 0  }}
            exit={{   opacity: 0,  scale: 0.94, y: 10  }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 240,
              background:    "rgba(8,6,4,0.92)",
              border:        `1px solid ${chipColor}28`,
              borderRadius:  14,
              backdropFilter:"blur(18px)",
              overflow:      "hidden",
            }}
          >
            <AtmospherePulse venueId={venueId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed chip */}
      <motion.button
        onClick={() => setExpanded(e => !e)}
        whileTap={{ scale: 0.95 }}
        style={{
          cursor:     "pointer",
          background: "none", border: "none", padding: 0,
        }}
      >
        <div style={{
          display:    "flex", alignItems: "center", gap: 7,
          padding:    "6px 11px", borderRadius: 20,
          background: "rgba(8,6,4,0.82)",
          border:     `1px solid ${chipColor}38`,
          backdropFilter: "blur(12px)",
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1], scale: isDeviant ? [1, 1.2, 1] : [1, 1.05, 1] }}
            transition={{ duration: isDeviant ? 1.0 : 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: chipColor, flexShrink: 0 }}
          />
          <span style={{ fontSize: 9, fontWeight: 700, color: chipColor, letterSpacing: "0.10em", whiteSpace: "nowrap" }}>
            {chipLabel}
          </span>
        </div>
      </motion.button>
    </div>
  );
}
