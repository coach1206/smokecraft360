/**
 * DevConsole — Developer Remote Protocol terminal.
 * Connects to the /developer Socket.io namespace.
 * Requires developer or super_admin JWT.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { io, type Socket } from "socket.io-client";

const GOLD   = "#D4AF37";
const GREEN  = "#32B45A";
const RED    = "#F07070";
const AMBER  = "#F5A623";
const OBSID  = "#060607";
const GFONT  = "'JetBrains Mono','Fira Mono','Courier New',monospace";

type ConnStatus = "disconnected" | "connecting" | "connected" | "error";

interface LogEntry {
  id:    number;
  ts:    number;
  kind:  "in" | "out" | "sys" | "err";
  event: string;
  body:  string;
}

interface SessionInfo {
  socketId: string;
  rooms:    string[];
}

let entryCounter = 0;
function makeEntry(kind: LogEntry["kind"], event: string, body: unknown): LogEntry {
  return { id: entryCounter++, ts: Date.now(), kind, event, body: JSON.stringify(body, null, 0) };
}

function StatusPip({ status }: { status: ConnStatus }) {
  const color = status === "connected" ? GREEN : status === "connecting" ? AMBER : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <motion.div
        animate={status === "connected" ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 9, height: 9, borderRadius: "50%", background: color }}
      />
      <span style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: "0.14em", fontFamily: GFONT }}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

function kindColor(kind: LogEntry["kind"]) {
  if (kind === "err") return RED;
  if (kind === "out") return AMBER;
  if (kind === "sys") return `${GOLD}99`;
  return GREEN;
}

export default function DevConsole() {
  const [, navigate]     = useLocation();
  const [status, setStatus] = useState<ConnStatus>("disconnected");
  const [log, setLog]    = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [cmd,  setCmd]   = useState("");
  const [tab,  setTab]   = useState<"log" | "sessions" | "diagnostics">("log");
  const sockRef  = useRef<Socket | null>(null);
  const logEnd   = useRef<HTMLDivElement | null>(null);
  const token    = typeof window !== "undefined" ? (localStorage.getItem("axiom_token") ?? "") : "";

  const appendLog = useCallback((entry: LogEntry) => {
    setLog(prev => [...prev.slice(-199), entry]);
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      appendLog(makeEntry("err", "auth", "No JWT found — developer or super_admin token required"));
      return;
    }

    setStatus("connecting");
    appendLog(makeEntry("sys", "connect", "Connecting to /developer namespace…"));

    const s = io("/developer", {
      path:  "/api/socket.io",
      auth:  { token },
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });
    sockRef.current = s;

    s.on("connect", () => {
      setStatus("connected");
      appendLog(makeEntry("sys", "connect", `Socket ID: ${s.id}`));
    });

    s.on("connect_error", (err) => {
      setStatus("error");
      appendLog(makeEntry("err", "connect_error", err.message));
    });

    s.on("disconnect", (reason) => {
      setStatus("disconnected");
      appendLog(makeEntry("sys", "disconnect", reason));
    });

    s.on("state_snapshot",  (d) => appendLog(makeEntry("in", "state_snapshot",  d)));
    s.on("memory_dump",     (d) => { appendLog(makeEntry("in", "memory_dump", d)); setMetrics(d as Record<string, unknown>); });
    s.on("active_sessions", (d: { sessions: SessionInfo[] }) => { appendLog(makeEntry("in", "active_sessions", d)); setSessions(d.sessions ?? []); });
    s.on("error_log",       (d) => appendLog(makeEntry("err", "error_log", d)));
    s.on("command_ack",     (d) => appendLog(makeEntry("sys", "command_ack", d)));

    return () => {
      s.disconnect();
      sockRef.current = null;
    };
  }, [token, appendLog]);

  // Auto-scroll log
  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const sendCommand = useCallback(() => {
    const s = sockRef.current;
    if (!s || !cmd.trim()) return;
    const parts = cmd.trim().split(/\s+/);
    const event = parts[0]!;
    let payload: unknown = {};
    try {
      payload = parts.length > 1 ? JSON.parse(parts.slice(1).join(" ")) : {};
    } catch {
      payload = { raw: parts.slice(1).join(" ") };
    }
    s.emit(event, payload);
    appendLog(makeEntry("out", event, payload));
    setCmd("");
  }, [cmd, appendLog]);

  const QUICK_CMDS = [
    { label: "DIAGNOSTIC",    event: "run_diagnostic",     payload: {} },
    { label: "SESSIONS",      event: "get_active_sessions", payload: {} },
    { label: "CLEAR MEMORY",  event: "clear_memory",        payload: {} },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: OBSID,
      color: "#B8FFB8", fontFamily: GFONT,
      position: "relative", overflow: "hidden",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1060, margin: "0 auto", padding: "0 16px 48px" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 0 22px",
          borderBottom: `1px solid ${GOLD}22`, marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => navigate("/command")}
              style={{
                background: "none", border: `1px solid ${GOLD}28`, borderRadius: 8,
                padding: "9px 14px", color: `${GOLD}77`, cursor: "pointer", fontSize: 18, fontWeight: 700,
              }}>
              ←
            </motion.button>
            <div>
              <div style={{ fontSize: 18, color: `${GOLD}66`, letterSpacing: "0.20em", fontWeight: 700 }}>
                SMOKECRAFT 360 · DEVELOPER REMOTE
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: GREEN, letterSpacing: "0.06em", lineHeight: 1 }}>
                DEV CONSOLE
              </div>
            </div>
          </div>
          <StatusPip status={status} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["log", "sessions", "diagnostics"] as const).map(t => (
            <motion.button key={t} whileTap={{ scale: 0.93 }} onClick={() => setTab(t)}
              style={{
                padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                fontSize: 18, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                border: `1px solid ${tab === t ? GOLD + "55" : "rgba(255,255,255,0.08)"}`,
                background: tab === t ? `${GOLD}14` : "transparent",
                color: tab === t ? GOLD : "rgba(255,255,255,0.32)",
              }}>
              {t}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>

            {/* ── EVENT LOG ──────────────────────────────────────────────── */}
            {tab === "log" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{
                  height: 420, overflowY: "auto",
                  background: "rgba(0,0,0,0.70)", border: `1px solid ${GOLD}22`, borderRadius: 10,
                  padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {log.length === 0 && (
                    <div style={{ color: "rgba(255,255,255,0.20)", fontSize: 18, margin: "auto", textAlign: "center" }}>
                      Waiting for events…
                    </div>
                  )}
                  {log.map(e => (
                    <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 18, lineHeight: 1.5, fontFamily: GFONT }}>
                      <span style={{ color: "rgba(255,255,255,0.30)", flexShrink: 0 }}>
                        {new Date(e.ts).toLocaleTimeString()}
                      </span>
                      <span style={{
                        color: kindColor(e.kind), fontWeight: 700,
                        flexShrink: 0, minWidth: 26, textAlign: "center",
                      }}>
                        {e.kind === "in" ? "←" : e.kind === "out" ? "→" : e.kind === "err" ? "✕" : "·"}
                      </span>
                      <span style={{ color: AMBER, fontWeight: 700, flexShrink: 0 }}>{e.event}</span>
                      <span style={{ color: "rgba(255,255,255,0.60)", wordBreak: "break-all" }}>{e.body}</span>
                    </div>
                  ))}
                  <div ref={logEnd} />
                </div>

                {/* Quick commands */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {QUICK_CMDS.map(q => (
                    <motion.button key={q.event} whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        sockRef.current?.emit(q.event, q.payload);
                        appendLog(makeEntry("out", q.event, q.payload));
                      }}
                      disabled={status !== "connected"}
                      style={{
                        padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                        fontSize: 18, fontWeight: 700, letterSpacing: "0.12em",
                        border: `1px solid ${GREEN}44`, background: `${GREEN}10`, color: GREEN,
                        opacity: status === "connected" ? 1 : 0.35,
                      }}>
                      {q.label}
                    </motion.button>
                  ))}
                </div>

                {/* Command input */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ color: GREEN, fontSize: 20, fontWeight: 700, alignSelf: "center", paddingLeft: 4 }}>›</div>
                  <input
                    value={cmd} onChange={e => setCmd(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendCommand(); }}
                    disabled={status !== "connected"}
                    placeholder="push_override { &quot;key&quot;: &quot;forceReload&quot;, &quot;value&quot;: true }"
                    style={{
                      flex: 1, background: "rgba(0,0,0,0.60)", border: `1px solid ${GREEN}33`,
                      borderRadius: 8, padding: "13px 15px",
                      color: GREEN, fontSize: 18, outline: "none", fontFamily: GFONT,
                      opacity: status === "connected" ? 1 : 0.40,
                    }}
                  />
                  <motion.button whileTap={{ scale: 0.93 }} onClick={sendCommand}
                    disabled={!cmd.trim() || status !== "connected"}
                    style={{
                      padding: "13px 22px", borderRadius: 8, cursor: "pointer",
                      fontSize: 18, fontWeight: 700, border: `1px solid ${GREEN}44`,
                      background: `${GREEN}14`, color: GREEN,
                      opacity: cmd.trim() && status === "connected" ? 1 : 0.35,
                    }}>
                    EXEC
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── SESSIONS ───────────────────────────────────────────────── */}
            {tab === "sessions" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, letterSpacing: "0.12em" }}>
                    ACTIVE KIOSK SESSIONS — {sessions.length}
                  </div>
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => {
                      sockRef.current?.emit("get_active_sessions", {});
                      appendLog(makeEntry("out", "get_active_sessions", {}));
                    }}
                    disabled={status !== "connected"}
                    style={{
                      padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                      fontSize: 18, fontWeight: 700, border: `1px solid ${GREEN}44`,
                      background: `${GREEN}10`, color: GREEN,
                      opacity: status === "connected" ? 1 : 0.35,
                    }}>
                    REFRESH
                  </motion.button>
                </div>
                {sessions.length === 0 ? (
                  <div style={{
                    padding: "44px", textAlign: "center",
                    color: "rgba(255,255,255,0.18)", fontSize: 18, fontFamily: GFONT,
                    border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 10,
                  }}>
                    Request sessions to see active kiosks
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sessions.map((ss, i) => (
                      <div key={i} style={{
                        padding: "16px 18px",
                        background: "rgba(0,255,80,0.04)", border: `1px solid ${GREEN}20`, borderRadius: 9,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontFamily: GFONT }}>{ss.socketId}</div>
                          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.38)", marginTop: 3, fontFamily: GFONT }}>
                            rooms: {ss.rooms.join(", ") || "none"}
                          </div>
                        </div>
                        <motion.button whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            sockRef.current?.emit("clear_memory", { targetSocketId: ss.socketId });
                            appendLog(makeEntry("out", "clear_memory", { targetSocketId: ss.socketId }));
                          }}
                          disabled={status !== "connected"}
                          style={{
                            padding: "9px 14px", borderRadius: 7, cursor: "pointer",
                            fontSize: 18, fontWeight: 700, border: `1px solid ${RED}44`,
                            background: `${RED}10`, color: RED,
                            opacity: status === "connected" ? 1 : 0.35,
                          }}>
                          CLEAR
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── DIAGNOSTICS ────────────────────────────────────────────── */}
            {tab === "diagnostics" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, letterSpacing: "0.12em" }}>SYSTEM DIAGNOSTICS</div>
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => {
                      sockRef.current?.emit("run_diagnostic", {});
                      appendLog(makeEntry("out", "run_diagnostic", {}));
                    }}
                    disabled={status !== "connected"}
                    style={{
                      padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                      fontSize: 18, fontWeight: 700, border: `1px solid ${GOLD}44`,
                      background: `${GOLD}0e`, color: GOLD,
                      opacity: status === "connected" ? 1 : 0.35,
                    }}>
                    RUN
                  </motion.button>
                </div>
                {!metrics ? (
                  <div style={{
                    padding: "44px", textAlign: "center",
                    color: "rgba(255,255,255,0.18)", fontSize: 18, fontFamily: GFONT,
                    border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 10,
                  }}>
                    Run diagnostic to see metrics
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(0,0,0,0.68)", border: `1px solid ${GOLD}22`, borderRadius: 10,
                    padding: "20px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16,
                  }}>
                    {Object.entries(metrics).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 18, color: `${GOLD}77`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: GREEN, fontFamily: GFONT }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
