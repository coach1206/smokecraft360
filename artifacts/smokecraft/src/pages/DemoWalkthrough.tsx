import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, ChevronLeft, ShoppingCart, Gift, Package,
  Monitor, BarChart3, Sparkles, Play, Square, Pause, CheckCircle2,
  AlertTriangle, TrendingUp, Wifi, Shield, CreditCard,
  Users, Briefcase, Presentation, Save, Link, Trash2, Star,
} from "lucide-react";
import KioskProductImage from "@/components/KioskProductImage";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";
import { useAuth }        from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/services/auth";
import type { Product } from "@/contexts/PosContext";

const DEFAULT_STEP_DURATION = 5000;

const SPEED_PRESETS: Record<string, number> = {
  slow: 8000,
  normal: 5000,
  fast: 3000,
  instant: 1500,
};

interface DemoProfile {
  id: string;
  name: string;
  description: string;
  icon: typeof Briefcase;
  color: string;
  stepIds: string[];
  speed: number;
}

const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "investor",
    name: "Investor Pitch",
    description: "Revenue metrics, growth potential, and platform capabilities",
    icon: Briefcase,
    color: "#d4af37",
    stepIds: ["dashboard", "order", "reward", "system"],
    speed: 6000,
  },
  {
    id: "partner",
    name: "Partner Overview",
    description: "Integration depth, device management, and inventory control",
    icon: Users,
    color: "#5b8def",
    stepIds: ["order", "inventory", "devices", "experience", "system"],
    speed: 5000,
  },
  {
    id: "tradeshow",
    name: "Trade Show",
    description: "Fast-paced highlight reel of all platform features",
    icon: Presentation,
    color: "#34d399",
    stepIds: ["experience", "order", "reward", "dashboard", "inventory", "devices", "system"],
    speed: 3500,
  },
];

const PROFILE_MAP = new Map(DEMO_PROFILES.map(p => [p.id, p]));

const SAVED_PROFILES_KEY = "smokecraft_demo_profiles";

interface SavedProfile {
  id: string;
  name: string;
  description: string;
  stepIds: string[];
  speed: number;
  createdAt: number;
}

function loadSavedProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: unknown): p is SavedProfile =>
        typeof p === "object" && p !== null &&
        typeof (p as SavedProfile).id === "string" &&
        typeof (p as SavedProfile).name === "string" &&
        Array.isArray((p as SavedProfile).stepIds),
    );
  } catch {
    return [];
  }
}

function persistSavedProfiles(profiles: SavedProfile[]) {
  localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(profiles));
}

function savedToDemoProfile(saved: SavedProfile): DemoProfile {
  return {
    id: saved.id,
    name: saved.name,
    description: saved.description,
    icon: Star,
    color: "#a78bfa",
    stepIds: saved.stepIds,
    speed: saved.speed,
  };
}

function buildShareableUrl(stepIds: string[], speed: number): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams();
  params.set("steps", stepIds.join(","));
  params.set("speed", String(speed));
  return `${base}?${params.toString()}`;
}

function parseDemoConfig(search: string): { stepIds: string[] | null; perStepSpeed: number | null; profileId: string | null } {
  const params = new URLSearchParams(search);
  const stepsParam = params.get("steps");
  const speedParam = params.get("speed");
  const profileParam = params.get("profile");

  const profile = profileParam ? PROFILE_MAP.get(profileParam) ?? null : null;

  let stepIds: string[] | null = stepsParam ? stepsParam.split(",").map(s => s.trim()).filter(Boolean) : null;
  if (!stepIds && profile) {
    stepIds = profile.stepIds;
  }

  let perStepSpeed: number | null = null;
  if (speedParam) {
    if (SPEED_PRESETS[speedParam]) {
      perStepSpeed = SPEED_PRESETS[speedParam];
    } else {
      const parsed = parseInt(speedParam, 10);
      if (!isNaN(parsed) && parsed >= 500) {
        perStepSpeed = parsed;
      }
    }
  } else if (profile) {
    perStepSpeed = profile.speed;
  }

  return { stepIds, perStepSpeed, profileId: profile?.id ?? null };
}

