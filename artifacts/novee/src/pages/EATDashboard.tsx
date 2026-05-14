/**
 * E.A.T. Engine Dashboard — /novee/eat-engine
 *
 * Shows internal telemetry from the NOVEE OS kernel:
 *  - Total events counter (animated)
 *  - Events over time (line chart — last 30 days)
 *  - Top event types (bar chart)
 *  - Per-module usage (horizontal bars)
 *  - Ritual Engagement metric (ratio of build-completions to swipe-starts)
 */

import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { apiFetch } from "@/lib/api";

interface TelemetrySummary {
  total: number;
  dailyCounts: { day: string; cnt: number }[];
  topEventTypes: { event_type: string; cnt: number }[];
  moduleUsage: { module_name: string; module_slug: string; event_count: number }[];
  ritualEngagement: number;
}

const EMPTY_SUMMARY: TelemetrySummary = {
  total: 0,
  dailyCounts: [],
  topEventTypes: [],
  moduleUsage: [],
  ritualEngagement: 0,
};

const ACCENT = "#C4610A";
const ACCENT_DIM = "rgba(196,97,10,0.35)";
const SURFACE = "rgba(24,24,25,0.85)";

type DashTab = "overview" | "events" | "modules" | "ritual";

export default function EATDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab]         = useState<DashTab>("overview");
  const [data, setData]       = useState<TelemetrySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [displayTotal, setDisplayTotal] = useState(0);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load summary
  useEffect(() => {
    setLoading(true);
    apiFetch<TelemetrySummary>("/telemetry/summary")
      .then((d) => setData(d))
      .catch(() => setData(EMPTY_SUMMARY))
      .finally(() => setLoading(false));
  }, []);

  // Animated counter
  useEffect(() => {
    if (counterRef.current) clearInterval(counterRef.current);
    if (data.total === 0) { setDisplayTotal(0); return; }
    let v = 0;
    const step = Math.max(1, Math.floor(data.total / 40));
    counterRef.current = setInterval(() => {
      v = Math.min(v + step, data.total);
      setDisplayTotal(v);
      if (v >= data.total && counterRef.current) clearInterval(counterRef.current);
    }, 25);
    return () => { if (counterRef.current) clearInterval(counterRef.current); };
  }, [data.total]);

  const TABS: { id: DashTab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "events",   label: "EVENTS" },
    { id: "modules",  label: "MODULES" },
    { id: "ritual",   label: "RITUAL" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0E", color: "#F5EDD8" }}>

      {/* Ambient top glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "70%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(196,97,10,0.5), transparent)",
        zIndex: 10,
      }} />

      {/* Header */}
      <header style={{
        background: "linear-gradient(180deg, #1A1A1B 0%, #111112 100%)",
        borderBottom: "1px solid rgba(196,97,10,0.15)",
        padding: "0 28px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: "none", color: "rgba(245,237,216,0.35)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "4px 8px 4px 0" }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: "#F5EDD8" }}>E.A.T. ENGINE</div>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(196,97,10,0.5)", marginTop: -1 }}>ENGAGEMENT · ANALYTICS · TELEMETRY</div>
          </div>
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.25)" }}>
          INTERNAL · NO EXPORT
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 28px",
        display: "flex", gap: 0,
        background: "rgba(0,0,0,0.3)",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`novee-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{ padding: "32px 28px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {tab === "overview" && <OverviewTab data={data} displayTotal={displayTotal} />}
            {tab === "events"   && <EventsTab data={data} />}
            {tab === "modules"  && <ModulesTab data={data} />}
            {tab === "ritual"   && <RitualTab data={data} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Tab Views ──────────────────────────────────────────────────────────────── */

function OverviewTab({ data, displayTotal }: { data: TelemetrySummary; displayTotal: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "TOTAL EVENTS", value: displayTotal.toLocaleString(), accent: true },
          { label: "RITUAL ENGAGEMENT", value: `${data.ritualEngagement}%`, accent: false },
          { label: "ACTIVE MODULES", value: String(data.moduleUsage.length), accent: false },
          { label: "EVENT TYPES", value: String(data.topEventTypes.length), accent: false },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: kpi.accent ? "rgba(196,97,10,0.08)" : SURFACE,
            border: `1px solid ${kpi.accent ? "rgba(196,97,10,0.25)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 10, padding: "18px 16px",
          }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)", marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 200, letterSpacing: "0.04em", color: kpi.accent ? "#C4610A" : "#F5EDD8" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Mini line chart */}
      {data.dailyCounts.length > 0 ? (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)", marginBottom: 16 }}>
            EVENTS OVER TIME (30 DAYS)
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.dailyCounts} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#1A1A1B", border: "1px solid rgba(196,97,10,0.3)", borderRadius: 6, fontSize: 11 }} />
              <Line type="monotone" dataKey="cnt" stroke={ACCENT} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState label="No time-series data yet. Emit events from SmokeCraft to see them here." />
      )}

      {/* Top event types mini */}
      {data.topEventTypes.length > 0 && (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)", marginBottom: 16 }}>
            TOP EVENT TYPES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.topEventTypes.slice(0, 5).map((et, i) => (
              <HBar key={et.event_type} label={et.event_type} value={et.cnt} max={data.topEventTypes[0].cnt} rank={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventsTab({ data }: { data: TelemetrySummary }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader label="EVENT TYPE BREAKDOWN" sub="Count distribution across all ingested event types" />

      {data.topEventTypes.length === 0 ? (
        <EmptyState label="No events ingested yet." />
      ) : (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
          <ResponsiveContainer width="100%" height={Math.max(200, data.topEventTypes.length * 40)}>
            <BarChart data={data.topEventTypes} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
              <YAxis type="category" dataKey="event_type" width={140} tick={{ fill: "rgba(245,237,216,0.5)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1A1A1B", border: "1px solid rgba(196,97,10,0.3)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="cnt" radius={[0, 4, 4, 0]}>
                {data.topEventTypes.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? ACCENT : `rgba(196,97,10,${0.6 - i * 0.06})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily trend */}
      {data.dailyCounts.length > 0 && (
        <>
          <SectionHeader label="DAILY TREND" sub="Event volume per day over the last 30 days" />
          <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.dailyCounts} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#1A1A1B", border: "1px solid rgba(196,97,10,0.3)", borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="cnt" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function ModulesTab({ data }: { data: TelemetrySummary }) {
  const maxEvents = Math.max(1, ...data.moduleUsage.map((m) => m.event_count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader label="MODULE USAGE" sub="Event count per registered kernel module" />

      {data.moduleUsage.length === 0 ? (
        <EmptyState label="No module usage data yet." />
      ) : (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {data.moduleUsage.map((m, i) => (
            <div key={m.module_slug}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#F5EDD8" }}>{m.module_name}</div>
                <div style={{ fontSize: 11, color: "rgba(245,237,216,0.5)" }}>{m.event_count.toLocaleString()} events</div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(m.event_count / maxEvents) * 100}%`,
                  background: i === 0 ? ACCENT : ACCENT_DIM,
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RitualTab({ data }: { data: TelemetrySummary }) {
  const r = data.ritualEngagement;
  const rating = r >= 70 ? "EXCELLENT" : r >= 40 ? "GOOD" : r >= 20 ? "DEVELOPING" : "EARLY";
  const ratingColor = r >= 70 ? "#4ade80" : r >= 40 ? "#C4610A" : r >= 20 ? "#D4AF37" : "#6b7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHeader label="RITUAL ENGAGEMENT" sub="Ratio of craft build completions to swipe-starts — measures how often guests complete a full ritual cycle" />

      {/* Big score */}
      <div style={{ display: "flex", gap: 20, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{
          background: "rgba(196,97,10,0.07)", border: "1px solid rgba(196,97,10,0.2)",
          borderRadius: 12, padding: "32px 40px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "0 0 auto",
        }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(245,237,216,0.35)" }}>RITUAL SCORE</div>
          <div style={{ fontSize: 72, fontWeight: 200, lineHeight: 1, color: "#C4610A" }}>{r}</div>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(245,237,216,0.4)" }}>/ 100</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: ratingColor, marginTop: 4 }}>
            {rating}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220, background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)" }}>HOW IT'S CALCULATED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Swipe Starts", type: "swipe_start", color: "#C4610A" },
              { label: "Build Completions", type: "build_complete", color: "#4ade80" },
            ].map((row) => {
              const match = data.topEventTypes.find(e => e.event_type === row.type);
              return (
                <div key={row.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "rgba(245,237,216,0.6)" }}>{row.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: row.color }}>{(match?.cnt ?? 0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ fontSize: 11, color: "rgba(245,237,216,0.35)", lineHeight: 1.5 }}>
            Formula: <span style={{ color: "rgba(196,97,10,0.8)", fontFamily: "monospace" }}>completions / starts × 100</span>
          </div>
        </div>
      </div>

      {/* Meter bar */}
      <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(245,237,216,0.5)" }}>Engagement meter</div>
          <div style={{ fontSize: 11, color: "#C4610A" }}>{r}%</div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            width: `${r}%`,
            background: `linear-gradient(90deg, #8b3a00, ${ACCENT}, #D4AF37)`,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "rgba(245,237,216,0.2)" }}>
          <span>0 — EARLY</span>
          <span>40 — GOOD</span>
          <span>70 — EXCELLENT</span>
        </div>
      </div>
    </div>
  );
}

/* ── Shared UI pieces ─────────────────────────────────────────────────────── */

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, rank }: { label: string; value: number; max: number; rank: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = rank === 0 ? ACCENT : `rgba(196,97,10,${0.7 - rank * 0.1})`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "rgba(245,237,216,0.6)", fontFamily: "monospace" }}>{label}</span>
        <span style={{ fontSize: 11, color: "rgba(245,237,216,0.4)" }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      background: "rgba(24,24,25,0.6)", border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 10, padding: "36px 24px", textAlign: "center",
      fontSize: 13, color: "rgba(245,237,216,0.3)", lineHeight: 1.6,
    }}>
      {label}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "48px 0" }}>
      <div style={{
        width: 20, height: 20, border: "1.5px solid rgba(196,97,10,0.2)",
        borderTopColor: "#C4610A", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>Loading telemetry…</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
