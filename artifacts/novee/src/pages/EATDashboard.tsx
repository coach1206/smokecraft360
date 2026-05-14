/**
 * E.A.T. Engine Dashboard — /novee/eat-engine
 *
 * Shows internal telemetry from the NOVEE OS kernel:
 *  - Total events counter (animated)
 *  - Events over time (line chart — configurable date range)
 *  - Top event types (bar chart)
 *  - Per-module usage (horizontal bars)
 *  - Ritual Engagement metric (ratio of build-completions to swipe-starts)
 */

import { useEffect, useState, useRef, useCallback } from "react";
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

interface RecentEvent {
  id: string;
  eventType: string;
  moduleId: string | null;
  venueId: string | null;
  occurredAt: string;
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

type DashTab = "overview" | "events" | "modules" | "ritual" | "live";

const POLL_INTERVAL_MS = 15_000;

const PRESET_OPTIONS = [
  { label: "7D",  days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function parseDaysFromSearch(search: string): number {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = parseInt(params.get("days") ?? "", 10);
    if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 365);
  } catch { /* ignore */ }
  return 30;
}

export default function EATDashboard() {
  const [, navigate] = useLocation();

  // Initialise days from URL on mount
  const [days, setDaysState] = useState<number>(() => parseDaysFromSearch(window.location.search));
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustom, setShowCustom]   = useState(false);