const DEMO_PRODUCTS: Product[] = [
  { id: "d-cig-1", name: "Arturo Fuente Opus X", category: "cigar", price: 42, image: "https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=300&h=300&fit=crop&q=80", stock: 8 },
  { id: "d-spr-1", name: "Macallan 18 Sherry Oak", category: "spirit", price: 28, image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&h=300&fit=crop&q=80", stock: 10 },
  { id: "d-beer-1", name: "Guinness Draught", category: "beer", price: 9, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop&q=80", stock: 24 },
  { id: "d-food-1", name: "Wagyu Beef Sliders", category: "food", price: 24, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=80", stock: 10 },
];


interface DemoStep {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof ShoppingCart;
  color: string;
  duration: number;
  render: () => React.ReactNode;
}

function StepCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{
        width: "100%", maxWidth: 700,
        padding: 24, borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function OrderCreationStep() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <StepCard>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Simulated Order Flow
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {DEMO_PRODUCTS.slice(0, 3).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: i <= phase ? 1 : 0.2, scale: i <= phase ? 1 : 0.9 }}
            style={{
              display: "flex", gap: 10, padding: 12, borderRadius: 14,
              background: i <= phase ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${i <= phase ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)"}`,
              alignItems: "center", flex: 1, minWidth: 180,
            }}
          >
            <KioskProductImage src={p.image} alt={p.name} category={p.category} width={50} height={50} borderRadius={10} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e0c8" }}>{p.name}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#d4af37" }}>${p.price}</div>
            </div>
            {i <= phase && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle2 size={18} color="#34d399" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>Cart Total</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#d4af37" }}>$79.00</div>
        </div>
        <motion.div
          animate={{ opacity: phase >= 3 ? 1 : 0.3 }}
          style={{
            padding: "12px 24px", borderRadius: 12,
            background: phase >= 3 ? "linear-gradient(135deg, #34d399, #22c55e)" : "rgba(255,255,255,0.06)",
            color: phase >= 3 ? "#0a0806" : "rgba(232,224,200,0.3)",
            fontSize: 14, fontWeight: 700,
          }}
        >
          {phase >= 3 ? "Payment Successful" : "Processing..."}
        </motion.div>
      </div>
    </StepCard>
  );
}

function RewardUnlockStep() {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUnlocked(true), 1200); return () => clearTimeout(t); }, []);

  return (
    <StepCard style={{ textAlign: "center" }}>
      <motion.div
        animate={{ scale: unlocked ? [1, 1.15, 1] : 1, rotate: unlocked ? [0, -5, 5, 0] : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: 80, height: 80, borderRadius: 20, margin: "0 auto 16px",
          background: unlocked ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))" : "rgba(255,255,255,0.04)",
          border: `2px solid ${unlocked ? "#d4af37" : "rgba(255,255,255,0.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Gift size={36} color={unlocked ? "#d4af37" : "rgba(232,224,200,0.3)"} />
      </motion.div>
      <AnimatePresence>
        {unlocked && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#d4af37", marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              Reward Unlocked!
            </div>
            <div style={{ fontSize: 14, color: "rgba(232,224,200,0.6)", marginBottom: 12 }}>
              10% loyalty discount applied — saved $8.80
            </div>
            <div style={{ display: "inline-flex", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>$88.00 → $79.20</span>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(232,224,200,0.35)" }}>
              5-minute cooldown prevents reward abuse • 1 reward per order enforced
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  );
}

function InventoryStep() {
  const [updates, setUpdates] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setUpdates(1), 600);
    const t2 = setTimeout(() => setUpdates(2), 1200);
    const t3 = setTimeout(() => setUpdates(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const movements = [
    { name: "Arturo Fuente Opus X", before: 8, after: 7, reason: "Order checkout" },
    { name: "Macallan 18 Sherry Oak", before: 10, after: 8, reason: "Order checkout" },
    { name: "Cohiba Behike 52", before: 5, after: 5, reason: "Low stock alert" },
  ];

  return (
    <StepCard>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Real-Time Inventory Tracking
      </div>
      {movements.map((m, i) => (
        <motion.div
          key={m.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: i < updates ? 1 : 0.2, x: i < updates ? 0 : -10 }}
          transition={{ delay: i * 0.1 }}
          style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 14px", marginBottom: 8, borderRadius: 12,
            background: i < updates ? "rgba(255,255,255,0.03)" : "transparent",
            border: `1px solid ${i === 2 && i < updates ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{m.name}</div>
            <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>{m.reason}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: "rgba(232,224,200,0.5)" }}>{m.before}</span>
            <span style={{ color: "rgba(232,224,200,0.2)" }}>→</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: m.before === m.after ? "#f59e0b" : "#ef4444" }}>{m.after}</span>
          </div>
          {i === 2 && i < updates && <AlertTriangle size={16} color="#f59e0b" />}
        </motion.div>
      ))}
      <div style={{ marginTop: 12, fontSize: 12, color: "rgba(232,224,200,0.3)", fontStyle: "italic" }}>
        Every stock movement logged with before/after audit trail • Role-gated large adjustments
      </div>
    </StepCard>
  );
}

