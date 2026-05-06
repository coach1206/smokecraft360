/**
 * EnterpriseIntelligence — /enterprise-intelligence
 * Axiom Enterprise Intelligence Dashboard — Phase 4.
 *
 * 9 tabs: Venue · Flavor · Emotional · Campaign · VIP · Social ·
 *         Manufacturer · Predictive · Multi-Venue
 *
 * Calls /api/enterprise-intelligence/* for aggregated composite data.
 * Design: OLED luxury, cinematic glass panels, animated intel cards.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#06040a",
  glass:   "rgba(255,255,255,0.030)",
  glassMd: "rgba(255,255,255,0.048)",
  border:  "rgba(255,255,255,0.07)",
  gold:    "#c9a84c",
  goldBt:  "#d4af37",
  text:    "rgba(240,232,212,0.92)",
  muted:   "rgba(240,232,212,0.50)",
  dim:     "rgba(240,232,212,0.28)",
  green:   "#4ade80",
  red:     "#f87171",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const token = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token");
  const r = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "venue" | "flavor" | "emotional" | "campaign" | "vip" | "social" | "manufacturer" | "predictive" | "multi";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "venue",        label: "Venue",         icon: "◉" },
  { id: "flavor",       label: "Flavor",        icon: "◈" },
  { id: "emotional",    label: "Emotional",     icon: "◇" },
  { id: "campaign",     label: "Campaign",      icon: "◆" },
  { id: "vip",          label: "VIP",           icon: "★" },
  { id: "social",       label: "Social Energy", icon: "◐" },
  { id: "manufacturer", label: "Manufacturer",  icon: "◑" },
  { id: "predictive",   label: "Predictive",    icon: "◌" },
  { id: "multi",        label: "Multi-Venue",   icon: "◎" },
];

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimCount({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const isNum = typeof value === "number";
  useEffect(() => {
    if (!isNum) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const fn = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round((value as number) * ease));
      if (t < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [value, isNum]);
  return <span>{isNum ? display : value}{suffix}</span>;
}

// ── Inline bar ────────────────────────────────────────────────────────────────

function Bar({ pct, color = C.gold }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 2 }}
      />
    </div>
  );
}

// ── Glass card ────────────────────────────────────────────────────────────────

function Card({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.glass,
      border: `1px solid ${accent ? accent + "33" : C.border}`,
      borderRadius: 14,
      padding: "20px 22px",
      boxShadow: accent ? `0 0 20px ${accent}0d` : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

function CardTitle({ children, color }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 22, fontWeight: 600, color: color ?? C.gold, letterSpacing: "0.02em", fontFamily: "'Cormorant Garamond', serif" }}>{children}</div>;
}

// ── Severity color ────────────────────────────────────────────────────────────

const SEV: Record<string, string> = { high: "#f87171", medium: "#fb923c", low: "#4ade80" };
const CAT: Record<string, string> = {
  atmosphere: "#d4af37", flavor: "#c9a84c", loyalty: "#a78bfa", predictive: "#60a5fa",
  campaign: "#4ade80", vip: "#d4af37", social: "#fb923c", mentor: "#c084fc",
  product: "#94a3b8",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function EnterpriseIntelligence() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("venue");

  // Data cache per tab
  const cache = useRef<Map<string, unknown>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<{ id: string; category: string; severity: string; text: string; timestamp: string }[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  // Endpoint map
  const ENDPOINT: Partial<Record<Tab, string>> = {
    venue:        "/api/enterprise-intelligence/summary",
    emotional:    "/api/enterprise-intelligence/emotional",
    campaign:     "/api/enterprise-intelligence/campaign",
    vip:          "/api/enterprise-intelligence/vip",
    predictive:   "/api/enterprise-intelligence/predictive",
    multi:        "/api/enterprise-intelligence/multi-venue",
    manufacturer: "/api/enterprise-intelligence/manufacturer",
  };

  // Load summary + feed on mount
  useEffect(() => {
    Promise.allSettled([
      apiGet("/api/enterprise-intelligence/summary"),
      apiGet("/api/enterprise-intelligence/live-feed"),
    ]).then(([s, f]) => {
      if (s.status === "fulfilled") setSummary(s.value as Record<string, unknown>);
      if (f.status === "fulfilled") setFeed((f.value as { insights: typeof feed }).insights ?? []);
    });
  }, []);

  // Load tab data
  useEffect(() => {
    const endpoint = ENDPOINT[tab];
    if (!endpoint) { setData(null); return; }
    if (cache.current.has(tab)) { setData(cache.current.get(tab)); return; }
    setLoading(true);
    apiGet(endpoint)
      .then(d => { cache.current.set(tab, d); setData(d); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [tab]);

  const sum = summary as {
    kpis?: Record<string, { value: string | number; delta: string; label: string }>;
    peakHours?: { hour: string; activity: number }[];
    topCraftEngagement?: { craft: string; pct: number }[];
    atmosphereDistribution?: Record<string, number>;
  } | null;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Cormorant Garamond', serif", display: "flex", flexDirection: "column" }}>
      {/* Top gold rule */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(201,168,76,0.7) 30%,rgba(212,175,55,0.95) 50%,rgba(201,168,76,0.7) 70%,transparent)", zIndex: 20 }} />

      {/* ── Header ── */}
      <div style={{ padding: "18px 24px 0", position: "sticky", top: 0, zIndex: 15, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <button onClick={() => navigate("/command")} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.muted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", fontFamily: "inherit" }}>← BACK</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(17px,3.5vw,24px)", fontWeight: 500, color: C.goldBt, letterSpacing: "0.06em" }}>Enterprise Intelligence</h1>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em", marginTop: 2 }}>AXIOM OS · HOSPITALITY INTELLIGENCE LAYER</div>
          </div>
          {/* Live pulse */}
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 11, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
        </div>

        {/* KPI strip */}
        {sum?.kpis && (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none" }}>
            {Object.values(sum.kpis).map(kpi => (
              <div key={kpi.label} style={{ flexShrink: 0, padding: "8px 16px", background: C.glass, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.1em" }}>{kpi.label.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: C.gold }}>{kpi.value}</span>
                  <span style={{ fontSize: 11, color: C.green }}>{kpi.delta}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: "9px 16px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, letterSpacing: "0.06em", fontFamily: "inherit",
              color: tab === t.id ? C.goldBt : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.goldBt}` : "2px solid transparent",
              transition: "all 0.15s ease",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area: content + live feed sidebar ── */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 80px" }}>
          {loading && <div style={{ color: C.muted, textAlign: "center", padding: "60px 0", fontSize: 14 }}>Loading intelligence…</div>}

          <AnimatePresence mode="wait">
            {!loading && (
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                {/* ── VENUE OVERVIEW ── */}
                {tab === "venue" && sum && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <SectionTitle>Venue Intelligence Overview</SectionTitle>
                    <Grid cols={2}>
                      {/* Peak hours heatmap */}
                      <Card style={{ gridColumn: "1 / -1" }}>
                        <CardLabel>Peak Engagement Hours</CardLabel>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60, marginTop: 10 }}>
                          {(sum.peakHours ?? []).map(h => (
                            <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${h.activity}%` }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                style={{ width: "100%", background: h.activity > 80 ? C.goldBt : h.activity > 50 ? C.gold + "aa" : C.gold + "44", borderRadius: "2px 2px 0 0", minHeight: 2 }}
                              />
                              <span style={{ fontSize: 9, color: C.dim }}>{h.hour.replace(" ", "\n")}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                      {/* Craft engagement */}
                      <Card>
                        <CardLabel>Craft Engagement Split</CardLabel>
                        {(sum.topCraftEngagement ?? []).map(c => (
                          <div key={c.craft} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                              <span style={{ color: C.muted }}>{c.craft}</span>
                              <span style={{ color: C.gold, fontWeight: 600 }}>{c.pct}%</span>
                            </div>
                            <Bar pct={c.pct} />
                          </div>
                        ))}
                      </Card>
                      {/* Atmosphere distribution */}
                      <Card>
                        <CardLabel>Atmosphere Distribution</CardLabel>
                        {Object.entries(sum.atmosphereDistribution ?? {}).slice(0, 5).map(([k, v]) => (
                          <div key={k} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: C.muted }}>{k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                              <span style={{ color: C.gold }}>{v as number}%</span>
                            </div>
                            <Bar pct={v as number} />
                          </div>
                        ))}
                      </Card>
                    </Grid>
                  </div>
                )}

                {/* ── FLAVOR INTELLIGENCE ── */}
                {tab === "flavor" && (
                  <FlavorTab />
                )}

                {/* ── EMOTIONAL ENGAGEMENT ── */}
                {tab === "emotional" && data && (
                  <EmotionalTab d={data as EmotionalData} />
                )}

                {/* ── CAMPAIGN INTELLIGENCE ── */}
                {tab === "campaign" && data && (
                  <CampaignTab d={data as CampaignData} />
                )}

                {/* ── VIP INTELLIGENCE ── */}
                {tab === "vip" && data && (
                  <VipTab d={data as VipData} />
                )}

                {/* ── SOCIAL ENERGY ── */}
                {tab === "social" && (
                  <SocialTab />
                )}

                {/* ── MANUFACTURER INSIGHTS ── */}
                {tab === "manufacturer" && data && (
                  <ManufacturerTab d={data as ManufacturerData} />
                )}

                {/* ── PREDICTIVE TRENDS ── */}
                {tab === "predictive" && data && (
                  <PredictiveTab d={data as PredictiveData} />
                )}

                {/* ── MULTI-VENUE ── */}
                {tab === "multi" && data && (
                  <MultiVenueTab d={data as MultiVenueData} />
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Live intelligence feed ── */}
        <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: "16px 14px 80px", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em", marginBottom: 12 }}>LIVE INTELLIGENCE FEED</div>
          {feed.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>Loading feed…</div>}
          {feed.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEV[item.severity] ?? C.muted, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: CAT[item.category] ?? C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.category}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: C.dim }}>
                  {Math.abs(Math.round((new Date(item.timestamp).getTime() - Date.now()) / 60000))}m ago
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55 }}>{item.text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>{children}</div>;
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, bar }: { label: string; value: string | number; bar?: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: bar !== undefined ? 4 : 0 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color: C.gold, fontWeight: 600 }}>{value}</span>
      </div>
      {bar !== undefined && <Bar pct={bar} />}
    </div>
  );
}

