/**
 * StaffBOHFeed — Back-of-House live Server Pulse feed.
 *
 * Mounts globally in App.tsx but only renders for staff/manager/venue_owner roles.
 * Subscribes to BOH_PULSE Socket.io events and shows a toast-style feed
 * in the bottom-left corner of the screen.
 *
 * REVENUE_OPPORTUNITY pulses (AxiomBridge spec) render with a distinct
 * green revenue badge and the full recommendation string from the server.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import { Zap, X, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { socket }                            from "@/lib/socket";
import { useAuth }                           from "@/contexts/AuthContext";

const C = {
  bg:      "rgba(20,14,6,0.97)",
  border:  "rgba(212,139,0,0.28)",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.60)",
  text:    "rgba(240,232,212,0.92)",
  muted:   "rgba(240,232,212,0.42)",
  green:   "#4ade80",
  emerald: "rgba(52,211,153,0.90)",
};

interface BOHPulse {
  id:              string;
  type?:           string;
  table:           string;
  guestName:       string;
  guestLevel:      string;
  draftProfile:    string;
  topMatch:        string;
  masteryBoost:    number;
  timestamp:       string;
  message:         string;
  action:          string;
  recommendation?: string;
}

const STAFF_ROLES = new Set(["staff", "manager", "venue_owner", "super_admin"]);
const MAX_PULSES  = 8;

export function StaffBOHFeed() {
  const { user } = useAuth();
  const [pulses,     setPulses]     = useState<BOHPulse[]>([]);
  const [expanded,   setExpanded]   = useState(false);
  const [unread,     setUnread]     = useState(0);

  const isStaff = !!user && STAFF_ROLES.has(user.role ?? "");

  const handlePulse = useCallback((data: Omit<BOHPulse, "id">) => {
    const pulse: BOHPulse = {
      ...data,
      id: `${Date.now()}-${Math.random()}`,
    };
    setPulses(prev => [pulse, ...prev].slice(0, MAX_PULSES));
    setUnread(n => n + 1);
    setExpanded(true);
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    socket.on("BOH_PULSE", handlePulse);
    return () => { socket.off("BOH_PULSE", handlePulse); };
  }, [isStaff, handlePulse]);

  if (!isStaff || pulses.length === 0) return null;

  const revenueCount = pulses.filter(p => p.type === "REVENUE_OPPORTUNITY").length;

  function dismiss(id: string) {
    setPulses(prev => prev.filter(p => p.id !== id));
  }

  function handleToggle() {
    setExpanded(v => !v);
    if (!expanded) setUnread(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position:  "fixed",
        bottom:    24, left: 20,
        zIndex:    890,
        width:     340,
        maxWidth:  "calc(100vw - 40px)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={handleToggle}
        style={{
          width:         "100%",
          display:       "flex",
          alignItems:    "center",
          gap:           10,
          background:    C.bg,
          border:        `1px solid ${C.border}`,
          borderRadius:  expanded ? "12px 12px 0 0" : 12,
          padding:       "10px 14px",
          cursor:        "pointer",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <Zap size={13} color={C.gold} />
        </motion.div>
        <span style={{
          flex:          1,
          textAlign:     "left",
          fontSize:      "0.68rem",
          fontWeight:    600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         C.goldDim,
        }}>
          Server Pulse
        </span>

        {/* Revenue opportunity badge */}
        {revenueCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          3,
              background:   "rgba(52,211,153,0.15)",
              border:       "1px solid rgba(52,211,153,0.35)",
              borderRadius: 10,
              padding:      "2px 7px",
              fontSize:     "0.58rem",
              fontWeight:   700,
              color:        C.emerald,
              letterSpacing: "0.08em",
            }}
          >
            <TrendingUp size={9} />
            {revenueCount} OPP
          </motion.span>
        )}

        {unread > 0 && !expanded && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              background:   C.gold,
              color:        "#000",
              borderRadius: "50%",
              width: 18, height: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.6rem", fontWeight: 700,
            }}
          >
            {unread}
          </motion.span>
        )}
        {expanded ? <ChevronDown size={13} color={C.muted} /> : <ChevronUp size={13} color={C.muted} />}
      </button>

      {/* Pulse list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              background:   C.bg,
              border:       `1px solid ${C.border}`,
              borderTop:    "none",
              borderRadius: "0 0 12px 12px",
              overflow:     "hidden",
              maxHeight:    400,
              overflowY:    "auto",
            }}
          >
            {pulses.map((p, i) => {
              const isRevenue = p.type === "REVENUE_OPPORTUNITY";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    padding:    "12px 14px",
                    borderTop:  i > 0 ? `1px solid rgba(212,139,0,0.08)` : "none",
                    position:   "relative",
                    borderLeft: isRevenue ? "2px solid rgba(52,211,153,0.5)" : "2px solid transparent",
                  }}
                >
                  {/* Dismiss */}
                  <button
                    onClick={() => dismiss(p.id)}
                    style={{
                      position:   "absolute", top: 10, right: 10,
                      background: "none", border: "none",
                      color:      "rgba(212,139,0,0.25)",
                      cursor:     "pointer", padding: 2,
                    }}
                  >
                    <X size={11} />
                  </button>

                  {/* Revenue Opportunity badge */}
                  {isRevenue && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display:       "inline-flex",
                        alignItems:    "center",
                        gap:           4,
                        background:    "rgba(52,211,153,0.10)",
                        border:        "1px solid rgba(52,211,153,0.28)",
                        borderRadius:  6,
                        padding:       "2px 8px",
                        fontSize:      "0.58rem",
                        fontWeight:    800,
                        color:         C.emerald,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        marginBottom:  6,
                      }}
                    >
                      <TrendingUp size={8} />
                      Revenue Opportunity
                    </motion.div>
                  )}

                  {/* Guest + table */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: isRevenue ? "rgba(52,211,153,0.14)" : "rgba(212,139,0,0.14)",
                      border: `1px solid ${isRevenue ? "rgba(52,211,153,0.3)" : "rgba(212,139,0,0.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: isRevenue ? C.emerald : C.gold, fontWeight: 700,
                    }}>
                      {p.guestName[0]}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: C.text, fontWeight: 500 }}>
                      {p.guestName}
                    </span>
                    <span style={{
                      fontSize:      "0.6rem",
                      color:         C.goldDim,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginLeft:    "auto",
                      paddingRight:  20,
                    }}>
                      {p.guestLevel}
                    </span>
                  </div>

                  {/* Draft profile */}
                  <p style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 5 }}>
                    Draft: <span style={{ color: C.text }}>{p.draftProfile}</span>
                  </p>

                  {/* Recommendation — full spec-format string when present */}
                  {p.recommendation ? (
                    <div style={{
                      background:   "rgba(52,211,153,0.07)",
                      border:       "1px solid rgba(52,211,153,0.22)",
                      borderRadius: 6,
                      padding:      "6px 9px",
                      display:      "flex",
                      alignItems:   "flex-start",
                      gap:          6,
                      marginBottom: 4,
                    }}>
                      <TrendingUp size={10} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.68rem", color: C.green, lineHeight: 1.4 }}>
                        {p.recommendation}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      background:   "rgba(74,222,128,0.08)",
                      border:       "1px solid rgba(74,222,128,0.2)",
                      borderRadius: 6,
                      padding:      "5px 9px",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          6,
                    }}>
                      <Zap size={10} color={C.green} />
                      <span style={{ fontSize: "0.68rem", color: C.green }}>
                        Recommend <strong>{p.topMatch}</strong> — +{p.masteryBoost} Mastery
                      </span>
                    </div>
                  )}

                  <p style={{
                    fontSize:   "0.58rem",
                    color:      "rgba(212,139,0,0.25)",
                    marginTop:  4,
                    letterSpacing: "0.05em",
                  }}>
                    {new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {p.table !== "–" && ` · Table ${p.table}`}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