function DeviceControlStep() {
  const devices = [
    { name: "Main Bar Kiosk", type: "kiosk", status: "online", battery: 100 },
    { name: "Lounge Tablet #1", type: "tablet", status: "online", battery: 78 },
    { name: "Demo iPad", type: "tablet", status: "offline", battery: 12 },
    { name: "Manager Phone", type: "mobile", status: "online", battery: 92 },
  ];

  return (
    <StepCard>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Device Fleet Management
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {devices.map((d, i) => (
          <motion.div
            key={d.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            style={{
              padding: "14px 16px", borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${d.status === "online" ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: d.status === "online" ? "#34d399" : "#ef4444",
                boxShadow: `0 0 6px ${d.status === "online" ? "#34d399" : "#ef4444"}`,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e0c8" }}>{d.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(232,224,200,0.4)" }}>
              <span>{d.type}</span>
              <span>{d.battery}%</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "rgba(232,224,200,0.3)", fontStyle: "italic" }}>
        Remote lock/unlock • Force refresh • Role assignment • Real-time heartbeat monitoring
      </div>
    </StepCard>
  );
}

interface LiveKpi { revenue: number; orders: number; rewards: number; active: boolean; }
interface LiveEvent { id: string; type: string; payload: Record<string, unknown>; timestamp: string; }

function DashboardMetricsStep() {
  const { user }               = useAuth();
  const isSuperAdmin           = user?.role === "super_admin";
  const [kpi,     setKpi]      = useState<LiveKpi>({ revenue: 0, orders: 0, rewards: 0, active: false });
  const [events,  setEvents]   = useState<LiveEvent[]>([]);
  const [simId,   setSimId]    = useState<string | null>(null);
  const [polling, setPolling]  = useState(false);
  const [started, setStarted]  = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startSim() {
    setSimError(null);
    try {
      const r = await fetch("/api/demo/simulate/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body:    JSON.stringify({ profile: "investor", speedMs: 3500 }),
      });
      if (!r.ok) {
        setSimError(r.status === 403
          ? "Super Admin access required to run the live simulation."
          : "Could not start simulation.");
        return;
      }
      const j = await r.json() as { sessionId: string };
      setSimId(j.sessionId);
      setStarted(true);
    } catch { setSimError("Connection error — live data unavailable."); }
  }

  async function stopSim() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (simId) {
      try {
        await fetch("/api/demo/simulate/stop", {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body:    JSON.stringify({ sessionId: simId }),
        });
      } catch { /* ignore */ }
    }
    setStarted(false);
    setSimId(null);
    setPolling(false);
  }

  // Poll /api/demo/simulate/feed every 4 s while simId is known
  useEffect(() => {
    if (!simId) return;
    setPolling(true);

    async function poll() {
      try {
        const r = await fetch(`/api/demo/simulate/feed?sessionId=${simId}`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const j = await r.json() as { revenue: number; orders: number; rewards: number; active: boolean; events: LiveEvent[] };
        setKpi({ revenue: j.revenue, orders: j.orders, rewards: j.rewards, active: j.active });
        setEvents(j.events.slice(-10).reverse());
      } catch { /* ignore */ }
    }

    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); setPolling(false); };
  }, [simId]);

  // Stop session on unmount
  useEffect(() => {
    return () => {
      if (simId) {
        fetch("/api/demo/simulate/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ sessionId: simId }),
        }).catch(() => {});
      }
    };
  }, [simId]);

  // ── Derived 4-stage experience funnel ─────────────────────────────────────────
  const funnelData = useMemo(() => {
    const recCount = events.filter(e => e.type === "ai_recommendation").length;
    return {
      entry:          events.filter(e => e.type === "user_interaction" || e.type === "product_viewed").length,
      recommendation: recCount,
      cart:           Math.floor(recCount * 0.65),
      purchase:       kpi.orders,
    };
  }, [events, kpi.orders]);

  const funnelMax = Math.max(funnelData.entry, funnelData.purchase, 1);

  const FUNNEL_STAGES: Array<{ key: keyof typeof funnelData; label: string; color: string }> = [
    { key: "entry",          label: "Entry",          color: "#5b8def" },
    { key: "recommendation", label: "Recommendation", color: "#a78bfa" },
    { key: "cart",           label: "Add to Cart",    color: "#f59e0b" },
    { key: "purchase",       label: "Purchase",       color: "#34d399" },
  ];

  // ── Storytelling overlay — narrative from most recent composite event ─────────
  const storyText = useMemo(() => {
    if (!simId || events.length === 0) return "Axiom OS is analyzing your venue in real time…";
    const ev = events.find(e => ["ai_recommendation", "order_placed", "user_interaction"].includes(e.type));
    if (!ev) return "Monitoring venue activity across all devices…";
    const p = ev.payload;
    if (ev.type === "ai_recommendation") {
      const items = p.recommendedItems as Array<{ name: string }> | undefined;
      return `Axiom AI matched ${String(p.guest ?? "a guest")} with ${items?.[0]?.name ?? "a premium selection"}.`;
    }
    if (ev.type === "order_placed") {
      return `${String(p.guest ?? "A guest")} ordered ${String(p.product ?? "an item")} — revenue up $${Number(p.total ?? 0).toFixed(0)}.`;
    }
    if (ev.type === "user_interaction") {
      return `${String(p.guest ?? "A guest")} is ${String(p.action ?? "").replace(/_/g, " ")} via ${String(p.source ?? "kiosk")}.`;
    }
    return "Processing live venue data…";
  }, [events, simId]);

  // Static fallback KPIs shown when sim is not running
  const displayRevenue  = simId ? `$${kpi.revenue.toLocaleString()}` : "$8,830";
  const displayOrders   = simId ? String(kpi.orders) : "56";
  const displayAvg      = simId && kpi.orders > 0 ? `$${Math.round(kpi.revenue / kpi.orders)}` : "$158";
  const displayConvRate = simId && funnelData.entry > 0
    ? `${Math.round((funnelData.purchase / funnelData.entry) * 100)}%`
    : "47%";

  const metrics = [
    { label: "Revenue",    value: displayRevenue,  color: "#d4af37" },
    { label: "Orders",     value: displayOrders,   color: "#5b8def" },
    { label: "Avg Order",  value: displayAvg,      color: "#34d399" },
    { label: "Conversion", value: displayConvRate, color: "#f59e0b" },
  ];

  const eventLabel: Record<string, string> = {
    order_placed:      "Order",
    product_viewed:    "View",
    reward_unlocked:   "Reward",
    revenue_update:    "Revenue",
    device_ping:       "Device",
    user_interaction:  "Engage",
    ai_recommendation: "AI Rec",
  };

  return (
    <StepCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Live Dashboard
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isSuperAdmin && (started ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => void stopSim()}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>
              <Square size={9} /> Stop
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => void startSim()}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontSize: 11, fontWeight: 700 }}>
              <Play size={9} /> Start Live
            </motion.button>
          ))}
          {simId && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: kpi.active ? "#34d399" : "rgba(232,224,200,0.3)" }}>
              <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ width: 6, height: 6, borderRadius: "50%", background: kpi.active ? "#34d399" : "rgba(232,224,200,0.2)" }} />
              {kpi.active ? "Live" : "…"}
            </div>
          )}
        </div>
      </div>
      {simError && (
        <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#ef4444" }}>
          {simError}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${m.color}20`, textAlign: "center" }}
          >
            <motion.div
              key={m.value}
              initial={{ scale: 1.15, color: m.color }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: 20, fontWeight: 700, color: m.color }}
            >
              {m.value}
            </motion.div>
            <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* 4-Stage Experience Funnel */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "rgba(232,224,200,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Experience Funnel</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {FUNNEL_STAGES.map(stage => {
            const count = funnelData[stage.key];
            const pct   = funnelMax > 0 ? Math.min(100, (count / funnelMax) * 100) : 0;
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 90, fontSize: 10, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>{stage.label}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 3, background: stage.color, opacity: 0.8 }}
                  />
                </div>
                <div style={{ width: 22, textAlign: "right", fontSize: 11, fontWeight: 700, color: stage.color, flexShrink: 0 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storytelling overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={storyText}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35 }}
          style={{
            marginBottom: 14, padding: "8px 12px", borderRadius: 10,
            background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.12)",
            fontSize: 11, color: "rgba(232,224,200,0.55)", fontStyle: "italic", lineHeight: 1.5,
          }}
        >
          {storyText}
        </motion.div>
      </AnimatePresence>

      {/* Live event feed */}
      {events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 10, color: "rgba(232,224,200,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Recent Events</div>
          {events.map(ev => {
            const p = ev.payload as Record<string, unknown>;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#d4af37", fontWeight: 700, minWidth: 52 }}>{eventLabel[ev.type] ?? ev.type}</span>
                <span style={{ color: "rgba(232,224,200,0.6)", flex: 1, paddingLeft: 8 }}>
                  {String(p.guest ?? p.guestName ?? "")}
                  {(p.product ?? p.productName) ? ` · ${String(p.product ?? p.productName ?? "")}` : ""}
                </span>
                {p.total != null && (
                  <span style={{ color: "#34d399", fontWeight: 700 }}>${Number(p.total).toFixed(2)}</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </StepCard>
  );
}

function ExperienceStep() {
  const [answered, setAnswered] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setAnswered(1), 800);
    const t2 = setTimeout(() => setAnswered(2), 1600);
    const t3 = setTimeout(() => setAnswered(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const questions = [
    { q: "What strength do you prefer?", a: "Full Body" },
    { q: "Flavor profile?", a: "Rich & Bold" },
    { q: "What's the occasion?", a: "Celebration" },
  ];

  return (
    <StepCard style={{ textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        SmokeCraft Experience Engine
      </div>
      <div style={{ fontSize: 12, color: "rgba(232,224,200,0.3)", marginBottom: 20 }}>
        AI-guided product recommendations through curated taste profiles
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400, margin: "0 auto" }}>
        {questions.map((item, i) => (
          <motion.div
            key={item.q}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: i < answered ? 1 : 0.3 }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", borderRadius: 12,
              background: i < answered ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${i < answered ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)"}`,
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(232,224,200,0.6)" }}>{item.q}</span>
            {i < answered && (
              <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: 13, fontWeight: 600, color: "#d4af37" }}>{item.a}</motion.span>
            )}
          </motion.div>
        ))}
      </div>
      {answered >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#34d399", fontWeight: 600, marginBottom: 4 }}>Recommendation Ready</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e0c8" }}>Arturo Fuente Opus X — Perfect for celebrations</div>
        </motion.div>
      )}
    </StepCard>
  );
}

