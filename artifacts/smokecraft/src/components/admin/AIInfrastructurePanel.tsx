import { useEffect, useState }    from "react";
import { useLocation }             from "wouter";
import { motion }                  from "framer-motion";
import {
  Brain, Server, Shield, CheckCircle2, AlertCircle,
  ExternalLink, TrendingUp, Zap, RotateCcw, Activity,
  ChevronRight,
} from "lucide-react";

const C = {
  bg:      "#F5F2ED",
  card:    "#EAE6DB",
  border:  "rgba(212,139,0,0.16)",
  gold:    "#D48B00",
  amber:   "#B8790A",
  ink:     "#1A1A1B",
  muted:   "#6B5E4E",
  dim:     "#8C7B69",
  green:   "#1A6B3A",
  red:     "#C0392B",
  blue:    "#1A4B8A",
  purple:  "#5B3FA0",
  mono:    "'JetBrains Mono','Courier New',monospace",
  serif:   "'Cormorant Garamond',serif",
  sans:    "'Inter',sans-serif",
};

interface BillingMode {
  mode:     string;
  packageTier: string;
  isActive: boolean;
}

interface Provider {
  providerName: string;
  isEnabled:    boolean;
  isPrimary:    boolean;
  priority:     number;
}

interface Usage {
  totalRequests:    number;
  successfulCalls:  number;
  failedCalls:      number;
  tokenUsage:       number;
  period:           string;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <motion.span
      animate={{ opacity: ok ? [1, 0.5, 1] : 1 }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        background: ok ? "#4ade80" : "#ef4444", flexShrink: 0,
      }}
    />
  );
}

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ height: 4, borderRadius: 2, background: `${color}18`, overflow: "hidden", flex: 1 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 2 }}
      />
    </div>
  );
}

