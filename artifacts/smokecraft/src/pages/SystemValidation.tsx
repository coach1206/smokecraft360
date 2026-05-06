/**
 * SystemValidation — /admin/system-validation
 *
 * Live system health dashboard + one-click smoke test for all platform systems.
 * Designed for operators and investors to verify the platform is fully operational.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, ChevronDown, ChevronRight, Cpu,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemCheckResult {
  system:     string;
  status:     "passed" | "failed" | "warning" | "skipped";
  message:    string;
  durationMs: number;
  detail?:    string;
}

interface ValidationRun {
  id:        string;
  status:    string;
  summary:   string;
  details:   SystemCheckResult[];
  ranBy:     string | null;
  createdAt: string;
}

interface HealthItem {
  system: string;
  status: "healthy" | "warning" | "failed";
  count?: number;
  error?: string;
}

// ── Design tokens (light mode — matches SwipeIntelligence) ───────────────────

const C = {
  bg:      "#F5F4F0",
  card:    "#FFFFFF",
  border:  "rgba(26,20,16,0.09)",
  text:    "#1A1410",
  muted:   "rgba(26,20,16,0.45)",
  dim:     "rgba(26,20,16,0.28)",
  accent:  "#1A1410",
  gold:    "#b8952a",
  green:   "#16a34a",
  red:     "#dc2626",
  orange:  "#ea580c",
  blue:    "#2563eb",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function apiPost(path: string, body: unknown = {}) {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// ── System display names ──────────────────────────────────────────────────────

const SYSTEM_LABELS: Record<string, string> = {
  database:               "Database",
  swipe_engine:           "Swipe Engine",
  inventory:              "Inventory",
  memory_brain:           "Memory Brain",
  add_to_order:           "Add-to-Order",
  reservations:           "Reservations",
  analytics:              "Analytics",
  orchestrator:           "Orchestrator",
  db_connectivity:        "DB Connectivity",
  start_session:          "Start Session",
  load_swipe_cards:       "Load Swipe Cards",
  record_add_swipe:       "Record Add Swipe",
  record_skip_swipe:      "Record Skip Swipe",
  recommendation_engine:  "Recommendation Engine",
  inventory_validation:   "Inventory Validation",
  create_reservation:     "Create Reservation",
  add_item_to_order:      "Add Item to Order",
  cancel_and_release:     "Cancel + Release",
  analytics_event:        "Analytics Event",
  orchestrator_event:     "Orchestrator Event",
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const conf = {
    passed:  { color: C.green,  bg: "#dcfce7", label: "passed",  Icon: CheckCircle2 },
    healthy: { color: C.green,  bg: "#dcfce7", label: "healthy", Icon: CheckCircle2 },
    warning: { color: C.orange, bg: "#fff7ed", label: "warning", Icon: AlertTriangle },
    partial: { color: C.orange, bg: "#fff7ed", label: "partial", Icon: AlertTriangle },
    failed:  { color: C.red,    bg: "#fef2f2", label: "failed",  Icon: XCircle },
    skipped: { color: C.muted,  bg: "#f5f4f0", label: "skipped", Icon: Clock },
  }[status] ?? { color: C.muted, bg: "#f5f4f0", label: status, Icon: Clock };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: conf.bg, color: conf.color,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
    }}>
      <conf.Icon size={11} /> {conf.label.toUpperCase()}
    </span>
  );
}

// ── Health card ───────────────────────────────────────────────────────────────

function HealthCard({ item }: { item: HealthItem }) {
  const isGreen = item.status === "healthy";
  const isRed   = item.status === "failed";
  const accent  = isGreen ? C.green : isRed ? C.red : C.orange;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "16px 18px",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {SYSTEM_LABELS[item.system] ?? item.system}
          </div>
          {"count" in item && (
            <div style={{ fontSize: 11, color: C.muted }}>{item.count?.toLocaleString()} rows</div>
          )}
          {item.error && (
            <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{item.error}</div>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>
    </motion.div>
  );
}

// ── Check result row ──────────────────────────────────────────────────────────

function CheckRow({ check, index: idx }: { check: SystemCheckResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {SYSTEM_LABELS[check.system] ?? check.system}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{check.message}</div>
        </div>
        <span style={{ fontSize: 11, color: C.dim, minWidth: 48, textAlign: "right" }}>
          {check.durationMs}ms
        </span>
        <StatusBadge status={check.status} />
        {check.detail && (
          <button
            onClick={() => setExpanded(p => !p)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && check.detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: "hidden",
              marginTop: 8,
              padding: "10px 12px",
              background: "#fef2f2",
              borderRadius: 8,
              fontSize: 11,
              color: C.red,
              fontFamily: "monospace",
            }}
          >
            {check.detail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ run }: { run: ValidationRun }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: "12px 0",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}
      >
        <StatusBadge status={run.status} />
        <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{run.summary}</span>
        <span style={{ fontSize: 11, color: C.dim }}>
          {new Date(run.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
        </span>
        {expanded ? <ChevronDown size={13} color={C.dim} /> : <ChevronRight size={13} color={C.dim} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", paddingBottom: 12 }}
          >
            {run.details.map((c, i) => <CheckRow key={c.system + i} check={c} index={i} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SystemValidation() {
  const [, navigate] = useLocation();
  const [runs,    setRuns]    = useState<ValidationRun[]>([]);
  const [health,  setHealth]  = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [latest,  setLatest]  = useState<{ checks: SystemCheckResult[]; summary: string; status: string } | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet("/api/admin/system-validation");
      setRuns(data.runs ?? []);
      setHealth(data.health ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runSmokeTest() {
    setRunning(true);
    setLatest(null);
    setError(null);
    try {
      const data = await apiPost("/api/admin/system-validation/run");
      setLatest({ checks: data.checks, summary: data.summary, status: data.status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smoke test failed");
    } finally {
      setRunning(false);
    }
  }

  const overallHealth = health.length === 0 ? "unknown"
    : health.some(h => h.status === "failed")  ? "failed"
    : health.some(h => h.status === "warning") ? "warning"
    : "healthy";

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <div style={{
        background: "#FFFFFF", borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "6px 12px",
              color: C.muted, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1A1410", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cpu size={16} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>System Validation</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>OPERATIONAL READINESS · AXIOM OS</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {overallHealth !== "unknown" && <StatusBadge status={overallHealth} />}
            <button
              onClick={runSmokeTest}
              disabled={running}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: running ? "rgba(26,20,16,0.5)" : "#1A1410",
                color: "#d4af37",
                border: "none", borderRadius: 10, padding: "8px 18px",
                fontSize: 13, fontWeight: 700, cursor: running ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {running
                ? <><RefreshCw size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Running…</>
                : <><Play size={14} fill="currentColor" /> Run Smoke Test</>
              }
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 12, padding: "14px 18px", marginBottom: 20,
            color: C.red, fontSize: 13,
          }}>
            {error === "401" ? "Sign in as admin to access system validation" : `Error: ${error}`}
          </div>
        )}

        {/* ── Latest smoke test result ── */}
        <AnimatePresence>
          {latest && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "22px 24px", marginBottom: 24,
                borderTop: `3px solid ${latest.status === "passed" ? C.green : latest.status === "partial" ? C.orange : C.red}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <StatusBadge status={latest.status} />
                <span style={{ fontSize: 13, color: C.muted }}>{latest.summary}</span>
              </div>
              {latest.checks.map((c, i) => <CheckRow key={c.system + i} check={c} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live health grid ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2px solid rgba(0,0,0,0.08)", borderTop: "2px solid #1A1410",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            Loading system health…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              Live System Health
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 10, marginBottom: 32,
            }}>
              {health.map(item => <HealthCard key={item.system} item={item as HealthItem} />)}
            </div>

            {/* ── History ── */}
            {runs.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                  Validation History
                </div>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "4px 20px 0",
                }}>
                  {runs.map(run => <HistoryRow key={run.id} run={run} />)}
                </div>
              </div>
            )}

            {runs.length === 0 && !latest && (
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "40px 24px", textAlign: "center",
              }}>
                <Cpu size={28} color={C.dim} style={{ marginBottom: 12 }} />
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                  No smoke tests have been run yet. Click <strong>Run Smoke Test</strong> to verify all systems.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
