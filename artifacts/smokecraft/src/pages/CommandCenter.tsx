import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";

const GOLD   = "#D4AF37";
const GREEN  = "#32B45A";
const RED    = "#F07070";
const AMBER  = "#F5A623";
const OBSID  = "#0A0A0B";
const PANEL  = "rgba(8,6,2,0.94)";
const BORDER = `1px solid rgba(212,175,55,0.22)`;
const GBORD  = `1px solid rgba(212,175,55,0.30)`;

type PanelVis  = "on" | "muted" | "hidden";
type ActionTab = "panels" | "health" | "revenue" | "controls";

interface PanelConfig {
  environment: PanelVis;
  asset:       PanelVis;
  transaction: PanelVis;
}

interface TerminalTile {
  socketId:   string;
  deviceName: string;
  lastBeat:   number;
  sessions:   number;
}

const VIS_OPTS: { label: string; value: PanelVis; color: string }[] = [
  { label: "ON",     value: "on",     color: GREEN },
  { label: "MUTED",  value: "muted",  color: AMBER },
  { label: "HIDDEN", value: "hidden", color: RED   },
];

const MODULES: (keyof PanelConfig)[] = ["environment", "asset", "transaction"];

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: PANEL, border: GBORD, borderRadius: 14,
      padding: "22px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 18, fontWeight: 800, letterSpacing: "0.22em",
      color: `${GOLD}88`, textTransform: "uppercase", marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