// ── Flavor tab (calls demand insight endpoint) ────────────────────────────────

function FlavorTab() {
  const [d, setD] = useState<{ topRequestedProducts?: { name?: string; score?: number }[]; topFlavors?: { flavor?: string; count?: number }[]; topCategories?: { category?: string; count?: number }[] } | null>(null);
  useEffect(() => {
    apiGet("/api/demand/insights").then(setD).catch(() => setD(null));
  }, []);
  if (!d) return <div style={{ color: C.muted, fontSize: 13, padding: "40px 0" }}>Loading flavor intelligence…</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Flavor + Product Intelligence</SectionTitle>
      <Grid cols={2}>
        <Card>
          <CardLabel>Top Flavor Profiles</CardLabel>
          {(d.topFlavors ?? []).slice(0, 8).map((f, i) => (
            <StatRow key={i} label={f.flavor ?? "—"} value={f.count ?? 0} bar={(f.count ?? 0) / ((d.topFlavors?.[0]?.count ?? 100)) * 100} />
          ))}
        </Card>
        <Card>
          <CardLabel>Trending Products</CardLabel>
          {(d.topRequestedProducts ?? []).slice(0, 6).map((p, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: C.text }}>{p.name ?? "—"}</span>
              <span style={{ fontSize: 12, color: C.gold }}>score {p.score ?? "—"}</span>
            </div>
          ))}
        </Card>
        <Card style={{ gridColumn: "1 / -1" }}>
          <CardLabel>Category Breakdown</CardLabel>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(d.topCategories ?? []).map((c, i) => (
              <div key={i} style={{ padding: "10px 16px", background: C.glassMd, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{c.category}</div>
                <div style={{ fontSize: 18, color: C.gold, fontWeight: 600 }}>{c.count}</div>
              </div>
            ))}
          </div>
        </Card>
      </Grid>
    </div>
  );
}

