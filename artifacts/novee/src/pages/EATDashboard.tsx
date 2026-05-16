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
  PieChart, Pie,
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

  // ── Top Event Types Comparison ────────────────────────────────────────────
  rows.push("## Top Event Types Comparison");
  rows.push("name,primary_count,comparison_count,delta_pct");
  {
    const cmpEventMap = new Map<string, number>(
      (cmp?.topEventTypes ?? []).map((e) => [e.event_type, e.cnt]),
    );
    const merged = [...data.topEventTypes]
      .map((e) => {
        const comparisonCnt = cmpEventMap.get(e.event_type) ?? 0;
        const deltaPct =
          comparisonCnt === 0
            ? ""
            : String(Math.round(((e.cnt - comparisonCnt) / comparisonCnt) * 100));
        return { name: e.event_type, primary: e.cnt, comparison: comparisonCnt, deltaPct };
      })
      .sort((a, b) => b.primary - a.primary);
    for (const row of merged) {
      rows.push(`"${row.name.replace(/"/g, '""')}",${row.primary},${row.comparison},${row.deltaPct}`);
    }
  }
  rows.push("");

  // ── Module Usage Comparison ───────────────────────────────────────────────
  rows.push("## Module Usage Comparison");
  rows.push("name,primary_count,comparison_count,delta_pct");
  {
    const cmpModuleMap = new Map<string, number>(
      (cmp?.moduleUsage ?? []).map((m) => [m.module_slug, m.event_count]),
    );
    const merged = [...data.moduleUsage]
      .map((m) => {
        const comparisonCnt = cmpModuleMap.get(m.module_slug) ?? 0;
        const deltaPct =
          comparisonCnt === 0
            ? ""
            : String(Math.round(((m.event_count - comparisonCnt) / comparisonCnt) * 100));
        return { name: m.module_name, primary: m.event_count, comparison: comparisonCnt, deltaPct };
      })
      .sort((a, b) => b.primary - a.primary);
    for (const row of merged) {
      rows.push(`"${row.name.replace(/"/g, '""')}",${row.primary},${row.comparison},${row.deltaPct}`);
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

function buildDailyCountsComparisonCsv(
  data: TelemetrySummary,
  days: number,
  compareDays: number,
): string {
  const cmp = data.comparison;
  const primaryLabel = `Primary: last ${days} day(s)`;
  const compareLabel = `Compare: last ${compareDays} day(s)`;
  const rows: string[] = [];
  rows.push("# E.A.T. Engine — Daily Counts Comparison");
  rows.push(`# Primary window: last ${days} day(s)`);
  rows.push(`# Comparison window: last ${compareDays} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");
  const maxLen = Math.max(data.dailyCounts.length, cmp ? cmp.dailyCounts.length : 0);
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
  return rows.join("\r\n");
}

function buildTopEventTypesComparisonCsv(
  data: TelemetrySummary,
  days: number,
  compareDays: number,
): string {
  const cmp = data.comparison;
  const primaryLabel = `Primary: last ${days} day(s)`;
  const compareLabel = `Compare: last ${compareDays} day(s)`;
  const rows: string[] = [];
  rows.push("# E.A.T. Engine — Top Event Types Comparison");
  rows.push(`# Primary window: last ${days} day(s)`);
  rows.push(`# Comparison window: last ${compareDays} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");
  rows.push(`name,"${primaryLabel}","${compareLabel}",delta_pct`);

  // Build a union of all event types from both windows
  const primaryEventMap = new Map<string, number>(
    data.topEventTypes.map((e) => [e.event_type, e.cnt]),
  );
  const cmpEventMap = new Map<string, number>(
    (cmp?.topEventTypes ?? []).map((e) => [e.event_type, e.cnt]),
  );
  const allNames = new Set([...primaryEventMap.keys(), ...cmpEventMap.keys()]);
  const merged = [...allNames]
    .map((name) => {
      const primaryCnt = primaryEventMap.get(name) ?? 0;
      const comparisonCnt = cmpEventMap.get(name) ?? 0;
      const deltaPct =
        comparisonCnt === 0
          ? ""
          : String(Math.round(((primaryCnt - comparisonCnt) / comparisonCnt) * 100));
      return { name, primary: primaryCnt, comparison: comparisonCnt, deltaPct };
    })
    .sort((a, b) => b.primary - a.primary);
  for (const row of merged) {
    rows.push(`"${row.name.replace(/"/g, '""')}",${row.primary},${row.comparison},${row.deltaPct}`);
  }
  return rows.join("\r\n");
}

function buildModuleUsageComparisonCsv(
  data: TelemetrySummary,
  days: number,
  compareDays: number,
): string {
  const cmp = data.comparison;
  const primaryLabel = `Primary: last ${days} day(s)`;
  const compareLabel = `Compare: last ${compareDays} day(s)`;
  const rows: string[] = [];
  rows.push("# E.A.T. Engine — Module Usage Comparison");
  rows.push(`# Primary window: last ${days} day(s)`);
  rows.push(`# Comparison window: last ${compareDays} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");
  rows.push(`name,module_slug,"${primaryLabel}","${compareLabel}",delta_pct`);

  // Build a union of all module slugs from both windows (mirrors ModulesTab ghost-row logic)
  const primaryModuleMap = new Map<string, { name: string; count: number }>(
    data.moduleUsage.map((m) => [m.module_slug, { name: m.module_name, count: m.event_count }]),
  );
  const cmpModuleMap = new Map<string, { name: string; count: number }>(
    (cmp?.moduleUsage ?? []).map((m) => [m.module_slug, { name: m.module_name, count: m.event_count }]),
  );
  const allSlugs = new Set([...primaryModuleMap.keys(), ...cmpModuleMap.keys()]);
  const merged = [...allSlugs]
    .map((slug) => {
      const pri = primaryModuleMap.get(slug);
      const cmpEntry = cmpModuleMap.get(slug);
      const name = pri?.name ?? cmpEntry?.name ?? slug;
      const primaryCnt = pri?.count ?? 0;
      const comparisonCnt = cmpEntry?.count ?? 0;
      const deltaPct =
        comparisonCnt === 0
          ? ""
          : String(Math.round(((primaryCnt - comparisonCnt) / comparisonCnt) * 100));
      return { name, slug, primary: primaryCnt, comparison: comparisonCnt, deltaPct };
    })
    .sort((a, b) => b.primary - a.primary);
  for (const row of merged) {
    rows.push(`"${row.name.replace(/"/g, '""')}","${row.slug}",${row.primary},${row.comparison},${row.deltaPct}`);
  }
  return rows.join("\r\n");
}

