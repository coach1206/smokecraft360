/**
 * RevenueAttributionTab — Phase 2: Revenue Attribution Engine.
 *
 * Queries /api/revenue-engine/events/platform and visualizes which
 * interactions (AI pairings, recommendations, VIP upgrades, etc.)
 * influenced measurable revenue.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw, ArrowUpRight, Filter } from "lucide-react";
import {
  getPlatformEvents,
  getPlatformSummary,
  getForecast,
  type RevenueEvent,
} from "@/services/revenueEngineApi";

// ── Tokens ────────────────────────────────────────────────────────────────

const GOLD  = "#D48B00";
const CREAM = "#F5F2ED";

const EVENT_COLOR: Record<string, string> = {
  ai_pairing:          "#9B8EC4",
  recommendation:      "#5E9E6E",
  vip_upgrade:         "#D48B00",
  subscription_charge: "#E8C870",
  module_purchase:     "#C4A96D",
  hardware_lease:      "#8A9BB0",
  reservation:         "#7EC8A0",
  reward_activation:   "#E87040",
  experience_complete: "#5E9E6E",
  default:             "#6B5E4E",
};

function eventColor(type: string) {
  for (const [k, v] of Object.entries(EVENT_COLOR)) {
    if (type.includes(k)) return v;
  }
  return EVENT_COLOR.default;
}

// ── Horizontal bar chart ──────────────────────────────────────────────────

function AttributionBar({ label, count, maxCount, color }: {
  label: string; count: number; maxCount: number; color: string;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "rgba(245,242,237,0.65)", textTransform: "capitalize" }}>
          {label.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: CREAM }}>{count}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(245,242,237,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 99, background: color }}
        />
      </div>
    </div>
  );
}

// ── Summary tiles ─────────────────────────────────────────────────────────

function SummaryTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      borderRadius: 14, border: "1px solid rgba(212,139,0,0.15)",
      background: "rgba(245,242,237,0.04)", padding: "14px 16px",
    }}>
      <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(245,242,237,0.35)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function RevenueAttributionTab() {
  const [events,    setEvents   ] = useState<RevenueEvent[]>([]);
  const [summary,   setSummary  ] = useState<Record<string, unknown>>({});
  const [forecast,  setForecast ] = useState<Record<string, unknown>>({});
  const [loading,   setLoading  ] = useState(true);
  const [error,     setError    ] = useState<string | null>(null);
  const [filter,    setFilter   ] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [evts, sum, fc] = await Promise.allSettled([
        getPlatformEvents(100),
        getPlatformSummary(),
        getForecast(),
      ]);
      if (evts.status === "fulfilled")  setEvents(evts.value.events ?? []);
      else setError("Could not load revenue events.");
      if (sum.status === "fulfilled")   setSummary(sum.value as Record<string, unknown>);
      if (fc.status  === "fulfilled")   setForecast(fc.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Build attribution map
  const typeCounts = events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.eventType] = (acc[ev.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount    = sortedTypes[0]?.[1] ?? 1;

  const allTypes    = ["all", ...sortedTypes.map(([k]) => k)];
  const filtered    = filter === "all" ? events : events.filter((e) => e.eventType === filter);

  const totalRevenue = events.reduce((sum, ev) => {
    const amt = typeof ev.amount === "number" ? ev.amount : 0;
    return sum + amt;
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{
            fontSize: 18, fontWeight: 300, color: CREAM,
            letterSpacing: "0.14em", textTransform: "uppercase",
            fontFamily: "'Cormorant Garamond', Georgia, serif", margin: 0,
          }}>
            Revenue Attribution
          </h2>
          <p style={{ fontSize: 10, color: "rgba(245,242,237,0.35)", margin: "3px 0 0", letterSpacing: "0.08em" }}>
            Phase 2 · Influence tracking · {events.length} events
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => { void load(); }}
          disabled={loading}
          whileTap={{ scale: 0.92 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            border: `1px solid rgba(212,139,0,0.25)`,
            background: "transparent", color: GOLD, cursor: "pointer",
            fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          }}
        >
          <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}>
            <RefreshCw size={11} />
          </motion.span>
          Refresh
        </motion.button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", color: "#E87070", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <SummaryTile label="Total Events"      value={events.length}    sub="platform-wide" />
        <SummaryTile label="Event Types"       value={sortedTypes.length} sub="distinct categories" />
        <SummaryTile label="Total Revenue"     value={`$${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} sub="attributed amount" />
        {Object.entries(summary).slice(0, 1).map(([k, v]) => (
          <SummaryTile key={k} label={k.replace(/_/g, " ")} value={typeof v === "number" ? v.toLocaleString() : String(v)} />
        ))}
      </div>

      {/* Attribution bars */}
      {sortedTypes.length > 0 && (
        <div style={{
          borderRadius: 18, border: "1px solid rgba(212,139,0,0.15)",
          background: "rgba(245,242,237,0.04)", padding: "20px 18px",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(245,242,237,0.4)", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Activity size={11} /> Influence Attribution Map
          </div>
          {sortedTypes.map(([type, count]) => (
            <AttributionBar key={type} label={type} count={count} maxCount={maxCount} color={eventColor(type)} />
          ))}
        </div>
      )}

      {/* Event filter + feed */}
      <div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4, color: "rgba(245,242,237,0.35)" }}>
            <Filter size={11} />
            <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>Filter</span>
          </div>
          {allTypes.slice(0, 8).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              style={{
                padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${filter === t ? GOLD : "rgba(245,242,237,0.1)"}`,
                background: filter === t ? `${GOLD}15` : "transparent",
                color: filter === t ? GOLD : "rgba(245,242,237,0.45)",
                fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "capitalize",
                transition: "all 0.18s",
              }}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Event list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 && !loading && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(245,242,237,0.25)", fontSize: 12 }}>
              No events yet — revenue events will appear here as they occur.
            </div>
          )}
          {filtered.slice(0, 50).map((ev, i) => {
            const color = eventColor(ev.eventType);
            const amt   = typeof ev.amount === "number" ? `$${(ev.amount / 100).toFixed(2)}` : null;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.025 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px", borderRadius: 12,
                  border: "1px solid rgba(245,242,237,0.06)",
                  background: "rgba(245,242,237,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: CREAM, fontWeight: 500, textTransform: "capitalize" }}>
                      {ev.eventType.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(245,242,237,0.3)", marginTop: 2 }}>
                      {ev.venueId ? `venue ${ev.venueId.slice(0, 10)}…` : "platform"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {amt && <div style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>{amt}</div>}
                  <div style={{ fontSize: 9, color: "rgba(245,242,237,0.3)", display: "flex", alignItems: "center", gap: 3 }}>
                    <ArrowUpRight size={8} />
                    {new Date(ev.createdAt).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Forecast preview */}
      {Object.keys(forecast).length > 0 && (
        <div style={{
          borderRadius: 18, border: "1px solid rgba(212,139,0,0.12)",
          background: "rgba(245,242,237,0.03)", padding: "18px 16px",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(245,242,237,0.4)", marginBottom: 14,
          }}>
            Revenue Forecast Intelligence
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {Object.entries(forecast).slice(0, 6).map(([k, v]) => (
              <div key={k} style={{ padding: "10px 0", borderBottom: "1px solid rgba(245,242,237,0.05)" }}>
                <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", textTransform: "capitalize", marginBottom: 4 }}>
                  {k.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: CREAM }}>
                  {typeof v === "number" ? `$${v.toLocaleString()}` : String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default RevenueAttributionTab;
