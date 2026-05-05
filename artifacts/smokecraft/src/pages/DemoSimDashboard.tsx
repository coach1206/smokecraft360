/**
 * DemoSimDashboard — Investor Demo Simulation Engine UI
 *
 * Streams live simulated events from POST /api/demo/simulate/start
 * + GET /api/demo/simulate/feed (SSE) to show a real-time "pitch view"
 * of the Axiom OS revenue, orders, and rewards engine.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Square, TrendingUp, ShoppingCart,
  Gift, Activity, Zap, Wifi, WifiOff,
} from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";

const C = {
  gold:   "#d4af37",
  goldDim:"rgba(212,175,55,0.6)",
  text:   "#e8e0c8",
  muted:  "rgba(232,224,200,0.5)",
  dim:    "rgba(232,224,200,0.28)",
  card:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
};

interface SimEvent {
  id:        string;
  type:      string;
  payload:   Record<string, unknown>;
  timestamp: string;
}

const PROFILE_OPTIONS = [
  { id: "investor",  label: "Investor Pitch",   color: "#d4af37", desc: "Revenue & growth metrics" },
  { id: "partner",   label: "Partner Overview",  color: "#5b8def", desc: "Integration depth" },
  { id: "tradeshow", label: "Trade Show",        color: "#34d399", desc: "Full feature reel" },
];

const EVENT_COLORS: Record<string, string> = {
  order_placed:    "#d4af37",
  reward_unlocked: "#34d399",
  product_viewed:  "#5b8def",
  revenue_update:  "#a78bfa",
  device_ping:     "#f97316",
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  order_placed:    ShoppingCart,
  reward_unlocked: Gift,
  product_viewed:  Activity,
  revenue_update:  TrendingUp,
  device_ping:     Wifi,
};

function fmt$(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EventRow({ event }: { event: SimEvent }) {
  const color = EVENT_COLORS[event.type] ?? "#e8e0c8";
  const Icon  = EVENT_ICONS[event.type] ?? Activity;
  const p     = event.payload;

  let summary = "";
  if (event.type === "order_placed")    summary = `${p.guest} ordered ${p.product} · $${p.total}`;
  if (event.type === "reward_unlocked") summary = `${p.guest} unlocked ${p.tier} reward · saved $${p.savedAmount}`;
  if (event.type === "product_viewed")  summary = `${p.product} viewed via ${p.source}`;
  if (event.type === "revenue_update")  summary = `Hourly rate: $${p.hourlyRate}/hr · ${p.trend}`;
  if (event.type === "device_ping")     summary = `${p.deviceName} — ${p.status} · ${p.battery}%`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 10,
        background: `${color}06`, border: `1px solid ${color}18`,
        fontSize: 12,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary}
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>
        {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </motion.div>
  );
}

export default function DemoSimDashboard() {
  const [, navigate]       = useLocation();
  const { getBackground }  = useVenueContext();
  const [profile,     setProfile]     = useState("investor");
  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [running,     setRunning]     = useState(false);
  const [events,      setEvents]      = useState<SimEvent[]>([]);
  const [revenue,     setRevenue]     = useState(0);
  const [orders,      setOrders]      = useState(0);
  const [rewards,     setRewards]     = useState(0);
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [speed,       setSpeed]       = useState(2000);
  const sseRef = useRef<EventSource | null>(null);
  const eventsRef = useRef<SimEvent[]>([]);

  const appendEvent = useCallback((evt: SimEvent) => {
    eventsRef.current = [evt, ...eventsRef.current].slice(0, 80);
    setEvents([...eventsRef.current]);
    if (evt.type === "order_placed")    setOrders(o => o + 1);
    if (evt.type === "reward_unlocked") setRewards(r => r + 1);
    if (evt.type === "order_placed") {
      const total = Number(evt.payload.total ?? 0);
      setRevenue(r => r + total);
    }
  }, []);

  async function startSim() {
    setError(null);
    try {
      const res = await fetch("/api/demo/simulate/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error("Failed to start simulation");
      const json = await res.json() as { sessionId: string };
      setSessionId(json.sessionId);
      setRunning(true);
      setRevenue(0); setOrders(0); setRewards(0);
      eventsRef.current = [];
      setEvents([]);
      openSSE(json.sessionId);
    } catch {
      setError("Could not start simulation. Check server status.");
    }
  }

  function openSSE(sid: string) {
    sseRef.current?.close();
    const url = `/api/demo/simulate/feed?sessionId=${sid}&speed=${speed}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as SimEvent;
        appendEvent(evt);
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      setConnected(false);
      // Fall back to polling if SSE fails
      if (running) startPolling(sid);
    };
  }

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSince = useRef<string | null>(null);

  function startPolling(sid: string) {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const qs = lastSince.current ? `&since=${lastSince.current}` : "";
        const r = await fetch(`/api/demo/simulate/events?sessionId=${sid}${qs}`);
        if (!r.ok) { stopSim(sid); return; }
        const data = await r.json() as { events: SimEvent[] };
        if (Array.isArray(data.events) && data.events.length > 0) {
          lastSince.current = data.events[data.events.length - 1]!.timestamp;
          data.events.forEach(e => appendEvent(e));
        }
      } catch { /* ignore */ }
    }, speed);
  }

  async function stopSim(sid?: string) {
    sseRef.current?.close();
    sseRef.current = null;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    const id = sid ?? sessionId;
    if (id) {
      try {
        await fetch("/api/demo/simulate/stop", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
      } catch { /* ignore */ }
    }
    setRunning(false);
    setConnected(false);
    setSessionId(null);
  }

  useEffect(() => {
    return () => {
      sseRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const selectedProfile = PROFILE_OPTIONS.find(p => p.id === profile) ?? PROFILE_OPTIONS[0]!;

  return (
    <BackgroundLayer image={getBackground("dashboard")} style={{
      height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(10,8,6,0.85)", backdropFilter: "blur(12px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Investor Demo Simulator</div>
            <div style={{ fontSize: 11, color: C.dim }}>Experience Commerce OS · Live Simulation Engine</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {running && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: connected ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${connected ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              {connected ? <Wifi size={11} color="#34d399" /> : <WifiOff size={11} color="#ef4444" />}
              <span style={{ fontSize: 10, fontWeight: 600, color: connected ? "#34d399" : "#ef4444" }}>
                {connected ? "Live" : "Reconnecting"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Revenue",  value: fmt$(revenue),       color: C.gold,    icon: TrendingUp },
            { label: "Orders",   value: String(orders),       color: "#5b8def", icon: ShoppingCart },
            { label: "Rewards",  value: String(rewards),      color: "#34d399", icon: Gift },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} style={{
                padding: "16px", borderRadius: 14,
                background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`,
                textAlign: "center",
              }}>
                <Icon size={18} color={kpi.color} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{kpi.label}</div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        {!running ? (
          <div style={{ padding: 20, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Select Demo Profile
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {PROFILE_OPTIONS.map(p => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setProfile(p.id)}
                  style={{
                    padding: "10px 18px", borderRadius: 12, cursor: "pointer",
                    background: profile === p.id ? `${p.color}12` : C.card,
                    border: `2px solid ${profile === p.id ? p.color : C.border}`,
                    color: profile === p.id ? p.color : C.muted,
                    fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column",
                    alignItems: "flex-start", gap: 2, minWidth: 140,
                  }}
                >
                  <span>{p.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: C.dim }}>{p.desc}</span>
                </motion.button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Event speed:</span>
              {[{ label: "Slow", v: 4000 }, { label: "Normal", v: 2000 }, { label: "Fast", v: 1000 }].map(s => (
                <motion.button
                  key={s.v}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSpeed(s.v)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: speed === s.v ? "rgba(212,175,55,0.1)" : C.card,
                    border: `1px solid ${speed === s.v ? C.gold : C.border}`,
                    color: speed === s.v ? C.gold : C.muted,
                  }}
                >
                  {s.label}
                </motion.button>
              ))}
            </div>
            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444", marginBottom: 12 }}>
                {error}
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startSim}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, cursor: "pointer",
                background: `linear-gradient(135deg, ${selectedProfile.color}, ${selectedProfile.color}bb)`,
                border: "none", color: "#0a0806", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Play size={16} /> Start {selectedProfile.label} Simulation
            </motion.button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} color="#34d399" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>{selectedProfile.label} simulation running</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => stopSim()}
              style={{
                padding: "12px 20px", borderRadius: 12, cursor: "pointer",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444", fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Square size={14} /> Stop
            </motion.button>
          </div>
        )}

        {/* Live event feed */}
        {events.length > 0 && (
          <div style={{ padding: 16, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Live Event Feed — {events.length} events
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
              <AnimatePresence initial={false}>
                {events.slice(0, 40).map(evt => (
                  <EventRow key={evt.id} event={evt} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!running && events.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.dim, fontSize: 13 }}>
            Select a profile and start the simulation to see live events.
          </div>
        )}
      </div>
    </BackgroundLayer>
  );
}