function buildProductsCsvContent(
  products: ProductItem[],
  days: number,
  craftFilter: "all" | "smoke" | "pour" | "brew" | "vape" = "all",
  trends?: Map<string, TrendPoint[]>,
): string {
  const rows: string[] = [];

  const filtered = craftFilter === "all" ? products : products.filter((p) => p.craft_type === craftFilter);

  rows.push("# E.A.T. Engine — Top Products Export");
  rows.push(`# Date range: last ${days} day(s)`);
  if (craftFilter !== "all") rows.push(`# Craft filter: ${craftFilter.toUpperCase()}`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");

  rows.push("rank,title,card_id,craft_type,adds,skips,total,add_ratio_pct");
  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i]!;
    const addRatio = p.total > 0 ? Math.round((p.adds / p.total) * 100) : 0;
    const title = (p.title ?? "").replace(/"/g, '""');
    const cardId = p.card_id.replace(/"/g, '""');
    const craftType = (p.craft_type ?? "").replace(/"/g, '""');
    rows.push(`${i + 1},"${title}","${cardId}","${craftType}",${p.adds},${p.skips},${p.total},${addRatio}`);
  }

  if (trends && trends.size > 0) {
    const trendRows: string[] = [];
    for (const p of filtered) {
      const points = trends.get(p.card_id);
      if (!points || points.length === 0) continue;
      const cardId = p.card_id.replace(/"/g, '""');
      for (const pt of points) {
        trendRows.push(`"${cardId}","${pt.day}",${pt.adds},${pt.skips}`);
      }
    }
    if (trendRows.length > 0) {
      rows.push("");
      rows.push("## 7-Day Trend");
      rows.push("card_id,day,adds,skips");
      rows.push(...trendRows);
    }
  }

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
  moduleDailyCounts: Record<string, { day: string; cnt: number }[]>;
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
  payload: Record<string, unknown> | null;
}

interface ProductItem {
  card_id: string;
  title: string | null;
  craft_type: string | null;
  adds: number;
  skips: number;
  total: number;
}

interface TrendPoint {
  day: string;
  adds: number;
  skips: number;
}

interface CraftBreakdownPoint {
  craft_type: string;
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
  moduleDailyCounts: {},
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

const EAT_LS_KEY                  = "eat_dashboard_days";
const EAT_LS_COMPARE_KEY          = "eat_dashboard_compare";
const EAT_LS_COMPARE_DAYS_KEY     = "eat_dashboard_compare_days";
const EAT_LS_PRESETS_KEY          = "eat_dashboard_custom_presets";
const EAT_LS_TAB_KEY              = "eat_dashboard_tab";
const EAT_LS_CRAFT_FILTER_KEY     = "eat_dashboard_craft_filter";

type SavedPreset = { name: string; days: number };

const MAX_SAVED_PRESETS = 3;

function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(EAT_LS_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is SavedPreset =>
          typeof p === "object" && p !== null &&
          typeof p.name === "string" && typeof p.days === "number",
      )
      .slice(0, MAX_SAVED_PRESETS);
  } catch { return []; }
}

function persistSavedPresets(presets: SavedPreset[]): void {
  try { localStorage.setItem(EAT_LS_PRESETS_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

const MUTE_SS_KEY      = "eat_live_mute_until";
const MUTE_DURATION_MS = 5 * 60 * 1000;

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

const VALID_TABS: DashTab[] = ["overview", "events", "modules", "ritual", "products", "live"];

function parseTabFromSearch(search: string): DashTab {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = params.get("tab");
    if (raw && (VALID_TABS as string[]).includes(raw)) return raw as DashTab;
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem(EAT_LS_TAB_KEY);
    if (stored && (VALID_TABS as string[]).includes(stored)) return stored as DashTab;
  } catch { /* ignore */ }
  return "overview";
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

const VALID_CRAFT_FILTERS: CraftFilter[] = ["all", "smoke", "pour", "brew", "vape"];

function parseCraftFilterFromSearch(search: string): CraftFilter {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = params.get("craftType");
    if (raw && (VALID_CRAFT_FILTERS as string[]).includes(raw)) return raw as CraftFilter;
  } catch { /* ignore */ }
  try {
    const stored = localStorage.getItem(EAT_LS_CRAFT_FILTER_KEY);
    if (stored && (VALID_CRAFT_FILTERS as string[]).includes(stored)) return stored as CraftFilter;
  } catch { /* ignore */ }
  return "all";
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
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => loadSavedPresets());
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");

  const [compareEnabled, setCompareEnabledState] = useState<boolean>(
    () => parseCompareFromSearch(window.location.search),
  );
  const [compareDays, setCompareDaysState] = useState<number>(
    () => parseCompareDaysFromSearch(window.location.search, parseDaysFromSearch(window.location.search)),
  );
  const [compareCustomInput, setCompareCustomInput] = useState<string>("");
  const [showCompareCustom, setShowCompareCustom]   = useState(false);

  const [tab, setTabState]        = useState<DashTab>(() => parseTabFromSearch(window.location.search));
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
  // Dot state: visible = should render; fading = transitioning out
  const [liveDotVisible, setLiveDotVisible] = useState(false);
  const [liveDotFading, setLiveDotFading]   = useState(false);
  const lastEventAtRef                      = useRef<number | null>(null);
  const liveDotFadeTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef                              = useRef<DashTab>(tab);

  const [products, setProducts]             = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [craftFilter, setCraftFilterState]  = useState<CraftFilter>(() => parseCraftFilterFromSearch(window.location.search));
  const [productTrends, setProductTrends]   = useState<Map<string, TrendPoint[]>>(new Map());
  const [craftBreakdown, setCraftBreakdown] = useState<CraftBreakdownPoint[]>([]);

  // ── Mute state ────────────────────────────────────────────────────────────
  const [muteUntil, setMuteUntilState] = useState<number | null>(() => {
    try {
      // Do NOT restore mute after a hard page reload — spec says mute should
      // not survive reloads. sessionStorage persists across reloads by default,
      // so we detect a reload navigation and discard any stored value.
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navEntry?.type === "reload") {
        sessionStorage.removeItem(MUTE_SS_KEY);
        return null;
      }
      const v = sessionStorage.getItem(MUTE_SS_KEY);
      if (v) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > Date.now()) return n;
      }
    } catch { /* ignore */ }
    return null;
  });
  const muteUntilRef     = useRef<number | null>(muteUntil);

  const [liveLimit, setLiveLimitState] = useState<LiveLimit>(() => {
    try {
      const v = parseInt(sessionStorage.getItem(LIVE_FEED_LIMIT_SS_KEY) ?? "", 10);
      if ((VALID_LIVE_LIMITS as readonly number[]).includes(v)) return v as LiveLimit;
    } catch { /* ignore */ }
    return 20;
  });
  const liveLimitRef = useRef<number>(liveLimit);

  const longPressRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const muteMenuBtnRef   = useRef<HTMLButtonElement | null>(null);

  // Keep muteUntilRef in sync so fetchRecentEvents can read it without deps.
  useEffect(() => { muteUntilRef.current = muteUntil; }, [muteUntil]);

  // Keep liveLimitRef in sync.
  useEffect(() => { liveLimitRef.current = liveLimit; }, [liveLimit]);

  const setLiveLimit = useCallback((n: LiveLimit) => {
    setLiveLimitState(n);
    liveLimitRef.current = n;
    try { sessionStorage.setItem(LIVE_FEED_LIMIT_SS_KEY, String(n)); } catch { /* ignore */ }
  }, []);

  // Auto-expire the mute when the timer runs out.
  useEffect(() => {
    if (muteUntil === null) return;
    const remaining = muteUntil - Date.now();
    if (remaining <= 0) {
      setMuteUntilState(null);
      try { sessionStorage.removeItem(MUTE_SS_KEY); } catch { /* ignore */ }
      return;
    }
    const id = setTimeout(() => {
      setMuteUntilState(null);
      try { sessionStorage.removeItem(MUTE_SS_KEY); } catch { /* ignore */ }
    }, remaining);
    return () => clearTimeout(id);
  }, [muteUntil]);

  // Close mute menu on outside click.
  useEffect(() => {
    if (!showMuteMenu) return;
    const handler = (e: MouseEvent) => {
      if (muteMenuBtnRef.current && !muteMenuBtnRef.current.contains(e.target as Node)) {
        setShowMuteMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMuteMenu]);

  const isMuted = muteUntil !== null && Date.now() < muteUntil;

  const activateMute = useCallback(() => {
    const until = Date.now() + MUTE_DURATION_MS;
    setMuteUntilState(until);
    muteUntilRef.current = until;
    try { sessionStorage.setItem(MUTE_SS_KEY, String(until)); } catch { /* ignore */ }
    setShowMuteMenu(false);
  }, []);

  const deactivateMute = useCallback(() => {
    setMuteUntilState(null);
    muteUntilRef.current = null;
    try { sessionStorage.removeItem(MUTE_SS_KEY); } catch { /* ignore */ }
    setShowMuteMenu(false);
  }, []);

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
      setTabState(parseTabFromSearch(search));
      setCraftFilterState(parseCraftFilterFromSearch(search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setTab = useCallback((t: DashTab) => {
    setTabState(t);
    try { localStorage.setItem(EAT_LS_TAB_KEY, t); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    if (t === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", t);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const setCraftFilter = useCallback((cf: CraftFilter) => {
    setCraftFilterState(cf);
    try { localStorage.setItem(EAT_LS_CRAFT_FILTER_KEY, cf); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    if (cf === "all") {
      url.searchParams.delete("craftType");
    } else {
      url.searchParams.set("craftType", cf);
    }
    window.history.replaceState({}, "", url.toString());
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
    apiFetch<{ events: RecentEvent[] }>(`/telemetry/recent?limit=${liveLimitRef.current}`)
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
            const muted = muteUntilRef.current !== null && Date.now() < muteUntilRef.current;
            if (tabRef.current !== "live" && !muted) {
              setUnreadCount((c) => c + freshIds.size);
            }
            lastEventAtRef.current = Date.now();
            if (liveDotFadeTimerRef.current) clearTimeout(liveDotFadeTimerRef.current);
            setLiveDotFading(false);
            setLiveDotVisible(true);
          }
        }

        prevEventIdsRef.current = incomingIds;
        setRecentEvents(events);
      })
      .catch(() => { /* silent */ });
  }, []);

  const fetchProducts = useCallback((d = days, cf: CraftFilter = craftFilter) => {
    setProductsLoading(true);
    setProductTrends(new Map());
    const craftParam = cf !== "all" ? `&craftType=${cf}` : "";

    // Fetch breakdown (always unfiltered — shows all crafts regardless of pill)
    setCraftBreakdown([]);
    apiFetch<{ breakdown: CraftBreakdownPoint[] }>(`/telemetry/products/by-craft?days=${d}`)
      .then(({ breakdown }) => setCraftBreakdown(breakdown))
      .catch(() => setCraftBreakdown([]));

    apiFetch<{ products: ProductItem[] }>(`/telemetry/products?days=${d}${craftParam}`)
      .then(({ products: p }) => {
        setProducts(p);
        // Fetch 7-day sparkline trends for all products in a single batch request
        if (p.length === 0) return;
        const TREND_DAYS = 7;
        const cardIds = p.map((item) => item.card_id).join(",");
        apiFetch<{ days: number; trends: Record<string, TrendPoint[]> }>(
          `/telemetry/products/trends/batch?cardIds=${encodeURIComponent(cardIds)}&days=${TREND_DAYS}`,
        ).then(({ trends }) => {
          setProductTrends(new Map(Object.entries(trends)));
        }).catch(() => { /* silent */ });
      })
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
  }, [days, compareDays, compareEnabled, liveLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "products") fetchProducts(days, craftFilter);
  }, [tab, days, craftFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive the "recently active" dot — re-evaluate every 5 s; clears once 60 s
  // has elapsed since the last new event arrived. Fades out gracefully instead
  // of disappearing abruptly.
  useEffect(() => {
    const ACTIVITY_WINDOW_MS = 60_000;
    const FADE_DURATION_MS   = 600;
    const id = setInterval(() => {
      if (lastEventAtRef.current === null) return;
      const elapsed = Date.now() - lastEventAtRef.current;
      if (elapsed >= ACTIVITY_WINDOW_MS) {
        setLiveDotFading(true);
        liveDotFadeTimerRef.current = setTimeout(() => {
          setLiveDotVisible(false);
          setLiveDotFading(false);
        }, FADE_DURATION_MS);
      }
    }, 5_000);
    return () => {
      clearInterval(id);
      if (liveDotFadeTimerRef.current) clearTimeout(liveDotFadeTimerRef.current);
    };
  }, []);

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
      setShowSavePreset(false);
      setPresetNameInput("");
    }
  };

  const handleSavePreset = () => {
    const name = presetNameInput.trim();
    if (!name) return;
    const existing = savedPresets.filter((p) => p.days !== days);
    if (existing.length >= MAX_SAVED_PRESETS) return;
    const updated = [...existing, { name, days }];
    setSavedPresets(updated);
    persistSavedPresets(updated);
    setShowSavePreset(false);
    setPresetNameInput("");
  };

  const handleDeletePreset = (presetDays: number) => {
    const updated = savedPresets.filter((p) => p.days !== presetDays);
    setSavedPresets(updated);
    persistSavedPresets(updated);
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
                onClick={() => { setDays(opt.days); setShowCustom(false); setShowSavePreset(false); }}
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
            {/* Saved named presets */}
            {savedPresets.map((preset) => (
              <div key={preset.days} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <button
                  onClick={() => { setDays(preset.days); setShowCustom(false); setShowSavePreset(false); }}
                  style={{
                    background: days === preset.days ? "rgba(196,97,10,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${days === preset.days ? "rgba(196,97,10,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "5px 0 0 5px", padding: "4px 8px",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    color: days === preset.days ? "#C4610A" : "rgba(245,237,216,0.45)",
                    cursor: "pointer", transition: "all 0.15s", borderRight: "none",
                  }}
                  title={`${preset.days} days`}
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.days)}
                  style={{
                    background: days === preset.days ? "rgba(196,97,10,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${days === preset.days ? "rgba(196,97,10,0.5)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "0 5px 5px 0", padding: "4px 6px",
                    fontSize: 9, color: "rgba(245,237,216,0.3)",
                    cursor: "pointer", transition: "all 0.15s", lineHeight: 1,
                  }}
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => { setShowCustom((v) => !v); setShowSavePreset(false); }}
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
            {/* Save preset button — only visible when a custom day range is active and under the cap */}
            {isCustomActive && !showSavePreset && (
              savedPresets.filter((p) => p.days !== days).length < MAX_SAVED_PRESETS ? (
                <button
                  onClick={() => { setShowSavePreset(true); setPresetNameInput(""); }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px dashed rgba(196,97,10,0.4)",
                    borderRadius: 5, padding: "4px 8px",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    color: "rgba(196,97,10,0.6)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  title={`Save ${days}D as a named preset`}
                >
                  + SAVE PRESET
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 9, letterSpacing: "0.1em",
                    color: "rgba(245,237,216,0.25)",
                    padding: "4px 6px",
                  }}
                  title="Delete a preset to save a new one (max 3)"
                >
                  3/3 PRESETS
                </span>
              )
            )}
            {isCustomActive && showSavePreset && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="text"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePreset();
                    if (e.key === "Escape") { setShowSavePreset(false); setPresetNameInput(""); }
                  }}
                  placeholder="preset name"
                  autoFocus
                  maxLength={24}
                  style={{
                    width: 100, padding: "4px 8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(196,97,10,0.35)",
                    borderRadius: 5, color: "#F5EDD8",
                    fontSize: 11, outline: "none",
                  }}
                />
                <button
                  onClick={handleSavePreset}
                  style={{
                    background: "rgba(196,97,10,0.25)", border: "1px solid rgba(196,97,10,0.5)",
                    borderRadius: 5, padding: "4px 8px",
                    fontSize: 10, color: "#C4610A", cursor: "pointer",
                  }}
                >
                  SAVE
                </button>
                <button
                  onClick={() => { setShowSavePreset(false); setPresetNameInput(""); }}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5, padding: "4px 7px",
                    fontSize: 10, color: "rgba(245,237,216,0.35)", cursor: "pointer",
                  }}
                >
                  ✕
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
            {/* Comparison export: available to any authenticated user (operator+) so venue managers
                can download side-by-side reports. General telemetry exports below remain admin-only. */}
            {userRole !== null && !loading && compareEnabled && data.comparison && (
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
            {(userRole === "admin" || userRole === "super_admin") && tab === "products" && !productsLoading && products.length > 0 && (
              <button
                onClick={() => {
                  const csv = buildProductsCsvContent(products, days, craftFilter, productTrends);
                  const today = new Date().toISOString().slice(0, 10);
                  const craftSegment = craftFilter !== "all" ? `-${craftFilter}` : "";
                  triggerCsvDownload(csv, `eat-products${craftSegment}-${days}d-${today}.csv`);
                }}
                title={`Export top products${craftFilter !== "all" ? ` (${craftFilter.toUpperCase()} only)` : ""} (last ${days} day(s)) as CSV`}
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
            {(userRole === "admin" || userRole === "super_admin") && !loading && tab !== "products" && (
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
        {TABS.map((t) => {
          const isLive = t.id === "live";
          return (
            <button
              key={t.id}
              ref={isLive ? muteMenuBtnRef : undefined}
              className={`novee-tab${tab === t.id ? " active" : ""}`}
              onClick={() => {
                setTab(t.id);
                if (t.id === "live") setUnreadCount(0);
              }}
              onContextMenu={(e) => {
                if (!isLive) return;
                e.preventDefault();
                setShowMuteMenu((v) => !v);
              }}
              onTouchStart={() => {
                if (!isLive) return;
                longPressFiredRef.current = false;
                longPressRef.current = setTimeout(() => {
                  longPressFiredRef.current = true;
                  setShowMuteMenu((v) => !v);
                }, 500);
              }}
              onTouchEnd={(e) => {
                if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
                // Suppress the synthetic click that follows a long-press action.
                if (longPressFiredRef.current) { e.preventDefault(); longPressFiredRef.current = false; }
              }}
              onTouchMove={() => {
                if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
              }}
              style={{ position: "relative" }}
            >
              {t.label}

              {/* Mute icon: shown when muted (replaces unread badge) */}
              {isLive && isMuted && (
                <span
                  title={`Muted — unmutes at ${new Date(muteUntil!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 4,
                    fontSize: 12,
                    lineHeight: 1,
                    pointerEvents: "none",
                    opacity: 0.75,
                  }}
                >
                  🔇
                </span>
              )}

              {/* Unread badge: hidden when muted */}
              {isLive && !isMuted && unreadCount > 0 && (
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

              {isLive && liveDotVisible && (
                <span className={`eat-live-dot${liveDotFading ? " fading" : ""}`} style={{
                  position: "absolute",
                  bottom: 5,
                  right: 5,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4ADE80",
                  pointerEvents: "none",
                }} />
              )}

              {/* Mute context menu */}
              {isLive && showMuteMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    zIndex: 300,
                    background: "#1E1E1F",
                    border: "1px solid rgba(196,97,10,0.3)",
                    borderRadius: 7,
                    padding: "4px 0",
                    minWidth: 160,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {!isMuted ? (
                    <div
                      role="menuitem"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); activateMute(); }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && activateMute()}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        cursor: "pointer",
                        padding: "8px 14px",
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                        color: "#F5EDD8",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(196,97,10,0.15)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "none")}
                    >
                      🔇 &nbsp;MUTE FOR 5 MIN
                    </div>
                  ) : (
                    <div
                      role="menuitem"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); deactivateMute(); }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && deactivateMute()}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        cursor: "pointer",
                        padding: "8px 14px",
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                        color: "#4ADE80",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(74,222,128,0.1)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "none")}
                    >
                      🔔 &nbsp;UNMUTE NOW
                    </div>
                  )}
                  {isMuted && muteUntil && (
                    <div style={{
                      padding: "4px 14px 8px",
                      fontSize: 9, letterSpacing: "0.12em",
                      color: "rgba(245,237,216,0.35)",
                    }}>
                      UNMUTES AT {new Date(muteUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
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
            {tab === "modules"   && <ModulesTab data={data} days={days} compareEnabled={compareEnabled} compareDays={compareDays} />}
            {tab === "ritual"    && <RitualTab data={data} compareEnabled={compareEnabled} compareDays={compareDays} />}
            {tab === "products"  && <ProductsTab products={products} loading={productsLoading} days={days} craftFilter={craftFilter} onCraftFilter={setCraftFilter} trends={productTrends} breakdown={craftBreakdown} />}
            {tab === "live"      && <LiveFeedTab events={recentEvents} newEventIds={newEventIds} liveLimit={liveLimit} onLimitChange={setLiveLimit} />}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)" }}>
              EVENTS OVER TIME ({days} DAYS{cmp ? ` vs PRIOR ${compareDays}D` : ""})
            </div>
            {cmp && (
              <SectionDownloadButton
                title={`Download Daily Counts comparison (${days}D vs ${compareDays}D) as CSV`}
                onClick={() => triggerCsvDownload(
                  buildDailyCountsComparisonCsv(data, days, compareDays),
                  `eat-daily-counts-${days}d-vs-${compareDays}d.csv`,
                )}
              />
            )}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,237,216,0.35)" }}>
              TOP EVENT TYPES
            </div>
            {cmp && (
              <SectionDownloadButton
                title={`Download Top Event Types comparison (${days}D vs ${compareDays}D) as CSV`}
                onClick={() => triggerCsvDownload(
                  buildTopEventTypesComparisonCsv(data, days, compareDays),
                  `eat-event-types-${days}d-vs-${compareDays}d.csv`,
                )}
              />
            )}
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <SectionHeader label="EVENT TYPE BREAKDOWN" sub="Count distribution across all ingested event types" />
        {cmp && data.topEventTypes.length > 0 && (
          <SectionDownloadButton
            title={`Download Top Event Types comparison (${days}D vs ${compareDays}D) as CSV`}
            onClick={() => triggerCsvDownload(
              buildTopEventTypesComparisonCsv(data, days, compareDays),
              `eat-event-types-${days}d-vs-${compareDays}d.csv`,
            )}
          />
        )}
      </div>

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
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <SectionHeader
              label="DAILY TREND"
              sub={`Event volume per day over the last ${days} days${cmp ? ` vs prior ${compareDays}D window` : ""}`}
            />
            {cmp && (
              <SectionDownloadButton
                title={`Download Daily Counts comparison (${days}D vs ${compareDays}D) as CSV`}
                onClick={() => triggerCsvDownload(
                  buildDailyCountsComparisonCsv(data, days, compareDays),
                  `eat-daily-counts-${days}d-vs-${compareDays}d.csv`,
                )}
              />
            )}
          </div>
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

function ModuleSparkline({ points }: { points: { day: string; cnt: number }[] }) {
  const W = 60;
  const H = 20;

  if (!points || points.length < 2) {
    return (
      <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(196,97,10,0.2)" strokeWidth={1} />
      </svg>
    );
  }

  const counts = points.map((p) => p.cnt);
  const maxVal = Math.max(1, ...counts);
  const minVal = Math.min(...counts);
  const range = maxVal - minVal || 1;

  const pad = 2;
  const step = (W - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = pad + ((maxVal - p.cnt) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyPoints = coords.join(" ");

  // Build a closed fill path by adding bottom-right and bottom-left corners
  const lastX = (pad + (points.length - 1) * step).toFixed(1);
  const fillPoints = `${polyPoints} ${lastX},${H} ${pad},${H}`;

  return (
    <svg width={W} height={H} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
      <polygon
        points={fillPoints}
        fill="rgba(196,97,10,0.12)"
        stroke="none"
      />
      <polyline
        points={polyPoints}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
    </svg>
  );
}

function ModulesTab({
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

  // Build a merged module list that includes modules from both windows.
  type MergedModule = {
    module_slug: string;
    module_name: string;
    primaryCount: number;
    cmpCount: number;
    status: "normal" | "new" | "ghost";
  };

  const mergedModules: MergedModule[] = (() => {
    const primaryMap = new Map(
      data.moduleUsage.map((m) => [m.module_slug, m]),
    );
    const cmpMap = new Map(
      (cmp?.moduleUsage ?? []).map((m) => [m.module_slug, m]),
    );

    const seen = new Set<string>();
    const rows: MergedModule[] = [];

    // Primary window rows (including modules also in compare)
    for (const m of data.moduleUsage) {
      seen.add(m.module_slug);
      const cmpCount = cmpMap.get(m.module_slug)?.event_count ?? 0;
      rows.push({
        module_slug: m.module_slug,
        module_name: m.module_name,
        primaryCount: m.event_count,
        cmpCount,
        status: cmp && cmpCount === 0 ? "new" : "normal",
      });
    }

    // Ghost rows: only in compare window
    if (cmp) {
      for (const m of cmp.moduleUsage) {
        if (seen.has(m.module_slug)) continue;
        rows.push({
          module_slug: m.module_slug,
          module_name: primaryMap.get(m.module_slug)?.module_name ?? m.module_name,
          primaryCount: 0,
          cmpCount: m.event_count,
          status: "ghost",
        });
      }
    }

    return rows;
  })();

  const allCounts = mergedModules.map((m) => Math.max(m.primaryCount, m.cmpCount));
  const maxEvents = Math.max(1, ...allCounts);

  const isEmpty = data.moduleUsage.length === 0 && (cmp?.moduleUsage ?? []).length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <SectionHeader label="MODULE USAGE" sub="Event count per registered kernel module" />
        {cmp && !isEmpty && (
          <SectionDownloadButton
            title={`Download Module Usage comparison (${days}D vs ${compareDays}D) as CSV`}
            onClick={() => triggerCsvDownload(
              buildModuleUsageComparisonCsv(data, days, compareDays),
              `eat-module-usage-${days}d-vs-${compareDays}d.csv`,
            )}
          />
        )}
      </div>

      {isEmpty ? (
        <EmptyState label="No module usage data yet." />
      ) : (
        <div style={{ background: SURFACE, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {mergedModules.map((m, i) => {
            const isGhost = m.status === "ghost";
            const isNew   = m.status === "new";
            const rowOpacity = isGhost ? 0.45 : 1;
            const sparkPoints = data.moduleDailyCounts[m.module_slug] ?? [];
            return (
              <div key={m.module_slug} style={{ opacity: rowOpacity }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: isGhost ? "rgba(245,237,216,0.5)" : "#F5EDD8", minWidth: 0, flex: 1, marginRight: 10 }}>
                    {m.module_name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ModuleSparkline points={sparkPoints} />
                    {cmp && isNew && (
                      <div style={{
                        display: "inline-flex", alignItems: "center",
                        background: "rgba(74,222,128,0.1)",
                        border: "1px solid rgba(74,222,128,0.25)",
                        borderRadius: 4, padding: "2px 6px",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                        color: "#4ade80",
                      }}>
                        NEW
                      </div>
                    )}
                    {cmp && !isNew && <DeltaBadge current={m.primaryCount} prior={m.cmpCount} />}
                    <div style={{ fontSize: 11, color: "rgba(245,237,216,0.5)" }}>
                      {m.primaryCount.toLocaleString()} events
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  {/* Comparison bar (behind) */}
                  {cmp && (
                    <div style={{
                      position: "absolute", top: 0, left: 0,
                      height: "100%", borderRadius: 2,
                      width: `${(m.cmpCount / maxEvents) * 100}%`,
                      background: "rgba(74,144,217,0.35)",
                      transition: "width 0.6s ease",
                    }} />
                  )}
                  {/* Primary bar — hidden for ghost rows */}
                  {!isGhost && (
                    <div style={{
                      position: "absolute", top: 0, left: 0,
                      height: "100%", borderRadius: 2,
                      width: `${(m.primaryCount / maxEvents) * 100}%`,
                      background: i === 0 ? ACCENT : ACCENT_DIM,
                      transition: "width 0.6s ease",
                    }} />
                  )}
                </div>
                {cmp && m.cmpCount > 0 && !isNew && (
                  <div style={{ fontSize: 9, color: COMPARE_COLOR, marginTop: 3, opacity: 0.6 }}>
                    prior: {m.cmpCount.toLocaleString()} ({compareDays}D)
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

/* ── Trend Sparkline ─────────────────────────────────────────────────────────── */

function TrendSparkline({ trend }: { trend: TrendPoint[] | undefined }) {
  const W = 80;
  const H = 28;
  const PAD = 2;

  if (!trend || trend.length < 2) {
    return (
      <svg width={W} height={H} style={{ display: "block", opacity: 0.2 }}>
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2}
          stroke="rgba(245,237,216,0.3)" strokeWidth={1} strokeDasharray="3 3" />
      </svg>
    );
  }

  const pts     = trend;
  const maxVal  = Math.max(...pts.map((p) => Math.max(p.adds, p.skips)), 1);
  const innerW  = W - PAD * 2;
  const innerH  = H - PAD * 2;
  const xStep   = innerW / (pts.length - 1);

  function toPoints(key: "adds" | "skips"): string {
    return pts
      .map((p, i) => {
        const x = PAD + i * xStep;
        const y = PAD + innerH - (p[key] / maxVal) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <polyline
        points={toPoints("adds")}
        fill="none"
        stroke="#4ade80"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      <polyline
        points={toPoints("skips")}
        fill="none"
        stroke="#f87171"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
}

/* ── Trend Arrow ─────────────────────────────────────────────────────────────── */

interface TrendStats {
  direction: "up" | "down" | "flat";
  changePct: number | null;
}

function computeTrendStats(trend: TrendPoint[] | undefined): TrendStats {
  if (!trend || trend.length < 4) return { direction: "flat", changePct: null };
  const recent = trend.slice(-3);
  const prior  = trend.slice(0, -3);
  const recentAvg = recent.reduce((s, p) => s + p.adds, 0) / recent.length;
  const priorAvg  = prior.reduce((s, p) => s + p.adds, 0)  / prior.length;
  if (priorAvg === 0) return { direction: recentAvg > 0 ? "up" : "flat", changePct: null };
  const changePct = Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
  const direction = changePct >= 15 ? "up" : changePct <= -15 ? "down" : "flat";
  return { direction, changePct };
}

function TrendArrow({ trend }: { trend: TrendPoint[] | undefined }) {
  const { direction, changePct } = computeTrendStats(trend);
  const pctLabel = changePct !== null
    ? ` (${changePct > 0 ? "+" : ""}${changePct}%)`
    : "";
  const cfg = direction === "up"
    ? { symbol: "↑", color: "#4ade80", title: `Trending up${pctLabel}` }
    : direction === "down"
    ? { symbol: "↓", color: "#f87171", title: `Trending down${pctLabel}` }
    : { symbol: "→", color: "rgba(245,237,216,0.3)", title: changePct !== null ? `Flat${pctLabel}` : "Not enough data" };
  return (
    <span
      title={cfg.title}
      style={{
        fontSize: 13, fontWeight: 700,
        color: cfg.color,
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {cfg.symbol}
    </span>
  );
}

/* ── Product Trend Modal ─────────────────────────────────────────────────────── */

const MODAL_DAYS_OPTIONS = [7, 30, 90] as const;
type ModalDays = typeof MODAL_DAYS_OPTIONS[number];

function TrendTooltipContent({ active, payload, label: day }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1A1A1B",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 11,
    }}>
      <div style={{ color: "rgba(245,237,216,0.5)", marginBottom: 4, fontSize: 10, letterSpacing: "0.1em" }}>{day}</div>
      <div style={{ color: ADD_COLOR }}>Adds: <strong>{payload[0]?.value ?? 0}</strong></div>
      <div style={{ color: SKIP_COLOR }}>Skips: <strong>{payload[1]?.value ?? 0}</strong></div>
    </div>
  );
}

function ProductTrendModal({
  product,
  onClose,
}: {
  product: ProductItem;
  onClose: () => void;
}) {
  const [modalDays, setModalDays] = useState<ModalDays>(30);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    setTrendLoading(true);
    apiFetch<{ cardId: string; days: number; trend: TrendPoint[] }>(
      `/kernel/telemetry/products/${encodeURIComponent(product.card_id)}/trend?days=${modalDays}`
    )
      .then((data) => setTrend(data.trend))
      .catch(() => setTrend([]))
      .finally(() => setTrendLoading(false));
  }, [product.card_id, modalDays]);

  const ct = product.craft_type?.toLowerCase() ?? null;
  const badgeStyle = ct && CRAFT_BADGE_COLORS[ct] ? CRAFT_BADGE_COLORS[ct]! : null;
  const addRatio = product.total > 0 ? (product.adds / product.total) * 100 : 0;
  const label = product.title ?? product.card_id;
  const tickInterval = Math.max(0, Math.floor(trend.length / 8) - 1);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#111112",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        width: "min(720px, 100%)",
        maxHeight: "90vh",
        overflow: "auto",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                color: "#F5EDD8",
                fontFamily: "'Cormorant Garamond', serif",
                letterSpacing: "0.04em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {label}
              </h2>
              {badgeStyle && (
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 20,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  background: badgeStyle.bg, color: badgeStyle.text,
                  flexShrink: 0,
                }}>
                  {ct!.toUpperCase()}
                </span>
              )}
            </div>
            {product.title && (
              <div style={{ fontSize: 10, color: "rgba(245,237,216,0.25)", fontFamily: "monospace", marginTop: 4 }}>
                {product.card_id}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 14px",
              color: "rgba(245,237,216,0.5)",
              fontSize: 12, cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            ✕
          </button>
        </div>

        {/* Aggregate totals */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {([
            { label: "ADDS", value: product.adds.toLocaleString(), color: ADD_COLOR },
            { label: "SKIPS", value: product.skips.toLocaleString(), color: SKIP_COLOR },
            { label: "TOTAL", value: product.total.toLocaleString(), color: "rgba(245,237,216,0.6)" },
            { label: "ADD RATE", value: `${Math.round(addRatio)}%`, color: addRatio >= 50 ? ADD_COLOR : SKIP_COLOR },
          ] as { label: string; value: string; color: string }[]).map((stat) => (
            <div key={stat.label} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "12px 16px",
              flex: "1 1 110px",
            }}>
              <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: "'Cormorant Garamond', serif" }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Day range selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)" }}>RANGE</span>
          <div style={{ display: "flex", gap: 8 }}>
            {MODAL_DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setModalDays(d)}
                style={{
                  background: modalDays === d ? "rgba(196,97,10,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${modalDays === d ? "#C4610A" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20, padding: "5px 16px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  color: modalDays === d ? "#C4610A" : "rgba(245,237,216,0.4)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{
          background: SURFACE,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "20px 8px 8px",
          minHeight: 280,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {trendLoading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "rgba(245,237,216,0.3)" }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "2px solid rgba(196,97,10,0.3)", borderTopColor: "#C4610A",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ fontSize: 11, letterSpacing: "0.15em" }}>LOADING TREND</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00Z");
                    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                  }}
                  tick={{ fontSize: 9, fill: "rgba(245,237,216,0.3)" }}
                  axisLine={false} tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: "rgba(245,237,216,0.3)" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<TrendTooltipContent />} />
                <Legend
                  formatter={(v: string) => (
                    <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(245,237,216,0.5)" }}>
                      {v.toUpperCase()}
                    </span>
                  )}
                />
                <Line
                  type="monotone" dataKey="adds" name="adds"
                  stroke={ADD_COLOR} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: ADD_COLOR }}
                />
                <Line
                  type="monotone" dataKey="skips" name="skips"
                  stroke={SKIP_COLOR} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: SKIP_COLOR }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function CraftBreakdownChart({
  breakdown,
  craftFilter,
  onCraftFilter,
}: {
  breakdown: CraftBreakdownPoint[];
  craftFilter: CraftFilter;
  onCraftFilter: (cf: CraftFilter) => void;
}) {
  const grandTotal = breakdown.reduce((s, r) => s + r.total, 0);
  const hasData = grandTotal > 0;

  const craftColor = (ct: string) =>
    CRAFT_FILTERS.find((f) => f.id === ct)?.color ?? "#888";

  // Build donut data: one slice per craft, value = adds + skips
  const pieData = breakdown.map((r) => ({
    name: r.craft_type.toUpperCase(),
    value: r.total,
    craftType: r.craft_type as CraftFilter,
    adds: r.adds,
    skips: r.skips,
    color: craftColor(r.craft_type),
  }));

  return (
    <div style={{
      background: SURFACE,
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
      padding: "16px 20px",
      display: "flex",
      gap: 24,
      alignItems: "center",
      flexWrap: "wrap",
    }}>
      {/* Chart area */}
      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
        {hasData ? (
          <PieChart width={120} height={120}>
            <Pie
              data={pieData}
              cx={55}
              cy={55}
              innerRadius={34}
              outerRadius={54}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              onClick={(entry) => {
                const ct = (entry as typeof pieData[number]).craftType;
                onCraftFilter(craftFilter === ct ? "all" : ct);
              }}
              style={{ cursor: "pointer" }}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.craftType}
                  fill={entry.color}
                  opacity={craftFilter === "all" || craftFilter === entry.craftType ? 1 : 0.28}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as typeof pieData[number];
                if (!d) return null;
                const pct = grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(1) : "0";
                return (
                  <div style={{
                    background: "rgba(18,18,20,0.95)",
                    border: `1px solid ${d.color}`,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color: "rgba(245,237,216,0.85)",
                    minWidth: 120,
                  }}>
                    <div style={{ color: d.color, fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                    <div>ADDS:  {d.adds}</div>
                    <div>SKIPS: {d.skips}</div>
                    <div style={{ marginTop: 4, color: "rgba(245,237,216,0.45)" }}>{pct}% of total</div>
                  </div>
                );
              }}
            />
          </PieChart>
        ) : (
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "rgba(245,237,216,0.2)", letterSpacing: "0.12em",
          }}>
            NO DATA
          </div>
        )}
        {/* Center label */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(245,237,216,0.9)", lineHeight: 1 }}>
            {grandTotal > 999 ? `${(grandTotal / 1000).toFixed(1)}k` : grandTotal}
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "rgba(245,237,216,0.3)", marginTop: 2 }}>
            TOTAL
          </div>
        </div>
      </div>

      {/* Legend / stat rows */}
      <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginBottom: 2 }}>
          CRAFT BREAKDOWN — CLICK SEGMENT OR ROW TO FILTER
        </div>
        {pieData.map((entry) => {
          const pct = grandTotal > 0 ? (entry.value / grandTotal) * 100 : 0;
          const isActive = craftFilter === "all" || craftFilter === entry.craftType;
          return (
            <button
              key={entry.craftType}
              onClick={() => onCraftFilter(craftFilter === entry.craftType ? "all" : entry.craftType)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: isActive ? 1 : 0.35,
                transition: "opacity 0.15s",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: entry.color, width: 38, textAlign: "left" }}>
                {entry.name}
              </span>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: entry.color,
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <span style={{ fontSize: 9, color: "rgba(245,237,216,0.45)", width: 32, textAlign: "right", flexShrink: 0 }}>
                {entry.value}
              </span>
              <span style={{ fontSize: 9, color: "rgba(245,237,216,0.25)", width: 36, textAlign: "right", flexShrink: 0 }}>
                {pct.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductsTab({
  products,
  loading,
  days,
  craftFilter,
  onCraftFilter,
  trends,
  breakdown,
}: {
  products: ProductItem[];
  loading: boolean;
  days: number;
  craftFilter: CraftFilter;
  onCraftFilter: (cf: CraftFilter) => void;
  trends: Map<string, TrendPoint[]>;
  breakdown: CraftBreakdownPoint[];
}) {
  const activeFilterConfig = CRAFT_FILTERS.find((f) => f.id === craftFilter) ?? CRAFT_FILTERS[0]!;
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

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

      {/* Craft type breakdown donut chart */}
      <CraftBreakdownChart breakdown={breakdown} craftFilter={craftFilter} onCraftFilter={onCraftFilter} />

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
              gridTemplateColumns: "36px 1fr 72px 60px 60px 60px 104px 140px",
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
              <span style={{ textAlign: "center" }}>7D TREND ↗</span>
              <span style={{ textAlign: "center" }}>ADD RATIO</span>
            </div>

            {products.map((p, i) => {
              const addRatio  = p.total > 0 ? (p.adds / p.total) * 100 : 0;
              const isTop     = i === 0;
              const label     = p.title ?? p.card_id;
              const rowKey    = `${p.card_id}|${p.title ?? ""}|${p.craft_type ?? ""}`;
              const ct        = p.craft_type?.toLowerCase() ?? null;
              const badgeStyle = ct && CRAFT_BADGE_COLORS[ct] ? CRAFT_BADGE_COLORS[ct]! : null;
              const trendData = trends.get(p.card_id);

              return (
                <div
                  key={rowKey}
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 72px 60px 60px 60px 104px 140px",
                    gap: "0 12px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                    background: isTop ? "rgba(196,97,10,0.04)" : "transparent",
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; }}
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

                  {/* 7-day sparkline + trend arrow */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <TrendSparkline trend={trendData} />
                    <TrendArrow trend={trendData} />
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

      {selectedProduct && (
        <ProductTrendModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
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
const LIVE_FEED_LIMIT_SS_KEY = "eat_live_feed_limit";
const VALID_LIVE_LIMITS = [20, 50, 100] as const;
type LiveLimit = typeof VALID_LIVE_LIMITS[number];

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
  const header = "id,event_type,module_id,venue_id,occurred_at,payload";
  const rows = events.map((e) => {
    const escape = (v: string | null) =>
      v === null ? "" : `"${v.replace(/"/g, '""')}"`;
    const payloadStr =
      e.payload == null || Object.keys(e.payload).length === 0
        ? ""
        : `"${JSON.stringify(e.payload).replace(/"/g, '""')}"`;
    return [
      escape(e.id),
      escape(e.eventType),
      escape(e.moduleId),
      escape(e.venueId),
      escape(e.occurredAt),
      payloadStr,
    ].join(",");
  });
  return [header, ...rows].join("\r\n");
}

function triggerLiveFeedCsvDownload(events: RecentEvent[], scopeLabel: string, limit: number): void {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `live-feed-lim${limit}-${scopeLabel}-${today}.csv`;
  const blob = new Blob([buildLiveFeedCsv(events)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

const LIVE_FEED_PAGE_SIZE = 20;

const EXPORT_TIME_WINDOWS: { label: string; minutes: number }[] = [
  { label: "All time",    minutes: 0 },
  { label: "Last 15 min", minutes: 15 },
  { label: "Last 30 min", minutes: 30 },
  { label: "Last 60 min", minutes: 60 },
];

function LiveFeedTab({ events, newEventIds, liveLimit, onLimitChange }: {
  events: RecentEvent[];
  newEventIds: Set<string>;
  liveLimit: LiveLimit;
  onLimitChange: (n: LiveLimit) => void;
}) {
  const [, forceRender] = useState(0);
  const [visibleCount, setVisibleCount] = useState(LIVE_FEED_PAGE_SIZE);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    () => readSessionSet(LIVE_FEED_FILTER_TYPES_KEY),
  );
  const [selectedModule, setSelectedModule] = useState<string>(
    () => readSessionString(LIVE_FEED_FILTER_MODULE_KEY),
  );

  const [showExportPopover, setShowExportPopover] = useState(false);
  const [exportScope, setExportScope]             = useState<"filtered" | "all">("filtered");
  const [exportMinutes, setExportMinutes]         = useState<number>(0);
  const exportBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showExportPopover) return;
    const handler = (e: MouseEvent) => {
      if (exportBtnRef.current && !exportBtnRef.current.closest("[data-export-popover-root]")?.contains(e.target as Node)) {
        setShowExportPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportPopover]);

  const allEventTypes = Array.from(new Set(events.map((e) => e.eventType))).sort();
  const allModules    = Array.from(new Set(events.map((e) => e.moduleId).filter(Boolean) as string[])).sort();

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      writeSessionSet(LIVE_FEED_FILTER_TYPES_KEY, next);
      return next;
    });
    setVisibleCount(LIVE_FEED_PAGE_SIZE);
  };

  const handleModuleChange = (mod: string) => {
    setSelectedModule(mod);
    writeSessionString(LIVE_FEED_FILTER_MODULE_KEY, mod);
    setVisibleCount(LIVE_FEED_PAGE_SIZE);
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(ev.eventType)) return false;
    if (selectedModule && ev.moduleId !== selectedModule) return false;
    return true;
  });

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = filteredEvents.length > visibleCount;

  const activeFilterCount = selectedTypes.size + (selectedModule ? 1 : 0);

  const ghostTypes   = [...selectedTypes].filter((t) => !allEventTypes.includes(t));
  const moduleIsGhost = selectedModule !== "" && !allModules.includes(selectedModule);
  const hasGhostFilters = ghostTypes.length > 0 || moduleIsGhost;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{FLASH_KEYFRAMES}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(196,97,10,0.5)", marginBottom: 1 }}>
            LIVE EVENT FEED
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "rgba(245,237,216,0.4)" }}>
              Showing up to {liveLimit} events · auto-refreshes every 15 s
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(245,237,216,0.25)" }}>LIMIT</span>
              {VALID_LIVE_LIMITS.map((n) => (
                <button
                  key={n}
                  onClick={() => onLimitChange(n)}
                  style={{
                    background: liveLimit === n ? "rgba(196,97,10,0.22)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${liveLimit === n ? "rgba(196,97,10,0.55)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 5, padding: "3px 9px",
                    fontSize: 10, fontWeight: liveLimit === n ? 700 : 400, letterSpacing: "0.08em",
                    color: liveLimit === n ? "#C4610A" : "rgba(245,237,216,0.4)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Export options trigger */}
          <div
            data-export-popover-root
            style={{ position: "relative" }}
          >
            <button
              ref={exportBtnRef}
              onClick={() => events.length > 0 && setShowExportPopover((v) => !v)}
              disabled={events.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: events.length > 0 ? "rgba(196,97,10,0.1)" : "rgba(196,97,10,0.04)",
                border: `1px solid ${showExportPopover ? "rgba(196,97,10,0.6)" : events.length > 0 ? "rgba(196,97,10,0.3)" : "rgba(196,97,10,0.12)"}`,
                borderRadius: 6, padding: "5px 11px",
                cursor: events.length > 0 ? "pointer" : "not-allowed",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                color: events.length > 0 ? "#C4610A" : "rgba(196,97,10,0.35)",
                opacity: events.length > 0 ? 1 : 0.6,
              }}
            >
              ↓ Export CSV ▾
            </button>

            {/* Export options popover */}
            {showExportPopover && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 400,
                  background: "#1E1E1F",
                  border: "1px solid rgba(196,97,10,0.35)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  minWidth: 230,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.65)",
                  display: "flex", flexDirection: "column", gap: 12,
                }}
              >
                {/* Scope */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginBottom: 6 }}>
                    SCOPE
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["filtered", "all"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setExportScope(s)}
                        style={{
                          flex: 1,
                          background: exportScope === s ? "rgba(196,97,10,0.22)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${exportScope === s ? "rgba(196,97,10,0.55)" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 6, padding: "5px 8px",
                          fontSize: 10, fontWeight: exportScope === s ? 700 : 400,
                          letterSpacing: "0.08em",
                          color: exportScope === s ? "#C4610A" : "rgba(245,237,216,0.45)",
                          cursor: "pointer",
                        }}
                      >
                        {s === "filtered" ? "Current filters" : "All events"}
                      </button>
                    ))}
                  </div>
                  {exportScope === "filtered" && activeFilterCount === 0 && (
                    <div style={{ marginTop: 5, fontSize: 9, color: "rgba(245,237,216,0.3)", letterSpacing: "0.08em" }}>
                      No filters active — same as "All events"
                    </div>
                  )}
                </div>

                {/* Time window */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", marginBottom: 6 }}>
                    TIME WINDOW
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {EXPORT_TIME_WINDOWS.map((w) => (
                      <button
                        key={w.minutes}
                        onClick={() => setExportMinutes(w.minutes)}
                        style={{
                          background: exportMinutes === w.minutes ? "rgba(196,97,10,0.22)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${exportMinutes === w.minutes ? "rgba(196,97,10,0.55)" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 6, padding: "4px 9px",
                          fontSize: 10, fontWeight: exportMinutes === w.minutes ? 700 : 400,
                          letterSpacing: "0.06em",
                          color: exportMinutes === w.minutes ? "#C4610A" : "rgba(245,237,216,0.45)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider + export button */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10 }}>
                  {(() => {
                    const baseEvents = exportScope === "all" ? events : filteredEvents;
                    const cutoff = exportMinutes > 0 ? Date.now() - exportMinutes * 60_000 : null;
                    const exportEvents = cutoff
                      ? baseEvents.filter((e) => new Date(e.occurredAt).getTime() >= cutoff)
                      : baseEvents;
                    const parts: string[] = [];
                    if (exportScope === "filtered" && activeFilterCount > 0) parts.push("filtered");
                    if (exportMinutes > 0) parts.push(`last${exportMinutes}m`);
                    if (parts.length === 0) parts.push("all");
                    const scopeLabel = parts.join("-");
                    const canExport = exportEvents.length > 0;
                    return (
                      <>
                        <div style={{ fontSize: 9, color: "rgba(245,237,216,0.25)", letterSpacing: "0.08em", marginBottom: 8 }}>
                          {exportEvents.length} event{exportEvents.length !== 1 ? "s" : ""} · <span style={{ color: "rgba(196,97,10,0.55)", fontFamily: "monospace" }}>live-feed-lim{liveLimit}-{scopeLabel}-{new Date().toISOString().slice(0, 10)}.csv</span>
                        </div>
                        <button
                          onClick={() => {
                            triggerLiveFeedCsvDownload(exportEvents, scopeLabel, liveLimit);
                            setShowExportPopover(false);
                          }}
                          disabled={!canExport}
                          style={{
                            width: "100%",
                            background: canExport ? "rgba(196,97,10,0.18)" : "rgba(196,97,10,0.06)",
                            border: `1px solid ${canExport ? "rgba(196,97,10,0.45)" : "rgba(196,97,10,0.15)"}`,
                            borderRadius: 6, padding: "7px 0",
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                            color: canExport ? "#C4610A" : "rgba(196,97,10,0.35)",
                            cursor: canExport ? "pointer" : "not-allowed",
                          }}
                        >
                          ↓ EXPORT
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
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
                setVisibleCount(LIVE_FEED_PAGE_SIZE);
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

      {/* Count note — shown whenever pagination is active or filters are applied */}
      {events.length > 0 && (activeFilterCount > 0 || hasMore || filteredEvents.length < events.length) && (
        <div style={{ fontSize: 10, color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em" }}>
          {activeFilterCount > 0
            ? `Showing ${Math.min(visibleCount, filteredEvents.length)} of ${filteredEvents.length} matching event${filteredEvents.length !== 1 ? "s" : ""} (${events.length} total fetched)`
            : `Showing ${Math.min(visibleCount, filteredEvents.length)} of ${events.length} event${events.length !== 1 ? "s" : ""}`}
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

          {visibleEvents.map((ev) => {
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

      {/* Load more */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setVisibleCount((c) => c + LIVE_FEED_PAGE_SIZE)}
            style={{
              background: "rgba(196,97,10,0.08)",
              border: "1px solid rgba(196,97,10,0.25)",
              borderRadius: 8, padding: "8px 24px",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              color: "#C4610A", cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,97,10,0.16)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,97,10,0.45)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,97,10,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,97,10,0.25)";
            }}
          >
            LOAD MORE ({filteredEvents.length - visibleCount} remaining)
          </button>
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

function SectionDownloadButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22,
        background: "rgba(74,144,217,0.1)",
        border: "1px solid rgba(74,144,217,0.3)",
        borderRadius: 4,
        color: "#4A90D9",
        fontSize: 12,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
        padding: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,144,217,0.2)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,144,217,0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,144,217,0.1)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,144,217,0.3)";
      }}
    >
      ↓
    </button>
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
