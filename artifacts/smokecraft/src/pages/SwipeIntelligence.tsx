/**
 * SwipeIntelligence — Behavioral Commerce Analytics Dashboard.
 * Route: /analytics/swipe-intelligence
 *
 * Displays swipe analytics: top tags, session metrics, craft comparison,
 * revenue metrics. Off-white premium shell, no background images.
 */

import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, Brain, TrendingUp, TrendingDown, BarChart2,
  Users, Zap, ShoppingBag, Package, Star,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       "#F5F3EF",
  card:     "#FFFFFF",
  border:   "rgba(0,0,0,0.07)",
  text:     "#1A1410",
  muted:    "rgba(26,20,16,0.45)",
  dim:      "rgba(26,20,16,0.28)",
  gold:     "#9A7820",
  accent:   "#1A1410",
  green:    "#16a34a",
  red:      "#dc2626",
  orange:   "#ea580c",
  purple:   "#7c3aed",
  blue:     "#1d4ed8",
};

const CRAFT_COLORS: Record<string, string> = {
  smoke: "#e85d26",
  pour:  "#7c3aed",
  brew:  "#ca8a04",
  vape:  "#0891b2",
};

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 800;
    const from = 0;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function HBar({
  label, value, max, color, pct,
}: { label: string; value: number; max: number; color: string; pct?: boolean }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{pct ? `${value}%` : value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, suffix, icon: Icon, color, sub,
}: {
  label: string; value: number; suffix?: string;
  icon: typeof Brain; color: string; sub?: string;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}14`, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>
        <AnimCounter value={value} suffix={suffix} />
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AnalyticsData {
  topSelectedTags:        { tag: string; count: number }[];
  topSkippedTags:         { tag: string; count: number }[];
  sessionsByType:         { experienceType: string; count: number }[];
  recommendationShown:    number;
  recommendationAccepted: number;
  acceptanceRate:         number;
}

interface SwipeMetrics {
  totalSessions:     number;
  completedSessions: number;
  totalSwipes:       number;
  addSwipes:         number;
  skipSwipes:        number;
}

export default function SwipeIntelligence() {
  const [, navigate] = useLocation();
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<SwipeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"overview" | "tags" | "revenue" | "craft">("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [analyticsData, sessionData] = await Promise.all([
          apiGet("/api/swipe-experience/analytics"),
          apiGet("/api/swipe-experience/metrics").catch(() => null),
        ]);
        if (cancelled) return;
        setData(analyticsData);
        setMetrics(sessionData);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalSessions  = data?.sessionsByType.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const totalSelected  = data?.topSelectedTags.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const maxTagCount    = Math.max(...(data?.topSelectedTags.map(t => Number(t.count)) ?? [1]), 1);
  const maxSkipCount   = Math.max(...(data?.topSkippedTags.map(t => Number(t.count)) ?? [1]), 1);
  const maxTypeCount   = Math.max(...(data?.sessionsByType.map(t => Number(t.count)) ?? [1]), 1);
  const completionRate = totalSessions > 0 && data?.recommendationShown
    ? Math.round((data.recommendationShown / totalSessions) * 100)
    : 0;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "tags",     label: "Taste Clusters" },
    { id: "revenue",  label: "Revenue" },
    { id: "craft",    label: "Craft Compare" },
  ] as const;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>

      {/* Header */}
      <div style={{
        background: "#FFFFFF",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center",
          gap: 16, height: 60,
        }}>
          <button
            onClick={() => navigate("/analytics")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "6px 12px",
              color: C.muted, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Analytics
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#1A1410", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={16} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Swipe Intelligence</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>BEHAVIORAL COMMERCE ANALYTICS</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 400,
                  background: tab === t.id ? "#1A1410" : "transparent",
                  color: tab === t.id ? "#FFFFFF" : C.muted,
                  border: "none", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "2px solid rgba(0,0,0,0.1)",
              borderTop: "2px solid #1A1410",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            Loading behavioral data…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{
            textAlign: "center", padding: "80px 0", color: C.red,
            fontSize: 14,
          }}>
            {error === "401" ? "Sign in as admin to view analytics" : `Error: ${error}`}
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16, marginBottom: 28,
                }}>
                  <StatCard label="Total Sessions"     value={totalSessions}                     icon={Users}     color={C.accent} />
                  <StatCard label="Total Swipes"       value={totalSelected * 2}                 icon={Zap}       color={C.purple} suffix=" swipes" />
                  <StatCard label="Recommendations"    value={data?.recommendationShown ?? 0}    icon={Star}      color={C.gold}   />
                  <StatCard label="Acceptance Rate"    value={data?.acceptanceRate ?? 0}         icon={TrendingUp} color={C.green}  suffix="%" sub="recs added to order" />
                  <StatCard label="Completion Rate"    value={completionRate}                    icon={BarChart2} color={C.blue}   suffix="%" sub="reached reveal" />
                  <StatCard label="Unique Preferences" value={data?.topSelectedTags.length ?? 0} icon={Brain}     color={C.orange} sub="distinct flavor tags" />
                </div>

                {/* Top selected vs skipped side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "20px 24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <TrendingUp size={16} color={C.green} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Top Selected Flavors</span>
                    </div>
                    {(data?.topSelectedTags ?? []).slice(0, 8).map(t => (
                      <HBar
                        key={t.tag}
                        label={t.tag}
                        value={Number(t.count)}
                        max={maxTagCount}
                        color={C.green}
                      />
                    ))}
                    {!data?.topSelectedTags.length && (
                      <p style={{ color: C.muted, fontSize: 13 }}>No swipe data yet — start a session</p>
                    )}
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "20px 24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <TrendingDown size={16} color={C.red} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Most Skipped Flavors</span>
                    </div>
                    {(data?.topSkippedTags ?? []).slice(0, 8).map(t => (
                      <HBar
                        key={t.tag}
                        label={t.tag}
                        value={Number(t.count)}
                        max={maxSkipCount}
                        color={C.red}
                      />
                    ))}
                    {!data?.topSkippedTags.length && (
                      <p style={{ color: C.muted, fontSize: 13 }}>No skip data yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TASTE CLUSTERS TAB ── */}
            {tab === "tags" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}>
                  {TASTE_CLUSTERS.map(cluster => {
                    const clusterTags = data?.topSelectedTags.filter(t =>
                      cluster.tags.some(ct => t.tag.includes(ct))
                    ) ?? [];
                    const clusterScore = clusterTags.reduce((s, t) => s + Number(t.count), 0);

                    return (
                      <div key={cluster.name} style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 16,
                        padding: "20px 24px",
                        borderTop: `3px solid ${cluster.color}`,
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center",
                          gap: 10, marginBottom: 14,
                        }}>
                          <span style={{ fontSize: 22 }}>{cluster.emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cluster.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{cluster.description}</div>
                          </div>
                          <div style={{
                            marginLeft: "auto",
                            background: `${cluster.color}14`,
                            color: cluster.color,
                            borderRadius: 8,
                            padding: "3px 10px",
                            fontSize: 13,
                            fontWeight: 700,
                          }}>
                            {clusterScore}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {cluster.tags.map(tag => {
                            const count = data?.topSelectedTags.find(t => t.tag === tag)?.count ?? 0;
                            return (
                              <span key={tag} style={{
                                padding: "3px 10px",
                                borderRadius: 20,
                                background: count > 0 ? `${cluster.color}18` : "rgba(0,0,0,0.04)",
                                border: `1px solid ${count > 0 ? cluster.color + "30" : "rgba(0,0,0,0.08)"}`,
                                fontSize: 12,
                                color: count > 0 ? cluster.color : C.muted,
                                fontWeight: count > 0 ? 600 : 400,
                              }}>
                                {tag} {count > 0 ? `(${count})` : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── REVENUE TAB ── */}
            {tab === "revenue" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                    gridColumn: "span 2",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <ShoppingBag size={16} color={C.gold} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recommendation Funnel</span>
                    </div>
                    <div style={{ display: "flex", gap: 0, height: 8, borderRadius: 8, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.6 }}
                        style={{ background: "#1A1410", flex: 1 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
                      {[
                        { label: "Sessions started",     value: totalSessions,                                color: C.accent },
                        { label: "Reached reveal",       value: data?.recommendationShown ?? 0,              color: C.blue   },
                        { label: "Added to order",       value: data?.recommendationAccepted ?? 0,           color: C.green  },
                        { label: "Conversion rate",      value: (data?.acceptanceRate ?? 0),                 color: C.gold, suffix: "%" },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>
                            <AnimCounter value={item.value} suffix={item.suffix} />
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                    }}>
                      <TrendingUp size={16} color={C.green} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Top Converting Tags</span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                      Tags that appear most in accepted recommendations.
                      These drive the highest Add-to-Order conversion.
                    </p>
                    {(data?.topSelectedTags ?? []).slice(0, 6).map((t, i) => (
                      <div key={t.tag} style={{
                        display: "flex", alignItems: "center",
                        gap: 12, padding: "8px 0",
                        borderBottom: i < 5 ? `1px solid ${C.border}` : "none",
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: i === 0 ? C.gold + "20" : "rgba(0,0,0,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          color: i === 0 ? C.gold : C.muted,
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{t.tag}</span>
                        <span style={{ fontSize: 12, color: C.muted }}>{t.count} picks</span>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                    }}>
                      <Package size={16} color={C.orange} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Suppressed Items</span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                      Items with zero stock are automatically excluded from recommendations.
                      Restock to re-enable revenue generation.
                    </p>
                    <div style={{
                      marginTop: 16,
                      padding: "14px 16px",
                      background: "rgba(234,88,12,0.06)",
                      borderRadius: 10,
                      border: "1px solid rgba(234,88,12,0.15)",
                    }}>
                      <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Revenue Brain Active</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        Out-of-stock items are hard-blocked. Low-stock items receive −25 score penalty.
                        Vendor reliability &lt; 60 applies an additional soft penalty.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CRAFT COMPARE TAB ── */}
            {tab === "craft" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "24px", marginBottom: 16,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
                  }}>
                    <BarChart2 size={16} color={C.accent} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                      Sessions by Craft Type
                    </span>
                  </div>

                  {data?.sessionsByType.length ? (
                    data.sessionsByType.map(row => (
                      <HBar
                        key={row.experienceType}
                        label={CRAFT_LABELS[row.experienceType] ?? row.experienceType}
                        value={Number(row.count)}
                        max={maxTypeCount}
                        color={CRAFT_COLORS[row.experienceType] ?? C.accent}
                      />
                    ))
                  ) : (
                    <p style={{ color: C.muted, fontSize: 13 }}>No session data yet</p>
                  )}
                </div>

                {/* Craft cards */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}>
                  {["smoke", "pour", "brew", "vape"].map(craft => {
                    const sessions = data?.sessionsByType.find(r => r.experienceType === craft);
                    const count    = Number(sessions?.count ?? 0);
                    const pct      = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
                    const color    = CRAFT_COLORS[craft]!;
                    return (
                      <div key={craft} style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 14,
                        padding: "18px 20px",
                        borderLeft: `4px solid ${color}`,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                          {CRAFT_LABELS[craft]}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>
                          <AnimCounter value={count} />
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>sessions ({pct}%)</div>
                        <div style={{
                          height: 3, background: "rgba(0,0,0,0.05)", borderRadius: 2,
                          marginTop: 12, overflow: "hidden",
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7 }}
                            style={{ height: "100%", background: color, borderRadius: 2 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Static config ─────────────────────────────────────────────────────────────

const CRAFT_LABELS: Record<string, string> = {
  smoke: "SmokeCraft 360",
  pour:  "PourCraft 360",
  brew:  "BrewCraft 360",
  vape:  "VapeCraft 360",
};

const TASTE_CLUSTERS = [
  {
    name: "Smoky Seekers",
    emoji: "🔥",
    color: "#e85d26",
    description: "Prefer bold, smoke-forward profiles",
    tags: ["smoky", "bold", "peat", "peated", "earthy", "cedar"],
  },
  {
    name: "Sweet Palates",
    emoji: "🍯",
    color: "#ca8a04",
    description: "Drawn to sweet, smooth, approachable flavors",
    tags: ["sweet", "creamy", "smooth", "vanilla", "caramel", "mild"],
  },
  {
    name: "Bold & Complex",
    emoji: "⚡",
    color: "#7c3aed",
    description: "Seek intensity, complexity, high strength",
    tags: ["bold", "spicy", "complex", "rich", "malty", "roasted"],
  },
  {
    name: "Light & Fresh",
    emoji: "💧",
    color: "#0891b2",
    description: "Prefer lighter, citrus, refreshing styles",
    tags: ["light", "crisp", "citrus", "floral", "delicate", "wheat"],
  },
  {
    name: "Tropical & Fruity",
    emoji: "🌴",
    color: "#16a34a",
    description: "Love fruity, tropical, exotic notes",
    tags: ["tropical", "fruity", "berry", "mint", "cool", "fresh"],
  },
] as const;