export default function AIInfrastructurePanel() {
  const [, navigate]  = useLocation();
  const [mode,        setMode]      = useState<BillingMode | null>(null);
  const [providers,   setProviders] = useState<Provider[]>([]);
  const [usage,       setUsage]     = useState<Usage | null>(null);
  const [loading,     setLoading]   = useState(true);
  const [error,       setError]     = useState(false);

  const token = localStorage.getItem("smokecraft_token");

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : ({} as Record<string, string>);

      const [mRes, pRes, uRes] = await Promise.all([
        fetch("/api/enterprise-ai/billing-mode", { headers }),
        fetch("/api/enterprise-ai/providers",    { headers }),
        fetch("/api/enterprise-ai/usage",        { headers }),
      ]);

      if (mRes.ok) {
        const j = await mRes.json() as { billingMode?: BillingMode };
        setMode(j.billingMode ?? null);
      }
      if (pRes.ok) {
        const j = await pRes.json() as { providers?: Provider[] };
        setProviders(j.providers ?? []);
      }
      if (uRes.ok) {
        const j = await uRes.json() as { usage?: Usage };
        setUsage(j.usage ?? null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const isBYOK       = mode?.mode === "byok";
  const modeColor    = isBYOK ? C.purple : C.green;
  const modeLabel    = isBYOK ? "BYOK" : "MANAGED";
  const primaryProv  = providers.find(p => p.isPrimary);
  const enabledProvs = providers.filter(p => p.isEnabled);
  const healthOk     = !error && (usage ? usage.failedCalls / Math.max(1, usage.totalRequests) < 0.1 : true);

  return (
    <div id="ai_infra" style={{ marginBottom: 14 }}>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, paddingTop: 4 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Brain size={19} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.20em", fontWeight: 700 }}>CL-06 · {healthOk ? "OPERATIONAL" : "ATTENTION REQUIRED"}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, fontFamily: C.serif, letterSpacing: "0.04em", lineHeight: 1.1 }}>AI Infrastructure</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => { void load(); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: `${C.gold}10`, border: `1px solid ${C.border}`, cursor: "pointer" }}
            title="Refresh"
          >
            <RotateCcw size={12} color={C.amber} />
          </motion.button>
          <div style={{ padding: "4px 10px", borderRadius: 5, background: `${C.gold}14`, border: `1px solid ${C.gold}35`, fontSize: 8, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>
            {healthOk ? "ACTIVE" : "REVIEW"}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px", borderRadius: 11, background: C.card, border: `1px solid ${C.border}` }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.gold}30`, borderTopColor: C.gold }} />
          <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>Loading AI infrastructure status…</span>
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderRadius: 11, background: `${C.red}08`, border: `1px solid ${C.red}25` }}>
          <AlertCircle size={16} color={C.red} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>Authentication required</div>
            <div style={{ fontSize: 10, color: C.muted }}>Sign in with admin credentials to view AI infrastructure status.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Mode + Health row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {/* Mode */}
            <div style={{ padding: "14px 16px", borderRadius: 11, background: C.card, border: `1px solid ${modeColor}22` }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>AI Mode</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isBYOK ? <Server size={15} color={C.purple} /> : <Shield size={15} color={C.green} />}
                <span style={{ fontSize: 14, fontWeight: 700, color: modeColor, fontFamily: C.mono }}>{modeLabel}</span>
              </div>
              <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>
                {isBYOK ? "Your provider keys" : "NOVEE-managed"}
              </div>
            </div>

            {/* Health */}
            <div style={{ padding: "14px 16px", borderRadius: 11, background: C.card, border: `1px solid ${healthOk ? C.green : C.red}22` }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>AI Health</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusDot ok={healthOk} />
                <span style={{ fontSize: 14, fontWeight: 700, color: healthOk ? "#4ade80" : "#ef4444", fontFamily: C.mono }}>
                  {healthOk ? "HEALTHY" : "DEGRADED"}
                </span>
              </div>
              <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>
                {usage ? `${usage.failedCalls} failed calls` : "No usage data"}
              </div>
            </div>

            {/* Primary provider */}
            <div style={{ padding: "14px 16px", borderRadius: 11, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Primary Provider</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={15} color={C.amber} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: C.mono, textTransform: "uppercase" }}>
                  {primaryProv?.providerName ?? (isBYOK ? "Not set" : "NOVEE Intelligence")}
                </span>
              </div>
              <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>
                {enabledProvs.length} provider{enabledProvs.length !== 1 ? "s" : ""} enabled
              </div>
            </div>
          </div>

          {/* Usage */}
          {usage && (
            <div style={{ padding: "14px 16px", borderRadius: 11, background: C.card, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
                Usage · {usage.period ?? "Current Period"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Total Requests",  value: usage.totalRequests,   max: usage.totalRequests + 500,  color: C.gold   },
                  { label: "Success",         value: usage.successfulCalls, max: usage.totalRequests || 1,   color: "#4ade80" },
                  { label: "Failed",          value: usage.failedCalls,     max: usage.totalRequests || 1,   color: "#ef4444" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 9, color: C.muted, fontFamily: C.mono, minWidth: 100 }}>{row.label}</span>
                    <MetricBar value={row.value} max={row.max} color={row.color} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: row.color, fontFamily: C.mono, minWidth: 36, textAlign: "right" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              {usage.tokenUsage > 0 && (
                <div style={{ marginTop: 10, fontSize: 9, color: C.muted, fontFamily: C.mono }}>
                  <span style={{ color: C.amber }}>{usage.tokenUsage.toLocaleString()}</span> tokens consumed
                </div>
              )}
            </div>
          )}

          {/* Failover chain */}
          {providers.length > 0 && (
            <div style={{ padding: "14px 16px", borderRadius: 11, background: C.card, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
                Failover Chain
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...providers].sort((a, b) => a.priority - b.priority).map((p, i) => (
                  <div key={p.providerName} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, minWidth: 20 }}>P{i + 1}</span>
                    <StatusDot ok={p.isEnabled} />
                    <span style={{ fontSize: 11, fontWeight: p.isPrimary ? 700 : 400, color: p.isPrimary ? C.ink : C.muted, textTransform: "uppercase", fontFamily: C.mono }}>
                      {p.providerName}
                    </span>
                    {p.isPrimary && (
                      <span style={{ fontSize: 8, fontWeight: 800, color: C.green, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 3, background: `${C.green}14`, border: `1px solid ${C.green}30` }}>
                        PRIMARY
                      </span>
                    )}
                    {!p.isEnabled && (
                      <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.10em" }}>DISABLED</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!mode && !providers.length && (
            <div style={{ padding: "16px 18px", borderRadius: 11, background: `${C.gold}08`, border: `1px dashed ${C.gold}35`, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Zap size={15} color={C.gold} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>AI Infrastructure Not Configured</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>
                Configure your AI provider ownership model to enable personalized recommendations, Revenue Brain, and all AI-powered features.
              </div>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/enterprise/ai-config")}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderRadius: 11, cursor: "pointer",
          background: `linear-gradient(135deg, ${C.gold}16, ${C.gold}08)`,
          border: `1px solid ${C.gold}35`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp size={15} color={C.gold} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>Full AI Configuration</div>
            <div style={{ fontSize: 10, color: C.muted }}>Providers · API keys · Failover · Usage limits</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <ExternalLink size={12} color={C.gold} />
          <ChevronRight size={14} color={C.gold} />
        </div>
      </motion.button>

    </div>
  );
}
