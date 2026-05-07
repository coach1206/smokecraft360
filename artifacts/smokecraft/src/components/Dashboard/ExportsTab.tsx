/**
 * ExportsTab — data export console (Brief B).
 *
 * - Pick scope (vendors / products / inventory / orders) and format (csv / json)
 * - Optional filters (status / since / until) for orders
 * - Click Export → browser downloads file + history row appears
 * - History list shows recent exports for the caller's tenant scope
 *
 * Role gating mirrors the server:
 *   super_admin → all four scopes; venue_owner / manager → inventory + orders only.
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download, RefreshCw, Loader2, AlertTriangle, Check, FileJson, FileSpreadsheet,
} from "lucide-react";
import {
  fetchExportHistory, runExport,
  type ExportLog, type ExportScope, type ExportFormat,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const ALL_SCOPES: ExportScope[]      = ["vendors", "products", "inventory", "orders"];
const STAFF_SCOPES: ExportScope[]    = ["inventory", "orders"];

const fmt = (iso: string): string => {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
};
const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

export function ExportsTab() {
  const { user } = useAuth();
  const isSuper  = user?.role === "super_admin";
  const scopes   = isSuper ? ALL_SCOPES : STAFF_SCOPES;

  const [scope,    setScope]    = useState<ExportScope>(scopes[0]!);
  const [format,   setFormat]   = useState<ExportFormat>("csv");
  const [status,   setStatus]   = useState<string>("");
  const [since,    setSince]    = useState<string>("");
  const [until,    setUntil]    = useState<string>("");
  const [history,  setHistory]  = useState<ExportLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setHistory(await fetchExportHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onExport = async () => {
    setRunning(true); setError(null); setSuccess(null);
    try {
      const filters: { status?: string; since?: string; until?: string } = {};
      if (scope === "orders") {
        if (status.trim()) filters.status = status.trim();
        if (since.trim())  filters.since  = new Date(since).toISOString();
        if (until.trim())  filters.until  = new Date(until).toISOString();
      }
      const r = await runExport({ scope, format, filters });
      setSuccess(`Exported ${r.rowCount} rows (${fmtBytes(r.byteCount)}) → ${r.filename}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setRunning(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(26,26,27,0.10)", border: "1px solid rgba(212,139,0,0.25)",
    color: "rgba(230,210,175,0.92)", padding: "6px 10px", borderRadius: 5,
    fontSize: 12,
  };

  return (
    <motion.div key="exports" className="space-y-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <div>
        <h2 className="font-serif text-xl flex items-center gap-2"
          style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
          <Download size={16} style={{ color: "rgba(212,139,0,0.7)" }} />
          Exports
        </h2>
        <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
          CSV / JSON exports · {isSuper ? "Global scope" : "Tenant-scoped to your venue"} · Audit-logged
        </p>
      </div>

      {/* ── Builder ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: "rgba(26,26,27,0.07)", border: "1px solid rgba(212,139,0,0.18)" }}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label>Scope</Label>
            <select className="w-full" style={inputStyle} value={scope}
              onChange={(e) => setScope(e.target.value as ExportScope)} data-testid="export-scope">
              {scopes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Format</Label>
            <select className="w-full" style={inputStyle} value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)} data-testid="export-format">
              <option value="csv">csv</option>
              <option value="json">json</option>
            </select>
          </div>

          {scope === "orders" && (
            <>
              <div>
                <Label>Status filter</Label>
                <input className="w-full" style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}
                  placeholder="paid · pending · …" data-testid="export-status" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Since</Label>
                  <input type="date" className="w-full" style={inputStyle} value={since} onChange={(e) => setSince(e.target.value)}
                    data-testid="export-since" />
                </div>
                <div>
                  <Label>Until</Label>
                  <input type="date" className="w-full" style={inputStyle} value={until} onChange={(e) => setUntil(e.target.value)}
                    data-testid="export-until" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={onExport} disabled={running} data-testid="export-run"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.2em]"
            style={{ background: "rgba(212,139,0,0.22)", color: "rgba(255,225,165,0.95)",
              border: "1px solid rgba(212,139,0,0.55)", opacity: running ? 0.6 : 1 }}>
            {running ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {running ? "Exporting…" : "Run Export"}
          </button>
          <button onClick={load} className="p-1.5 rounded-md" style={{ color: "rgba(230,210,175,0.6)" }} aria-label="Refresh">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="text-[11px] mt-3 px-3 py-2 rounded flex items-center gap-2"
            style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        {success && (
          <div className="text-[11px] mt-3 px-3 py-2 rounded flex items-center gap-2"
            style={{ background: "rgba(80,160,90,0.12)", border: "1px solid rgba(80,160,90,0.3)", color: "rgba(180,255,190,0.95)" }}
            data-testid="export-success">
            <Check size={12} /> {success}
          </div>
        )}
      </div>

      {/* ── History ───────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(180,155,100,0.6)" }}>
          Recent exports
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : history.length === 0 ? (
          <div className="text-[11px] px-4 py-6 text-center rounded"
            style={{ background: "rgba(26,26,27,0.04)", border: "1px dashed rgba(212,139,0,0.18)", color: "rgba(180,155,100,0.5)" }}>
            No exports yet.
          </div>
        ) : (
          <div className="space-y-1.5" data-testid="export-history">
            {history.map((h) => (
              <div key={h.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md"
                style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(212,139,0,0.10)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  {h.format === "csv"
                    ? <FileSpreadsheet size={12} style={{ color: "rgba(212,139,0,0.7)" }} />
                    : <FileJson        size={12} style={{ color: "rgba(212,139,0,0.7)" }} />}
                  <span className="font-serif text-[12px]" style={{ color: "rgba(230,210,175,0.92)" }}>{h.scope}</span>
                  <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.55)" }}>
                    {h.format}
                  </span>
                  {h.status === "failed" && (
                    <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(180,40,40,0.18)", color: "rgba(255,180,170,0.95)", border: "1px solid rgba(180,40,40,0.45)" }}>
                      failed
                    </span>
                  )}
                </div>
                <div className="text-[10px] flex items-center gap-3 flex-shrink-0" style={{ color: "rgba(180,155,100,0.55)" }}>
                  <span>{h.rowCount} rows</span>
                  <span>{fmtBytes(h.byteCount)}</span>
                  <span>{fmt(h.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.6)" }}>{children}</div>;
}
