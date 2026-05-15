/**
 * E.A.T. Engine Dashboard — /novee/eat-engine
 *
 * Shows internal telemetry from the NOVEE OS kernel:
 *  - Total events counter (animated)
 *  - Events over time (line chart — configurable date range)
 *  - Top event types (bar chart)
 *  - Per-module usage (horizontal bars)
 *  - Ritual Engagement metric (ratio of build-completions to swipe-starts)
 *  - Compare mode: overlay two date ranges with delta % badges
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { apiFetch } from "@/lib/api";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const raw = token.split(".")[1] ?? "";
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      raw.length + ((4 - (raw.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJwtRole(): string | null {
  const token =
    localStorage.getItem("axiom_jwt") ??
    localStorage.getItem("novee_admin_token") ??
    "";
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.role === "string" ? payload.role : null;
}

function buildCsvContent(data: TelemetrySummary, days: number): string {
  const rows: string[] = [];

  rows.push("# E.A.T. Engine Telemetry Export");
  rows.push(`# Date range: last ${days} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");

  rows.push("## Daily Counts");
  rows.push("date,events");
  for (const d of data.dailyCounts) {
    rows.push(`${d.day},${d.cnt}`);
  }
  rows.push("");

  rows.push("## Top Event Types");
  rows.push("event_type,count");
  for (const e of data.topEventTypes) {
    rows.push(`"${e.event_type.replace(/"/g, '""')}",${e.cnt}`);
  }
  rows.push("");

  rows.push("## Module Usage");
  rows.push("module_name,module_slug,event_count");
  for (const m of data.moduleUsage) {
    rows.push(`"${m.module_name.replace(/"/g, '""')}","${m.module_slug}",${m.event_count}`);
  }
  rows.push("");

  rows.push("## Summary");
  rows.push("metric,value");
  rows.push(`total_events,${data.total}`);
  rows.push(`ritual_engagement_pct,${data.ritualEngagement}`);

  return rows.join("\r\n");
}

function buildComparisonCsvContent(
  data: TelemetrySummary,
  days: number,
  compareDays: number,
): string {
  const cmp = data.comparison;
  const primaryLabel = `Primary: last ${days} day(s)`;
  const compareLabel = `Compare: last ${compareDays} day(s)`;
  const rows: string[] = [];

  rows.push("# E.A.T. Engine Comparison Export");
  rows.push(`# Primary window: last ${days} day(s)`);
  rows.push(`# Comparison window: last ${compareDays} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");

  // ── Daily Counts ──────────────────────────────────────────────────────────
  rows.push("## Daily Counts");
  const maxLen = Math.max(
    data.dailyCounts.length,
    cmp ? cmp.dailyCounts.length : 0,
  );
  const unequalWindows = days !== compareDays;
  if (unequalWindows) {
    rows.push(`primary_date,comparison_date,"${primaryLabel}","${compareLabel}",delta_pct`);
  } else {
    rows.push(`date,"${primaryLabel}","${compareLabel}",delta_pct`);
  }
  for (let i = 0; i < maxLen; i++) {
    const primary = data.dailyCounts[i];
    const comparison = cmp?.dailyCounts[i];
    const primaryCnt = primary?.cnt ?? 0;
    const comparisonCnt = comparison?.cnt ?? 0;
    const deltaPct =
      comparisonCnt === 0
        ? ""
        : String(Math.round(((primaryCnt - comparisonCnt) / comparisonCnt) * 100));
    if (unequalWindows) {
      rows.push(`${primary?.day ?? ""},${comparison?.day ?? ""},${primaryCnt},${comparisonCnt},${deltaPct}`);
    } else {
      rows.push(`${primary?.day ?? ""},${primaryCnt},${comparisonCnt},${deltaPct}`);
    }
  }
  rows.push("");

  // ── Top Event Types — Primary ─────────────────────────────────────────────
  rows.push(`## Top Event Types — ${primaryLabel}`);
  rows.push("event_type,count");
  for (const e of data.topEventTypes) {
    rows.push(`"${e.event_type.replace(/"/g, '""')}",${e.cnt}`);
  }
  rows.push("");

  // ── Top Event Types — Comparison ──────────────────────────────────────────
  rows.push(`## Top Event Types — ${compareLabel}`);
  rows.push("event_type,count");
  if (cmp) {
    for (const e of cmp.topEventTypes) {
      rows.push(`"${e.event_type.replace(/"/g, '""')}",${e.cnt}`);
    }
  }
  rows.push("");

  // ── Module Usage — Primary ────────────────────────────────────────────────
  rows.push(`## Module Usage — ${primaryLabel}`);
  rows.push("module_name,module_slug,event_count");
  for (const m of data.moduleUsage) {
    rows.push(`"${m.module_name.replace(/"/g, '""')}","${m.module_slug}",${m.event_count}`);
  }
  rows.push("");

  // ── Module Usage — Comparison ─────────────────────────────────────────────
  rows.push(`## Module Usage — ${compareLabel}`);
  rows.push("module_name,module_slug,event_count");
  if (cmp) {
    for (const m of cmp.moduleUsage) {
      rows.push(`"${m.module_name.replace(/"/g, '""')}","${m.module_slug}",${m.event_count}`);
    }
  }
  rows.push("");

  // ── Summary ───────────────────────────────────────────────────────────────
  rows.push("## Summary");
  rows.push(`metric,"${primaryLabel}","${compareLabel}",delta_pct`);
  const totalDelta =
    cmp && cmp.total > 0
      ? String(Math.round(((data.total - cmp.total) / cmp.total) * 100))
      : "";
  rows.push(`total_events,${data.total},${cmp?.total ?? ""},${totalDelta}`);
  const ritualDelta =
    cmp && cmp.ritualEngagement > 0
      ? String(
          Math.round(
            ((data.ritualEngagement - cmp.ritualEngagement) / cmp.ritualEngagement) * 100,
          ),
        )
      : "";
  rows.push(
    `ritual_engagement_pct,${data.ritualEngagement},${cmp?.ritualEngagement ?? ""},${ritualDelta}`,
  );

  return rows.join("\r\n");
}

function triggerCsvDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

interface TelemetryWindowSummary {
  total: number;
  dailyCounts: { day: string; cnt: number }[];
  topEventTypes: { event_type: string; cnt: number }[];
  moduleUsage: { module_name: string; module_slug: string; event_count: number }[];
  ritualEngagement: number;
}

interface TelemetrySummary extends TelemetryWindowSummary {
  comparison: TelemetryWindowSummary | null;
}

interface RecentEvent {
  id: string;
  eventType: string;
  moduleId: string | null;
  venueId: string | null;
  occurredAt: string;
}

interface ProductItem {
  card_id: string;
  title: string | null;
  craft_type: string | null;
  adds: number;
  skips: number;
  total: number;
}

type CraftFilter = "all" | "smoke" | "pour" | "brew" | "vape";

const CRAFT_FILTERS: { id: CraftFilter; label: string; color: string }[] = [
  { id: "all",   label: "ALL",   color: "#C4610A" },
  { id: "smoke", label: "SMOKE", color: "#8B5CF6" },
  { id: "pour",  label: "POUR",  color: "#3B82F6" },
  { id: "brew",  label: "BREW",  color: "#D97706" },
  { id: "vape",  label: "VAPE",  color: "#10B981" },
];

const CRAFT_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  smoke: { bg: "rgba(139,92,246,0.15)", text: "#A78BFA" },
  pour:  { bg: "rgba(59,130,246,0.15)", text: "#60A5FA" },
  brew:  { bg: "rgba(217,119,6,0.15)",  text: "#FCD34D" },
  vape:  { bg: "rgba(16,185,129,0.15)", text: "#34D399" },
};

const EMPTY_SUMMARY: TelemetrySummary = {
  total: 0,
  dailyCounts: [],
  topEventTypes: [],
  moduleUsage: [],
  ritualEngagement: 0,
  comparison: null,
};

const ACCENT      = "#C4610A";
const ACCENT_DIM  = "rgba(196,97,10,0.35)";
const COMPARE_COLOR = "#4A90D9";
const SURFACE     = "rgba(24,24,25,0.85)";

type DashTab = "overview" | "events" | "modules" | "ritual" | "live" | "products";

const POLL_INTERVAL_MS = 15_000;

const PRESET_OPTIONS = [
  { label: "7D",  days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const EAT_LS_KEY         = "eat_dashboard_days";
const EAT_LS_COMPARE_KEY = "eat_dashboard_compare";
const EAT_LS_COMPARE_DAYS_KEY = "eat_dashboard_compare_days";

function parseDaysFromSearch(search: string): number {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = parseInt(params.get("days") ?? "", 10);
    if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 365);
  } catch { /* ignore */ }
  try {
    const stored = parseInt(localStorage.getItem(EAT_LS_KEY) ?? "", 10);
    if (Number.isFinite(stored) && stored > 0) return Math.min(stored, 365);
  } catch { /* ignore */ }
  return 30;
}