function SystemOverviewStep() {
  const statusRows = [
    { icon: Wifi, label: "API Status", value: "Operational", color: "#34d399" },
    { icon: Monitor, label: "Devices", value: "5/6 Online", color: "#34d399" },
    { icon: Package, label: "Inventory", value: "2 Low Stock", color: "#f59e0b" },
    { icon: CreditCard, label: "Payment", value: "Simulated", color: "#5b8def" },
    { icon: Shield, label: "Security", value: "All Clear", color: "#34d399" },
    { icon: TrendingUp, label: "Operating Mode", value: "Overlay", color: "#5b8def" },
  ];

  return (
    <StepCard>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(232,224,200,0.5)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        System Health & Security
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {statusRows.map((row, i) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${row.color}15`,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${row.color}10`, border: `1px solid ${row.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={16} color={row.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(232,224,200,0.35)" }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "rgba(232,224,200,0.3)", fontStyle: "italic" }}>
        Full audit trail • Role-based access control • Multi-device fleet management
      </div>
    </StepCard>
  );
}

const ALL_STEPS: DemoStep[] = [
  { id: "order", title: "Order Creation", subtitle: "Smart Commerce with instant checkout", icon: ShoppingCart, color: "#d4af37", duration: DEFAULT_STEP_DURATION, render: () => <OrderCreationStep /> },
  { id: "reward", title: "Reward Unlock", subtitle: "Automated loyalty with fraud protection", icon: Gift, color: "#34d399", duration: DEFAULT_STEP_DURATION, render: () => <RewardUnlockStep /> },
  { id: "inventory", title: "Inventory Tracking", subtitle: "Real-time stock with audit trail", icon: Package, color: "#5b8def", duration: DEFAULT_STEP_DURATION, render: () => <InventoryStep /> },
  { id: "devices", title: "Device Control", subtitle: "Fleet management across venues", icon: Monitor, color: "#f97316", duration: DEFAULT_STEP_DURATION, render: () => <DeviceControlStep /> },
  { id: "dashboard", title: "Dashboard Metrics", subtitle: "Revenue intelligence & insights", icon: BarChart3, color: "#8b5cf6", duration: DEFAULT_STEP_DURATION, render: () => <DashboardMetricsStep /> },
  { id: "experience", title: "Experience Engine", subtitle: "AI-guided craft recommendations", icon: Sparkles, color: "#f59e0b", duration: DEFAULT_STEP_DURATION, render: () => <ExperienceStep /> },
  { id: "system", title: "System Health", subtitle: "Security, status, and audit", icon: Shield, color: "#34d399", duration: DEFAULT_STEP_DURATION, render: () => <SystemOverviewStep /> },
];

const STEP_MAP = new Map(ALL_STEPS.map(s => [s.id, s]));

function ProfileCard({
  profile,
  index,
  onSelect,
  onDelete,
}: {
  profile: DemoProfile;
  index: number;
  onSelect: (profile: DemoProfile) => void;
  onDelete?: (id: string) => void;
}) {
  const Icon = profile.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.03, borderColor: profile.color }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(profile)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12, padding: "28px 24px", borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(255,255,255,0.08)`,
        color: "#e8e0c8", cursor: "pointer",
        width: 210, textAlign: "center",
        transition: "border-color 0.2s",
        position: "relative",
      }}
    >
      {onDelete && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(profile.id); } }}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            cursor: "pointer", color: "#ef4444",
          }}
        >
          <Trash2 size={13} />
        </div>
      )}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `${profile.color}15`,
        border: `1px solid ${profile.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={26} color={profile.color} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: profile.color, marginBottom: 4 }}>
          {profile.name}
        </div>
        <div style={{ fontSize: 12, color: "rgba(232,224,200,0.45)", lineHeight: 1.4 }}>
          {profile.description}
        </div>
      </div>
      <div style={{
        fontSize: 11, color: "rgba(232,224,200,0.3)",
        padding: "4px 10px", borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
      }}>
        {profile.stepIds.length} steps · {(profile.speed / 1000).toFixed(1)}s each
      </div>
    </motion.button>
  );
}

function ProfileSelector({
  onSelect,
  onSkip,
  savedProfiles,
  onDeleteSaved,
  bgImage,
}: {
  onSelect: (profile: DemoProfile) => void;
  onSkip: () => void;
  savedProfiles: SavedProfile[];
  onDeleteSaved: (id: string) => void;
  bgImage: string;
}) {
  const savedDemoProfiles = savedProfiles.map(savedToDemoProfile);

  return (
    <BackgroundLayer image={bgImage} style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "#e8e0c8", padding: 24, overflow: "auto",
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: "center", marginBottom: 40 }}
      >
        <div style={{
          fontSize: 28, fontWeight: 700, color: "#e8e0c8",
          fontFamily: "'Playfair Display', serif", marginBottom: 8,
        }}>
          Choose a Demo Profile
        </div>
        <div style={{ fontSize: 14, color: "rgba(232,224,200,0.5)", maxWidth: 420 }}>
          Select a preset tailored for your audience, or skip to run the full demo
        </div>
      </motion.div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 720, marginBottom: 32 }}>
        {DEMO_PROFILES.map((profile, i) => (
          <ProfileCard key={profile.id} profile={profile} index={i} onSelect={onSelect} />
        ))}
      </div>

      {savedDemoProfiles.length > 0 && (
        <>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.4)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: 16,
          }}>
            Saved Profiles
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 720, marginBottom: 32 }}>
            {savedDemoProfiles.map((profile, i) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                index={DEMO_PROFILES.length + i}
                onSelect={onSelect}
                onDelete={onDeleteSaved}
              />
            ))}
          </div>
        </>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSkip}
        style={{
          padding: "12px 28px", borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(232,224,200,0.6)", cursor: "pointer",
          fontSize: 14, fontWeight: 600,
        }}
      >
        Skip — Run Full Demo
      </motion.button>
    </BackgroundLayer>
  );
}

function SaveProfileDialog({
  stepIds,
  speed,
  onSave,
  onClose,
}: {
  stepIds: string[];
  speed: number;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, description.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, padding: 28, borderRadius: 20,
          background: "#1a1714", border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{
          fontSize: 20, fontWeight: 700, color: "#e8e0c8",
          fontFamily: "'Playfair Display', serif", marginBottom: 4,
        }}>
          Save as Profile
        </div>
        <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", marginBottom: 20 }}>
          {stepIds.length} steps · {(speed / 1000).toFixed(1)}s per step
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(232,224,200,0.5)", marginBottom: 6, fontWeight: 600 }}>
            Profile Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="e.g. Quick Sales Pitch"
            maxLength={50}
            autoFocus
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#e8e0c8", fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(232,224,200,0.5)", marginBottom: 6, fontWeight: 600 }}>
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="e.g. Focused on revenue and rewards"
            maxLength={100}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#e8e0c8", fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,224,200,0.6)", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 12,
              background: name.trim() ? "linear-gradient(135deg, #a78bfa, #8b5cf6)" : "rgba(255,255,255,0.04)",
              border: "none",
              color: name.trim() ? "#fff" : "rgba(232,224,200,0.3)",
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 700,
            }}
          >
            Save Profile
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DemoWalkthrough() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(loadSavedProfiles);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const urlConfig = useMemo(() => parseDemoConfig(window.location.search), []);

  const hasUrlPreset = urlConfig.profileId !== null || urlConfig.stepIds !== null || urlConfig.perStepSpeed !== null;
  const [showSelector, setShowSelector] = useState(!hasUrlPreset);
  const [selectedProfile, setSelectedProfile] = useState<DemoProfile | null>(
    urlConfig.profileId ? PROFILE_MAP.get(urlConfig.profileId) ?? null : null,
  );

  const { stepIds, perStepSpeed } = useMemo(() => {
    if (selectedProfile && !urlConfig.stepIds) {
      return {
        stepIds: selectedProfile.stepIds,
        perStepSpeed: urlConfig.perStepSpeed ?? selectedProfile.speed,
      };
    }
    return { stepIds: urlConfig.stepIds, perStepSpeed: urlConfig.perStepSpeed };
  }, [selectedProfile, urlConfig]);

  const steps: DemoStep[] = useMemo(() => {
    if (!stepIds) return ALL_STEPS;
    const filtered = stepIds
      .map(id => STEP_MAP.get(id))
      .filter((s): s is DemoStep => s !== undefined);
    return filtered.length > 0 ? filtered : ALL_STEPS;
  }, [stepIds]);

  const activeStepIds = useMemo(() => steps.map(s => s.id), [steps]);
  const activeSpeed = perStepSpeed ?? DEFAULT_STEP_DURATION;

  const isCustomConfig = useMemo(() => {
    const builtInIds = new Set(DEMO_PROFILES.map(p => p.id));
    if (selectedProfile && builtInIds.has(selectedProfile.id)) return false;
    if (stepIds !== null || perStepSpeed !== null) return true;
    return false;
  }, [selectedProfile, stepIds, perStepSpeed]);

  const getStepDuration = useCallback((stepIndex: number): number => {
    if (perStepSpeed !== null) return perStepSpeed;
    return steps[stepIndex]?.duration ?? DEFAULT_STEP_DURATION;
  }, [perStepSpeed, steps]);

  const goNext = useCallback(() => {
    setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : 0));
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleProfileSelect = useCallback((profile: DemoProfile) => {
    setSelectedProfile(profile);
    setCurrentStep(0);
    setPaused(false);
    setShowSelector(false);
  }, []);

  const handleProfileSkip = useCallback(() => {
    setShowSelector(false);
  }, []);

  const handleSaveProfile = useCallback((name: string, description: string) => {
    const newProfile: SavedProfile = {
      id: `custom_${Date.now()}`,
      name,
      description: description || `${activeStepIds.length} steps at ${(activeSpeed / 1000).toFixed(1)}s`,
      stepIds: activeStepIds,
      speed: activeSpeed,
      createdAt: Date.now(),
    };
    const updated = [...savedProfiles, newProfile];
    setSavedProfiles(updated);
    persistSavedProfiles(updated);
    setShowSaveDialog(false);
  }, [savedProfiles, activeStepIds, activeSpeed]);

  const handleDeleteSaved = useCallback((id: string) => {
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    persistSavedProfiles(updated);
  }, [savedProfiles]);

  const handleCopyShareUrl = useCallback(() => {
    const url = buildShareableUrl(activeStepIds, activeSpeed);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }, [activeStepIds, activeSpeed]);

  useEffect(() => {
    if (showSelector || paused) return;
    const duration = getStepDuration(currentStep);
    timerRef.current = setTimeout(goNext, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentStep, paused, showSelector, goNext, getStepDuration]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (showSelector || showSaveDialog) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === "Escape") navigate("/");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, navigate, showSelector, showSaveDialog]);

  if (showSelector) {
    return (
      <ProfileSelector
        onSelect={handleProfileSelect}
        onSkip={handleProfileSkip}
        savedProfiles={savedProfiles}
        onDeleteSaved={handleDeleteSaved}
        bgImage={getBackground("demoWalk")}
      />
    );
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <BackgroundLayer image={getBackground("demoWalk")} style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      color: "#e8e0c8", overflow: "hidden",
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "8px 20px",
          background: "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1), rgba(245,158,11,0.15))",
          borderBottom: "1px solid rgba(245,158,11,0.2)",
          flexShrink: 0,
        }}
      >
        <Play size={12} color="#f59e0b" style={{ marginRight: 8 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Demo Mode{selectedProfile ? `: ${selectedProfile.name}` : ": Simulated Data"}
        </span>
        <span style={{ margin: "0 10px", color: "rgba(245,158,11,0.3)", fontSize: 11 }}>·</span>
        <span style={{ fontSize: 11, color: "rgba(245,158,11,0.65)", letterSpacing: "0.08em" }}>
          Experience Commerce OS
        </span>
      </motion.div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(232,224,200,0.5)", cursor: "pointer",
            }}>
            <X size={18} />
          </motion.button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: step.color }}>
              {step.title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>
              {step.subtitle}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(232,224,200,0.35)" }}>
            {currentStep + 1} / {steps.length}
          </span>
          {isCustomConfig && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setPaused(true); setShowSaveDialog(true); }}
              title="Save as Profile"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, height: 36, padding: "0 12px", borderRadius: 10,
                background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
                color: "#a78bfa", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              <Save size={14} /> Save
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCopyShareUrl}
            title="Copy shareable URL"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, height: 36, padding: "0 12px", borderRadius: 10,
              background: copiedUrl ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${copiedUrl ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: copiedUrl ? "#34d399" : "rgba(232,224,200,0.5)",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            {copiedUrl ? <><CheckCircle2 size={14} /> Copied</> : <><Link size={14} /> Share</>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPaused(p => !p)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              background: paused ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${paused ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: paused ? "#f59e0b" : "rgba(232,224,200,0.5)",
              cursor: "pointer",
            }}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </motion.button>
        </div>
      </div>

      <div style={{ height: 3, background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${step.color}, ${step.color}80)`,
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px", overflow: "auto",
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCurrentStep(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 10,
                  background: i === currentStep ? `${s.color}15` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${i === currentStep ? `${s.color}40` : "rgba(255,255,255,0.06)"}`,
                  color: i === currentStep ? s.color : "rgba(232,224,200,0.3)",
                  cursor: "pointer", fontSize: 11, fontWeight: i === currentStep ? 600 : 400,
                  minHeight: 36,
                }}
              >
                <Icon size={13} />
                <span style={{ display: i === currentStep ? "inline" : "none" }}>{s.title}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step.id} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {step.render()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goPrev}
          disabled={currentStep === 0}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 12,
            background: currentStep === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: currentStep === 0 ? "rgba(232,224,200,0.15)" : "rgba(232,224,200,0.5)",
            cursor: currentStep === 0 ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 600, minHeight: 44,
          }}
        >
          <ChevronLeft size={16} /> Previous
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", cursor: "pointer",
            fontSize: 13, fontWeight: 600, minHeight: 44,
          }}
        >
          Exit Demo
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goNext}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 12,
            background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
            border: "none",
            color: "#0a0806",
            cursor: "pointer",
            fontSize: 13, fontWeight: 700, minHeight: 44,
          }}
        >
          {currentStep === steps.length - 1 ? "Restart" : "Next"} <ChevronRight size={16} />
        </motion.button>
      </div>

      <AnimatePresence>
        {showSaveDialog && (
          <SaveProfileDialog
            stepIds={activeStepIds}
            speed={activeSpeed}
            onSave={handleSaveProfile}
            onClose={() => setShowSaveDialog(false)}
          />
        )}
      </AnimatePresence>
    </BackgroundLayer>
  );
}
