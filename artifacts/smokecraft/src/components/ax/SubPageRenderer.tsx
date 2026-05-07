/**
 * SubPageRenderer — inline quick-view panel content for the StaffPanel nav grid.
 *
 * Renders a rich data view for a given slug without leaving the StaffPanel.
 * Tiles that open this: Revenue · Analytics · Campaigns.
 * All other tiles still navigate to their full-page routes.
 *
 * Slug map:
 *   "revenue"   → Revenue Engine live metrics
 *   "analytics" → Occupancy + sentiment quick glance
 *   "campaigns" → Active campaign list
 *   default     → Fallback "processing" state
 */

import { useAxiomStore }    from "@/store/axiomStore";
import { ProductionAudit }  from "./ProductionAudit";
import { motion }           from "framer-motion";
import {
  Zap, Activity, TrendingUp, Users,
  BarChart3, Smile, Meh, Frown,
  CheckCircle, ChevronRight, ExternalLink, Settings,
} from "lucide-react";

// ── Tokens matching HandoffContainer's dark-chrome palette ────────────────────

const T = {
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.45)",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.44)",
  dim:     "rgba(26,26,27,0.22)",
  surface: "rgba(26,26,27,0.06)",
  border:  "rgba(26,26,27,0.10)",
  green:   "#4ade80",
  red:     "#f87171",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
};

// ── Campaign data ─────────────────────────────────────────────────────────────

const CAMPAIGNS = [
  { name: "Member Monday",          status: "live",  lift: "+18%",  color: T.green  },
  { name: "Cigar of the Month",     status: "live",  lift: "+11%",  color: T.gold   },
  { name: "After-Hours Early Bird", status: "draft", lift: "–",     color: T.purple },
];

// ── Stat card atom ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = T.gold,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1,
      padding: "12px 14px",
      background: "rgba(26,26,27,0.09)",
      border: `1px solid ${T.border}`,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.18em", color: T.muted, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: T.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Revenue quick-view ────────────────────────────────────────────────────────

function RevenueView({ totalLift, isDynamicActive, occupancy }: { totalLift: number; isDynamicActive: boolean; occupancy: number }) {
  const BAR_HEIGHTS = [40, 70, 45, 90, 65, 80, 95];
  const projectedLift = (occupancy / 100) * (isDynamicActive ? 64 : 38);

  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14} color={T.gold} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.gold, letterSpacing: "0.06em" }}>Revenue Engine</span>
        </div>
        <div style={{
          padding: "3px 10px", borderRadius: 99, fontSize: 8, fontWeight: 700,
          background: isDynamicActive ? "rgba(74,222,128,0.12)" : "rgba(26,26,27,0.07)",
          border: `1px solid ${isDynamicActive ? "rgba(74,222,128,0.30)" : T.border}`,
          color: isDynamicActive ? T.green : T.dim,
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          {isDynamicActive ? "● Dynamic ON" : "○ Static"}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{
        height: 80, display: "flex", alignItems: "flex-end", justifyContent: "space-around",
        gap: 4, padding: "0 4px",
        background: "rgba(26,26,27,0.06)", borderRadius: 12, border: `1px solid ${T.border}`,
      }}>
        {BAR_HEIGHTS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
            style={{ transformOrigin: "bottom", flex: 1, borderRadius: "3px 3px 0 0", background: `${T.gold}50` }}
          >
            <div style={{ height: `${h}%`, background: `linear-gradient(180deg, ${T.gold}80, ${T.gold}28)`, borderRadius: "3px 3px 0 0" }} />
          </motion.div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Total Lift"      value={`$${totalLift.toFixed(2)}`}      color={T.green}  />
        <StatCard label="Dynamic State"   value={isDynamicActive ? "ON" : "OFF"}   color={isDynamicActive ? T.green : T.dim} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Projected / hr"  value={`$${projectedLift.toFixed(0)}`}   color={T.gold} sub="based on occupancy" />
        <StatCard label="Occupancy"       value={`${occupancy}%`} color={occupancy > 80 ? T.red : occupancy < 25 ? T.gold : T.green} />
      </div>

      {/* Dynamic pricing toggle hint */}
      {!isDynamicActive && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(212,139,0,0.06)", border: `1px solid ${T.goldDim}`,
            fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 8,
          }}>
          <TrendingUp size={12} color={T.gold} />
          Enable dynamic pricing in Revenue Engine for surge capture
        </motion.div>
      )}
    </div>
  );
}

// ── Analytics quick-view ──────────────────────────────────────────────────────

