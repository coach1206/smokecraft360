/**
 * Owner Intel Panel — /admin/intel
 *
 * Action-based intelligence for venue owners.
 * Never shows raw data — only "what customers prefer" and "do this" actions.
 */

import { useEffect, useState } from "react";
import { useLocation }         from "wouter";
import { motion }              from "framer-motion";
import { ArrowLeft, Zap, TrendingUp, ShoppingBag, AlertCircle, Loader2 } from "lucide-react";
import BackgroundLayer         from "@/components/Layout/BackgroundLayer";
import { useVenueContext }     from "@/contexts/VenueContext";

interface QuickIntel {
  trend:      string;
  topCreator: string;
}

interface SummaryIntel {
  topPreference: string;
  actions:       string[];
}

export default function OwnerIntelPanel() {
  const [, navigate]            = useLocation();
  const { getBackground }       = useVenueContext();

  const [quick,   setQuick]   = useState<QuickIntel   | null>(null);
  const [summary, setSummary] = useState<SummaryIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/craft/intel/quick").then(r => r.json()),
      fetch("/api/craft/intel/summary").then(r => r.json()),
    ])
      .then(([q, s]) => {
        setQuick(q as QuickIntel);
        setSummary(s as SummaryIntel);
      })
      .catch(() => setError("Could not load intelligence data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <BackgroundLayer
      image={getBackground("analytics")}
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", color: "#1A1A1B" }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 24px",
        borderBottom: "1px solid rgba(26,26,27,0.08)",
        background: "rgba(245,242,237,0.82)", backdropFilter: "blur(8px)",
        flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/admin-panel")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(26,26,27,0.06)",
            border: "1px solid rgba(26,26,27,0.10)",
            color: "rgba(26,26,27,0.48)", cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#D48B00" }}>Owner Intelligence</div>
          <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)" }}>Action-based insights · Updated live</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "32px 24px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "rgba(26,26,27,0.48)" }}>
            <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase" }}>Loading intelligence…</span>
          </div>
        )}

        {error && !loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "20px 24px", borderRadius: 16,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef9191", fontSize: 14,
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Trend + Creator row */}
            {quick && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    padding: "24px 22px", borderRadius: 18,
                    background: "linear-gradient(155deg, rgba(212,139,0,0.12), rgba(245,242,237,0.7))",
                    border: "1px solid rgba(212,139,0,0.3)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <TrendingUp size={16} color="#D48B00" />
                    <span style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#D48B00", fontWeight: 700 }}>Trending Now</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1B" }}>{quick.trend}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,26,27,0.48)", marginTop: 6 }}>Most-picked style combination this session</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  style={{
                    padding: "24px 22px", borderRadius: 18,
                    background: "linear-gradient(155deg, rgba(52,211,153,0.10), rgba(245,242,237,0.7))",
                    border: "1px solid rgba(52,211,153,0.25)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Zap size={16} color="#34d399" />
                    <span style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#34d399", fontWeight: 700 }}>Top Creator</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1B" }}>{quick.topCreator}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,26,27,0.48)", marginTop: 6 }}>Highest craft score this period</div>
                </motion.div>
              </div>
            )}

            {/* Customer preference */}
            {summary && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.14 }}
                  style={{
                    padding: "22px 24px", borderRadius: 18, marginBottom: 20,
                    background: "rgba(245,242,237,0.55)",
                    border: "1px solid rgba(26,26,27,0.09)",
                  }}
                >
                  <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(26,26,27,0.40)", fontWeight: 700, marginBottom: 10 }}>
                    Customers Prefer
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#D48B00" }}>{summary.topPreference}</div>
                </motion.div>

                {/* Action list */}
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(26,26,27,0.40)", fontWeight: 700, marginBottom: 14 }}>
                    Do This
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {summary.actions.map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "16px 20px", borderRadius: 14,
                          background: "rgba(245,242,237,0.55)",
                          border: "1px solid rgba(26,26,27,0.08)",
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "rgba(212,139,0,0.12)",
                          border: "1px solid rgba(212,139,0,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <ShoppingBag size={13} color="#D48B00" />
                        </div>
                        <span style={{ fontSize: 15, color: "#1A1A1B", fontWeight: 500 }}>{action}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </BackgroundLayer>
  );
}
