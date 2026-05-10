/**
 * OperatorReadiness — /admin/operator-readiness
 *
 * Operator launch checklist showing live readiness state across all 10 system areas.
 * Print-friendly for shift handover use.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Printer, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronRight, Rocket,
  ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReadinessItem {
  key:     string;
  label:   string;
  status:  "ready" | "warning" | "missing";
  message: string;
  fix:     string;
}

interface ReadinessSection {
  key:    string;
  label:  string;
  items:  ReadinessItem[];
  status: "ready" | "warning" | "missing";
}

interface ReadinessReport {
  sections:      ReadinessSection[];
  overallStatus: "ready" | "warning" | "missing";
  summary:       string;
  checkedAt:     string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     "#F5F4F0",
  card:   "#1A1A1B",
  border: "rgba(26,20,16,0.09)",
  text:   "#1A1410",
  muted:  "rgba(26,20,16,0.45)",
  dim:    "rgba(26,20,16,0.28)",
  gold:   "#b8952a",
  green:  "#16a34a",
  red:    "#dc2626",
  orange: "#ea580c",
};

// ── Section icons / colors ────────────────────────────────────────────────────

const SECTION_META: Record<string, { color: string; emoji: string }> = {
  system_health:     { color: "#2563eb", emoji: "🔵" },
  inventory:         { color: "#16a34a", emoji: "📦" },
  venue_settings:    { color: "#D48B00", emoji: "🏛️" },
  experience_controls: { color: "#8b5cf6", emoji: "🎛️" },
  demo_mode:         { color: "#0891b2", emoji: "🎬" },
  staff_access:      { color: "#ea580c", emoji: "👥" },
  order_flow:        { color: "#16a34a", emoji: "🛒" },
  analytics:         { color: "#D48B00", emoji: "📊" },
  sound_assets:      { color: "#8b5cf6", emoji: "🔊" },
  performance_mode:  { color: "#2563eb", emoji: "⚡" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Status components ─────────────────────────────────────────────────────────

function StatusBadge({ status, small = false }: { status: string; small?: boolean }) {
  const conf: Record<string, { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }> = {
    ready:   { color: C.green,  bg: "#dcfce7", label: "Ready",   Icon: CheckCircle2 },
    warning: { color: C.orange, bg: "#fff7ed", label: "Warning", Icon: AlertTriangle },
    missing: { color: C.red,    bg: "#fef2f2", label: "Action Needed", Icon: XCircle },
  };
  const c = conf[status] ?? conf["missing"]!;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 8px" : "4px 10px",
      borderRadius: 20, background: c.bg, color: c.color,
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: "0.06em",
      whiteSpace: "nowrap",
    }}>
      <c.Icon size={small ? 10 : 11} /> {c.label.toUpperCase()}
    </span>
  );
}

// ── Section component ─────────────────────────────────────────────────────────

function SectionCard({ section, defaultOpen }: { section: ReadinessSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SECTION_META[section.key] ?? { color: C.muted, emoji: "⚙️" };

  return (
    <motion.div
      className="print-card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 14, marginBottom: 12, overflow: "hidden",
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18 }}>{meta.emoji}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text }}>{section.label}</span>
        <StatusBadge status={section.status} small />
        <span style={{ color: C.dim }}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "4px 0 8px" }}>
              {section.items.map((item, i) => (
                <ChecklistItem key={item.key} item={item} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ChecklistItem({ item, index }: { item: ReadinessItem; index: number }) {
  const [showFix, setShowFix] = useState(item.status !== "ready");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      style={{
        padding: "10px 20px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ paddingTop: 2 }}>
          {item.status === "ready"   && <CheckCircle2 size={15} color={C.green} />}
          {item.status === "warning" && <AlertTriangle size={15} color={C.orange} />}
          {item.status === "missing" && <XCircle size={15} color={C.red} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.label}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{item.message}</div>

          {item.status !== "ready" && (
            <button
              onClick={() => setShowFix(p => !p)}
              style={{
                marginTop: 6, background: "none", border: "none",
                cursor: "pointer", color: item.status === "missing" ? C.red : C.orange,
                fontSize: 11, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {showFix ? "▲ Hide fix" : "▼ How to fix"}
            </button>
          )}

          <AnimatePresence>
            {showFix && item.status !== "ready" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  marginTop: 8, padding: "10px 12px",
                  background: item.status === "missing" ? "#fef2f2" : "#fff7ed",
                  borderRadius: 8, fontSize: 12, color: C.text, lineHeight: 1.6,
                  borderLeft: `3px solid ${item.status === "missing" ? C.red : C.orange}`,
                }}>
                  {item.fix}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <StatusBadge status={item.status} small />
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .print-card { break-inside: avoid; page-break-inside: avoid; }
  body { background: white !important; }
  * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
}
`;

export default function OperatorReadiness() {
  const [, navigate] = useLocation();
  const [report,    setReport]   = useState<ReadinessReport | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}/api/admin/operator-readiness`, { headers: authHeaders() });
      if (!r.ok) { setError(r.status === 401 ? "401" : r.status === 403 ? "403" : `${r.status}`); return; }
      const data: ReadinessReport = await r.json();
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const overall = report?.overallStatus;
  const overallColor = overall === "ready" ? C.green : overall === "warning" ? C.orange : C.red;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>
      <style>{PRINT_STYLE}</style>

      {/* Header */}
      <div className="no-print" style={{
        background: "#1A1A1B", borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, height: 60 }}>
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
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#1A1410",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Rocket size={16} color="#D48B00" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Operator Readiness</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>LAUNCH CHECKLIST · AXIOM OS</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {report && <StatusBadge status={report.overallStatus} />}
            <button
              onClick={() => void load(true)}
              disabled={refreshing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "6px 14px",
                color: C.muted, fontSize: 12, cursor: "pointer",
              }}
            >
              <RefreshCw size={13} style={refreshing ? { animation: "spin 0.7s linear infinite" } : {}} />
              Refresh
            </button>
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "6px 14px",
                color: C.muted, fontSize: 12, cursor: "pointer",
              }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Print title */}
        <div style={{ display: "none" }} className="print-header">
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>NOVEE OS — Operator Readiness Checklist</h1>
          <p style={{ color: C.muted, margin: "0 0 24px", fontSize: 13 }}>
            Generated: {new Date().toLocaleString()} · Run before every shift
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 12, padding: "16px 20px", marginBottom: 20,
            color: C.red, fontSize: 13,
          }}>
            {error === "401" || error === "403"
              ? "Sign in as venue_owner, manager, or super_admin to access operator readiness."
              : `Error loading readiness data: ${error}`}
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2px solid rgba(26,26,27,0.02)", borderTop: "2px solid #1A1410",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            Checking system readiness…
          </div>
        )}

        {report && (
          <>
            {/* Overall status banner */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderTop: `4px solid ${overallColor}`,
              borderRadius: 16, padding: "20px 24px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: overallColor + "15",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {overall === "ready"   && <CheckCircle2 size={22} color={C.green} />}
                {overall === "warning" && <AlertTriangle size={22} color={C.orange} />}
                {overall === "missing" && <XCircle size={22} color={C.red} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                  {overall === "ready" ? "Venue Ready to Operate"
                    : overall === "warning" ? "Venue Operational — Improvements Available"
                    : "Action Required Before Opening"}
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>{report.summary}</div>
              </div>
              <div style={{ fontSize: 11, color: C.dim, textAlign: "right" }}>
                Checked<br />
                {new Date(report.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Quick links */}
            <div className="no-print" style={{
              display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20,
            }}>
              {[
                { label: "System Validation", href: "/admin/system-validation" },
                { label: "Experience Control", href: "/admin/experience-control" },
                { label: "Staff Training",     href: "/training/staff" },
                { label: "Operator Manual",    href: "/admin/manual" },
                { label: "Demo Mode",          href: "/demo/axiom-experience" },
                { label: "Analytics",          href: "/analytics/swipe-intelligence" },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 8,
                    background: C.card, border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 12, textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {link.label} <ExternalLink size={10} />
                </a>
              ))}
            </div>

            {/* Section cards */}
            <div>
              {report.sections.map((section, i) => (
                <SectionCard
                  key={section.key}
                  section={section}
                  defaultOpen={section.status !== "ready" || i < 3}
                />
              ))}
            </div>

            {/* Footer note */}
            <div style={{
              marginTop: 24, padding: "14px 18px",
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, fontSize: 12, color: C.muted, lineHeight: 1.6,
            }}>
              <strong style={{ color: C.text }}>Pre-shift checklist:</strong> Run this page at the start of every shift.
              All "Action Needed" items should be resolved before opening. "Warning" items indicate degraded but functional states.
              For any system failures, contact your Axiom support contact with the smoke test output from{" "}
              <a href="/admin/system-validation" style={{ color: C.gold }}>System Validation</a>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
