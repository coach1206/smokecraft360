/**
 * ConflictsTab — admin queue for cross-source data mismatches.
 *
 * Lists open conflicts and offers four resolution actions per row:
 *   • Use A   — keep sourceA's value
 *   • Use B   — keep sourceB's value
 *   • Custom  — type an override value (inline)
 *   • Dismiss — close without picking a side
 *
 * Tenant scoping is enforced server-side: super_admin sees all (incl.
 * cross-venue / null-venue rows), venue_owner / manager only see their
 * own venueId.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Check, X, Edit3, Loader2, Filter, RefreshCw,
} from "lucide-react";
import {
  fetchConflicts, resolveConflict,
  type DataConflict, type ConflictStatus, type ConflictResolution,
} from "@/services/api";

const STATUS_LABEL: Record<ConflictStatus, string> = {
  open: "Open", resolved: "Resolved", dismissed: "Dismissed",
};
const STATUS_COLORS: Record<ConflictStatus, { bg: string; fg: string; border: string }> = {
  open:      { bg: "rgba(212,140,55,0.15)", fg: "rgba(255,210,140,0.95)", border: "rgba(212,140,55,0.5)" },
  resolved:  { bg: "rgba(80,160,90,0.15)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
  dismissed: { bg: "rgba(180,180,180,0.08)", fg: "rgba(180,180,180,0.7)", border: "rgba(180,180,180,0.25)" },
};

const formatDateTime = (iso: string): string => {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
};

export function ConflictsTab() {
  const [items,    setItems]    = useState<DataConflict[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<ConflictStatus | "all">("open");
  const [acting,   setActing]   = useState<Record<string, boolean>>({});
  const [customFor, setCustomFor] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await fetchConflicts(filter === "all" ? undefined : filter);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (r: DataConflict, resolution: ConflictResolution, customOverride?: string) => {
    setActing((s) => ({ ...s, [r.id]: true }));
    try {
      const opts = resolution === "use_custom" && customOverride !== undefined ? { customValue: customOverride } : {};
      const updated = await resolveConflict(r.id, resolution, opts);
      setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      setCustomFor(null);
      setCustomValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setActing((s) => ({ ...s, [r.id]: false }));
    }
  };

  return (
    <motion.div
      key="conflicts"
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Data Conflicts
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
            Cross-source mismatches · Vendor / POS / Distributor / Admin · Atomic resolve
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={11} style={{ color: "rgba(180,155,100,0.5)" }} />
          {(["open", "resolved", "dismissed", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.15em] transition-all"
              style={filter === f
                ? { background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.45)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </button>
          ))}
          <button onClick={load} disabled={loading} aria-label="Refresh"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "rgba(230,210,175,0.6)" }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
          <Loader2 size={12} className="animate-spin" /> Loading conflicts…
        </div>
      ) : items.length === 0 ? (
        <div className="text-[11px] px-4 py-8 rounded text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(212,175,55,0.2)", color: "rgba(180,155,100,0.5)" }}>
          {filter === "open" ? "No open conflicts. All data sources agree." : "No conflicts in this view."}
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="conflicts-list">
          <AnimatePresence mode="popLayout">
            {items.map((r) => {
              const colors = STATUS_COLORS[r.status];
              const isOpen = r.status === "open";
              const isShowingCustom = customFor === r.id;
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  data-testid={`conflict-row-${r.id}`}
                  className="rounded-lg p-3"
                  style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(212,175,55,0.12)" }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={14} style={{ color: colors.fg, marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-serif" style={{ color: "rgba(230,210,175,0.92)", fontSize: 13 }}>
                          {r.entityType} · {r.fieldName}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                          style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}
                          data-testid={`conflict-status-${r.id}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        <span className="text-[9px]" style={{ color: "rgba(180,155,100,0.45)" }}>
                          {r.entityId.slice(0, 12)}{r.entityId.length > 12 ? "…" : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <SourceCard source={r.sourceA} value={r.valueA} label="A" />
                        <SourceCard source={r.sourceB} value={r.valueB} label="B" />
                      </div>

                      <div className="text-[10px] mt-2" style={{ color: "rgba(180,155,100,0.5)" }}>
                        Detected {formatDateTime(r.detectedAt)}
                        {r.resolvedAt && ` · Resolved ${formatDateTime(r.resolvedAt)} (${r.resolution})`}
                        {r.resolvedValue !== null && ` → kept "${r.resolvedValue}"`}
                      </div>
                      {r.notes && (
                        <div className="text-[10px] mt-1 italic" style={{ color: "rgba(180,155,100,0.55)" }}>
                          {r.notes}
                        </div>
                      )}

                      {isOpen && (
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          <ResolveBtn label="Use A" icon={<Check size={11} />} disabled={acting[r.id]}
                            onClick={() => resolve(r, "use_a")} tone="ok" testId={`use-a-${r.id}`} />
                          <ResolveBtn label="Use B" icon={<Check size={11} />} disabled={acting[r.id]}
                            onClick={() => resolve(r, "use_b")} tone="ok" testId={`use-b-${r.id}`} />
                          <ResolveBtn label="Custom" icon={<Edit3 size={11} />} disabled={acting[r.id]}
                            onClick={() => { setCustomFor(r.id); setCustomValue(""); }}
                            tone="info" testId={`custom-${r.id}`} />
                          <ResolveBtn label="Dismiss" icon={<X size={11} />} disabled={acting[r.id]}
                            onClick={() => resolve(r, "dismissed")} tone="bad" testId={`dismiss-${r.id}`} />
                          {acting[r.id] && <Loader2 size={12} className="animate-spin" style={{ color: "rgba(212,175,55,0.7)" }} />}
                        </div>
                      )}

                      {isShowingCustom && (
                        <div className="flex items-center gap-2 mt-2">
                          <input value={customValue} onChange={(e) => setCustomValue(e.target.value)}
                            placeholder="Enter override value…"
                            data-testid={`custom-input-${r.id}`}
                            className="flex-1 text-[11px]"
                            style={{
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(212,175,55,0.25)",
                              color: "rgba(230,210,175,0.92)",
                              padding: "6px 10px", borderRadius: 5,
                            }} />
                          <button onClick={() => resolve(r, "use_custom", customValue)} disabled={!customValue.trim() || acting[r.id]}
                            data-testid={`custom-submit-${r.id}`}
                            className="px-3 py-1 rounded-md text-[9px] uppercase tracking-[0.15em]"
                            style={{ background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.45)", opacity: !customValue.trim() ? 0.5 : 1 }}>
                            Save
                          </button>
                          <button onClick={() => { setCustomFor(null); setCustomValue(""); }}
                            className="p-1 rounded-md" style={{ color: "rgba(180,155,100,0.55)" }}>
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function SourceCard({ source, value, label }: { source: string; value: string; label: "A" | "B" }) {
  return (
    <div className="rounded-md p-2"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] mb-1"
        style={{ color: "rgba(180,155,100,0.55)" }}>
        <span>Source {label}</span>
        <span style={{ color: "rgba(212,175,55,0.7)" }}>{source}</span>
      </div>
      <div className="font-mono text-[12px] truncate" style={{ color: "rgba(230,210,175,0.92)" }} title={value}>
        {value}
      </div>
    </div>
  );
}

function ResolveBtn({ label, icon, onClick, disabled, tone, testId }: {
  label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean;
  tone: "ok" | "bad" | "info"; testId?: string;
}) {
  const palette = {
    ok:   { bg: "rgba(80,160,90,0.18)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
    bad:  { bg: "rgba(180,40,40,0.15)",  fg: "rgba(255,180,170,0.9)",  border: "rgba(180,40,40,0.45)" },
    info: { bg: "rgba(80,140,200,0.18)", fg: "rgba(180,220,255,0.95)", border: "rgba(80,140,200,0.5)" },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-[0.15em] transition-all"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, opacity: disabled ? 0.5 : 1 }}>
      {icon} {label}
    </button>
  );
}
