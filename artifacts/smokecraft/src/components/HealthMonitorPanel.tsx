/**
 * Phase 10 — Health Monitoring Dashboard
 *
 * Auto-refreshes every 30 s. Shows per-provider health status, p95 latency,
 * error rate, and a venue-level health score. Includes a manual sweep trigger.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProviderHealth {
  id:               string;
  providerName:     string;
  displayName:      string;
  providerType:     string;
  lastHealthStatus: string;
  lastTestedAt:     string | null;
  errorMessage:     string | null;
  isActive:         boolean;
}

interface MetricSummary {
  providerId:    string;
  providerName:  string;
  totalRequests: number;
  errorRate:     number;
  p95Ms:         number | null;
  p50Ms:         number | null;
}

const STATUS_COLOR: Record<string, string> = {
  healthy:        "#32B45A",
  degraded:       "#C8A00A",
  failed:         "#C84A4A",
  fallback_active:"#C87028",
  unchecked:      "rgba(212,175,55,0.40)",
};

interface Props {
  venueId: string;
  GOLD:    string;
  CREAM:   string;
}

export function HealthMonitorPanel({ venueId, GOLD, CREAM }: Props) {
  const [providers, setProviders]   = useState<ProviderHealth[]>([]);
  const [metrics,   setMetrics]     = useState<MetricSummary[]>([]);
  const [sweeping,  setSweeping]    = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading,   setLoading]     = useState(true);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("axiom_token") ?? ""}` };

  const loadAll = useCallback(async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/integration-kernel/venues/${venueId}/providers`, { headers: authHeader }),
        fetch(`/api/integration-kernel/venues/${venueId}/metrics?hours=24`, { headers: authHeader }),
      ]);
      if (pRes.ok) {
        const d = await pRes.json() as { providers: ProviderHealth[] };
        setProviders(d.providers);
      }
      if (mRes.ok) {
        const d = await mRes.json() as { metrics: MetricSummary[] };
        setMetrics(d.metrics);
      }
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [venueId]);

  useEffect(() => {
    void loadAll();
    intervalRef.current = setInterval(() => { void loadAll(); }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadAll]);

  async function runSweep() {
    setSweeping(true);
    await Promise.allSettled(
      providers
        .filter(p => p.isActive)
        .map(p =>
          fetch(`/api/integration-kernel/venues/${venueId}/providers/${p.id}/test`, {
            method: "POST", headers: authHeader,
          }),
        ),
    );
    await loadAll();
    setSweeping(false);
  }

  const healthyCount = providers.filter(p => p.lastHealthStatus === "healthy").length;
  const totalActive  = providers.filter(p => p.isActive).length;
  const healthScore  = totalActive > 0 ? Math.round((healthyCount / totalActive) * 100) : 100;

  const scoreColor = healthScore >= 90 ? "#32B45A" : healthScore >= 70 ? "#C8A00A" : "#C84A4A";

  function getMetric(name: string): MetricSummary | undefined {
    return metrics.find(m => m.providerName === name || m.providerId === name);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>HEALTH MONITOR</div>
          <div style={{ fontSize: 9, color: `${GOLD}55`, letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif", marginTop: 1 }}>LIVE PROVIDER STATUS · AUTO-REFRESH 30s</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastRefresh && (
            <div style={{ fontSize: 8, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif" }}>
              {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => void runSweep()} disabled={sweeping}
            style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${GOLD}44`, background: sweeping ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.12)", color: sweeping ? `${GOLD}44` : GOLD, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
            {sweeping ? "SWEEPING..." : "SWEEP ALL"}
          </motion.button>
        </div>
      </div>

      {/* Health score bar */}
      <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${scoreColor}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: `${GOLD}88`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.12em" }}>VENUE HEALTH SCORE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor, fontFamily: "'Inter',sans-serif" }}>{healthScore}<span style={{ fontSize: 10, opacity: 0.7 }}>%</span></div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${healthScore}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 2, background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <div style={{ fontSize: 8, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif" }}>{healthyCount}/{totalActive} providers healthy</div>
          <div style={{ fontSize: 8, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif" }}>
            {providers.filter(p => p.lastHealthStatus === "failed").length} failed ·{" "}
            {providers.filter(p => p.lastHealthStatus === "degraded").length} degraded
          </div>
        </div>
      </div>

      {/* Provider grid */}
      <AnimatePresence>
        {loading && (
          <div style={{ textAlign: "center", padding: 18, color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.14em" }}>
            LOADING HEALTH DATA...
          </div>
        )}
      </AnimatePresence>

      {!loading && providers.length === 0 && (
        <div style={{ padding: "14px", textAlign: "center", color: `${GOLD}44`, fontSize: 10, fontFamily: "'Inter',sans-serif" }}>
          No active providers to monitor
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {providers.filter(p => p.isActive).map(p => {
          const m = getMetric(p.providerName);
          const col = STATUS_COLOR[p.lastHealthStatus] ?? STATUS_COLOR["unchecked"];
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${col}28` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}` }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: CREAM, fontFamily: "'Inter',sans-serif" }}>
                      {p.displayName || p.providerName}
                    </div>
                    <div style={{ fontSize: 8, color: `${GOLD}55`, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", marginTop: 1 }}>
                      {p.providerType.toUpperCase()}
                      {p.lastTestedAt ? ` · ${new Date(p.lastTestedAt).toLocaleTimeString()}` : " · Never tested"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {m && (
                    <>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: m.p95Ms != null ? (m.p95Ms < 500 ? "#32B45A" : m.p95Ms < 2000 ? "#C8A00A" : "#C84A4A") : `${GOLD}55`, fontFamily: "'Inter',sans-serif" }}>
                          {m.p95Ms != null ? `p95 ${m.p95Ms}ms` : "—"}
                        </div>
                        <div style={{ fontSize: 8, color: `${GOLD}44`, fontFamily: "'Inter',sans-serif" }}>
                          {m.totalRequests} req · {(m.errorRate * 100).toFixed(1)}% err
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{ padding: "2px 7px", borderRadius: 4, background: `${col}18`, border: `1px solid ${col}44`, fontSize: 8, color: col, fontWeight: 700, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }}>
                    {p.lastHealthStatus.replace("_", " ").toUpperCase()}
                  </div>
                </div>
              </div>
              {p.errorMessage && (
                <div style={{ marginTop: 5, fontSize: 8, color: "#F07070", fontFamily: "'Inter',sans-serif", padding: "4px 8px", borderRadius: 4, background: "rgba(200,74,74,0.08)", border: "1px solid rgba(200,74,74,0.20)" }}>
                  {p.errorMessage}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
