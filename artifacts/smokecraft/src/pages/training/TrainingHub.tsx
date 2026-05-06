/**
 * TrainingHub — /training
 * Main entry for Axiom OS Training Mode.
 *
 * KPIs and live event feed are sourced from real backend APIs.
 * useTrainingData hook provides write-through localStorage cache + offline fallback.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }          from "framer-motion";
import { useLocation }                      from "wouter";
import {
  Users, TrendingUp, BarChart3, BookOpen, Map,
  Award, Play, ArrowLeft, DollarSign, WifiOff,
} from "lucide-react";
import Maxwell                              from "@/components/Maxwell";
import TrainingBanner                       from "@/components/training/TrainingBanner";
import { DEMO_VENUE, DEMO_KPIS, LIVE_EVENTS, MAXWELL_INTROS } from "@/data/trainingData";
import { useTrainingData, logTrainingEvent, trainingFetch } from "@/hooks/useTrainingApi";

const T = {
  bg:     "#06040a",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(201,168,76,0.15)",
  gold:   "#c9a84c",
  goldB:  "#d4af37",
  text:   "rgba(240,232,212,0.92)",
  muted:  "rgba(240,232,212,0.50)",
  light:  "rgba(240,232,212,0.75)",
  green:  "#34d399",
  blue:   "#60a5fa",
  amber:  "#f59e0b",
  red:    "#ef4444",
  purple: "#a78bfa",
};

const MODES = [
  { id: "employee",       title: "Employee Training",  subtitle: "Role-based onboarding",   desc: "Interactive walkthroughs for every venue role — from bartender to owner.",            icon: Users,       color: T.gold,   route: "/training/employee" },
  { id: "investor",       title: "Investor Demo",      subtitle: "Cinematic auto-demo",      desc: "A guided journey through AI intelligence, revenue automation, and scale.",             icon: TrendingUp,  color: T.green,  route: "/training/investor" },
  { id: "sales",          title: "Sales Presentation", subtitle: "Venue-owner showcase",     desc: "Walk venue owners through increased engagement, spend, and retention.",                icon: DollarSign,  color: T.blue,   route: "/training/sales" },
  { id: "walkthrough",    title: "Venue Walkthrough",  subtitle: "10-step setup flow",       desc: "From first launch to full operation — guided touchscreen walkthrough.",                icon: Map,         color: T.purple, route: "/training/walkthrough" },
  { id: "scenarios",      title: "Scenario Missions",  subtitle: "8 training scenarios",     desc: "Real-world simulations with scoring, coaching, and Maxwell guidance.",                 icon: BookOpen,    color: T.amber,  route: "/training/scenarios" },
  { id: "certifications", title: "Certifications",     subtitle: "Training records",         desc: "View earned certifications and track completion across all roles.",                    icon: Award,       color: "#06b6d4",route: "/training/certifications" },
];

const EVENT_COLORS: Record<string, string> = {
  ai: T.purple, reservation: T.gold, inventory: T.amber, loyalty: T.green,
  trend: T.blue, order: T.light, campaign: "#f472b6", staff: T.green,
};

// ── KPI strip — real data from /api/training/analytics/summary ────────────────

interface SummaryData {
  revenueTonight: number; aiConfidence: number; tabsOpen: number;
  tabsPaid: number; guestSatisfaction: number; upsellRate: number;
  pairingAccuracy: number; staffOnShift: number; inventoryAlerts: number;
}

function KpiStrip() {
  const { data: summary, fromCache } = useTrainingData<{ summary: SummaryData }>(
    "analytics/summary",
    { summary: DEMO_KPIS as unknown as SummaryData },
  );

  const [vals, setVals] = useState<SummaryData>(summary?.summary ?? (DEMO_KPIS as unknown as SummaryData));

  // Seed initial values from API
  useEffect(() => {
    if (summary?.summary) setVals(summary.summary);
  }, [summary]);

  // Gentle tick animation — increments on top of real DB values
  useEffect(() => {
    const t = setInterval(() => {
      setVals((v) => ({
        ...v,
        revenueTonight:    v.revenueTonight + Math.floor(Math.random() * 12 + 4),
        aiConfidence:      Math.min(100, v.aiConfidence + (Math.random() > 0.6 ? 1 : 0)),
        tabsPaid:          v.tabsPaid + (Math.random() > 0.85 ? 1 : 0),
        guestSatisfaction: Math.min(100, v.guestSatisfaction),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const kpis = [
    { label: "Revenue Tonight",   value: `$${vals.revenueTonight.toLocaleString()}`, color: T.green  },
    { label: "AI Confidence",     value: `${vals.aiConfidence}%`,                    color: T.purple },
    { label: "Active Tabs",       value: String(vals.tabsOpen),                      color: T.gold   },
    { label: "Guest Satisfaction",value: `${vals.guestSatisfaction}%`,               color: T.blue   },
    { label: "Upsell Rate",       value: `${vals.upsellRate}%`,                      color: T.amber  },
    { label: "Pairing Accuracy",  value: `${vals.pairingAccuracy}%`,                 color: T.green  },
  ];

  return (
    <div>
      {fromCache && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <WifiOff size={9} color={T.amber} />
          <span style={{ fontSize: 9, color: T.amber }}>Cached data — reconnecting…</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {kpis.map(({ label, value, color }) => (
          <motion.div
            key={label}
            animate={{ borderColor: [`${color}25`, `${color}55`, `${color}25`] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ minWidth: 130, flex: "1 0 130px", background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 10, padding: "10px 14px" }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Cormorant Garamond',serif" }}>{value}</div>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Live event feed — real data from /api/training/demo-state/events ──────────

interface FeedEvent { id: string; type: string; text: string; ts: string; fromDb?: boolean }

function LiveFeed() {
  const [events, setEvents] = useState<Array<{ type: string; message: string }>>(LIVE_EVENTS.slice(0, 6));
  const [apiEvents, setApiEvents] = useState<FeedEvent[]>([]);
  const [idx, setIdx] = useState(6);
  const [fromDb, setFromDb] = useState(false);

  // Initial fetch from API
  useEffect(() => {
    trainingFetch<{ events: FeedEvent[] }>("demo-state/events")
      .then(({ data }) => {
        setApiEvents(data.events);
        setFromDb(true);
      })
      .catch(() => {
        // Fallback to static events — already set
      });
  }, []);

  // Tick — alternate between API events and static fallback
  useEffect(() => {
    const t = setInterval(() => {
      if (fromDb && apiEvents.length > 0) {
        setEvents((prev) => {
          const next = [...prev];
          const ev = apiEvents[idx % apiEvents.length]!;
          next.unshift({ type: ev.type, message: ev.text });
          next.pop();
          return next;
        });
      } else {
        setEvents((prev) => {
          const next = [...prev];
          next.unshift(LIVE_EVENTS[idx % LIVE_EVENTS.length]!);
          next.pop();
          return next;
        });
      }
      setIdx((i) => i + 1);
    }, 3200);
    return () => clearInterval(t);
  }, [idx, fromDb, apiEvents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: fromDb ? T.green : T.amber }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {fromDb ? "Live — Vault Cigar Lounge" : "Simulation — Vault Cigar Lounge"}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {events.map((ev, i) => {
          const color = EVENT_COLORS[ev.type] ?? T.light;
          return (
            <motion.div
              key={`${ev.message}-${i}`}
              initial={{ opacity: 0, x: 12, height: 0 }}
              animate={{ opacity: 1 - i * 0.12, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: -12, height: 0 }}
              transition={{ duration: 0.35 }}
              style={{ padding: "8px 10px", background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 7, overflow: "hidden" }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 8, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>{ev.type}</span>
                <span style={{ fontSize: 10.5, color: T.light, lineHeight: 1.45 }}>{ev.message}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────

function ModeCard({ mode, onClick }: { mode: typeof MODES[number]; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = mode.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? `${mode.color}0d` : T.card,
        border: `1px solid ${hovered ? mode.color + "55" : T.border}`,
        borderRadius: 13, padding: "18px 18px", cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", width: "100%",
        boxShadow: hovered ? `0 0 20px ${mode.color}15` : "none",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${mode.color}15`, border: `1px solid ${mode.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} color={mode.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 1 }}>{mode.title}</div>
          <div style={{ fontSize: 9, color: mode.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{mode.subtitle}</div>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{mode.desc}</div>
        </div>
        <motion.div animate={{ x: hovered ? 3 : 0 }} style={{ color: mode.color, paddingTop: 2 }}>
          <Play size={12} />
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TrainingHub() {
  const [, navigate] = useLocation();

  // Log page view on mount
  useEffect(() => {
    logTrainingEvent({ eventType: "page_view", page: "hub" });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter','SF Pro Display',sans-serif" }}>
      <div style={{
        position: "fixed", top: -60, left: "50%", transform: "translateX(-50%)",
        width: 700, height: 220,
        background: `radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/operations")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Operations
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em" }}>
            Axiom OS Training Mode
          </div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Powered by CraftHub · {DEMO_VENUE.name}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
          <span style={{ fontSize: 10, color: T.green }}>Live Simulation</span>
        </div>
      </div>
      <TrainingBanner />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0, minHeight: "calc(100vh - 61px)", position: "relative", zIndex: 1 }}>

        {/* Left: Venue header + mode cards */}
        <div style={{ padding: "28px 28px", borderRight: `1px solid ${T.border}`, overflowY: "auto" }}>

          {/* Venue banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)",
              border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 24,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: T.gold, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, marginBottom: 4 }}>
                Demo Venue — Simulation Active
              </div>
              <div style={{ fontSize: 28, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text, letterSpacing: "0.04em" }}>
                {DEMO_VENUE.name}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                {DEMO_VENUE.location} · Est. {DEMO_VENUE.since} · {DEMO_VENUE.seats} seats
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Rating", value: `${DEMO_VENUE.rating}★`, color: T.gold },
                { label: "Tier",   value: DEMO_VENUE.tier,          color: T.purple },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* KPI strip — real API */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 10 }}>
              Live Venue Metrics
            </div>
            <div style={{ marginBottom: 28 }}>
              <KpiStrip />
            </div>
          </motion.div>

          {/* Mode cards */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 12 }}>
              Select Training Mode
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MODES.map((mode, i) => (
                <motion.div key={mode.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.06 }}>
                  <ModeCard mode={mode} onClick={() => { logTrainingEvent({ eventType: "page_view", page: mode.id }); navigate(mode.route); }} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Live event feed */}
        <div style={{ padding: "28px 20px", overflowY: "auto" }}>
          <LiveFeed />
        </div>
      </div>

      <Maxwell message={MAXWELL_INTROS.hub} context="Training Hub" />
    </div>
  );
}