// ── Social tab (uses environment analytics endpoint) ──────────────────────────

function SocialTab() {
  const [d, setD] = useState<{ energyStateDistribution?: Record<string, number>; avgLingerMinutes?: Record<string, number>; vipArrivalResponses?: number; automationUptime?: string } | null>(null);
  useEffect(() => {
    apiGet("/api/environment/analytics").then(setD).catch(() => setD(null));
  }, []);
  if (!d) return <div style={{ color: C.muted, fontSize: 13, padding: "40px 0" }}>Loading social energy data…</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Social Energy + Community Intelligence</SectionTitle>
      <Grid cols={2}>
        <Card>
          <CardLabel>Energy State Distribution</CardLabel>
          {Object.entries(d.energyStateDistribution ?? {}).map(([k, v]) => (
            <StatRow key={k} label={k.replace(/_/g, " ")} value={`${v}%`} bar={v} />
          ))}
        </Card>
        <Card>
          <CardLabel>Avg Linger by Atmosphere State</CardLabel>
          {Object.entries(d.avgLingerMinutes ?? {}).slice(0, 6).map(([k, v]) => (
            <StatRow key={k} label={k.replace(/_/g, " ")} value={`${v} min`} bar={v / 50 * 100} />
          ))}
        </Card>
        <Card>
          <CardLabel>VIP Arrival Responses</CardLabel>
          <CardTitle color={C.goldBt}><AnimCount value={d.vipArrivalResponses ?? 0} /></CardTitle>
          <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>Tracked this period</div>
        </Card>
        <Card>
          <CardLabel>Automation Uptime</CardLabel>
          <CardTitle color={C.green}>{d.automationUptime ?? "—"}</CardTitle>
          <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>Environmental automation</div>
        </Card>
      </Grid>
    </div>
  );
}

