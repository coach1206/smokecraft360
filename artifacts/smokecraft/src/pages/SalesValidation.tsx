/**
 * Sales Validation Dashboard — Phase 10
 *
 * Live capability health checklist. Each sellable feature pings its real
 * API endpoint and shows operational status. Super_admin only.
 *
 * Route: /sales-validation
 */

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, RefreshCw, Check, X, Clock, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Design tokens ─────────────────────────────────────────────────────────

const GOLD   = "#D48B00";
const CREAM  = "#F5F2ED";
const BG     = "#0A0A0B";
const GLASS  = "rgba(245,242,237,0.05)";

// ── Capability definitions ────────────────────────────────────────────────

type CapStatus = "idle" | "checking" | "ok" | "warn" | "error";

interface Capability {
  id:       string;
  name:     string;
  phase:    string;
  endpoint: string;
  method:   "GET" | "POST";
  body?:    unknown;
  /** Optional: expected field in JSON response to confirm live data */
  expectKey?: string;
  status:   CapStatus;
  latency:  number | null;
  detail:   string;
}

const CAPABILITIES: Omit<Capability, "status" | "latency" | "detail">[] = [
  // Phase 1 — Entitlement + Provisioning
  { id: "entitlement-summary",  phase: "P1 Entitlement",    name: "Platform Revenue Summary",      method: "GET",  endpoint: "/api/revenue-engine/summary",          expectKey: undefined },
  { id: "tier-map",             phase: "P1 Entitlement",    name: "Tier Capability Map",            method: "GET",  endpoint: "/api/revenue-engine/provision/tier-map" },
  { id: "feature-flags",        phase: "P1 Entitlement",    name: "Feature Flag Resolution",        method: "GET",  endpoint: "/api/feature-flags/resolve" },
  { id: "license-status",       phase: "P1 Entitlement",    name: "License Authority",              method: "GET",  endpoint: "/api/license/status" },
  { id: "module-catalog",       phase: "P1 Entitlement",    name: "Module Catalog",                 method: "GET",  endpoint: "/api/revenue-engine/modules/catalog" },

  // Phase 2 — Revenue Attribution
  { id: "revenue-events",       phase: "P2 Attribution",    name: "Revenue Events Pipeline",        method: "GET",  endpoint: "/api/revenue-engine/events/platform?limit=1" },
  { id: "revenue-forecast",     phase: "P2 Attribution",    name: "Revenue Forecast Engine",        method: "GET",  endpoint: "/api/revenue-engine/forecast" },
  { id: "revenue-plans",        phase: "P2 Attribution",    name: "Subscription Plans",             method: "GET",  endpoint: "/api/revenue-engine/plans" },

  // Phase 3 — Billing
  { id: "pricing-rules",        phase: "P3 Billing",        name: "Dynamic Pricing Rules",          method: "GET",  endpoint: "/api/revenue-engine/pricing/rules" },
  { id: "hardware-mrr",         phase: "P3 Billing",        name: "Hardware Lease MRR",             method: "GET",  endpoint: "/api/revenue-engine/hardware/platform/mrr" },
  { id: "reconciliation",       phase: "P3 Billing",        name: "Financial Reconciliation",       method: "GET",  endpoint: "/api/reconciliation/summary" },

  // Phase 5 — Enterprise
  { id: "enterprise-contracts", phase: "P5 Enterprise",     name: "Enterprise Contracts",           method: "GET",  endpoint: "/api/revenue-engine/enterprise/contracts" },
  { id: "enterprise-wl",        phase: "P5 Enterprise",     name: "White-Label Registry",           method: "GET",  endpoint: "/api/revenue-engine/enterprise/white-label" },
  { id: "marketplace",          phase: "P8 Marketplace",    name: "Module Marketplace Listings",    method: "GET",  endpoint: "/api/revenue-engine/marketplace/listings" },

  // Phase 6 — Devices
  { id: "devices",              phase: "P6 Hardware",       name: "Device Registry",                method: "GET",  endpoint: "/api/devices" },

  // Phase 7 — AI
  { id: "ai-quota",             phase: "P7 AI Economics",   name: "AI Quota System (platform)",     method: "GET",  endpoint: "/api/revenue-engine/ai/quota/platform" },

  // Phase 9 — Ops
  { id: "os-events",            phase: "P9 Founder Ops",    name: "OS Event Bus",                   method: "GET",  endpoint: "/api/os/events?limit=1" },
  { id: "system-version",       phase: "P12 Hardening",     name: "System Version / Health",        method: "GET",  endpoint: "/api/system/version" },

  // Phase 11 — Experience
  { id: "products",             phase: "P11 Experience",    name: "Product Catalog",                method: "GET",  endpoint: "/api/products" },
  { id: "themes",               phase: "P11 Experience",    name: "Venue Theme Config",             method: "GET",  endpoint: "/api/themes/smokecraft" },
  { id: "distributors",         phase: "P11 Experience",    name: "Distributor Supply Chain",       method: "GET",  endpoint: "/api/distributors" },
];

