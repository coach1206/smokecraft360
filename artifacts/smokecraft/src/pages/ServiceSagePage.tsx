/**
 * ServiceSagePage — /staff/sage
 *
 * Mobile-first Service Sage Dashboard for venue staff.
 * Shows the live floor grid, real-time BOH nudge feed, and Confirm Sale CTA.
 *
 * Design: Industrial-Luxe — dark charcoal (#1A1A1B) bg, Warm Honey Amber
 * accents, crisp white type. Touch-first, glance-able at a glance.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation }                from "wouter";
import { motion, AnimatePresence }    from "framer-motion";
import {
  ArrowLeft, Zap, TrendingUp, CheckCircle2, Users,
  Clock, Circle, RefreshCw, BarChart2,
} from "lucide-react";
import { socket } from "@/lib/socket";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:      "#111110",
  panel:   "#1A1A1B",
  card:    "#222220",
  border:  "rgba(212,139,0,0.14)",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.55)",
  text:    "rgba(240,232,212,0.95)",
  muted:   "rgba(240,232,212,0.45)",
  green:   "#4ade80",
  amber:   "#fbbf24",
  red:     "#f87171",
  emerald: "rgba(52,211,153,0.90)",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface FloorTable {
  tableId:    string;
  guestCount: number;
  status:     "active" | "idle" | "closing";
  lastAction: string;
  section?:   string;
}

interface BOHNudge {
  id:              string;
  type?:           string;
  table:           string;
  guestName:       string;
  guestLevel:      string;
  draftProfile:    string;
  topMatch:        string;
  masteryBoost:    number;
  recommendation?: string;
  timestamp:       string;
  confirmed?:      boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  active:  C.green,
  idle:    C.amber,
  closing: C.red,
};

const STATUS_LABEL: Record<string, string> = {
  active:  "ACTIVE",
  idle:    "IDLE",
  closing: "CLOSING",
};

function minutesAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  return `${Math.round(diff / 60)}h ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServiceSagePage() {
  const [, navigate]    = useLocation();
  const [tables,  setTables]  = useState<FloorTable[]>([]);
  const [nudges,  setNudges]  = useState<BOHNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"floor" | "nudges">("floor");
  const [confirming, setConfirming] = useState<string | null>(null);
  const nudgeCount = nudges.filter(n => !n.confirmed).length;

  // ── Floor polling ──────────────────────────────────────────────────────────

  const fetchFloor = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/sage/floor`);
      if (r.ok) {
        const d = await r.json() as { tables: FloorTable[] };
        setTables(d.tables);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFloor();
    const t = setInterval(fetchFloor, 30_000);
    return () => clearInterval(t);
  }, [fetchFloor]);

  // ── Live BOH_PULSE ─────────────────────────────────────────────────────────

  const handlePulse = useCallback((data: Omit<BOHNudge, "id" | "confirmed">) => {
    setNudges(prev => [
      { ...data, id: `${Date.now()}-${Math.random()}`, confirmed: false },
      ...prev,
    ].slice(0, 30));
    setTab("nudges");
  }, []);

  useEffect(() => {
    socket.on("BOH_PULSE", handlePulse);
    return () => { socket.off("BOH_PULSE", handlePulse); };
  }, [handlePulse]);

  // ── Confirm Sale ───────────────────────────────────────────────────────────

  async function confirmSale(nudge: BOHNudge) {
    setConfirming(nudge.id);
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${BASE}/api/sage/confirm-sale`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tableId:         nudge.table,
          guestName:       nudge.guestName,
          guestLevel:      nudge.guestLevel,
          recommendedItem: nudge.topMatch,
        }),
      });
      setNudges(prev =>
        prev.map(n => n.id === nudge.id ? { ...n, confirmed: true } : n)
      );
    } catch { /* non-fatal */ }
    finally { setConfirming(null); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:  "100dvh",
      background: C.bg,
      color:      C.text,
      display:    "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        background:    C.panel,
        borderBottom:  `1px solid ${C.border}`,
        padding:       "14px 20px",
        display:       "flex",
        alignItems:    "center",
        gap:           14,
        position:      "sticky",
        top:           0,
        zIndex:        50,
      }}>
        <button
          onClick={() => navigate("/staff")}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "flex" }}
        >
          <ArrowLeft size={20} />
        </button>

        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap size={16} color={C.gold} />
        </motion.div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text }}>
            Service Sage
          </div>
          <div style={{ fontSize: "0.62rem", color: C.muted, letterSpacing: "0.08em" }}>
            Live Floor · Revenue Intelligence
          </div>
        </div>

        <button
          onClick={fetchFloor}
          style={{ background: "none", border: "none", color: C.goldDim, cursor: "pointer", padding: 4 }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display:      "flex",
        background:   C.panel,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {(["floor", "nudges"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex:          1,
              padding:       "12px 0",
              background:    "none",
              border:        "none",
              borderBottom:  tab === t ? `2px solid ${C.gold}` : "2px solid transparent",
              color:         tab === t ? C.gold : C.muted,
              fontSize:      "0.7rem",
              fontWeight:    600,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              cursor:        "pointer",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              gap:           6,
              transition:    "all 0.15s",
            }}
          >
            {t === "floor" ? <BarChart2 size={13} /> : <Zap size={13} />}
            {t === "floor" ? "Live Floor" : (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                Nudges
                {nudgeCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      background: C.gold, color: "#000",
                      borderRadius: "50%", width: 16, height: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.55rem", fontWeight: 800,
                    }}
                  >
                    {nudgeCount}
                  </motion.span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>

        {/* FLOOR TAB */}
        {tab === "floor" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: C.muted, paddingTop: 60, fontSize: "0.8rem" }}>
                Loading floor…
              </div>
            ) : (
              <>
                {/* Section groups */}
                {Array.from(new Set(tables.map(t => t.section ?? "Floor"))).map(section => (
                  <div key={section} style={{ marginBottom: 24 }}>
                    <div style={{
                      fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em",
                      textTransform: "uppercase", color: C.goldDim, marginBottom: 10,
                    }}>
                      {section}
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: 10,
                    }}>
                      {tables.filter(t => (t.section ?? "Floor") === section).map(table => (
                        <motion.div
                          key={table.tableId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            background:   C.card,
                            border:       `1px solid ${table.status === "active" ? "rgba(74,222,128,0.20)" : C.border}`,
                            borderRadius: 12,
                            padding:      "14px 12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.text }}>
                              {table.tableId}
                            </span>
                            <motion.div
                              animate={table.status === "active" ? { opacity: [1, 0.4, 1] } : {}}
                              transition={{ duration: 1.6, repeat: Infinity }}
                            >
                              <Circle size={8} fill={STATUS_COLOR[table.status]} color={STATUS_COLOR[table.status]} />
                            </motion.div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                            <Users size={10} color={C.muted} />
                            <span style={{ fontSize: "0.68rem", color: C.text }}>
                              {table.guestCount} {table.guestCount === 1 ? "guest" : "guests"}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                            <Clock size={9} color={C.muted} />
                            <span style={{ fontSize: "0.6rem", color: C.muted }}>
                              {minutesAgo(table.lastAction)}
                            </span>
                          </div>

                          <div style={{
                            display:       "inline-flex",
                            alignItems:    "center",
                            background:    `${STATUS_COLOR[table.status]}18`,
                            border:        `1px solid ${STATUS_COLOR[table.status]}40`,
                            borderRadius:  6,
                            padding:       "2px 8px",
                            fontSize:      "0.55rem",
                            fontWeight:    700,
                            letterSpacing: "0.10em",
                            color:         STATUS_COLOR[table.status],
                          }}>
                            {STATUS_LABEL[table.status]}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}

                {tables.length === 0 && (
                  <div style={{ textAlign: "center", color: C.muted, paddingTop: 40, fontSize: "0.8rem" }}>
                    No active tables. Floor is quiet.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* NUDGES TAB */}
        {tab === "nudges" && (
          <AnimatePresence>
            {nudges.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", color: C.muted, paddingTop: 60 }}
              >
                <Zap size={28} color={C.goldDim} style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: "0.8rem" }}>Waiting for guest drafts…</div>
                <div style={{ fontSize: "0.68rem", marginTop: 6, color: "rgba(212,139,0,0.3)" }}>
                  Nudges appear here when a guest finishes their craft session.
                </div>
              </motion.div>
            ) : (
              nudges.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i === 0 ? 0 : 0 }}
                  style={{
                    background:    n.confirmed ? "rgba(26,26,27,0.5)" : C.card,
                    border:        `1px solid ${n.type === "REVENUE_OPPORTUNITY" && !n.confirmed ? "rgba(52,211,153,0.30)" : C.border}`,
                    borderLeft:    n.type === "REVENUE_OPPORTUNITY" && !n.confirmed ? "3px solid rgba(52,211,153,0.6)" : `3px solid ${C.border}`,
                    borderRadius:  12,
                    padding:       "14px 16px",
                    marginBottom:  10,
                    opacity:       n.confirmed ? 0.5 : 1,
                  }}
                >
                  {/* Revenue badge */}
                  {n.type === "REVENUE_OPPORTUNITY" && !n.confirmed && (
                    <div style={{
                      display:       "inline-flex",
                      alignItems:    "center",
                      gap:           4,
                      background:    "rgba(52,211,153,0.10)",
                      border:        "1px solid rgba(52,211,153,0.25)",
                      borderRadius:  6,
                      padding:       "2px 8px",
                      fontSize:      "0.56rem",
                      fontWeight:    800,
                      letterSpacing: "0.10em",
                      color:         C.emerald,
                      textTransform: "uppercase",
                      marginBottom:  8,
                    }}>
                      <TrendingUp size={8} />
                      Revenue Opportunity
                    </div>
                  )}

                  {/* Guest info row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(212,139,0,0.12)",
                      border: `1px solid rgba(212,139,0,0.25)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: C.gold, fontWeight: 700, flexShrink: 0,
                    }}>
                      {n.guestName[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.74rem", fontWeight: 600, color: C.text }}>
                        {n.guestName}
                        <span style={{ fontSize: "0.6rem", color: C.muted, marginLeft: 6 }}>
                          {n.guestLevel}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.6rem", color: C.goldDim }}>
                        Table {n.table}  ·  {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>

                  {/* Draft + recommendation */}
                  <div style={{ fontSize: "0.68rem", color: C.muted, marginBottom: 8 }}>
                    Draft: <span style={{ color: C.text }}>{n.draftProfile}</span>
                  </div>

                  {n.recommendation ? (
                    <div style={{
                      background: "rgba(52,211,153,0.07)",
                      border:     "1px solid rgba(52,211,153,0.20)",
                      borderRadius: 8,
                      padding:    "7px 10px",
                      fontSize:   "0.68rem",
                      color:      C.green,
                      lineHeight: 1.45,
                      marginBottom: 10,
                    }}>
                      {n.recommendation}
                    </div>
                  ) : (
                    <div style={{
                      background: "rgba(74,222,128,0.07)",
                      border:     "1px solid rgba(74,222,128,0.18)",
                      borderRadius: 8,
                      padding:    "7px 10px",
                      fontSize:   "0.68rem",
                      color:      C.green,
                      marginBottom: 10,
                    }}>
                      Recommend <strong>{n.topMatch}</strong> — +{n.masteryBoost} Mastery
                    </div>
                  )}

                  {/* Confirm Sale CTA */}
                  {n.confirmed ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.66rem", color: C.green }}>
                      <CheckCircle2 size={13} />
                      Sale confirmed
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => confirmSale(n)}
                      disabled={confirming === n.id}
                      style={{
                        width:         "100%",
                        padding:       "10px 0",
                        background:    confirming === n.id ? "rgba(212,139,0,0.10)" : "rgba(212,139,0,0.14)",
                        border:        `1px solid rgba(212,139,0,0.35)`,
                        borderRadius:  8,
                        color:         confirming === n.id ? C.goldDim : C.gold,
                        fontSize:      "0.7rem",
                        fontWeight:    700,
                        letterSpacing: "0.08em",
                        cursor:        confirming === n.id ? "default" : "pointer",
                        display:       "flex",
                        alignItems:    "center",
                        justifyContent:"center",
                        gap:           6,
                        transition:    "all 0.15s",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      {confirming === n.id ? "Confirming…" : "Confirm Sale"}
                    </motion.button>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