// ── Typed tab components ──────────────────────────────────────────────────────

type EmotionalData = {
  atmosphereResponse: { overallScore: number; trend: string; byState: { state: string; score: number; lingerMins: number; returnRate: string }[] };
  mentorEngagement: { repeatAfterMentorSession: string; boldsessionRate: string; smoothSessionRate: string; topMentors: string[] };
  vipResponse: { avgLingerBoost: string; premiumSpendLift: string; conversionToReturn: string };
  emotionalContinuity: { returnsWithin7Days: string; returnsWithin30Days: string; loyaltyAttachment: string; atmosphereLoyalty: string };
};

function EmotionalTab({ d }: { d: EmotionalData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Emotional Engagement Analytics</SectionTitle>
      <Grid cols={2}>
        <Card accent={C.gold} style={{ gridColumn: "1 / -1" }}>
          <CardLabel>Atmosphere Response by Energy State</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginTop: 10 }}>
            {d.atmosphereResponse.byState.map(s => (
              <div key={s.state} style={{ padding: "12px 14px", background: C.glassMd, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{s.state}</div>
                <div style={{ fontSize: 20, color: C.gold, fontWeight: 600, marginBottom: 2 }}>{s.score}<span style={{ fontSize: 12, color: C.muted }}>/100</span></div>
                <Bar pct={s.score} />
                <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>{s.lingerMins} min · {s.returnRate} return</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardLabel>Mentor Engagement</CardLabel>
          <StatRow label="Repeat After Mentor Session" value={d.mentorEngagement.repeatAfterMentorSession} />
          <StatRow label="Bold Sessions" value={d.mentorEngagement.boldsessionRate} />
          <StatRow label="Smooth Sessions" value={d.mentorEngagement.smoothSessionRate} />
          <div style={{ marginTop: 10 }}>
            <CardLabel>Top Mentors</CardLabel>
            {d.mentorEngagement.topMentors.map(m => (
              <div key={m} style={{ fontSize: 13, color: C.text, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>{m}</div>
            ))}
          </div>
        </Card>
        <Card>
          <CardLabel>Emotional Continuity</CardLabel>
          <StatRow label="Return within 7 Days" value={d.emotionalContinuity.returnsWithin7Days} />
          <StatRow label="Return within 30 Days" value={d.emotionalContinuity.returnsWithin30Days} />
          <StatRow label="Loyalty Attachment" value={d.emotionalContinuity.loyaltyAttachment} />
          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(201,168,76,0.07)", border: `1px solid ${C.gold}33`, borderRadius: 8, fontSize: 12, color: C.muted }}>
            {d.emotionalContinuity.atmosphereLoyalty}
          </div>
        </Card>
      </Grid>
    </div>
  );
}

type CampaignData = {
  activeCampaigns: number; totalReach: number;
  summary: { name: string; status: string; engagementLift: string; conversionRate: string; revenue: string; sentiment: string }[];
  loyaltyReactivation: { campaignsSent: number; recovered: number; recoveryRate: string; revenueRecovered: string };
  atmospherePromotion: { bestPerforming: string; avgLift: string; roi: string };
};

const SENTIMENT_COLOR: Record<string, string> = { highest: C.green, high: "#4ade80aa", medium: "#fb923c" };

function CampaignTab({ d }: { d: CampaignData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Campaign + Marketing Intelligence</SectionTitle>
      <Grid cols={3}>
        <Card><CardLabel>Active Campaigns</CardLabel><CardTitle><AnimCount value={d.activeCampaigns} /></CardTitle></Card>
        <Card><CardLabel>Total Reach</CardLabel><CardTitle><AnimCount value={d.totalReach} /></CardTitle></Card>
        <Card><CardLabel>Recovery Rate</CardLabel><CardTitle color={C.green}>{d.loyaltyReactivation.recoveryRate}</CardTitle></Card>
      </Grid>
      <Card>
        <CardLabel>Campaign Performance</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {d.summary.map(c => (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 80px", gap: 12, padding: "12px 14px", background: C.glassMd, border: `1px solid ${C.border}`, borderRadius: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 10, color: c.status === "active" ? C.green : C.dim, letterSpacing: "0.1em", marginTop: 2 }}>{c.status.toUpperCase()}</div>
              </div>
              <span style={{ fontSize: 13, color: SENTIMENT_COLOR[c.sentiment] ?? C.muted, textAlign: "right" }}>{c.engagementLift}</span>
              <span style={{ fontSize: 13, color: C.muted, textAlign: "right" }}>{c.conversionRate} CVR</span>
              <span style={{ fontSize: 13, color: C.gold, textAlign: "right" }}>{c.revenue}</span>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SENTIMENT_COLOR[c.sentiment] ?? C.muted, justifySelf: "end" }} />
            </div>
          ))}
        </div>
      </Card>
      <Grid cols={2}>
        <Card>
          <CardLabel>Loyalty Reactivation</CardLabel>
          <StatRow label="Campaigns Sent" value={d.loyaltyReactivation.campaignsSent} />
          <StatRow label="Recovered" value={d.loyaltyReactivation.recovered} />
          <StatRow label="Revenue Recovered" value={d.loyaltyReactivation.revenueRecovered} />
        </Card>
        <Card>
          <CardLabel>Atmosphere Promotion</CardLabel>
          <StatRow label="Best Performing" value={d.atmospherePromotion.bestPerforming} />
          <StatRow label="Avg Engagement Lift" value={d.atmospherePromotion.avgLift} />
          <StatRow label="ROI" value={d.atmospherePromotion.roi} />
        </Card>
      </Grid>
    </div>
  );
}

type VipData = {
  totalVipSessions: number; avgSessionValue: string;
  premiumPreferences: { product: string; pct: number }[];
  behaviorProfile: Record<string, string>;
  arrivals30Days: { date: string; count: number }[];
};

function VipTab({ d }: { d: VipData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>VIP Intelligence</SectionTitle>
      <Grid cols={3}>
        <Card accent={C.gold}><CardLabel>VIP Sessions</CardLabel><CardTitle><AnimCount value={d.totalVipSessions} /></CardTitle></Card>
        <Card accent={C.gold}><CardLabel>Avg Session Value</CardLabel><CardTitle>{d.avgSessionValue}</CardTitle></Card>
        <Card accent={C.gold}><CardLabel>Return Rate</CardLabel><CardTitle color={C.green}>78%</CardTitle></Card>
      </Grid>
      <Grid cols={2}>
        <Card>
          <CardLabel>Premium Product Preferences</CardLabel>
          {d.premiumPreferences.map(p => <StatRow key={p.product} label={p.product} value={`${p.pct}%`} bar={p.pct} />)}
        </Card>
        <Card>
          <CardLabel>Behavioral Profile</CardLabel>
          {Object.entries(d.behaviorProfile).map(([k, v]) => (
            <div key={k} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.muted }}>{k.replace(/([A-Z])/g, " $1")}</span>
              <span style={{ fontSize: 12, color: C.text }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card style={{ gridColumn: "1 / -1" }}>
          <CardLabel>Arrivals — Last 30 Days</CardLabel>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 50, marginTop: 10 }}>
            {d.arrivals30Days.map(a => (
              <div key={a.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <motion.div initial={{ height: 0 }} animate={{ height: `${a.count * 33}%` }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ width: "100%", background: C.goldBt, borderRadius: "2px 2px 0 0", minHeight: a.count > 0 ? 6 : 0 }} />
                <span style={{ fontSize: 9, color: C.dim }}>{a.date.replace("Apr ", "A").replace("May ", "M")}</span>
              </div>
            ))}
          </div>
        </Card>
      </Grid>
    </div>
  );
}

type ManufacturerData = {
  flavorMovement: { flavor: string; trend: string; regions: string[] }[];
  pairingIntelligence: { cigar: string; pairing: string; engagementScore: number }[];
  productEventResponse: { product: string; event: string; lift: string }[];
  loyaltyProductLinks: { segment: string; topProducts: string[]; avgSpend: string }[];
};

function ManufacturerTab({ d }: { d: ManufacturerData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Manufacturer + Distributor Intelligence</SectionTitle>
      <Grid cols={2}>
        <Card>
          <CardLabel>Flavor Movement Trends</CardLabel>
          {d.flavorMovement.map(f => (
            <div key={f.flavor} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.text }}>{f.flavor}</span>
                <span style={{ color: f.trend.startsWith("+") ? C.green : C.red, fontWeight: 600 }}>{f.trend}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{f.regions.join(" · ")}</div>
            </div>
          ))}
        </Card>
        <Card>
          <CardLabel>Pairing Intelligence</CardLabel>
          {d.pairingIntelligence.map(p => (
            <div key={p.cigar} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.text }}>{p.cigar} × {p.pairing}</div>
              <div style={{ marginTop: 4 }}><Bar pct={p.engagementScore} /></div>
              <div style={{ fontSize: 11, color: C.gold, marginTop: 3 }}>Score: {p.engagementScore}</div>
            </div>
          ))}
        </Card>
        <Card>
          <CardLabel>Event-Driven Product Response</CardLabel>
          {d.productEventResponse.map(p => (
            <div key={p.product} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 13, color: C.text }}>{p.product}</div><div style={{ fontSize: 11, color: C.dim }}>{p.event}</div></div>
              <span style={{ fontSize: 14, color: C.green, fontWeight: 600, alignSelf: "center" }}>{p.lift}</span>
            </div>
          ))}
        </Card>
        <Card>
          <CardLabel>Loyalty × Product Segments</CardLabel>
          {d.loyaltyProductLinks.map(l => (
            <div key={l.segment} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: C.gold, fontWeight: 600 }}>{l.segment}</span>
                <span style={{ color: C.green }}>{l.avgSpend}</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{l.topProducts.join(" · ")}</div>
            </div>
          ))}
        </Card>
      </Grid>
    </div>
  );
}