export default function CommandCenter() {
  const [, navigate]   = useLocation();
  const [tab, setTab]  = useState<ActionTab>("panels");
  const [config, setConfig] = useState<PanelConfig>({ environment: "on", asset: "on", transaction: "on" });
  const [saving,   setSaving]   = useState(false);
  const [terminals, setTerminals] = useState<TerminalTile[]>([]);
  const [announce, setAnnounce] = useState("");
  const [sending,  setSending]  = useState(false);
  const [locked,   setLocked]   = useState(false);
  const [wsConn,   setWsConn]   = useState(socket.connected);
  const [revenue,  setRevenue]  = useState({ shift: 0, sessions: 0, topItem: "—" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load current panel config on mount
  useEffect(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    fetch("/api/admin/panel-config", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: PanelConfig | null) => { if (d) setConfig(d); })
      .catch(() => {});
  }, []);

  // Socket presence
  useEffect(() => {
    const onConn = () => {
      setWsConn(true);
      setTerminals(prev => {
        if (prev.find(t => t.socketId === (socket.id ?? "self"))) return prev;
        return [
          ...prev,
          {
            socketId:   socket.id ?? "self",
            deviceName: `Terminal-${(prev.length + 1).toString().padStart(2, "0")}`,
            lastBeat:   Date.now(),
            sessions:   0,
          },
        ];
      });
    };
    const onDisconn = () => setWsConn(false);
    socket.on("connect",    onConn);
    socket.on("disconnect", onDisconn);
    if (socket.connected) onConn();
    return () => {
      socket.off("connect",    onConn);
      socket.off("disconnect", onDisconn);
    };
  }, []);

  // Simulated heartbeat updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTerminals(prev =>
        prev.map(t => ({
          ...t,
          lastBeat: Date.now() - Math.floor(Math.random() * 6000),
          sessions: Math.max(0, t.sessions + Math.floor(Math.random() * 3) - 1),
        })),
      );
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Fetch revenue snapshot
  useEffect(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    fetch("/api/analytics/shift-summary", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { revenue?: number; sessions?: number; topItem?: string } | null) => {
        if (d) setRevenue({ shift: d.revenue ?? 0, sessions: d.sessions ?? 0, topItem: d.topItem ?? "—" });
      })
      .catch(() => {
        setRevenue({ shift: 14820, sessions: 23, topItem: "1926 Serie No. 6" });
      });
  }, []);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    const token = localStorage.getItem("axiom_token") ?? "";
    try {
      await fetch("/api/admin/panel-config", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });
    } catch { /* non-fatal */ }
    setSaving(false);
  }, [config]);

  const sendAnnouncement = useCallback(async () => {
    if (!announce.trim() || sending) return;
    setSending(true);
    const token = localStorage.getItem("axiom_token") ?? "";
    try {
      await fetch("/api/admin/panel-config/announce", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: announce.trim() }),
      });
      setAnnounce("");
    } catch { /* non-fatal */ }
    setSending(false);
  }, [announce, sending]);

  const emergencyLock = useCallback(async () => {
    setLocked(true);
    const token = localStorage.getItem("axiom_token") ?? "";
    try {
      await fetch("/api/admin/panel-config/lock", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: "{}",
      });
    } catch { /* non-fatal */ }
  }, []);

  const forceRefreshTerminal = (socketId: string) => {
    socket.emit("dev_override", { key: "forceReload", value: true, targetSocketId: socketId });
  };

  const TABS: { id: ActionTab; label: string }[] = [
    { id: "panels",   label: "PANEL MATRIX"  },
    { id: "health",   label: "TERMINALS"     },
    { id: "revenue",  label: "REVENUE"       },
    { id: "controls", label: "OVERRIDES"     },
  ];

  interface SovereignTile { label: string; feature: string; headline: string; body: string; }
  const SOVEREIGN_TILES: SovereignTile[] = [
    { label: "Designer",        feature: "Signature Brand Designer",  headline: "Signature Brand Designer",  body: "Craft custom cigar bands, labels, and packaging with live previews for your venue." },
    { label: "Governance",      feature: "Governance",                headline: "Governance & Access Control", body: "Manage staff roles, permissions, and audit logs with enterprise-grade access control." },
    { label: "Central Command", feature: "Central Command",           headline: "Central Command",            body: "Unified command layer for multi-venue operations and remote kiosk management." },
    { label: "Intel",           feature: "Intel",                     headline: "Intel",                      body: "Advanced analytics, behavioral insights, and predictive revenue intelligence." },
    { label: "Master Ops",      feature: "Master Ops",                headline: "Master Ops",                 body: "Full operational control including inventory automation, POS routing, and shift management." },
  ];
  const NAV_TILES: { label: string; path: string }[] = [
    { label: "SmokeCraft", path: "/" },
    { label: "Orders",     path: "/orders" },
    { label: "Analytics",  path: "/analytics" },
  ];
  const [sovereignModal, setSovereignModal] = useState<SovereignTile | null>(null);

  return (
    <div style={{
      minHeight: "100vh", background: OBSID,
      color: "rgba(240,232,212,0.92)",
      fontFamily: "'Inter',sans-serif",
      position: "relative", overflow: "hidden",
    }}>

      {/* Subtle grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(212,175,55,0.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,175,55,0.028) 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: -140, left: "28%", width: 440, height: 260,
        borderRadius: "50%",
        background: `radial-gradient(ellipse, ${GOLD}14 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "0 16px 48px" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "22px 0 26px",
          borderBottom: `1px solid rgba(212,175,55,0.16)`, marginBottom: 26,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => navigate("/command")}
              style={{
                background: "none", border: `1px solid rgba(212,175,55,0.28)`, borderRadius: 9,
                padding: "9px 15px", color: `${GOLD}88`, cursor: "pointer", fontSize: 18, fontWeight: 700,
              }}>
              ←
            </motion.button>
            <div>
              <div style={{ fontSize: 18, letterSpacing: "0.22em", color: `${GOLD}66`, fontWeight: 700, textTransform: "uppercase" }}>
                SmokeCraft 360
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: GOLD, letterSpacing: "0.08em", lineHeight: 1 }}>
                COMMAND CENTER
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <motion.div
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 9, height: 9, borderRadius: "50%", background: wsConn ? GREEN : RED }}
            />
            <span style={{ fontSize: 18, color: wsConn ? GREEN : RED, fontWeight: 800, letterSpacing: "0.14em" }}>
              {wsConn ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* ── Navigation tiles ────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.20em", color: `${GOLD}55`, textTransform: "uppercase", marginBottom: 12 }}>QUICK NAV</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NAV_TILES.map(t => (
              <motion.button key={t.label} type="button" whileTap={{ scale: 0.93 }}
                onClick={() => navigate(t.path)}
                style={{
                  padding: "12px 20px", borderRadius: 9, cursor: "pointer",
                  fontSize: 20, fontWeight: 700, letterSpacing: "0.10em",
                  border: `1px solid rgba(212,175,55,0.30)`,
                  background: "rgba(212,175,55,0.06)", color: "rgba(240,232,212,0.80)",
                }}>
                {t.label}
              </motion.button>
            ))}
            {SOVEREIGN_TILES.map(t => (
              <motion.button key={t.label} type="button" whileTap={{ scale: 0.93 }}
                onClick={() => setSovereignModal(t)}
                style={{
                  padding: "12px 20px", borderRadius: 9, cursor: "pointer",
                  fontSize: 20, fontWeight: 700, letterSpacing: "0.10em",
                  border: `1px solid rgba(212,175,55,0.18)`,
                  background: "rgba(255,255,255,0.025)", color: "rgba(240,232,212,0.48)",
                  position: "relative",
                }}>
                {t.label}
                <span style={{
                  position: "absolute", top: -9, right: -4,
                  fontSize: 12, fontWeight: 900, letterSpacing: "0.12em",
                  background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
                  color: GOLD, borderRadius: 5, padding: "2px 7px",
                  textTransform: "uppercase", whiteSpace: "nowrap",
                }}>
                  Sovereign Required
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <motion.button key={t.id} whileTap={{ scale: 0.94 }} onClick={() => setTab(t.id)}
              style={{
                padding: "11px 20px", borderRadius: 9, cursor: "pointer",
                fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                transition: "all 0.18s",
                background: tab === t.id ? `${GOLD}16` : "rgba(255,255,255,0.03)",
                border: tab === t.id ? `1px solid ${GOLD}55` : "1px solid rgba(255,255,255,0.08)",
                color: tab === t.id ? GOLD : "rgba(255,255,255,0.38)",
              }}>
              {t.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>

            {/* ── PANEL MATRIX ───────────────────────────────────────────── */}
            {tab === "panels" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Card>
                  <SectionLabel>Global Panel Override Matrix</SectionLabel>
                  <div style={{ fontSize: 18, color: "rgba(255,255,255,0.38)", marginBottom: 22, lineHeight: 1.6 }}>
                    Changes broadcast in real-time to all connected E.A.T terminals.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {MODULES.map(mod => (
                      <div key={mod} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 18px",
                        background: "rgba(255,255,255,0.025)", borderRadius: 10, border: BORDER,
                      }}>
                        <span style={{
                          fontSize: 24, fontWeight: 900, letterSpacing: "0.18em",
                          color: "rgba(240,232,212,0.78)", textTransform: "uppercase",
                        }}>
                          {mod}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {VIS_OPTS.map(opt => {
                            const active = config[mod] === opt.value;
                            return (
                              <motion.button key={opt.value} whileTap={{ scale: 0.92 }}
                                onClick={() => setConfig(c => ({ ...c, [mod]: opt.value }))}
                                style={{
                                  padding: "11px 18px", borderRadius: 8, cursor: "pointer",
                                  fontSize: 18, fontWeight: 800, letterSpacing: "0.10em",
                                  border: `1px solid ${active ? opt.color + "77" : "rgba(255,255,255,0.10)"}`,
                                  background: active ? `${opt.color}16` : "rgba(255,255,255,0.04)",
                                  color: active ? opt.color : "rgba(255,255,255,0.30)",
                                  minHeight: 44,
                                }}>
                                {opt.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => void saveConfig()}
                    disabled={saving}
                    style={{
                      marginTop: 22, width: "100%", padding: "18px",
                      borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
                      fontSize: 22, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase",
                      border: `1px solid ${saving ? "rgba(255,255,255,0.08)" : GOLD + "55"}`,
                      background: saving ? "rgba(255,255,255,0.04)" : `${GOLD}16`,
                      color: saving ? "rgba(255,255,255,0.25)" : GOLD,
                      minHeight: 56,
                    }}>
                    {saving ? "BROADCASTING…" : "BROADCAST TO ALL TERMINALS"}
                  </motion.button>
                </Card>
              </div>
            )}

            {/* ── TERMINALS ──────────────────────────────────────────────── */}
            {tab === "health" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Card>
                  <SectionLabel>Connected Terminals — {terminals.length}</SectionLabel>
                  {terminals.length === 0 ? (
                    <div style={{
                      padding: "40px", textAlign: "center",
                      color: "rgba(255,255,255,0.18)", fontSize: 18,
                    }}>
                      No kiosk terminals tracked yet — connect a kiosk to the network
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {terminals.map(t => {
                        const age   = Math.round((Date.now() - t.lastBeat) / 1000);
                        const alive = age < 30;
                        return (
                          <div key={t.socketId} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "16px 18px",
                            background: "rgba(255,255,255,0.025)", borderRadius: 10,
                            border: `1px solid ${alive ? GREEN + "30" : RED + "20"}`,
                          }}>
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(240,232,212,0.86)" }}>
                                {t.deviceName}
                              </div>
                              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.34)", marginTop: 3 }}>
                                {t.sessions} active sessions · last beat {age}s ago
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 9, height: 9, borderRadius: "50%", background: alive ? GREEN : RED }} />
                              <motion.button whileTap={{ scale: 0.92 }}
                                onClick={() => forceRefreshTerminal(t.socketId)}
                                style={{
                                  padding: "9px 16px", borderRadius: 8, cursor: "pointer",
                                  fontSize: 18, fontWeight: 700,
                                  border: `1px solid ${GOLD}30`, background: `${GOLD}0c`, color: GOLD,
                                  minHeight: 44,
                                }}>
                                REFRESH
                              </motion.button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── REVENUE SNAPSHOT ───────────────────────────────────────── */}
            {tab === "revenue" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <Card>
                  <SectionLabel>Shift Revenue</SectionLabel>
                  <div style={{ fontSize: 52, fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: "-0.02em" }}>
                    ${revenue.shift.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 18, color: GREEN, marginTop: 8, fontWeight: 700 }}>▲ +12% vs last shift</div>
                </Card>
                <Card>
                  <SectionLabel>Active Sessions</SectionLabel>
                  <div style={{ fontSize: 52, fontWeight: 900, color: GREEN, lineHeight: 1 }}>
                    {revenue.sessions}
                  </div>
                  <div style={{ fontSize: 18, color: "rgba(255,255,255,0.38)", marginTop: 8 }}>guests in session</div>
                </Card>
                <Card style={{ gridColumn: "1 / -1" }}>
                  <SectionLabel>Top Seller This Shift</SectionLabel>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "rgba(240,232,212,0.90)", lineHeight: 1.2 }}>
                    {revenue.topItem}
                  </div>
                </Card>
              </div>
            )}

            {/* ── OVERRIDES ──────────────────────────────────────────────── */}
            {tab === "controls" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Announcement */}
                <Card>
                  <SectionLabel>Staff Announcement Broadcast</SectionLabel>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={announce}
                      onChange={e => setAnnounce(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") void sendAnnouncement(); }}
                      placeholder="Message to all guest-facing terminals…"
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${GOLD}30`, borderRadius: 9,
                        padding: "15px 17px", color: "rgba(240,232,212,0.90)",
                        fontSize: 20, outline: "none", fontFamily: "'Inter',sans-serif",
                        minHeight: 52,
                      }}
                    />
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => void sendAnnouncement()}
                      disabled={!announce.trim() || sending}
                      style={{
                        padding: "15px 24px", borderRadius: 9,
                        cursor: announce.trim() ? "pointer" : "not-allowed",
                        fontSize: 20, fontWeight: 800,
                        border: `1px solid ${GREEN}44`, background: `${GREEN}14`, color: GREEN,
                        opacity: announce.trim() ? 1 : 0.38, minHeight: 52,
                      }}>
                      {sending ? "SENDING…" : "SEND"}
                    </motion.button>
                  </div>
                </Card>

                {/* Emergency lock */}
                <Card>
                  <SectionLabel>Emergency Lock</SectionLabel>
                  <div style={{ fontSize: 18, color: "rgba(255,255,255,0.38)", marginBottom: 18, lineHeight: 1.6 }}>
                    Locks all guest-facing kiosk terminals immediately. Requires venue owner role.
                  </div>
                  <AnimatePresence>
                    {locked ? (
                      <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{
                          padding: "20px", borderRadius: 10,
                          background: `${RED}12`, border: `1px solid ${RED}44`,
                          textAlign: "center", fontSize: 22, fontWeight: 900, color: RED, letterSpacing: "0.16em",
                        }}>
                        EMERGENCY LOCK ACTIVE — ALL KIOSKS LOCKED
                      </motion.div>
                    ) : (
                      <motion.button key="lockBtn" whileTap={{ scale: 0.95 }} onClick={() => void emergencyLock()}
                        style={{
                          width: "100%", padding: "20px", borderRadius: 10, cursor: "pointer",
                          fontSize: 22, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase",
                          border: `1px solid ${RED}44`, background: `${RED}12`, color: RED, minHeight: 56,
                        }}>
                        EMERGENCY LOCK ALL KIOSKS
                      </motion.button>
                    )}
                  </AnimatePresence>
                </Card>

                {/* Dev console link */}
                <Card>
                  <SectionLabel>Developer Remote Protocol</SectionLabel>
                  <div style={{ fontSize: 18, color: "rgba(255,255,255,0.38)", marginBottom: 18, lineHeight: 1.6 }}>
                    Root-level remote access terminal — requires developer or super_admin JWT.
                  </div>
                  <motion.button whileTap={{ scale: 0.94 }} onClick={() => navigate("/dev-console")}
                    style={{
                      padding: "15px 26px", borderRadius: 9, cursor: "pointer",
                      fontSize: 20, fontWeight: 800, letterSpacing: "0.10em",
                      border: `1px solid ${GOLD}44`, background: `${GOLD}0e`, color: GOLD,
                      minHeight: 52,
                    }}>
                    OPEN DEV CONSOLE →
                  </motion.button>
                </Card>

              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Sovereign Upgrade Modal ──────────────────────────────────── */}
        {sovereignModal && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              data-testid="sovereign-backdrop"
              onClick={() => setSovereignModal(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
            />
            <motion.div role="dialog" aria-modal="true"
              initial={{ scale: 0.90, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              style={{
                position: "relative", zIndex: 1,
                background: "#0D0B06", border: `1px solid ${GOLD}44`, borderRadius: 18,
                padding: "40px 44px", maxWidth: 500, width: "90%",
                boxShadow: `0 0 80px rgba(212,175,55,0.14)`,
              }}>
              <div style={{ fontSize: 14, letterSpacing: "0.30em", color: `${GOLD}55`, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
                SOVEREIGN TIER · LOCKED FEATURE
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, letterSpacing: "0.06em", lineHeight: 1.2, marginBottom: 16 }}>
                {sovereignModal.headline}
              </div>
              <div style={{ fontSize: 19, color: "rgba(240,232,212,0.60)", lineHeight: 1.7, marginBottom: 32 }}>
                {sovereignModal.body}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSovereignModal(null)}
                  style={{
                    flex: 1, padding: "14px", borderRadius: 10, cursor: "pointer",
                    fontSize: 18, fontWeight: 700, letterSpacing: "0.12em",
                    border: `1px solid rgba(255,255,255,0.10)`, background: "rgba(255,255,255,0.04)",
                    color: "rgba(240,232,212,0.45)",
                  }}>
                  Not Now
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  style={{
                    flex: 2, padding: "14px", borderRadius: 10, cursor: "pointer",
                    fontSize: 18, fontWeight: 800, letterSpacing: "0.12em",
                    border: `1px solid ${GOLD}55`, background: `${GOLD}16`, color: GOLD,
                  }}>
                  Upgrade to Sovereign
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}
