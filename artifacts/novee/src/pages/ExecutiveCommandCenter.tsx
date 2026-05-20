import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInventory } from "@/lib/inventoryState";
import { posRouter, type POSVendor } from "@/lib/posRouter";

const G    = "#D4AF37";
const DIM  = "rgba(212,175,55,0.55)";
const CREAM = "rgba(240,232,212,0.90)";
const CDIM  = "rgba(240,232,212,0.45)";
const PANEL = "rgba(8,5,2,0.92)";
const BORDER= "rgba(212,175,55,0.18)";
const EM    = "#32B45A";
const RED   = "#F07070";

type Tab = "modules" | "staff" | "developer" | "inventory" | "pos";

/* ── E.A.T Module Visibility Context (exported for App.tsx to lift) ── */
export interface EATModuleFlags {
  environment: boolean;
  asset:       boolean;
  transaction: boolean;
  staffHUD:    boolean;
  pairing:     boolean;
  lounge:      boolean;
  executive:   boolean;
}

const DEFAULT_FLAGS: EATModuleFlags = {
  environment: true, asset: true, transaction: true,
  staffHUD: true, pairing: true, lounge: true, executive: true,
};

/* ── Shared atoms ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 28, fontWeight: 900, color: G, letterSpacing: "0.08em", fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 18, color: CDIM, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>{children}</div>;
}
function DataValue({ children, color = G }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'Inter',sans-serif", lineHeight: 1.1 }}>{children}</div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: on ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? `${G}55` : BORDER}`, borderRadius: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: on ? G : CDIM, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>{label}</span>
      <motion.div
        onPointerDown={() => onChange(!on)}
        style={{ width: 52, height: 28, borderRadius: 14, background: on ? `rgba(212,175,55,0.80)` : "rgba(80,60,20,0.40)", border: `1px solid ${on ? G : BORDER}`, position: "relative", cursor: "pointer", flexShrink: 0 }}
        animate={{ boxShadow: on ? `0 0 16px ${G}55` : "none" }}
      >
        <motion.div
          animate={{ x: on ? 26 : 2 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          style={{ position: "absolute", top: 2, width: 24, height: 24, borderRadius: "50%", background: on ? "#0A0600" : "rgba(212,175,55,0.38)" }}
        />
      </motion.div>
    </div>
  );
}

/* ── Humidor Panel ── */
function HumidorTab({ ambientHumidity, ambientTemp, humidor, humidorSummary }: ReturnType<typeof useInventory>) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = humidor.find(h => h.id === selected);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, height: "100%", overflow: "hidden" }}>
      {/* List */}
      <div style={{ overflowY: "auto", paddingRight: 4 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Total Puros",       value: String(humidorSummary.total),                   color: G    },
            { label: "Cabinet Humidity",  value: `${ambientHumidity.toFixed(1)}%`,              color: ambientHumidity > 75 || ambientHumidity < 65 ? RED : EM },
            { label: "Ambient Temp",      value: `${ambientTemp.toFixed(1)}°F`,                 color: CREAM },
            { label: "Critical Alerts",   value: String(humidorSummary.critical.length),         color: humidorSummary.critical.length > 0 ? RED : EM },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
              <Label>{m.label}</Label>
              <DataValue color={m.color}>{m.value}</DataValue>
            </div>
          ))}
        </div>
        {humidor.map(item => {
          const isSel = selected === item.id;
          const statusColor = item.status === "optimal" ? EM : item.status === "low" ? G : item.status === "critical" ? RED : "#C87028";
          return (
            <motion.div key={item.id} onPointerDown={() => setSelected(isSel ? null : item.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, background: isSel ? "rgba(212,175,55,0.10)" : PANEL, border: `1px solid ${isSel ? `${G}66` : BORDER}`, borderRadius: 10, cursor: "pointer" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: CREAM, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif" }}>{item.vitola} · {item.origin} · {item.strength}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: item.qty < 8 ? RED : G }}>{item.qty}</div>
                <div style={{ fontSize: 14, color: DIM }}>units</div>
              </div>
              <div style={{ width: 60, textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.10em" }}>{item.status}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail pane */}
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence mode="wait">
          {sel ? (
            <motion.div key={sel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SectionTitle>{sel.name}</SectionTitle>
              <div style={{ fontSize: 16, color: DIM, marginBottom: 16, fontFamily: "'Inter',sans-serif" }}>{sel.brand} · {sel.origin}</div>
              {[
                ["Vitola",          sel.vitola],
                ["Wrapper",         sel.wrapper],
                ["Strength",        sel.strength],
                ["Units in Stock",  String(sel.qty)],
                ["Boxes in Cabinet",String(sel.boxCount)],
                ["Humidity Target", `${sel.humidityTarget}%`],
                ["Humidity Actual", `${sel.humidityActual}%`],
                ["Popularity Rank", `#${sel.popularityRank}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 18, color: CDIM, fontFamily: "'Inter',sans-serif" }}>{k}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: Math.abs(sel.humidityActual - sel.humidityTarget) > 4 && k === "Humidity Actual" ? RED : CREAM, fontFamily: "'Inter',sans-serif" }}>{v}</span>
                </div>
              ))}
              {Math.abs(sel.humidityActual - sel.humidityTarget) > 4 && (
                <div style={{ marginTop: 14, background: "rgba(240,112,112,0.12)", border: "1px solid rgba(240,112,112,0.35)", borderRadius: 8, padding: "12px 14px", fontSize: 18, color: RED, fontFamily: "'Inter',sans-serif" }}>
                  ⚠ Humidity variance exceeds ±4% — inspect cabinet seal
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 32, color: `${G}55` }}>◈</div>
              <div style={{ fontSize: 18, color: CDIM, textAlign: "center", fontFamily: "'Inter',sans-serif" }}>Select a cigar to view<br/>detailed cabinet data</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Bar Panel ── */
function BarTab({ bar, barSummary }: ReturnType<typeof useInventory>) {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Bottles in Reserve", value: String(barSummary.totalBottles),    color: G    },
          { label: "Total Pours Tonight",value: String(barSummary.totalPours),      color: CREAM },
          { label: "Critical Items",     value: String(barSummary.critical.length), color: barSummary.critical.length > 0 ? RED : EM },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            <Label>{m.label}</Label>
            <DataValue color={m.color}>{m.value}</DataValue>
          </div>
        ))}
      </div>
      {bar.map(item => {
        const pct = (item.bottlesRemaining / item.bottlesCapacity) * 100;
        const statusColor = item.status === "available" ? EM : item.status === "low" ? G : item.status === "critical" ? RED : "#6A9FD8";
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 8, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{item.name}</div>
              <div style={{ fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif" }}>
                {item.brand}{item.age ? ` · ${item.age}` : ""} · ${item.pricePerPour}/pour
              </div>
              <div style={{ marginTop: 8, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct < 25 ? RED : pct < 50 ? G : EM, borderRadius: 3, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 14, color: DIM, marginTop: 4, fontFamily: "'Inter',sans-serif" }}>{item.bottlesRemaining} of {item.bottlesCapacity} bottles · {item.pourCount} pours tonight</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, width: 90 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: statusColor, textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>{item.status}</div>
              <div style={{ fontSize: 16, color: G, fontFamily: "'Inter',sans-serif" }}>Pair: {item.pairingScore}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Kitchen Panel ── */
function KitchenTab({ kitchen, kitchenSummary }: ReturnType<typeof useInventory>) {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Items Available",  value: String(kitchenSummary.available.length), color: EM    },
          { label: "Items Low Stock",  value: String(kitchenSummary.low.length),       color: G     },
          { label: "Sold Out",         value: String(kitchenSummary.soldOut.length),   color: RED   },
          { label: "Sold Tonight",     value: String(kitchenSummary.totalSold),        color: CREAM },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            <Label>{m.label}</Label>
            <DataValue color={m.color}>{m.value}</DataValue>
          </div>
        ))}
      </div>
      {kitchen.map(item => {
        const pct = (item.servingsRemaining / item.servingsCapacity) * 100;
        const sc  = item.status === "available" ? EM : item.status === "low" ? G : item.status === "sold_out" ? RED : "#6A9FD8";
        return (
          <div key={item.id} style={{ display: "flex", gap: 14, padding: "14px 16px", marginBottom: 8, background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${sc}`, borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{item.name}</div>
                <div style={{ fontSize: 14, background: "rgba(212,175,55,0.14)", color: G, border: `1px solid ${G}44`, borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>
                  {item.category.replace("_", " ")}
                </div>
              </div>
              <div style={{ fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif", marginBottom: 8 }}>{item.description}</div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: sc, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 14, color: DIM, fontFamily: "'Inter',sans-serif" }}>{item.servingsRemaining} servings left · {item.soldTonight} sold · {item.prepTime} prep</div>
              <div style={{ fontSize: 16, color: G, fontFamily: "'Inter',sans-serif", marginTop: 6 }}>♦ {item.pairingNotes}</div>
            </div>
            <div style={{ width: 80, textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: sc, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Inter',sans-serif" }}>{item.status.replace("_", " ")}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: G }}>{item.popularityScore}%</div>
              <div style={{ fontSize: 14, color: DIM, fontFamily: "'Inter',sans-serif" }}>popularity</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── POS Router Panel ── */
function PosRouterTab() {
  const [statuses, setStatuses] = useState(posRouter.getAllVendorStatuses());
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setLastSync(new Date());
      setStatuses(posRouter.getAllVendorStatuses());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const vendors: { id: POSVendor; name: string; icon: string }[] = [
    { id: "clover",     name: "Clover",     icon: "◈" },
    { id: "toast",      name: "Toast POS",  icon: "⊞" },
    { id: "lightspeed", name: "Lightspeed", icon: "⟡" },
    { id: "square",     name: "Square",     icon: "⊹" },
  ];

  const MULTIPLIER_TIERS = [
    { code: "2x", threshold: "$100+", label: "Standard Boost",  color: G    },
    { code: "3x", threshold: "$250+", label: "Premium Boost",   color: "#C87028" },
    { code: "5x", threshold: "$500+", label: "Elite Boost",     color: RED  },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <SectionTitle>Universal POS Router</SectionTitle>
      <div style={{ fontSize: 18, color: DIM, marginBottom: 20, fontFamily: "'Inter',sans-serif" }}>
        Normalizes Clover · Toast · Lightspeed · Square payloads into unified transaction stream
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {vendors.map(v => {
          const s = statuses[v.id];
          const sc = s === "connected" ? EM : s === "degraded" ? G : RED;
          return (
            <div key={v.id} style={{ background: PANEL, border: `1px solid ${s === "connected" ? `${EM}44` : s === "degraded" ? `${G}44` : "rgba(240,112,112,0.30)"}`, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(212,175,55,0.10)", border: `1px solid ${G}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: G, flexShrink: 0 }}>{v.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{v.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc, boxShadow: `0 0 8px ${sc}` }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: sc, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>{s}</span>
                </div>
              </div>
              <motion.button type="button"
                onPointerDown={() => {
                  const next = s === "connected" ? "offline" : "connected";
                  posRouter.setVendorStatus(v.id, next);
                  setStatuses(posRouter.getAllVendorStatuses());
                }}
                whileTap={{ scale: 0.93 }}
                style={{ border: `1px solid ${G}44`, borderRadius: 8, padding: "10px 16px", background: "rgba(212,175,55,0.08)", cursor: "pointer", fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>
                TOGGLE
              </motion.button>
            </div>
          );
        })}
      </div>

      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: G, fontFamily: "'Inter',sans-serif", marginBottom: 12 }}>Spend Multiplier Engine</div>
        <div style={{ display: "flex", gap: 12 }}>
          {MULTIPLIER_TIERS.map(t => (
            <div key={t.code} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${t.color}44`, borderRadius: 10, padding: "14px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: t.color, fontFamily: "'Inter',sans-serif" }}>{t.code}</div>
              <div style={{ fontSize: 18, color: CREAM, fontFamily: "'Inter',sans-serif", fontWeight: 700 }}>{t.threshold}</div>
              <div style={{ fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif" }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, color: CDIM, fontFamily: "'Inter',sans-serif" }}>Last Sync</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: EM, fontFamily: "'Inter',sans-serif" }}>{lastSync.toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

/* ── Developer Panel ── */
function DevPanel() {
  const [wsState, setWsState] = useState<"connected" | "connecting" | "offline">("connected");
  const [systemHealth, setSystemHealth] = useState({ cpu: 14, memory: 38, uptime: "4h 22m", sessions: 3 });
  const [commandLog, setCommandLog] = useState<{ ts: string; cmd: string; result: string }[]>([
    { ts: "21:42:18", cmd: "PING", result: "OK · 4ms" },
    { ts: "21:39:05", cmd: "GET_SESSION_STATE", result: "active · phase=crafthub" },
    { ts: "21:31:22", cmd: "CLEAR_GUEST_CACHE", result: "OK · 2 sessions flushed" },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setSystemHealth(h => ({
        ...h,
        cpu:    Math.round(Math.min(95, Math.max(8, h.cpu + (Math.random() - 0.5) * 6))),
        memory: Math.round(Math.min(85, Math.max(22, h.memory + (Math.random() - 0.5) * 4))),
      }));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    const results: Record<string, string> = {
      "PING":                "OK · 3ms",
      "CLEAR_STUCK_STATES":  "OK · 1 session cleared",
      "FORCE_REFRESH_CLIENT":"OK · broadcast sent",
      "DUMP_SESSION_DATA":   "OK · 3 active sessions",
      "RESET_KIOSK_GUEST":   "OK · guest cache flushed",
    };
    setCommandLog(l => [{ ts, cmd, result: results[cmd] ?? "OK" }, ...l.slice(0, 8)]);
  }, []);

  const COMMANDS = [
    "PING", "CLEAR_STUCK_STATES", "FORCE_REFRESH_CLIENT", "DUMP_SESSION_DATA", "RESET_KIOSK_GUEST",
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        <SectionTitle>Developer Root Override</SectionTitle>

        {/* WS Status */}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>WebSocket Tunnel</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: wsState === "connected" ? EM : wsState === "connecting" ? G : RED, boxShadow: `0 0 10px ${wsState === "connected" ? EM : G}` }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif', textTransform:'uppercase'" }}>{wsState.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["connected", "offline"] as const).map(s => (
              <motion.button key={s} type="button" onPointerDown={() => setWsState(s)} whileTap={{ scale: 0.93 }}
                style={{ flex: 1, height: 44, background: wsState === s ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${wsState === s ? G : BORDER}`, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700, color: wsState === s ? G : CDIM, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
                {s}
              </motion.button>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>System Health</div>
          {[
            { label: "CPU Usage",   value: `${systemHealth.cpu}%`,    color: systemHealth.cpu > 80 ? RED : EM },
            { label: "Memory",      value: `${systemHealth.memory}%`, color: systemHealth.memory > 70 ? RED : CREAM },
            { label: "Uptime",      value: systemHealth.uptime,       color: EM },
            { label: "Active Sessions", value: String(systemHealth.sessions), color: G },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 18, color: CDIM, fontFamily: "'Inter',sans-serif" }}>{m.label}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: m.color, fontFamily: "'Inter',sans-serif" }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Remote Commands */}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>Remote Commands</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {COMMANDS.map(cmd => (
              <motion.button key={cmd} type="button" onPointerDown={() => sendCommand(cmd)} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", height: 46, background: "rgba(212,175,55,0.07)", border: `1px solid ${G}33`, borderRadius: 8, cursor: "pointer", fontSize: 18, fontWeight: 700, color: G, textAlign: "left", padding: "0 16px", fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>
                › {cmd}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Command Log */}
      <div style={{ background: "rgba(4,3,0,0.98)", border: `1px solid ${G}33`, borderRadius: 12, padding: "18px", overflow: "auto", fontFamily: "'Courier New',monospace" }}>
        <div style={{ fontSize: 18, color: G, fontWeight: 700, marginBottom: 14, letterSpacing: "0.14em" }}>COMMAND LOG</div>
        <AnimatePresence>
          {commandLog.map((entry, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: "rgba(212,175,55,0.35)" }}>[{entry.ts}]</div>
              <div style={{ fontSize: 18, color: G }}>› {entry.cmd}</div>
              <div style={{ fontSize: 16, color: EM }}>  {entry.result}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {commandLog.length === 0 && (
          <div style={{ fontSize: 18, color: "rgba(212,175,55,0.25)" }}>No commands issued this session.</div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ MAIN COMPONENT ════════════════════════ */
interface Props {
  flags: EATModuleFlags;
  onFlagsChange: (f: EATModuleFlags) => void;
}

export default function ExecutiveCommandCenter({ flags, onFlagsChange }: Props) {
  const [tab, setTab] = useState<Tab>("modules");
  const inventory = useInventory();

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "modules",   label: "Module Control",    icon: "⊞" },
    { id: "staff",     label: "Staff Matrix",      icon: "◈" },
    { id: "developer", label: "Developer Root",    icon: "⟡" },
    { id: "inventory", label: "Inventory Matrix",  icon: "⊹" },
    { id: "pos",       label: "POS Router",        icon: "◆" },
  ];

  const MODULE_FLAGS: { key: keyof EATModuleFlags; label: string }[] = [
    { key: "environment", label: "Environment Module (Panel E)" },
    { key: "asset",       label: "Asset Intelligence (Panel A)" },
    { key: "transaction", label: "Transaction Intelligence (Panel T)" },
    { key: "staffHUD",    label: "Staff HUD" },
    { key: "pairing",     label: "AI Pairing Engine" },
    { key: "lounge",      label: "Lounge Operations" },
    { key: "executive",   label: "Executive Command Widget" },
  ];

  const STAFF_NAMES = ["Daniel — Floor Manager", "Maya — Sommelier", "Alex — Cigar Specialist", "Jordan — Senior Server", "Casey — Server"];
  const MODULE_NAMES = ["Environment Monitor", "Asset Intelligence", "Transaction Intel", "Pairing Engine", "Staff HUD"];
  const [staffPerms, setStaffPerms] = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    STAFF_NAMES.forEach(s => {
      init[s] = {};
      MODULE_NAMES.forEach(m => { init[s][m] = true; });
    });
    return init;
  });

  return (
    <div style={{ width: "100%", height: "100%", background: "#050301", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Inter',sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}`, background: "rgba(8,5,2,0.95)", flexShrink: 0, display: "flex", alignItems: "center", gap: 20 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: G, letterSpacing: "0.10em", fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>EXECUTIVE COMMAND CENTER</div>
          <div style={{ fontSize: 18, color: DIM, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 4 }}>Management Clearance · Tier II</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(212,175,55,0.10)", border: `1px solid ${G}55`, borderRadius: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: EM, boxShadow: `0 0 8px ${EM}` }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: EM }}>SECURE SESSION ACTIVE</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, background: "rgba(4,3,0,0.95)", flexShrink: 0 }}>
        {TABS.map(t => (
          <motion.button key={t.id} type="button" onPointerDown={() => setTab(t.id)} whileTap={{ scale: 0.96 }}
            style={{
              flex: 1, height: 56, background: tab === t.id ? "rgba(212,175,55,0.14)" : "transparent",
              border: "none", borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 18, fontWeight: tab === t.id ? 800 : 600,
              color: tab === t.id ? G : CDIM, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em",
            }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 24px", overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {tab === "modules" && (
            <motion.div key="modules" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", overflow: "auto" }}>
              <SectionTitle>E.A.T. Module Visibility Control</SectionTitle>
              <div style={{ fontSize: 18, color: DIM, marginBottom: 20, fontFamily: "'Inter',sans-serif" }}>
                Toggle visibility of individual E.A.T. framework panels across all active terminal viewports in real time.
              </div>
              {MODULE_FLAGS.map(mf => (
                <Toggle key={mf.key} on={flags[mf.key]} onChange={v => onFlagsChange({ ...flags, [mf.key]: v })} label={mf.label} />
              ))}
              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                <motion.button type="button" onPointerDown={() => onFlagsChange(DEFAULT_FLAGS)} whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, height: 52, background: "rgba(212,175,55,0.10)", border: `1px solid ${G}55`, borderRadius: 10, cursor: "pointer", fontSize: 20, fontWeight: 700, color: G, fontFamily: "'Inter',sans-serif" }}>
                  RESTORE ALL DEFAULTS
                </motion.button>
                <motion.button type="button" onPointerDown={() => onFlagsChange({ environment: false, asset: false, transaction: false, staffHUD: false, pairing: false, lounge: false, executive: false })} whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, height: 52, background: "rgba(240,112,112,0.10)", border: `1px solid rgba(240,112,112,0.40)`, borderRadius: 10, cursor: "pointer", fontSize: 20, fontWeight: 700, color: RED, fontFamily: "'Inter',sans-serif" }}>
                  DISABLE ALL MODULES
                </motion.button>
              </div>
            </motion.div>
          )}

          {tab === "staff" && (
            <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", overflow: "auto" }}>
              <SectionTitle>Staff Permission Matrix</SectionTitle>
              <div style={{ fontSize: 18, color: DIM, marginBottom: 20, fontFamily: "'Inter',sans-serif" }}>Configure real-time module access per staff member.</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 18, color: G, fontFamily: "'Inter',sans-serif", borderBottom: `1px solid ${BORDER}` }}>Staff Member</th>
                      {MODULE_NAMES.map(m => (
                        <th key={m} style={{ padding: "12px 10px", fontSize: 16, color: DIM, fontFamily: "'Inter',sans-serif", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STAFF_NAMES.map(s => (
                      <tr key={s}>
                        <td style={{ padding: "12px 14px", fontSize: 18, color: CREAM, fontFamily: "'Inter',sans-serif", borderBottom: `1px solid rgba(212,175,55,0.08)` }}>{s}</td>
                        {MODULE_NAMES.map(m => (
                          <td key={m} style={{ padding: "12px 10px", textAlign: "center", borderBottom: `1px solid rgba(212,175,55,0.08)` }}>
                            <motion.div onPointerDown={() => setStaffPerms(p => ({ ...p, [s]: { ...p[s], [m]: !p[s][m] } }))}
                              style={{ width: 36, height: 20, borderRadius: 10, background: staffPerms[s]?.[m] ? `${G}88` : "rgba(80,60,20,0.40)", border: `1px solid ${staffPerms[s]?.[m] ? G : BORDER}`, position: "relative", cursor: "pointer", margin: "0 auto" }}>
                              <motion.div animate={{ x: staffPerms[s]?.[m] ? 18 : 2 }} transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: staffPerms[s]?.[m] ? "#0A0600" : "rgba(212,175,55,0.38)" }} />
                            </motion.div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === "developer" && (
            <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", overflow: "hidden" }}>
              <DevPanel />
            </motion.div>
          )}

          {tab === "inventory" && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 0, marginBottom: 16, flexShrink: 0 }}>
                {(["humidor", "bar", "kitchen"] as const).map((axis, i, arr) => {
                  const labels = { humidor: "⊞ HUMIDOR", bar: "◈ BAR TELEMETRY", kitchen: "⊹ KITCHEN" };
                  const active = tab === "inventory";
                  void active;
                  return (
                    <div key={axis} style={{ flex: 1, textAlign: "center", padding: "10px", cursor: "default", fontSize: 18, fontWeight: 700, color: G, borderBottom: i === 0 ? `2px solid ${G}` : `2px solid ${BORDER}`, borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      {labels[axis]}
                    </div>
                  );
                })}
              </div>
              {/* Show all three inventory axes stacked */}
              <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 10, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>HUMIDOR — {inventory.humidorSummary.total} PUROS</div>
                  <HumidorTab {...inventory} />
                </div>
                <div style={{ flexShrink: 0, marginTop: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 10, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>BAR TELEMETRY — {inventory.barSummary.totalBottles} BOTTLES</div>
                  <BarTab {...inventory} />
                </div>
                <div style={{ flexShrink: 0, marginTop: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 10, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>KITCHEN — {inventory.kitchenSummary.totalSold} SOLD TONIGHT</div>
                  <KitchenTab {...inventory} />
                </div>
              </div>
            </motion.div>
          )}

          {tab === "pos" && (
            <motion.div key="pos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ height: "100%", overflow: "hidden" }}>
              <PosRouterTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export { DEFAULT_FLAGS };
