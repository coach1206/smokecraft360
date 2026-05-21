/**
 * Phase 15 — Integration Analytics Panel
 *
 * Provider performance: request volume, p95 latency, error rate, token usage.
 * Usage metering: budget consumption per provider.
 * Time range: 24h / 7d / 30d selector.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface MetricSummary {
  providerId:    string;
  providerName:  string;
  providerType:  string;
  totalRequests: number;
  successCount:  number;
  errorCount:    number;
  errorRate:     number;
  p50Ms:         number | null;
  p95Ms:         number | null;
  p99Ms:         number | null;
  avgTokens:     number | null;
  totalTokens:   number;
}

interface UsageSummary {
  providerId:      string;
  dailyRequests:   number;
  monthlyRequests: number;
  monthlyTokens:   number;
  limits: {
    dailyRequests:   number | null;
    monthlyRequests: number | null;
    monthlyTokens:   number | null;
    alertThreshold:  number;
  } | null;
  budgetPct: number | null;
}

const HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };

interface Props {
  venueId: string;
  GOLD:    string;
  CREAM:   string;
}

export function IntegrationAnalyticsPanel({ venueId, GOLD, CREAM }: Props) {
  const [range,   setRange]   = useState<"24h" | "7d" | "30d">("24h");
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [usage,   setUsage]   = useState<UsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"performance" | "budget">("performance");

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("axiom_token") ?? ""}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hours = HOURS[range] ?? 24;
      const [mRes, uRes] = await Promise.all([
        fetch(`/api/integration-kernel/venues/${venueId}/metrics?hours=${hours}`, { headers: authHeader }),
        fetch(`/api/integration-kernel/venues/${venueId}/usage-summary`, { headers: authHeader }),
      ]);
      if (mRes.ok) {
        const d = await mRes.json() as { metrics: MetricSummary[] };
        setMetrics(d.metrics);
      }
      if (uRes.ok) {
        const d = await uRes.json() as { usage: UsageSummary[] };
        setUsage(d.usage);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [venueId, range]);

  useEffect(() => { void load(); }, [load]);

  const totalRequests = metrics.reduce((s, m) => s + m.totalRequests, 0);
  const totalErrors   = metrics.reduce((s, m) => s + m.errorCount, 0);
  const totalTokens   = metrics.reduce((s, m) => s + m.totalTokens, 0);
  const avgP95        = metrics.length > 0
    ? metrics.filter(m => m.p95Ms != null).reduce((s, m) => s + (m.p95Ms ?? 0), 0) / (metrics.filter(m => m.p95Ms != null).length || 1)
    : null;

  const latencyColor = (ms: number | null) =>
    ms == null ? `${GOLD}44` : ms < 300 ? "#32B45A" : ms < 1000 ? "#C8A00A" : "#C84A4A";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>INTEGRATION ANALYTICS</div>
          <div style={{ fontSize: 9, color: `${GOLD}55`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif", marginTop: 1 }}>PROVIDER PERFORMANCE + BUDGET TRACKING</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["24h", "7d", "30d"] as const).map(r => (
            <motion.button key={r} type="button" whileTap={{ scale: 0.95 }} onClick={() => setRange(r)}
              style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${range === r ? GOLD + "55" : GOLD + "18"}`, background: range === r ? `rgba(212,175,55,0.12)` : "transparent", color: range === r ? GOLD : `${GOLD}44`, fontSize: 8, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
              {r}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
        {[
          { label: "TOTAL REQUESTS", value: totalRequests.toLocaleString(), color: GOLD },
          { label: "ERRORS",         value: totalErrors.toLocaleString(),   color: totalErrors > 0 ? "#C84A4A" : "#32B45A" },
          { label: "AVG P95",        value: avgP95 != null ? `${Math.round(avgP95)}ms` : "—", color: latencyColor(avgP95) },
          { label: "TOKENS",         value: totalTokens > 1000 ? `${(totalTokens/1000).toFixed(1)}k` : totalTokens.toString(), color: "#A889F4" },
        ].map(stat => (
          <div key={stat.label} style={{ padding: "9px 10px", borderRadius: 7, background: "rgba(255,255,255,0.025)", border: `1px solid ${GOLD}15`, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: stat.color, fontFamily: "'Inter',sans-serif" }}>{stat.value}</div>
            <div style={{ fontSize: 7, color: `${GOLD}44`, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4 }}>
        {(["performance", "budget"] as const).map(t => (
          <motion.button key={t} type="button" whileTap={{ scale: 0.95 }} onClick={() => setTab(t)}
            style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${tab === t ? GOLD + "55" : GOLD + "18"}`, background: tab === t ? `rgba(212,175,55,0.12)` : "transparent", color: tab === t ? GOLD : `${GOLD}44`, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif" }}>
            {t.toUpperCase()}
          </motion.button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 16, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>LOADING...</div>
      )}

      {/* Performance tab */}
      {!loading && tab === "performance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {metrics.length === 0 && (
            <div style={{ padding: 14, textAlign: "center", color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>No request data for this period</div>
          )}
          {metrics.map(m => (
            <motion.div key={m.providerId} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}15` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{m.providerName}</div>
                  <div style={{ fontSize: 8, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em" }}>{m.providerType.toUpperCase()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, fontFamily: "'Inter',sans-serif" }}>{m.totalRequests.toLocaleString()} req</div>
                  <div style={{ fontSize: 8, color: m.errorRate > 0.05 ? "#C84A4A" : "#32B45A", fontFamily: "'Inter',sans-serif" }}>
                    {(m.errorRate * 100).toFixed(1)}% error rate
                  </div>
                </div>
              </div>
              {/* Latency bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {[
                  { label: "p50", value: m.p50Ms },
                  { label: "p95", value: m.p95Ms },
                  { label: "p99", value: m.p99Ms },
                ].map(lat => (
                  <div key={lat.label} style={{ padding: "5px 7px", borderRadius: 5, background: "rgba(0,0,0,0.15)", border: `1px solid ${latencyColor(lat.value)}22` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: latencyColor(lat.value), fontFamily: "'Inter',sans-serif" }}>
                      {lat.value != null ? `${Math.round(lat.value)}ms` : "—"}
                    </div>
                    <div style={{ fontSize: 7, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif" }}>{lat.label}</div>
                  </div>
                ))}
              </div>
              {m.totalTokens > 0 && (
                <div style={{ marginTop: 5, fontSize: 8, color: "#A889F4", fontFamily: "'Inter',sans-serif" }}>
                  {m.totalTokens.toLocaleString()} tokens · avg {m.avgTokens != null ? Math.round(m.avgTokens) : "—"}/req
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Budget tab */}
      {!loading && tab === "budget" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {usage.length === 0 && (
            <div style={{ padding: 14, textAlign: "center", color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>No usage data</div>
          )}
          {usage.map(u => {
            const pct = u.budgetPct ?? 0;
            const barColor = pct > 0.9 ? "#C84A4A" : pct > 0.7 ? "#C8A00A" : "#32B45A";
            return (
              <div key={u.providerId} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}15` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif" }}>{u.providerId}</div>
                  {u.budgetPct != null && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: barColor, fontFamily: "'Inter',sans-serif" }}>
                      {Math.round(u.budgetPct * 100)}% budget used
                    </div>
                  )}
                </div>
                {u.budgetPct != null && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(u.budgetPct * 100)}%` }} transition={{ duration: 0.7 }}
                        style={{ height: "100%", borderRadius: 2, background: barColor }} />
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {[
                    { label: "Daily Req",   value: u.dailyRequests,   limit: u.limits?.dailyRequests },
                    { label: "Monthly Req", value: u.monthlyRequests, limit: u.limits?.monthlyRequests },
                    { label: "Tokens",      value: u.monthlyTokens,   limit: u.limits?.monthlyTokens },
                  ].map(stat => (
                    <div key={stat.label} style={{ fontSize: 8, color: `${GOLD}66`, fontFamily: "'Inter',sans-serif" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: CREAM }}>{stat.value.toLocaleString()}</div>
                      <div>{stat.label}{stat.limit ? ` / ${stat.limit.toLocaleString()}` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