  const [tab, setTab]             = useState<DashTab>("overview");
  const [data, setData]           = useState<TelemetrySummary>(EMPTY_SUMMARY);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stale, setStale]         = useState(false);
  const [displayTotal, setDisplayTotal] = useState(0);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [recentEvents, setRecentEvents]     = useState<RecentEvent[]>([]);
  const [newEventIds, setNewEventIds]       = useState<Set<string>>(new Set());
  const prevEventIdsRef                     = useRef<Set<string>>(new Set());
  const hasBaselineRef                      = useRef(false);
  const flashTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync days → URL
  const setDays = useCallback((n: number) => {
    setDaysState(n);
    const url = new URL(window.location.href);
    url.searchParams.set("days", String(n));
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Keep state in sync when the user navigates back/forward
  useEffect(() => {
    const onPopState = () => {
      const next = parseDaysFromSearch(window.location.search);
      setDaysState(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const fetchSummary = useCallback((isInitial = false, d = days) => {
    if (isInitial) setLoading(true);
    apiFetch<TelemetrySummary>(`/telemetry/summary?days=${d}`)
      .then((res) => { setData(res); setLastUpdated(new Date()); setStale(false); })
      .catch(() => { if (!isInitial) setStale(true); else setData(EMPTY_SUMMARY); })
      .finally(() => { if (isInitial) setLoading(false); });
  }, [days]);

  const fetchRecentEvents = useCallback(() => {
    apiFetch<{ events: RecentEvent[] }>("/telemetry/recent?limit=20")
      .then(({ events }) => {
        const incomingIds = new Set(events.map((e) => e.id));
        const isFirstLoad = !hasBaselineRef.current;
        hasBaselineRef.current = true;

        if (!isFirstLoad) {
          const freshIds = new Set<string>();
          for (const id of incomingIds) {
            if (!prevEventIdsRef.current.has(id)) freshIds.add(id);
          }
          if (freshIds.size > 0) {
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            setNewEventIds(freshIds);
            flashTimerRef.current = setTimeout(() => setNewEventIds(new Set()), 1800);
          }
        }

        prevEventIdsRef.current = incomingIds;
        setRecentEvents(events);
      })
      .catch(() => { /* silent — feed is additive UI */ });
  }, []);

  // Re-fetch + restart polling when days changes
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    fetchSummary(true, days);
    fetchRecentEvents();
    pollRef.current = setInterval(() => {
      fetchSummary(false, days);
      fetchRecentEvents();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleCustomSubmit = () => {
    const n = parseInt(customInput, 10);
    if (Number.isFinite(n) && n > 0) {
      setDays(Math.min(n, 365));
      setShowCustom(false);
      setCustomInput("");
    }
  };

  const isCustomActive = !PRESET_OPTIONS.some((p) => p.days === days);

  const TABS: { id: DashTab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "events",   label: "EVENTS" },
    { id: "modules",  label: "MODULES" },
    { id: "ritual",   label: "RITUAL" },
    { id: "live",     label: "● LIVE FEED" },
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
        padding: "0 28px", minHeight: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "8px 16px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Left: back + title */}
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

        {/* Center: date-range picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginRight: 4 }}>RANGE</span>
          {PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => { setDays(opt.days); setShowCustom(false); }}
              style={{
                background: days === opt.days ? "rgba(196,97,10,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${days === opt.days ? "rgba(196,97,10,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 5, padding: "4px 10px",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                color: days === opt.days ? "#C4610A" : "rgba(245,237,216,0.45)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
          {/* Custom button */}
          <button
            onClick={() => setShowCustom((v) => !v)}
            style={{
              background: isCustomActive ? "rgba(196,97,10,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isCustomActive ? "rgba(196,97,10,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 5, padding: "4px 10px",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              color: isCustomActive ? "#C4610A" : "rgba(245,237,216,0.45)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {isCustomActive ? `${days}D` : "CUSTOM"}
          </button>
          {showCustom && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                min={1}
                max={365}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                placeholder="days"
                autoFocus
                style={{
                  width: 58, padding: "4px 8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(196,97,10,0.35)",
                  borderRadius: 5, color: "#F5EDD8",
                  fontSize: 11, outline: "none",
                }}
              />
              <button
                onClick={handleCustomSubmit}
                style={{
                  background: "rgba(196,97,10,0.25)", border: "1px solid rgba(196,97,10,0.5)",
                  borderRadius: 5, padding: "4px 8px",
                  fontSize: 10, color: "#C4610A", cursor: "pointer",
                }}
              >
                GO
              </button>
            </div>
          )}
        </div>

        {/* Right: meta */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.25)" }}>
            INTERNAL · NO EXPORT
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: stale ? "rgba(180,60,60,0.7)" : "rgba(196,97,10,0.5)" }}>
              {stale ? "⚠ STALE — " : ""}UPDATED {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
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
            {tab === "overview" && <OverviewTab data={data} displayTotal={displayTotal} days={days} />}
            {tab === "events"   && <EventsTab data={data} days={days} />}
            {tab === "modules"  && <ModulesTab data={data} />}
            {tab === "ritual"   && <RitualTab data={data} />}
            {tab === "live"     && <LiveFeedTab events={recentEvents} newEventIds={newEventIds} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Tab Views ──────────────────────────────────────────────────────────────── */

function OverviewTab({ data, displayTotal, days }: { data: TelemetrySummary; displayTotal: number; days: number }) {
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
            EVENTS OVER TIME ({days} DAYS)
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

function EventsTab({ data, days }: { data: TelemetrySummary; days: number }) {
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
          <SectionHeader label="DAILY TREND" sub={`Event volume per day over the last ${days} days`} />
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

/* ── Live Feed Tab ──────────────────────────────────────────────────────────── */

const FLASH_KEYFRAMES = `
@keyframes feedFlash {
  0%   { background: rgba(196,97,10,0.22); }
  60%  { background: rgba(196,97,10,0.10); }
  100% { background: transparent; }
}
@keyframes feedSlideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5)  return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function LiveFeedTab({ events, newEventIds }: { events: RecentEvent[]; newEventIds: Set<string> }) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{FLASH_KEYFRAMES}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 3 }}>
            LIVE EVENT FEED
          </div>
          <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>
            Most recent 20 telemetry events · auto-refreshes every 15 s
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(196,97,10,0.08)", border: "1px solid rgba(196,97,10,0.2)",
          borderRadius: 20, padding: "4px 12px",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#C4610A",
            boxShadow: "0 0 6px #C4610A",
            animation: "feedPulse 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#C4610A" }}>LIVE</span>
        </div>
        <style>{`@keyframes feedPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      </div>

      {events.length === 0 ? (
        <EmptyState label="No telemetry events recorded yet. Emit events from SmokeCraft to see them here." />
      ) : (
        <div style={{
          background: SURFACE,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 90px 110px",
            gap: "0 12px",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
            color: "rgba(245,237,216,0.25)",
          }}>
            <span>EVENT TYPE</span>
            <span>MODULE</span>
            <span>VENUE</span>
            <span style={{ textAlign: "right" }}>TIME</span>
          </div>

          {events.map((ev) => {
            const isNew = newEventIds.has(ev.id);
            return (
              <div
                key={ev.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 110px",
                  gap: "0 12px",
                  padding: "11px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  alignItems: "center",
                  animation: isNew
                    ? "feedFlash 1.8s ease-out forwards, feedSlideIn 0.25s ease-out"
                    : undefined,
                }}
              >
                <span style={{
                  fontSize: 12, fontFamily: "monospace",
                  color: isNew ? "#D48B00" : "#F5EDD8",
                  fontWeight: isNew ? 600 : 400,
                  transition: "color 0.4s",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ev.eventType}
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(245,237,216,0.35)",
                  fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ev.moduleId ? ev.moduleId.slice(0, 8) + "…" : "—"}
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(245,237,216,0.35)",
                  fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ev.venueId ? ev.venueId.slice(0, 8) + "…" : "—"}
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(245,237,216,0.3)",
                  textAlign: "right", whiteSpace: "nowrap",
                }}>
                  {formatRelative(ev.occurredAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