type PredictiveData = {
  returningGuests: { highLikelihood: number; mediumLikelihood: number; atRisk: number; model: string };
  slowPeriods: { window: string; confidence: string; action: string }[];
  atmosphereForecasts: { state: string; effectiveness: number; trend: string }[];
  inventorySignals: { product: string; action: string; confidence: string; daysUntilOut: number }[];
  revenueForecast: { next7Days: string; next30Days: string; confidence: string; drivers: string[] };
};

function PredictiveTab({ d }: { d: PredictiveData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Predictive Hospitality Intelligence</SectionTitle>
      <Grid cols={3}>
        <Card accent={C.green}><CardLabel>High Return Likelihood</CardLabel><CardTitle color={C.green}><AnimCount value={d.returningGuests.highLikelihood} /></CardTitle></Card>
        <Card><CardLabel>Medium Likelihood</CardLabel><CardTitle><AnimCount value={d.returningGuests.mediumLikelihood} /></CardTitle></Card>
        <Card accent={C.red}><CardLabel>At-Risk Guests</CardLabel><CardTitle color={C.red}><AnimCount value={d.returningGuests.atRisk} /></CardTitle></Card>
      </Grid>
      <Grid cols={2}>
        <Card>
          <CardLabel>Revenue Forecast</CardLabel>
          <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
            <div><div style={{ fontSize: 10, color: C.dim }}>NEXT 7 DAYS</div><div style={{ fontSize: 20, color: C.gold, fontWeight: 600 }}>{d.revenueForecast.next7Days}</div></div>
            <div><div style={{ fontSize: 10, color: C.dim }}>NEXT 30 DAYS</div><div style={{ fontSize: 20, color: C.gold, fontWeight: 600 }}>{d.revenueForecast.next30Days}</div></div>
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Confidence: {d.revenueForecast.confidence}</div>
          {d.revenueForecast.drivers.map(dr => (
            <div key={dr} style={{ fontSize: 12, color: C.muted, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>· {dr}</div>
          ))}
        </Card>
        <Card>
          <CardLabel>Atmosphere Effectiveness Forecast</CardLabel>
          {d.atmosphereForecasts.map(f => (
            <div key={f.state} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: C.muted }}>{f.state}</span>
                <span style={{ color: f.trend === "↑" ? C.green : f.trend === "↓" ? C.red : C.muted }}>{f.effectiveness} {f.trend}</span>
              </div>
              <Bar pct={f.effectiveness} color={f.trend === "↑" ? C.green : f.trend === "↓" ? C.red : C.gold} />
            </div>
          ))}
        </Card>
        <Card style={{ gridColumn: "1 / -1" }}>
          <CardLabel>Slow Period Predictions</CardLabel>
          {d.slowPeriods.map(s => (
            <div key={s.window} style={{ display: "grid", gridTemplateColumns: "160px 80px 1fr", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.text }}>{s.window}</span>
              <span style={{ fontSize: 12, color: s.confidence === "High" ? C.red : "#fb923c" }}>{s.confidence}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{s.action}</span>
            </div>
          ))}
        </Card>
      </Grid>
    </div>
  );
}

