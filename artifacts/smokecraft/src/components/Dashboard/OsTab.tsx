/**
 * OsTab — Axiom OS control surface (super_admin only).
 *
 * Live event feed (polled every 8s) over /api/os/events plus a command
 * console for /api/os/command (theme switch, venue lock, flag toggle,
 * subscription grace extend). CSV export uses the same filter set.
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Download, RefreshCw, Lock, Unlock, Palette, Flag, Clock, Send, AlertCircle,
} from "lucide-react";
import {
  fetchOsEvents, osEventsCsvUrl, runOsCommand,
  type OsEventRow, type OsEventsFilters, type OsCommand,
} from "@/services/api";

const POLL_MS = 8000;

type CmdKind = "theme.switch" | "venue.lock" | "venue.unlock" | "flag.toggle" | "subscription.extend_grace";

export function OsTab() {
  const [filters, setFilters] = useState<OsEventsFilters>({ limit: 100 });
  const [events,  setEvents]  = useState<OsEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchOsEvents(filters);
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  // ── Command console state ───────────────────────────────────────────────────
  const [cmdKind, setCmdKind]     = useState<CmdKind>("theme.switch");
  const [cmdVenue, setCmdVenue]   = useState("");
  const [cmdTheme, setCmdTheme]   = useState("");
  const [cmdName,  setCmdName]    = useState("");
  const [cmdEnabled, setCmdEnabled] = useState(true);
  const [cmdDays,  setCmdDays]    = useState(7);
  const [cmdResult, setCmdResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cmdBusy, setCmdBusy]     = useState(false);

  const submitCommand = useCallback(async () => {
    setCmdBusy(true); setCmdResult(null);
    try {
      let payload: OsCommand;
      switch (cmdKind) {
        case "theme.switch":
          payload = { command: "theme.switch", venueId: cmdVenue, themeProfile: cmdTheme }; break;
        case "venue.lock":
          payload = { command: "venue.lock", venueId: cmdVenue }; break;
        case "venue.unlock":
          payload = { command: "venue.unlock", venueId: cmdVenue }; break;
        case "flag.toggle":
          payload = { command: "flag.toggle", name: cmdName, enabled: cmdEnabled,
                      venueId: cmdVenue || null }; break;
        case "subscription.extend_grace":
          payload = { command: "subscription.extend_grace", venueId: cmdVenue, days: cmdDays }; break;
      }
      const r = await runOsCommand(payload);
      setCmdResult({ ok: true, msg: JSON.stringify(r) });
      void refresh();
    } catch (e) {
      setCmdResult({ ok: false, msg: e instanceof Error ? e.message : "Command failed" });
    } finally {
      setCmdBusy(false);
    }
  }, [cmdKind, cmdVenue, cmdTheme, cmdName, cmdEnabled, cmdDays, refresh]);

  const cmdIcon = {
    "theme.switch":               <Palette size={14} />,
    "venue.lock":                 <Lock size={14} />,
    "venue.unlock":               <Unlock size={14} />,
    "flag.toggle":                <Flag size={14} />,
    "subscription.extend_grace":  <Clock size={14} />,
  }[cmdKind];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Axiom OS</h2>
          <span className="ml-2 rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">super_admin</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            <input type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)} />
            auto-refresh 8s
          </label>
          <button onClick={() => void refresh()} disabled={loading}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <a href={osEventsCsvUrl(filters)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500">
            <Download size={12} /> CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-900/50 p-3 md:grid-cols-5">
        <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="venueId"
          value={filters.venueId   ?? ""} onChange={e => setFilters(f => ({ ...f, venueId:   e.target.value || undefined }))} />
        <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="userId"
          value={filters.userId    ?? ""} onChange={e => setFilters(f => ({ ...f, userId:    e.target.value || undefined }))} />
        <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="eventType (e.g. view)"
          value={filters.eventType ?? ""} onChange={e => setFilters(f => ({ ...f, eventType: e.target.value || undefined }))} />
        <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="module (smokecraft…)"
          value={filters.module    ?? ""} onChange={e => setFilters(f => ({ ...f, module:    e.target.value || undefined }))} />
        <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" type="number" placeholder="limit (max 1000)"
          value={filters.limit ?? 100} onChange={e => setFilters(f => ({ ...f, limit: Number(e.target.value) || 100 }))} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded bg-red-900/40 px-3 py-2 text-xs text-red-200">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Live event feed */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-300">Live event feed ({events.length})</h3>
        <div className="max-h-96 overflow-auto rounded border border-zinc-800">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-2 py-1 text-left">time</th>
                <th className="px-2 py-1 text-left">event_type</th>
                <th className="px-2 py-1 text-left">venue</th>
                <th className="px-2 py-1 text-left">user</th>
                <th className="px-2 py-1 text-left">product</th>
                <th className="px-2 py-1 text-left">metadata</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} className="border-t border-zinc-800/50 text-zinc-200">
                  <td className="px-2 py-1 font-mono text-zinc-400">{new Date(ev.createdAt).toLocaleTimeString()}</td>
                  <td className="px-2 py-1">{ev.eventType}</td>
                  <td className="px-2 py-1 font-mono">{ev.venueId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{ev.userId?.slice(0, 8)  ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{ev.productId ?? "—"}</td>
                  <td className="px-2 py-1 max-w-xs truncate text-zinc-500">{ev.metadata ? JSON.stringify(ev.metadata) : "—"}</td>
                </tr>
              ))}
              {events.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-zinc-500">No events match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Command console */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
          {cmdIcon} Command console
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select className="rounded bg-zinc-800 px-2 py-1 text-xs text-white"
            value={cmdKind} onChange={e => setCmdKind(e.target.value as CmdKind)}>
            <option value="theme.switch">theme.switch</option>
            <option value="venue.lock">venue.lock</option>
            <option value="venue.unlock">venue.unlock</option>
            <option value="flag.toggle">flag.toggle</option>
            <option value="subscription.extend_grace">subscription.extend_grace</option>
          </select>

          <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="venueId (uuid)"
            value={cmdVenue} onChange={e => setCmdVenue(e.target.value)} />

          {cmdKind === "theme.switch" && (
            <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="themeProfile slug"
              value={cmdTheme} onChange={e => setCmdTheme(e.target.value)} />
          )}
          {cmdKind === "flag.toggle" && (
            <>
              <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" placeholder="flag name"
                value={cmdName} onChange={e => setCmdName(e.target.value)} />
              <label className="flex items-center gap-1 text-xs text-zinc-300">
                <input type="checkbox" checked={cmdEnabled} onChange={e => setCmdEnabled(e.target.checked)} /> enabled
              </label>
            </>
          )}
          {cmdKind === "subscription.extend_grace" && (
            <input className="rounded bg-zinc-800 px-2 py-1 text-xs text-white" type="number" min={1} max={90}
              placeholder="days (1-90)" value={cmdDays} onChange={e => setCmdDays(Number(e.target.value) || 7)} />
          )}

          <button onClick={() => void submitCommand()} disabled={cmdBusy || !cmdVenue}
            className="col-span-full flex items-center justify-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50">
            <Send size={12} /> {cmdBusy ? "Running…" : "Execute"}
          </button>
        </div>
        {cmdResult && (
          <pre className={`mt-3 max-h-32 overflow-auto rounded p-2 text-xs ${cmdResult.ok ? "bg-emerald-900/30 text-emerald-200" : "bg-red-900/30 text-red-200"}`}>
            {cmdResult.msg}
          </pre>
        )}
        <p className="mt-3 text-[10px] text-zinc-500">
          All commands are audit-logged with before/after state. Note: session.force_logout is not supported —
          JWTs in this app are stateless and require a token denylist (out of scope).
        </p>
      </div>
    </motion.div>
  );
}