function parseCompareFromSearch(search: string): boolean {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    if (params.has("compare")) return params.get("compare") === "1";
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem(EAT_LS_COMPARE_KEY);
    if (stored !== null) return stored === "1";
  } catch { /* ignore */ }
  return false;
}

function parseCompareDaysFromSearch(search: string, fallbackDays: number): number {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = parseInt(params.get("compareDays") ?? "", 10);
    if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 365);
  } catch { /* ignore */ }
  try {
    const stored = parseInt(localStorage.getItem(EAT_LS_COMPARE_DAYS_KEY) ?? "", 10);
    if (Number.isFinite(stored) && stored > 0) return Math.min(stored, 365);
  } catch { /* ignore */ }
  return fallbackDays;
}

function deltaPercent(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

export default function EATDashboard() {
  const [, navigate] = useLocation();

  const [userRole] = useState<string | null>(() => parseJwtRole());

  const [days, setDaysState] = useState<number>(() => parseDaysFromSearch(window.location.search));
  const [customInput, setCustomInput]   = useState<string>("");
  const [showCustom, setShowCustom]     = useState(false);

  const [compareEnabled, setCompareEnabledState] = useState<boolean>(
    () => parseCompareFromSearch(window.location.search),
  );
  const [compareDays, setCompareDaysState] = useState<number>(
    () => parseCompareDaysFromSearch(window.location.search, parseDaysFromSearch(window.location.search)),
  );
  const [compareCustomInput, setCompareCustomInput] = useState<string>("");
  const [showCompareCustom, setShowCompareCustom]   = useState(false);

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

  const [unreadCount, setUnreadCount]       = useState(0);
  const tabRef                              = useRef<DashTab>(tab);

  const [products, setProducts]             = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [craftFilter, setCraftFilter]       = useState<CraftFilter>("all");

  // Keep tabRef in sync so fetchRecentEvents can read current tab without
  // needing it as a dependency (which would restart the poll on every tab change).
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const setDays = useCallback((n: number) => {
    setDaysState(n);
    try { localStorage.setItem(EAT_LS_KEY, String(n)); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("days", String(n));
    window.history.replaceState({}, "", url.toString());
  }, []);

  const setCompareEnabled = useCallback((enabled: boolean) => {
    setCompareEnabledState(enabled);
    try { localStorage.setItem(EAT_LS_COMPARE_KEY, enabled ? "1" : "0"); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set("compare", "1");
      const cd = parseInt(url.searchParams.get("compareDays") ?? "", 10);
      if (!Number.isFinite(cd) || cd <= 0) {
        url.searchParams.set("compareDays", String(compareDays));
      }
    } else {
      url.searchParams.delete("compare");
      url.searchParams.delete("compareDays");
    }
    window.history.replaceState({}, "", url.toString());
  }, [compareDays]);

  const setCompareDays = useCallback((n: number) => {
    setCompareDaysState(n);
    try { localStorage.setItem(EAT_LS_COMPARE_DAYS_KEY, String(n)); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("compareDays", String(n));
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const search = window.location.search;
      setDaysState(parseDaysFromSearch(search));
      setCompareEnabledState(parseCompareFromSearch(search));
      setCompareDaysState(parseCompareDaysFromSearch(search, parseDaysFromSearch(search)));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const fetchSummary = useCallback((isInitial = false, d = days, cd = compareDays, ce = compareEnabled) => {
    if (isInitial) setLoading(true);
    const compareParam = ce ? `&compareDays=${cd}` : "";
    apiFetch<TelemetrySummary>(`/telemetry/summary?days=${d}${compareParam}`)
      .then((res) => { setData(res); setLastUpdated(new Date()); setStale(false); })
      .catch(() => { if (!isInitial) setStale(true); else setData(EMPTY_SUMMARY); })
      .finally(() => { if (isInitial) setLoading(false); });
  }, [days, compareDays, compareEnabled]);

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
            if (tabRef.current !== "live") {
              setUnreadCount((c) => c + freshIds.size);
            }
          }
        }

        prevEventIdsRef.current = incomingIds;
        setRecentEvents(events);
      })
      .catch(() => { /* silent */ });
  }, []);

  const fetchProducts = useCallback((d = days, cf: CraftFilter = craftFilter) => {
    setProductsLoading(true);
    const craftParam = cf !== "all" ? `&craftType=${cf}` : "";
    apiFetch<{ products: ProductItem[] }>(`/telemetry/products?days=${d}${craftParam}`)
      .then(({ products: p }) => { setProducts(p); })
      .catch(() => { /* silent */ })
      .finally(() => setProductsLoading(false));
  }, [days, craftFilter]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    fetchSummary(true, days, compareDays, compareEnabled);
    fetchRecentEvents();
    pollRef.current = setInterval(() => {
      fetchSummary(false, days, compareDays, compareEnabled);
      fetchRecentEvents();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [days, compareDays, compareEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "products") fetchProducts(days, craftFilter);
  }, [tab, days, craftFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleCompareCustomSubmit = () => {
    const n = parseInt(compareCustomInput, 10);
    if (Number.isFinite(n) && n > 0) {
      setCompareDays(Math.min(n, 365));
      setShowCompareCustom(false);
      setCompareCustomInput("");
    }
  };

  const isCustomActive        = !PRESET_OPTIONS.some((p) => p.days === days);
  const isCompareCustomActive = !PRESET_OPTIONS.some((p) => p.days === compareDays);

  const TABS: { id: DashTab; label: string }[] = [
    { id: "overview",  label: "OVERVIEW" },
    { id: "events",    label: "EVENTS" },
    { id: "modules",   label: "MODULES" },
    { id: "ritual",    label: "RITUAL" },
    { id: "products",  label: "TOP PRODUCTS" },
    { id: "live",      label: "● LIVE FEED" },
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

        {/* Center: primary range + compare controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Primary range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginRight: 2 }}>RANGE</span>
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

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

          {/* Compare toggle */}
          <button
            onClick={() => setCompareEnabled(!compareEnabled)}
            style={{
              background: compareEnabled ? "rgba(74,144,217,0.18)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${compareEnabled ? "rgba(74,144,217,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 5, padding: "4px 11px",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              color: compareEnabled ? "#4A90D9" : "rgba(245,237,216,0.4)",
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span style={{ fontSize: 8 }}>⇄</span>
            COMPARE
          </button>

          {/* Comparison range picker */}
          {compareEnabled && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              background: "rgba(74,144,217,0.06)",
              border: "1px solid rgba(74,144,217,0.15)",
              borderRadius: 7, padding: "4px 10px",
            }}>
              <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(74,144,217,0.6)", marginRight: 2 }}>VS</span>
              {PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => { setCompareDays(opt.days); setShowCompareCustom(false); }}
                  style={{
                    background: compareDays === opt.days ? "rgba(74,144,217,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${compareDays === opt.days ? "rgba(74,144,217,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 5, padding: "3px 9px",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    color: compareDays === opt.days ? "#4A90D9" : "rgba(245,237,216,0.4)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowCompareCustom((v) => !v)}
                style={{
                  background: isCompareCustomActive ? "rgba(74,144,217,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isCompareCustomActive ? "rgba(74,144,217,0.5)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 5, padding: "3px 9px",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                  color: isCompareCustomActive ? "#4A90D9" : "rgba(245,237,216,0.4)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {isCompareCustomActive ? `${compareDays}D` : "CUSTOM"}
              </button>
              {showCompareCustom && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={compareCustomInput}
                    onChange={(e) => setCompareCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCompareCustomSubmit()}
                    placeholder="days"
                    autoFocus
                    style={{
                      width: 58, padding: "4px 8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(74,144,217,0.35)",
                      borderRadius: 5, color: "#F5EDD8",
                      fontSize: 11, outline: "none",
                    }}
                  />
                  <button
                    onClick={handleCompareCustomSubmit}
                    style={{
                      background: "rgba(74,144,217,0.2)", border: "1px solid rgba(74,144,217,0.45)",
                      borderRadius: 5, padding: "4px 8px",
                      fontSize: 10, color: "#4A90D9", cursor: "pointer",
                    }}
                  >
                    GO
                  </button>
                </div>
              )}
              <span style={{ fontSize: 9, color: "rgba(74,144,217,0.45)", letterSpacing: "0.1em" }}>
                PRIOR WINDOW
              </span>
            </div>
          )}
        </div>

        {/* Right: meta + export */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(userRole === "admin" || userRole === "super_admin") && !loading && compareEnabled && data.comparison && (
              <button
                onClick={() => {
                  const csv = buildComparisonCsvContent(data, days, compareDays);
                  triggerCsvDownload(csv, `eat-export-${days}d-vs-${compareDays}d.csv`);
                }}
                title={`Export ${days}d vs ${compareDays}d comparison as CSV`}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(74,144,217,0.12)",
                  border: "1px solid rgba(74,144,217,0.35)",
                  borderRadius: 5, padding: "4px 11px",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  color: "#4A90D9", cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,144,217,0.22)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,144,217,0.6)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,144,217,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,144,217,0.35)";
                }}
              >
                <span style={{ fontSize: 11 }}>↓</span>
                EXPORT COMPARISON
              </button>
            )}
            {(userRole === "admin" || userRole === "super_admin") && !loading && (
              <button
                onClick={() => {
                  const csv = buildCsvContent(data, days);
                  const today = new Date().toISOString().slice(0, 10);
                  triggerCsvDownload(csv, `eat-telemetry-${days}d-${today}.csv`);
                }}
                title={`Export last ${days} day(s) as CSV`}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(196,97,10,0.12)",
                  border: "1px solid rgba(196,97,10,0.35)",
                  borderRadius: 5, padding: "4px 11px",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  color: "#C4610A", cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,97,10,0.22)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,97,10,0.6)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,97,10,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,97,10,0.35)";
                }}
              >
                <span style={{ fontSize: 11 }}>↓</span>
                EXPORT CSV
              </button>
            )}
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.25)" }}>
              INTERNAL
            </div>
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
            onClick={() => {
              setTab(t.id);
              if (t.id === "live") setUnreadCount(0);
            }}
            style={{ position: "relative" }}
          >
            {t.label}
            {t.id === "live" && unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: 6,
                right: 4,
                minWidth: 18,
                height: 18,
                padding: "0 4px",
                borderRadius: 9,
                background: "#C4610A",
                color: "#F5EDD8",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                pointerEvents: "none",
              }}>
                +{unreadCount > 99 ? "99" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main style={{ padding: "32px 28px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab
                data={data}
                displayTotal={displayTotal}
                days={days}
                compareEnabled={compareEnabled}
                compareDays={compareDays}
              />
            )}
            {tab === "events"   && (
              <EventsTab
                data={data}
                days={days}
                compareEnabled={compareEnabled}
                compareDays={compareDays}
              />
            )}
            {tab === "modules"   && <ModulesTab data={data} compareEnabled={compareEnabled} compareDays={compareDays} />}
            {tab === "ritual"    && <RitualTab data={data} compareEnabled={compareEnabled} compareDays={compareDays} />}
            {tab === "products"  && <ProductsTab products={products} loading={productsLoading} days={days} craftFilter={craftFilter} onCraftFilter={setCraftFilter} />}
            {tab === "live"      && <LiveFeedTab events={recentEvents} newEventIds={newEventIds} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Delta badge ─────────────────────────────────────────────────────────────── */

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  if (prior === 0) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 4, padding: "2px 6px",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        color: "rgba(245,237,216,0.3)",
      }}>
        —
      </div>
    );
  }
  const pct = deltaPercent(current, prior)!;
  const up = pct >= 0;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: up ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
      border: `1px solid ${up ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
      borderRadius: 4, padding: "2px 6px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      color: up ? "#4ade80" : "#f87171",
    }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </div>
  );
}

/* ── Merged daily chart data ─────────────────────────────────────────────────── */
// The backend zero-fills every window with generate_series, so each daily
// array has exactly `windowDays` entries in ascending calendar order.
// We align the two series from their trailing (most-recent) end so that
// position 0 on the chart corresponds to the latest day of each window and
// position N-1 corresponds to the earliest — making "this period vs prior
// period" visually intuitive regardless of window lengths.

function mergeChartData(
  primary: { day: string; cnt: number }[],
  comparison: { day: string; cnt: number }[] | undefined,
): { label: string; primary: number; comparison?: number }[] {
  if (!comparison || comparison.length === 0) {
    // No comparison: show primary oldest→newest, label by MM-DD date
    return primary.map((p) => ({ label: p.day.slice(5), primary: p.cnt }));
  }

  // Both arrays are zero-filled oldest→newest.
  // Reverse and pair from the trailing (most-recent) end.
  const p = [...primary].reverse();
  const c = [...comparison].reverse();
  const len = Math.max(p.length, c.length);

  const result: { label: string; primary: number; comparison?: number }[] = [];
  for (let i = 0; i < len; i++) {
    result.push({
      label: `D-${i}`,
      primary: p[i]?.cnt ?? 0,
      comparison: c[i]?.cnt ?? 0,
    });
  }
  // Reverse back so oldest is on the left of the chart
  return result.reverse();
}

/* ── Tab Views ──────────────────────────────────────────────────────────────── */

function OverviewTab({
  data,
  displayTotal,
  days,
  compareEnabled,
  compareDays,
}: {
  data: TelemetrySummary;
  displayTotal: number;
  days: number;
  compareEnabled: boolean;
  compareDays: number;
}) {
  const cmp = compareEnabled ? data.comparison : null;

  const kpis = [
    {
      label: "TOTAL EVENTS",
      value: displayTotal.toLocaleString(),
      raw: data.total,
      cmpRaw: cmp?.total,
      accent: true,
    },
    {
      label: "RITUAL ENGAGEMENT",
      value: `${data.ritualEngagement}%`,
      raw: data.ritualEngagement,
      cmpRaw: cmp?.ritualEngagement,
      accent: false,
    },
    {
      label: "ACTIVE MODULES",
      value: String(data.moduleUsage.length),
      raw: data.moduleUsage.length,
      cmpRaw: cmp?.moduleUsage.length,
      accent: false,
    },
    {
      label: "EVENT TYPES",
      value: String(data.topEventTypes.length),
      raw: data.topEventTypes.length,
      cmpRaw: cmp?.topEventTypes.length,
      accent: false,
    },
  ];

  const chartData = mergeChartData(data.dailyCounts, cmp?.dailyCounts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {kpis.map((kpi) => (
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
            {cmp && kpi.cmpRaw !== undefined && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <DeltaBadge current={kpi.raw} prior={kpi.cmpRaw} />
                <span style={{ fontSize: 9, color: "rgba(245,237,216,0.25)", letterSpacing: "0.1em" }}>
                  vs {kpi.cmpRaw.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Line chart */}
      {data.dailyCounts.length > 0 ? (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)", marginBottom: 16 }}>
            EVENTS OVER TIME ({days} DAYS{cmp ? ` vs PRIOR ${compareDays}D` : ""})
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
              <YAxis tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#1A1A1B", border: "1px solid rgba(196,97,10,0.3)", borderRadius: 6, fontSize: 11 }} />
              {cmp && <Legend wrapperStyle={{ fontSize: 9, color: "rgba(245,237,216,0.4)" }} />}
              <Line
                type="monotone"
                dataKey="primary"
                name={`Primary (${days}D)`}
                stroke={ACCENT}
                strokeWidth={1.5}
                dot={false}
              />
              {cmp && (
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={`Compare (${compareDays}D prior)`}
                  stroke={COMPARE_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              )}
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

function EventsTab({
  data,
  days,
  compareEnabled,
  compareDays,
}: {
  data: TelemetrySummary;
  days: number;
  compareEnabled: boolean;
  compareDays: number;
}) {
  const cmp = compareEnabled ? data.comparison : null;
  const chartData = mergeChartData(data.dailyCounts, cmp?.dailyCounts);

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

      {/* Daily trend with optional comparison series */}
      {data.dailyCounts.length > 0 && (
        <>
          <SectionHeader
            label="DAILY TREND"
            sub={`Event volume per day over the last ${days} days${cmp ? ` vs prior ${compareDays}D window` : ""}`}
          />
          <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "20px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
                <YAxis tick={{ fill: "rgba(245,237,216,0.25)", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#1A1A1B", border: "1px solid rgba(196,97,10,0.3)", borderRadius: 6, fontSize: 11 }} />
                {cmp && <Legend wrapperStyle={{ fontSize: 9, color: "rgba(245,237,216,0.4)" }} />}
                <Line
                  type="monotone"
                  dataKey="primary"
                  name={`Primary (${days}D)`}
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={{ fill: ACCENT, r: 2 }}
                />
                {cmp && (
                  <Line
                    type="monotone"
                    dataKey="comparison"
                    name={`Compare (${compareDays}D prior)`}
                    stroke={COMPARE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ fill: COMPARE_COLOR, r: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-type delta table when compare is on */}
          {cmp && cmp.topEventTypes.length > 0 && (
            <>
              <SectionHeader label="EVENT TYPE DELTA" sub="Change in event counts between primary and comparison windows" />
              <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 80px 80px",
                  gap: "0 12px", padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
                  color: "rgba(245,237,216,0.25)",
                }}>
                  <span>EVENT TYPE</span>
                  <span style={{ textAlign: "right" }}>PRIMARY</span>
                  <span style={{ textAlign: "right" }}>PRIOR</span>
                  <span style={{ textAlign: "right" }}>DELTA</span>
                </div>
                {data.topEventTypes.map((et) => {
                  const prior = cmp.topEventTypes.find((c) => c.event_type === et.event_type)?.cnt ?? 0;
                  return (
                    <div
                      key={et.event_type}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 80px",
                        gap: "0 12px", padding: "10px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "#F5EDD8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {et.event_type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, textAlign: "right" }}>
                        {et.cnt.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(74,144,217,0.8)", textAlign: "right" }}>
                        {prior.toLocaleString()}
                      </span>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <DeltaBadge current={et.cnt} prior={prior} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ModulesTab({
  data,
  compareEnabled,
  compareDays,
}: {
  data: TelemetrySummary;
  compareEnabled: boolean;
  compareDays: number;
}) {
  const cmp = compareEnabled ? data.comparison : null;
  const allCounts = [
    ...data.moduleUsage.map((m) => m.event_count),
    ...(cmp ? cmp.moduleUsage.map((m) => m.event_count) : []),
  ];
  const maxEvents = Math.max(1, ...allCounts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader label="MODULE USAGE" sub="Event count per registered kernel module" />

      {data.moduleUsage.length === 0 ? (
        <EmptyState label="No module usage data yet." />
      ) : (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {data.moduleUsage.map((m, i) => {
            const cmpModule = cmp?.moduleUsage.find((c) => c.module_slug === m.module_slug);
            const cmpCount  = cmpModule?.event_count ?? 0;
            return (
              <div key={m.module_slug}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#F5EDD8" }}>{m.module_name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cmp && <DeltaBadge current={m.event_count} prior={cmpCount} />}
                    <div style={{ fontSize: 11, color: "rgba(245,237,216,0.5)" }}>{m.event_count.toLocaleString()} events</div>
                  </div>
                </div>
                <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  {/* Comparison bar (behind) */}
                  {cmp && (
                    <div style={{
                      position: "absolute", top: 0, left: 0,
                      height: "100%", borderRadius: 2,
                      width: `${(cmpCount / maxEvents) * 100}%`,
                      background: "rgba(74,144,217,0.35)",
                      transition: "width 0.6s ease",
                    }} />
                  )}
                  {/* Primary bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    height: "100%", borderRadius: 2,
                    width: `${(m.event_count / maxEvents) * 100}%`,
                    background: i === 0 ? ACCENT : ACCENT_DIM,
                    transition: "width 0.6s ease",
                  }} />
                </div>
                {cmp && cmpModule && (
                  <div style={{ fontSize: 9, color: COMPARE_COLOR, marginTop: 3, opacity: 0.6 }}>
                    prior: {cmpCount.toLocaleString()} ({compareDays}D)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RitualTab({
  data,
  compareEnabled,
  compareDays,
}: {
  data: TelemetrySummary;
  compareEnabled: boolean;
  compareDays: number;
}) {
  const r    = data.ritualEngagement;
  const cmp  = compareEnabled ? data.comparison : null;
  const rating = r >= 70 ? "EXCELLENT" : r >= 40 ? "GOOD" : r >= 20 ? "DEVELOPING" : "EARLY";
  const ratingColor = r >= 70 ? "#4ade80" : r >= 40 ? "#C4610A" : r >= 20 ? "#D4AF37" : "#6b7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHeader label="RITUAL ENGAGEMENT" sub="Ratio of craft build completions to swipe-starts — measures how often guests complete a full ritual cycle" />

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
          {cmp && (
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <DeltaBadge current={r} prior={cmp.ritualEngagement} />
              <span style={{ fontSize: 9, color: "rgba(245,237,216,0.3)" }}>vs {cmp.ritualEngagement}% ({compareDays}D)</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 220, background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)" }}>HOW IT'S CALCULATED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Swipe Starts",      type: "swipe_start",    color: "#C4610A" },
              { label: "Build Completions", type: "build_complete", color: "#4ade80" },
            ].map((row) => {
              const match    = data.topEventTypes.find((e) => e.event_type === row.type);
              const cmpMatch = cmp?.topEventTypes.find((e) => e.event_type === row.type);
              return (
                <div key={row.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "rgba(245,237,216,0.6)" }}>{row.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: row.color }}>{(match?.cnt ?? 0).toLocaleString()}</div>
                    {cmp && <DeltaBadge current={match?.cnt ?? 0} prior={cmpMatch?.cnt ?? 0} />}
                  </div>
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {cmp && (
              <span style={{ fontSize: 9, color: COMPARE_COLOR, letterSpacing: "0.08em" }}>
                PRIOR {cmp.ritualEngagement}%
              </span>
            )}
            <div style={{ fontSize: 11, color: "#C4610A" }}>{r}%</div>
          </div>
        </div>
        <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          {/* Comparison bar (behind) */}
          {cmp && (
            <div style={{
              position: "absolute", top: 0, left: 0,
              height: "100%", borderRadius: 4,
              width: `${cmp.ritualEngagement}%`,
              background: `rgba(74,144,217,0.35)`,
              transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
            }} />
          )}
          {/* Primary bar */}
          <div style={{
            position: "absolute", top: 0, left: 0,
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

/* ── Top Products Tab ───────────────────────────────────────────────────────── */

const ADD_COLOR   = "#4ade80";
const SKIP_COLOR  = "#f87171";

function hexToRgbStr(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

function ProductsTab({
  products,
  loading,
  days,
  craftFilter,
  onCraftFilter,
}: {
  products: ProductItem[];
  loading: boolean;
  days: number;
  craftFilter: CraftFilter;
  onCraftFilter: (cf: CraftFilter) => void;
}) {
  const activeFilterConfig = CRAFT_FILTERS.find((f) => f.id === craftFilter) ?? CRAFT_FILTERS[0]!;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "rgba(245,237,216,0.3)" }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "2px solid rgba(196,97,10,0.3)",
          borderTopColor: "#C4610A",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 11, letterSpacing: "0.2em" }}>LOADING PRODUCT DATA</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        label="TOP PRODUCTS"
        sub={`Ranked by swipe interactions (adds + skips) over the last ${days} day${days === 1 ? "" : "s"}`}
      />

      {/* Craft type filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginRight: 4 }}>CRAFT</span>
        {CRAFT_FILTERS.map((f) => {
          const isActive = craftFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onCraftFilter(f.id)}
              style={{
                background: isActive ? `rgba(${hexToRgbStr(f.color)},0.18)` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? f.color : "rgba(255,255,255,0.08)"}`,
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                color: isActive ? f.color : "rgba(245,237,216,0.4)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          );
        })}
        {craftFilter !== "all" && (
          <span style={{ fontSize: 9, color: activeFilterConfig.color, letterSpacing: "0.1em", marginLeft: 4, opacity: 0.7 }}>
            filtered
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState label={craftFilter === "all"
          ? "No swipe_add or swipe_skip events with cardId found in this window. Swipe interactions will appear here once guests engage with the experience."
          : `No ${craftFilter.toUpperCase()} products found in this window.`}
        />
      ) : (
        <>
          {/* Legend */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: ADD_COLOR }} />
              <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(245,237,216,0.45)" }}>ADDS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: SKIP_COLOR }} />
              <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(245,237,216,0.45)" }}>SKIPS</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(245,237,216,0.25)", letterSpacing: "0.1em", marginLeft: "auto" }}>
              {products.length} product{products.length !== 1 ? "s" : ""} tracked
            </div>
          </div>

          <div style={{
            background: SURFACE,
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr 72px 60px 60px 60px 140px",
              gap: "0 12px",
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
              color: "rgba(245,237,216,0.25)",
            }}>
              <span>#</span>
              <span>PRODUCT</span>
              <span>CRAFT</span>
              <span style={{ textAlign: "right" }}>ADDS</span>
              <span style={{ textAlign: "right" }}>SKIPS</span>
              <span style={{ textAlign: "right" }}>TOTAL</span>
              <span style={{ textAlign: "center" }}>ADD RATIO</span>
            </div>

            {products.map((p, i) => {
              const addRatio  = p.total > 0 ? (p.adds / p.total) * 100 : 0;
              const isTop     = i === 0;
              const label     = p.title ?? p.card_id;
              const rowKey    = `${p.card_id}|${p.title ?? ""}|${p.craft_type ?? ""}`;
              const ct        = p.craft_type?.toLowerCase() ?? null;
              const badgeStyle = ct && CRAFT_BADGE_COLORS[ct] ? CRAFT_BADGE_COLORS[ct]! : null;

              return (
                <div
                  key={rowKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 72px 60px 60px 60px 140px",
                    gap: "0 12px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                    background: isTop ? "rgba(196,97,10,0.04)" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isTop ? "rgba(196,97,10,0.04)" : "transparent"; }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: isTop ? "rgba(196,97,10,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isTop ? "rgba(196,97,10,0.4)" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: isTop ? "#C4610A" : "rgba(245,237,216,0.35)",
                  }}>
                    {i + 1}
                  </div>

                  {/* Title */}
                  <div style={{ overflow: "hidden" }}>
                    <div style={{
                      fontSize: 13, fontWeight: isTop ? 600 : 400,
                      color: isTop ? "#F5EDD8" : "rgba(245,237,216,0.75)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {label}
                    </div>
                    {p.title && (
                      <div style={{ fontSize: 9, color: "rgba(245,237,216,0.25)", fontFamily: "monospace", marginTop: 2 }}>
                        {p.card_id}
                      </div>
                    )}
                  </div>

                  {/* Craft type badge */}
                  <div>
                    {badgeStyle ? (
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                        background: badgeStyle.bg,
                        color: badgeStyle.text,
                      }}>
                        {ct!.toUpperCase()}
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, color: "rgba(245,237,216,0.2)" }}>—</span>
                    )}
                  </div>

                  {/* Adds */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: ADD_COLOR, textAlign: "right" }}>
                    {p.adds.toLocaleString()}
                  </div>

                  {/* Skips */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: SKIP_COLOR, textAlign: "right" }}>
                    {p.skips.toLocaleString()}
                  </div>

                  {/* Total */}
                  <div style={{ fontSize: 13, color: "rgba(245,237,216,0.5)", textAlign: "right" }}>
                    {p.total.toLocaleString()}
                  </div>

                  {/* Add ratio bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: addRatio >= 50 ? ADD_COLOR : SKIP_COLOR, letterSpacing: "0.08em" }}>
                        {Math.round(addRatio)}% add
                      </span>
                    </div>
                    <div style={{ height: 5, background: "rgba(248,113,113,0.25)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${addRatio}%`,
                        background: `linear-gradient(90deg, rgba(74,222,128,0.6), ${ADD_COLOR})`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
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

const LIVE_FEED_FILTER_TYPES_KEY = "eat_live_feed_filter_types";
const LIVE_FEED_FILTER_MODULE_KEY = "eat_live_feed_filter_module";

function readSessionSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}

function writeSessionSet(key: string, s: Set<string>): void {
  try { sessionStorage.setItem(key, JSON.stringify([...s])); } catch { /* ignore */ }
}