function AnalyticsView({ occupancy }: { occupancy: number }) {
  const SENTIMENT = [
    { icon: Smile, label: "Satisfied",    pct: 68, color: T.green  },
    { icon: Meh,   label: "Neutral",      pct: 22, color: T.gold   },
    { icon: Frown, label: "Disappointed", pct: 10, color: T.red    },
  ];

  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BarChart3 size={14} color={T.blue} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.blue, letterSpacing: "0.06em" }}>Analytics</span>
      </div>

      {/* Occupancy meter */}
      <div style={{ padding: "14px 16px", background: "rgba(26,26,27,0.07)", borderRadius: 12, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={10} color={T.muted} /> Live Occupancy
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: occupancy > 80 ? T.red : occupancy < 25 ? T.gold : T.green }}>
            {occupancy}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "rgba(26,26,27,0.08)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupancy}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{
              height: "100%", borderRadius: 99,
              background: occupancy > 80
                ? `linear-gradient(90deg, ${T.red}80, ${T.red})`
                : occupancy < 25
                  ? `linear-gradient(90deg, ${T.gold}60, ${T.gold})`
                  : `linear-gradient(90deg, ${T.green}60, ${T.green})`,
            }}
          />
        </div>
        <div style={{ marginTop: 6, fontSize: 9, color: T.dim }}>
          {occupancy > 80 ? "At capacity — surge pricing eligible" : occupancy < 25 ? "Slow period — volume incentive active" : "Normal demand"}
        </div>
      </div>

      {/* Sentiment */}
      <div style={{ padding: "14px 16px", background: "rgba(26,26,27,0.06)", borderRadius: 12, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: T.muted, marginBottom: 12 }}>
          Guest Sentiment
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SENTIMENT.map(({ icon: Icon, label, pct, color }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted }}>
                  <Icon size={11} color={color} /> {label}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(26,26,27,0.07)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                  style={{ height: "100%", borderRadius: 99, background: color, opacity: 0.7 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <StatCard label="Sessions Today" value="24" sub="↑ 3 vs. yesterday" color={T.blue} />
    </div>
  );
}

// ── Campaigns quick-view ──────────────────────────────────────────────────────

function CampaignsView() {
  return (
    <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={14} color={T.gold} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.gold, letterSpacing: "0.06em" }}>Active Campaigns</span>
      </div>

      {CAMPAIGNS.map((c) => (
        <motion.div
          key={c.name}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          style={{
            padding: "14px 16px",
            background: "rgba(26,26,27,0.07)",
            border: `1px solid ${c.color}22`,
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, opacity: c.status === "live" ? 1 : 0.35,
              boxShadow: c.status === "live" ? `0 0 6px ${c.color}` : "none" }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: T.dim, marginTop: 2 }}>
                {c.status}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {c.status === "live" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {c.lift !== "–" && <CheckCircle size={11} color={T.green} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.lift}</span>
              </div>
            )}
            <ChevronRight size={13} color={T.dim} />
          </div>
        </motion.div>
      ))}

      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "rgba(26,26,27,0.04)", border: `1px solid ${T.border}`,
        fontSize: 10, color: T.dim, textAlign: "center",
      }}>
        Manage full campaign suite in Campaigns module
      </div>
    </div>
  );
}

// ── Operations quick-view ─────────────────────────────────────────────────────

function OperationsView() {
  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 18px 4px" }}>
        <Settings size={14} color={T.gold} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.gold, letterSpacing: "0.06em" }}>Operations</span>
      </div>

      <ProductionAudit />

      {/* Escape hatch to full module */}
      <div style={{ margin: "0 18px 4px" }}>
        <a
          href="/operations"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 14px", borderRadius: 11, textDecoration: "none",
            background: "rgba(26,26,27,0.04)", border: `1px solid ${T.border}`,
            fontSize: 11, fontWeight: 600, color: T.muted,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,139,0,0.35)"; (e.currentTarget as HTMLElement).style.color = "#1A1A1B"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.muted; }}
        >
          <ExternalLink size={12} />
          Open Full Operations Module
        </a>
      </div>
    </div>
  );
}

// ── Default fallback ──────────────────────────────────────────────────────────

function DefaultView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, padding: 32, textAlign: "center" }}>
      <motion.div
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Activity size={40} color={`${T.gold}40`} />
      </motion.div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.24em", color: T.dim, marginTop: 16, fontStyle: "italic" }}>
        Axiom OS Intelligence: Processing Data…
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SubPageRenderer({ slug }: { slug: string }) {
  const { totalLift, occupancy, isDynamicActive } = useAxiomStore();

  switch (slug) {
    case "revenue":
      return <RevenueView totalLift={totalLift} isDynamicActive={isDynamicActive} occupancy={occupancy} />;
    case "analytics":
      return <AnalyticsView occupancy={occupancy} />;
    case "campaigns":
      return <CampaignsView />;
    case "operations":
      return <OperationsView />;
    default:
      return <DefaultView />;
  }
}