function initCapabilities(): Capability[] {
  return CAPABILITIES.map((c) => ({ ...c, status: "idle", latency: null, detail: "" }));
}

// ── Status color map ──────────────────────────────────────────────────────

const STATUS_COLOR: Record<CapStatus, string> = {
  idle:     "#8A9BB0",
  checking: "#D48B00",
  ok:       "#5E9E6E",
  warn:     "#E87040",
  error:    "#C0392B",
};

const STATUS_ICON: Record<CapStatus, React.ReactNode> = {
  idle:     <Clock size={10} />,
  checking: <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={10} /></motion.span>,
  ok:       <Check size={10} />,
  warn:     <AlertTriangle size={10} />,
  error:    <X size={10} />,
};

// ── Capability row ─────────────────────────────────────────────────────────

function CapRow({ cap, idx }: { cap: Capability; idx: number }) {
  const color = STATUS_COLOR[cap.status];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.03 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 12,
        border: `1px solid ${color}20`,
        background: cap.status === "ok" ? "rgba(94,158,110,0.06)" :
                    cap.status === "error" ? "rgba(192,57,43,0.06)" : GLASS,
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ color, flexShrink: 0 }}>{STATUS_ICON[cap.status]}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: CREAM, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {cap.name}
          </div>
          <div style={{ fontSize: 9, color: "rgba(245,242,237,0.3)", fontFamily: "monospace", marginTop: 2 }}>
            {cap.endpoint}
          </div>
          {cap.detail && (
            <div style={{ fontSize: 9, color: cap.status === "error" ? "#C0392B" : "rgba(245,242,237,0.4)", marginTop: 2 }}>
              {cap.detail}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
        {cap.latency !== null && (
          <span style={{ fontSize: 9, color: "rgba(245,242,237,0.3)" }}>{cap.latency}ms</span>
        )}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 8px", borderRadius: 999, border: `1px solid ${color}35`,
          background: `${color}12`, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", color,
        }}>
          {cap.status.toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SalesValidation() {
  const { user } = useAuth();
  const [caps, setCaps] = useState<Capability[]>(initCapabilities);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setDone(false);
    // Set all to checking
    setCaps((prev) => prev.map((c) => ({ ...c, status: "checking", latency: null, detail: "" })));

    const results = await Promise.allSettled(
      CAPABILITIES.map(async (cap, i) => {
        const t0 = Date.now();
        try {
          const r = await fetch(cap.endpoint, {
            method:      cap.method,
            credentials: "include",
            headers:     cap.body ? { "Content-Type": "application/json" } : undefined,
            body:        cap.body ? JSON.stringify(cap.body) : undefined,
          });
          const latency = Date.now() - t0;
          const status: CapStatus = r.ok ? "ok" : r.status === 404 ? "warn" : "error";
          return { i, status, latency, detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status}` };
        } catch (e) {
          return { i, status: "error" as CapStatus, latency: Date.now() - t0, detail: e instanceof Error ? e.message : "Network error" };
        }
      })
    );

    setCaps((prev) => {
      const next = [...prev];
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const { i, status, latency, detail } = r.value;
          next[i] = { ...next[i]!, status, latency, detail };
        }
      });
      return next;
    });

    setRunning(false);
    setDone(true);
  }, []);

  if (user?.role !== "super_admin") {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(245,242,237,0.3)", fontSize: 13 }}>
          <Shield size={28} color={GOLD} style={{ marginBottom: 16 }} />
          <div style={{ letterSpacing: "0.1em" }}>SUPER ADMIN ACCESS REQUIRED</div>
        </div>
      </div>
    );
  }

  const phases = [...new Set(caps.map((c) => c.phase))];
  const totalOk    = caps.filter((c) => c.status === "ok").length;
  const totalError = caps.filter((c) => c.status === "error").length;
  const totalWarn  = caps.filter((c) => c.status === "warn").length;
  const score      = done ? Math.round((totalOk / caps.length) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 300, color: CREAM,
              letterSpacing: "0.2em", textTransform: "uppercase",
              fontFamily: "'Cormorant Garamond', Georgia, serif", margin: 0,
            }}>
              Sales Validation
            </h1>
            <p style={{ fontSize: 10, color: "rgba(245,242,237,0.3)", margin: "4px 0 0", letterSpacing: "0.12em" }}>
              PHASE 10 · OPERATIONAL CAPABILITY AUDIT · {caps.length} CAPABILITIES
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {done && score !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: "8px 16px", borderRadius: 12,
                  border: `1px solid ${score >= 80 ? "#5E9E6E" : "#E87040"}30`,
                  background: `${score >= 80 ? "#5E9E6E" : "#E87040"}12`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: score >= 80 ? "#5E9E6E" : "#E87040" }}>{score}%</div>
                <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Operational</div>
              </motion.div>
            )}
            <motion.button
              type="button"
              onClick={() => { void runAll(); }}
              disabled={running}
              whileTap={{ scale: 0.93 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: 999,
                border: `1px solid ${GOLD}50`,
                background: `${GOLD}18`,
                color: GOLD, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.7 : 1,
              }}
            >
              <Zap size={12} />
              {running ? "Validating…" : done ? "Re-Validate" : "Validate All"}
            </motion.button>
          </div>
        </div>

        {/* ── Score bar ── */}
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", gap: 16, marginBottom: 24,
              padding: "14px 18px", borderRadius: 14,
              border: "1px solid rgba(245,242,237,0.08)",
              background: GLASS,
            }}
          >
            {[
              { label: "Operational", count: totalOk,    color: "#5E9E6E" },
              { label: "Warning",     count: totalWarn,  color: "#E87040" },
              { label: "Failed",      count: totalError, color: "#C0392B" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color }}>{count}</span>
                <span style={{ fontSize: 10, color: "rgba(245,242,237,0.4)" }}>{label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Capability groups ── */}
        {phases.map((phase) => {
          const phaseCaps = caps.filter((c) => c.phase === phase);
          return (
            <div key={phase} style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
                textTransform: "uppercase", color: GOLD, marginBottom: 10,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {phase}
                <span style={{ color: "rgba(245,242,237,0.2)", fontWeight: 400 }}>
                  {phaseCaps.filter((c) => c.status === "ok").length}/{phaseCaps.length}
                </span>
              </div>
              {phaseCaps.map((cap, i) => <CapRow key={cap.id} cap={cap} idx={i} />)}
            </div>
          );
        })}

        {!done && !running && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(245,242,237,0.25)", fontSize: 13, letterSpacing: "0.06em" }}>
            Press <strong style={{ color: GOLD }}>Validate All</strong> to run a live operational audit of every sellable capability.
          </div>
        )}

      </div>
    </div>
  );
}
