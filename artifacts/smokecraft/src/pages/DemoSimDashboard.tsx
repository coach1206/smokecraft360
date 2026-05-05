/**
 * DemoSimDashboard — Investor Demo Simulation Engine UI
 *
 * super_admin only. Polls /api/demo/simulate/events (no SSE, so Bearer auth
 * headers work correctly on every request).
 *
 * Features:
 *  - Role gate: non-super_admin users see an access-denied screen
 *  - KPIs: Revenue, Orders, Rewards, Conversion Rate (orders/views)
 *  - Conversion funnel: Views → Ordered → Rewarded
 *  - Storytelling overlay: contextual narrative cards that rotate as events flow
 *  - Auth headers on every API call
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Square, TrendingUp, ShoppingCart,
  Gift, Activity, Zap, Lock, BarChart3, Eye, ChevronRight,
} from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";
import { useAuth }         from "@/contexts/AuthContext";
import { getAuthHeaders }  from "@/services/auth";

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
  product_viewed:  Eye,
  revenue_update:  TrendingUp,
  device_ping:     Activity,
};

const STORY_LINES = [
  "Revenue engine is firing — your AI upsell prompts are converting.",
  "Loyalty flywheel spinning — every order is building a return visit.",
  "Cross-sell engine surfacing pairings across all craft modules.",
  "Inventory telemetry live — stock levels adjusting in real time.",
  "Guest profiles enriched with each interaction — AI learns instantly.",
  "Conversion funnel optimizing automatically — no human config needed.",
  "Experience Commerce OS powering seamless guest-to-transaction flow.",
];

function fmt$(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EventRow({ event }: { event: SimEvent }) {
  const color = EVENT_COLORS[event.type] ?? "#e8e0c8";
  const Icon  = EVENT_ICONS[event.type] ?? Activity;
  const p     = event.payload;

  let summary = "";
  if (event.type === "order_placed")    summary = `${String(p.guest)} ordered ${String(p.product)} · $${String(p.total)}`;
  if (event.type === "reward_unlocked") summary = `${String(p.guest)} unlocked ${String(p.tier)} reward · saved $${String(p.savedAmount)}`;
  if (event.type === "product_viewed")  summary = `${String(p.product)} viewed via ${String(p.source)}`;
  if (event.type === "revenue_update")  summary = `Hourly rate: $${String(p.hourlyRate)}/hr · ${String(p.trend)}`;
  if (event.type === "device_ping")     summary = `${String(p.deviceName)} — ${String(p.status)} · ${String(p.battery)}%`;

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

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0806", color: C.text, gap: 16,
    }}>
      <Lock size={40} color="rgba(239,68,68,0.6)" />
      <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>Super Admin Access Required</div>
      <div style={{ fontSize: 13, color: C.muted, maxWidth: 320, textAlign: "center" }}>
        The investor demo simulation engine is restricted to <strong style={{ color: C.gold }}>super_admin</strong> accounts only.
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onBack}
        style={{
          padding: "10px 24px", borderRadius: 12, cursor: "pointer",
          background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
          color: C.text, fontSize: 14, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </motion.button>
    </div>
  );
}

export default function DemoSimDashboard() {
  const [, navigate]       = useLocation();
  const { getBackground }  = useVenueContext();
  const { user }           = useAuth();

  const [profile,     setProfile]     = useState("investor");
  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [running,     setRunning]     = useState(false);
  const [events,      setEvents]      = useState<SimEvent[]>([]);
  const [revenue,     setRevenue]     = useState(0);
  const [orders,      setOrders]      = useState(0);
  const [rewards,     setRewards]     = useState(0);
  const [views,       setViews]       = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const [speed,       setSpeed]       = useState(2000);
  const [storyIdx,    setStoryIdx]    = useState(0);

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const storyRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef   = useRef<SimEvent[]>([]);
  const lastSince   = useRef<string | null>(null);

  // Role gate: only super_admin may use this page
  const isSuperAdmin = user?.role === "super_admin";

  const appendEvent = useCallback((evt: SimEvent) => {
    eventsRef.current = [evt, ...eventsRef.current].slice(0, 80);
    setEvents([...eventsRef.current]);
    if (evt.type === "order_placed")    { setOrders(o => o + 1); setRevenue(r => r + Number(evt.payload.total ?? 0)); }
    if (evt.type === "reward_unlocked") setRewards(r => r + 1);
    if (evt.type === "product_viewed")  setViews(v => v + 1);
  }, []);

  async function startSim() {
    setError(null);
    try {
      const res = await fetch("/api/demo/simulate/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error(res.status === 403 ? "Access denied — super_admin only" : "Failed to start simulation");
      const json = await res.json() as { sessionId: string };
      setSessionId(json.sessionId);
      setRunning(true);
      setRevenue(0); setOrders(0); setRewards(0); setViews(0);
      eventsRef.current = [];
      setEvents([]);
      lastSince.current = null;
      startPolling(json.sessionId);
      startStoryRotation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start simulation.");
    }
  }

  function startPolling(sid: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const qs = lastSince.current ? `&since=${encodeURIComponent(lastSince.current)}` : "";
        const r  = await fetch(`/api/demo/simulate/events?sessionId=${sid}${qs}`, { headers: getAuthHeaders() });
        if (!r.ok) { void stopSim(sid); return; }
        const data = await r.json() as { revenue?: number; orders?: number; rewards?: number; events?: SimEvent[] };
        if (Array.isArray(data.events) && data.events.length > 0) {
          lastSince.current = data.events[data.events.length - 1]!.timestamp;
          data.events.forEach(e => appendEvent(e));
        }
        // Sync aggregated KPIs if available (from /events endpoint)
        if (typeof data.revenue === "number") setRevenue(data.revenue);
        if (typeof data.orders  === "number") setOrders(data.orders);
        if (typeof data.rewards === "number") setRewards(data.rewards);
      } catch { /* ignore */ }
    }, Math.max(speed, 3000));
  }

  function startStoryRotation() {
    if (storyRef.current) clearInterval(storyRef.current);
    storyRef.current = setInterval(() => {
      setStoryIdx(i => (i + 1) % STORY_LINES.length);
    }, 5000);
  }

  async function stopSim(sid?: string) {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (storyRef.current) { clearInterval(storyRef.current); storyRef.current = null; }
    const id = sid ?? sessionId;
    if (id) {
      try {
        await fetch("/api/demo/simulate/stop", {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body:    JSON.stringify({ sessionId: id }),
        });
      } catch { /* ignore */ }
    }
    setRunning(false);
    setSessionId(null);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current);
      if (storyRef.current) clearInterval(storyRef.current);
    };
  }, []);

  const selectedProfile = PROFILE_OPTIONS.find(p => p.id === profile) ?? PROFILE_OPTIONS[0]!;
  const convRate = views > 0 ? ((orders / views) * 100).toFixed(1) : "—";

  if (!isSuperAdmin) {
    return <AccessDenied onBack={() => navigate("/dashboard")} />;
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {running && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
              <Zap size={11} color="#34d399" />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#34d399" }}>Live</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* KPI Bar — 4 metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Revenue",         value: fmt$(revenue),    color: C.gold,    icon: TrendingUp  },
            { label: "Orders",          value: String(orders),   color: "#5b8def", icon: ShoppingCart },
            { label: "Rewards",         value: String(rewards),  color: "#34d399", icon: Gift         },
            { label: "Conversion Rate", value: convRate === "—" ? "—" : `${convRate}%`, color: "#a78bfa", icon: BarChart3 },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} style={{
                padding: "14px", borderRadius: 14,
                background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`,
                textAlign: "center",
              }}>
                <Icon size={16} color={kpi.color} style={{ marginBottom: 5 }} />
                <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{kpi.label}</div>
              </div>
            );
          })}
        </div>

        {/* Conversion Funnel */}
        {running && (
          <div style={{ padding: "14px 16px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Conversion Funnel
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[
                { label: "Viewed",  value: views,  color: "#5b8def" },
                { label: "Ordered", value: orders, color: C.gold    },
                { label: "Rewarded",value: rewards,color: "#34d399" },
              ].map((stage, i) => (
                <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 6, flex: i === 0 ? 1.5 : 1 }}>
                  <div style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, textAlign: "center",
                    background: `${stage.color}08`, border: `1px solid ${stage.color}22`,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: stage.color }}>{stage.value}</div>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{stage.label}</div>
                    {i > 0 && views > 0 && (
                      <div style={{ fontSize: 8, color: `${stage.color}80`, marginTop: 2 }}>
                        {((stage.value / Math.max(views, 1)) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  {i < 2 && <ChevronRight size={14} color={C.dim} style={{ flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storytelling overlay — rotates contextual narrative while sim runs */}
        {running && (
          <AnimatePresence mode="wait">
            <motion.div
              key={storyIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              style={{
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.18)",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <Zap size={14} color={C.gold} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.goldDim, fontStyle: "italic", lineHeight: 1.5 }}>
                {STORY_LINES[storyIdx]}
              </span>
            </motion.div>
          </AnimatePresence>
        )}

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
              {[{ label: "Slow", v: 8000 }, { label: "Normal", v: 4000 }, { label: "Fast", v: 3000 }].map(s => (
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
              onClick={() => void startSim()}
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
              onClick={() => void stopSim()}
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
