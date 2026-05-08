/**
 * VenueStatus — Fixed top strip for the Staff Floor Cockpit.
 *
 * Shows live-derived metrics from the current floor state:
 *   Active Guests | VIP Probability High | In Handoff | AI Alerts
 *
 * Pulses the amber dot when any stat changes.
 * Props flow from the parent (no extra fetch needed — parent already polls).
 */

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface GuestTile {
  sessionId:    string;
  sessionScore: number;
  inHandoff:    boolean;
  aiInsight:    string;
}

interface Props {
  guests:      GuestTile[];
  lastUpdated: Date | null;
}

interface Stat {
  label: string;
  value: number | string;
  accent?: string;
  alert?:  boolean;
}

export default function VenueStatus({ guests, lastUpdated }: Props) {
  const dotControls = useAnimation();
  const prevCount   = useRef(guests.length);

  const activeGuests    = guests.length;
  const vipGuests       = guests.filter(g => g.sessionScore >= 72).length;
  const pendingHandoffs = guests.filter(g => g.inHandoff).length;
  const aiAlerts        = guests.filter(g =>
    g.aiInsight && g.aiInsight.length > 0 && !g.inHandoff,
  ).length;

  useEffect(() => {
    if (guests.length !== prevCount.current) {
      dotControls.start({
        scale:   [1, 1.8, 1],
        opacity: [1, 0.4, 1],
        transition: { duration: 0.5 },
      });
      prevCount.current = guests.length;
    }
  }, [guests.length, dotControls]);

  const stats: Stat[] = [
    { label: "Active Guests",    value: activeGuests,    accent: "#F5F2ED"  },
    { label: "VIP Probability",  value: vipGuests,       accent: "#FFD700", alert: vipGuests > 0 },
    { label: "In Handoff",       value: pendingHandoffs, accent: "#7EC8A0", alert: pendingHandoffs > 0 },
    { label: "AI Alerts",        value: aiAlerts,        accent: "#E85D26", alert: aiAlerts > 0 },
  ];

  return (
    <div style={{
      position:        "fixed",
      top:             0,
      left:            0,
      right:           0,
      zIndex:          100,
      background:      "rgba(10,8,6,0.88)",
      backdropFilter:  "blur(20px) saturate(0.85)",
      borderBottom:    "1px solid rgba(212,139,0,0.18)",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "space-between",
      padding:         "10px 24px",
      gap:             "16px",
    }}>
      {/* Brand label */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <motion.div
          animate={dotControls}
          style={{
            width:        7,
            height:       7,
            borderRadius: "50%",
            background:   "#D48B00",
            boxShadow:    "0 0 8px rgba(212,139,0,0.6)",
            flexShrink:   0,
          }}
        />
        <span style={{
          fontFamily:    "'Cormorant Garamond', serif",
          fontSize:      "10px",
          letterSpacing: "0.28em",
          color:         "#D48B00",
          textTransform: "uppercase",
          whiteSpace:    "nowrap",
        }}>
          Axiom OS — Operational
        </span>
      </div>

      {/* Stats */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "28px",
        flex:           1,
        justifyContent: "center",
      }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ textAlign: "center", minWidth: "60px" }}>
            <motion.div
              key={`${stat.label}-${stat.value}`}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   "18px",
                fontWeight: 700,
                color:      stat.alert && (stat.value as number) > 0 ? stat.accent : "#F5F2ED",
                lineHeight: 1,
              }}
            >
              {stat.alert && (stat.value as number) > 0 && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ display: "inline-block" }}
                >
                  {stat.value}
                </motion.span>
              )}
              {!(stat.alert && (stat.value as number) > 0) && stat.value}
            </motion.div>
            <div style={{
              fontFamily:    "'Cormorant Garamond', serif",
              fontSize:      "9px",
              letterSpacing: "0.15em",
              color:         "#6B5E4E",
              textTransform: "uppercase",
              marginTop:     "2px",
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      {lastUpdated && (
        <div style={{
          fontFamily:    "'Cormorant Garamond', serif",
          fontSize:      "10px",
          color:         "#6B5E4E",
          whiteSpace:    "nowrap",
          flexShrink:    0,
        }}>
          {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
    </div>
  );
}