function readSessionString(key: string): string {
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}

function writeSessionString(key: string, v: string): void {
  try { sessionStorage.setItem(key, v); } catch { /* ignore */ }
}

function buildLiveFeedCsv(events: RecentEvent[]): string {
  const header = "id,event_type,module_id,venue_id,occurred_at";
  const rows = events.map((e) => {
    const escape = (v: string | null) =>
      v === null ? "" : `"${v.replace(/"/g, '""')}"`;
    return [
      escape(e.id),
      escape(e.eventType),
      escape(e.moduleId),
      escape(e.venueId),
      escape(e.occurredAt),
    ].join(",");
  });
  return [header, ...rows].join("\r\n");
}

function triggerLiveFeedCsvDownload(events: RecentEvent[]): void {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `live-feed-${today}.csv`;
  const blob = new Blob([buildLiveFeedCsv(events)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function LiveFeedTab({ events, newEventIds }: { events: RecentEvent[]; newEventIds: Set<string> }) {
  const [, forceRender] = useState(0);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    () => readSessionSet(LIVE_FEED_FILTER_TYPES_KEY),
  );
  const [selectedModule, setSelectedModule] = useState<string>(
    () => readSessionString(LIVE_FEED_FILTER_MODULE_KEY),
  );

  useEffect(() => {
    const timer = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const allEventTypes = Array.from(new Set(events.map((e) => e.eventType))).sort();
  const allModules    = Array.from(new Set(events.map((e) => e.moduleId).filter(Boolean) as string[])).sort();

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      writeSessionSet(LIVE_FEED_FILTER_TYPES_KEY, next);
      return next;
    });
  };

  const handleModuleChange = (mod: string) => {
    setSelectedModule(mod);
    writeSessionString(LIVE_FEED_FILTER_MODULE_KEY, mod);
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(ev.eventType)) return false;
    if (selectedModule && ev.moduleId !== selectedModule) return false;
    return true;
  });

  const activeFilterCount = selectedTypes.size + (selectedModule ? 1 : 0);

  const ghostTypes   = [...selectedTypes].filter((t) => !allEventTypes.includes(t));
  const moduleIsGhost = selectedModule !== "" && !allModules.includes(selectedModule);
  const hasGhostFilters = ghostTypes.length > 0 || moduleIsGhost;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{FLASH_KEYFRAMES}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 3 }}>
            LIVE EVENT FEED
          </div>
          <div style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>
            Most recent 20 telemetry events · auto-refreshes every 15 s
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => filteredEvents.length > 0 && triggerLiveFeedCsvDownload(filteredEvents)}
            disabled={filteredEvents.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: filteredEvents.length > 0 ? "rgba(196,97,10,0.1)" : "rgba(196,97,10,0.04)",
              border: `1px solid ${filteredEvents.length > 0 ? "rgba(196,97,10,0.3)" : "rgba(196,97,10,0.12)"}`,
              borderRadius: 6, padding: "5px 11px",
              cursor: filteredEvents.length > 0 ? "pointer" : "not-allowed",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
              color: filteredEvents.length > 0 ? "#C4610A" : "rgba(196,97,10,0.35)",
              opacity: filteredEvents.length > 0 ? 1 : 0.6,
            }}
          >
            ↓ Export CSV
          </button>
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
        </div>
        <style>{`@keyframes feedPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      </div>

      {/* Filter controls */}
      {events.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
        }}>
          {/* Event type pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", flex: 1 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.25)", marginRight: 2, whiteSpace: "nowrap" }}>
              TYPE
            </span>
            {allEventTypes.map((type) => {
              const active = selectedTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  style={{
                    background: active ? "rgba(196,97,10,0.22)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? "rgba(196,97,10,0.55)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20, padding: "3px 10px",
                    fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "0.08em",
                    color: active ? "#C4610A" : "rgba(245,237,216,0.45)",
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "monospace",
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Module dropdown */}
          {allModules.length > 0 && (
            <>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.25)", whiteSpace: "nowrap" }}>
                  MODULE
                </span>
                <select
                  value={selectedModule}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  style={{
                    background: selectedModule ? "rgba(196,97,10,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedModule ? "rgba(196,97,10,0.45)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 6, padding: "4px 8px",
                    fontSize: 10, color: selectedModule ? "#C4610A" : "rgba(245,237,216,0.45)",
                    cursor: "pointer", outline: "none",
                    fontFamily: "monospace", letterSpacing: "0.05em",
                  }}
                >
                  <option value="">ALL</option>
                  {moduleIsGhost && (
                    <option key="__ghost__" value={selectedModule} disabled>
                      {selectedModule} (not in window)
                    </option>
                  )}
                  {allModules.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Clear button */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSelectedTypes(new Set());
                setSelectedModule("");
                writeSessionSet(LIVE_FEED_FILTER_TYPES_KEY, new Set());
                writeSessionString(LIVE_FEED_FILTER_MODULE_KEY, "");
              }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, padding: "3px 10px",
                fontSize: 9, letterSpacing: "0.14em",
                color: "rgba(245,237,216,0.35)",
                cursor: "pointer", transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              CLEAR ({activeFilterCount})
            </button>
          )}
        </div>
      )}

      {/* Stale filter hint */}
      {hasGhostFilters && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px",
          background: "rgba(196,97,10,0.07)",
          border: "1px solid rgba(196,97,10,0.2)",
          borderRadius: 7,
          fontSize: 10, color: "rgba(196,97,10,0.75)", letterSpacing: "0.08em",
        }}>
          <span style={{ fontSize: 12 }}>⚠</span>
          <span>
            {[
              ghostTypes.length > 0 && `${ghostTypes.join(", ")} not in current window`,
              moduleIsGhost && `module "${selectedModule}" not in current window`,
            ].filter(Boolean).join(" · ")}
            {" — filters still active; clear to show all events"}
          </span>
        </div>
      )}

      {/* Filtered count note */}
      {activeFilterCount > 0 && events.length > 0 && (
        <div style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em" }}>
          Showing {filteredEvents.length} of {events.length} event{events.length !== 1 ? "s" : ""}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState label="No telemetry events recorded yet. Emit events from SmokeCraft to see them here." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState label="No events match the active filters. Try removing a filter pill or clearing all filters." />
      ) : (
        <div style={{
          background: SURFACE,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, overflow: "hidden",
        }}>
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

          {filteredEvents.map((ev) => {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[180, 120, 200].map((h, i) => (
        <div
          key={i}
          style={{
            height: h, background: "rgba(24,24,25,0.6)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 10,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}`}</style>
    </div>
  );
}