type MultiVenueData = {
  networkSize: number;
  topPerforming: { name: string; atmosphereScore: number; avgRevenue: string; lingerMins: number; returnRate: string }[];
  flavorTrendsByRegion: { region: string; topFlavor: string; topPairing: string }[];
  atmosphereRankings: { state: string; networkAvgScore: number }[];
};

function MultiVenueTab({ d }: { d: MultiVenueData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle>Multi-Venue Network Intelligence</SectionTitle>
      <Card><CardLabel>Network Size</CardLabel><CardTitle><AnimCount value={d.networkSize} suffix=" venues" /></CardTitle></Card>
      <Card>
        <CardLabel>Top Performing Venues</CardLabel>
        {d.topPerforming.map((v, i) => (
          <div key={v.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 80px 80px 80px", gap: 10, padding: "12px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.dim }}>#{i + 1}</span>
            <span style={{ fontSize: 13, color: C.text }}>{v.name}</span>
            <span style={{ fontSize: 12, color: C.gold, textAlign: "right" }}>{v.atmosphereScore}</span>
            <span style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>{v.avgRevenue}/g</span>
            <span style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>{v.lingerMins}m</span>
            <span style={{ fontSize: 12, color: C.green, textAlign: "right" }}>{v.returnRate}</span>
          </div>
        ))}
      </Card>
      <Grid cols={2}>
        <Card>
          <CardLabel>Flavor Trends by Region</CardLabel>
          {d.flavorTrendsByRegion.map(r => (
            <div key={r.region} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.gold, marginBottom: 4 }}>{r.region}</div>
              <div style={{ fontSize: 12, color: C.text }}>{r.topFlavor} × {r.topPairing}</div>
            </div>
          ))}
        </Card>
        <Card>
          <CardLabel>Network Atmosphere Rankings</CardLabel>
          {d.atmosphereRankings.map(a => <StatRow key={a.state} label={a.state} value={a.networkAvgScore} bar={a.networkAvgScore} />)}
        </Card>
      </Grid>
    </div>
  );
}
