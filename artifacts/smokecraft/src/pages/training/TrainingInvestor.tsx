/**
 * TrainingInvestor — /training/investor
 * Cinematic auto-demo investor presentation.
 *
 * 6 slides: Customer Journey → AI Engine → Behavioral Intelligence
 *           → Loyalty & Revenue → Analytics → Scale & Marketplace
 *
 * Auto-advances every 12 seconds. Manual navigation. Animated KPI counters.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence }                  from "framer-motion";
import { useLocation }                              from "wouter";
import {
  ArrowLeft, ArrowRight, Pause, Play, Brain,
  TrendingUp, Users, DollarSign, Zap, Globe, BarChart3, Star,
  FileText, X, WifiOff,
} from "lucide-react";
import Maxwell                                      from "@/components/Maxwell";
import TrainingBanner                               from "@/components/training/TrainingBanner";
import { DEMO_KPIS, LIVE_EVENTS, MAXWELL_INTROS }  from "@/data/trainingData";
import { VOICEOVER_SCRIPTS }                        from "@/data/voiceoverScripts";
import { logTrainingEvent, useTrainingData, trainingFetch } from "@/hooks/useTrainingApi";

const T = {
  bg:     "#F5F2ED",
  card:   "rgba(26,26,27,0.06)",
  border: "rgba(212,139,0,0.15)",
  gold:   "#D48B00",
  goldB:  "#D48B00",
  text:   "rgba(26,26,27,0.90)",
  muted:  "rgba(240,232,212,0.48)",
  light:  "rgba(26,26,27,0.72)",
  green:  "#34d399",
  blue:   "#60a5fa",
  amber:  "#f59e0b",
  purple: "#a78bfa",
  pink:   "#f472b6",
};

// ── Animated counter ──────────────────────────────────────────────────────────

function Counter({ target, prefix = "", suffix = "", decimals = 0 }: {
  target: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return <>{prefix}{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</>;
}

// ── Slide definitions ─────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: "journey",
    title: "The Guest Journey",
    subtitle: "From first swipe to loyal advocate",
    icon: Users,
    color: T.gold,
    maxwellMsg: "Every guest interaction creates behavioral data. The swipe experience collects palate preferences, pairing decisions, and mood signals — all feeding the AI in real time.",
    kpis: [
      { label: "Avg Onboarding Time", value: 90, suffix: "sec",   color: T.green   },
      { label: "Profile Completion",  value: 97, suffix: "%",     color: T.gold    },
      { label: "First-Session Match", value: 84, suffix: "%",     color: T.blue    },
      { label: "Return Rate",         value: 68, suffix: "%",     color: T.purple  },
    ],
    content: [
      { label: "Enrollment", detail: "Cinematic Q flow collects atmosphere, boldness, experience in under 90 seconds" },
      { label: "Mentor Assignment", detail: "AI assigns one of 11 fictional mentors based on palate vectors — personalized from the first moment" },
      { label: "Swipe Experience", detail: "Tinder-style card engine with drag physics — each swipe refines the taste profile" },
      { label: "Add to Order", detail: "Time-bounded inventory reservations with real-time POS sync" },
    ],
  },
  {
    id: "ai",
    title: "AI Recommendation Engine",
    subtitle: "Semantic intelligence across four craft types",
    icon: Brain,
    color: T.purple,
    maxwellMsg: "The Revenue Brain scores every recommendation across taste match, margin contribution, stock level, and vendor reliability — simultaneously. No manual curation needed.",
    kpis: [
      { label: "Pairing Accuracy",    value: 94, suffix: "%",     color: T.purple  },
      { label: "Upsell Detection",    value: 34, suffix: "%",     color: T.gold    },
      { label: "Recommendation Speed",value: 180, suffix: "ms",   color: T.green   },
      { label: "Match Confidence",    value: 91, suffix: "%",     color: T.blue    },
    ],
    content: [
      { label: "Revenue Brain v2",      detail: "40% taste / 25% margin / 15% stock / 10% reliability / 10% premium weighting" },
      { label: "Semantic Cross-Category",detail: "Cigar + spirit pairings transcend craft type boundaries using flavor descriptor mapping" },
      { label: "Food Pairing Engine",    detail: "Contextual pairing suggestions derived from 12,000+ indexed flavor combinations" },
      { label: "Real-Time Adaptation",   detail: "Profile updates after every swipe — no batch processing, no delay" },
    ],
  },
  {
    id: "behavior",
    title: "Behavioral Intelligence",
    subtitle: "Understanding guests before they know what they want",
    icon: Zap,
    color: T.blue,
    maxwellMsg: "The behavioral intelligence layer detects upsell windows, mismatch signals, and engagement peaks — surfacing them to staff in real time. This is what turns recommendation into revenue.",
    kpis: [
      { label: "Behavioral Data Points", value: 48, suffix: "k/mo", color: T.blue    },
      { label: "Upsell Window Accuracy", value: 87, suffix: "%",     color: T.amber   },
      { label: "Engagement Peak Detect", value: 93, suffix: "%",     color: T.purple  },
      { label: "Mismatch Recovery Rate", value: 79, suffix: "%",     color: T.green   },
    ],
    content: [
      { label: "Taste Cluster Analysis", detail: "Guests auto-segmented into flavor clusters — bold-social, mellow-intimate, and 9 more" },
      { label: "Time-of-Day Context",    detail: "Recommendations adjust based on evening mood, day of week, and seasonal patterns" },
      { label: "Swipe Intelligence",      detail: "Overview, Taste Clusters, Revenue Funnel, and Craft Compare — live dashboards" },
      { label: "Couples Mode",            detail: "Multi-profile blending creates joint recommendations for groups and couples" },
    ],
  },
  {
    id: "loyalty",
    title: "Loyalty & Revenue Engine",
    subtitle: "Turning every visit into compounding revenue",
    icon: DollarSign,
    color: T.green,
    maxwellMsg: "The loyalty system operates independently from recommendations — but the two engines share data. High-loyalty guests see elevated personalization scores, which drives higher average tab values.",
    kpis: [
      { label: "Avg Tab Value Lift",   value: 28, suffix: "%",       color: T.green   },
      { label: "Loyalty Redemption",   value: 72, suffix: "%",       color: T.gold    },
      { label: "MTD Revenue",          value: 68400, prefix: "$",    color: T.amber   },
      { label: "Campaign ROI",         value: 340, suffix: "%",      color: T.blue    },
    ],
    content: [
      { label: "5-Tier Progression",   detail: "Bronze → Silver → Gold → Platinum → Vault — each tier unlocks deeper personalization" },
      { label: "Partner Campaigns",    detail: "Distributor brand campaigns auto-boost recommendations with budget enforcement and ROI reporting" },
      { label: "Dynamic Pricing",      detail: "Server-side pricing engine prevents client-side manipulation — all math runs on the server" },
      { label: "Revenue Forecasting",  detail: "Historical data generates real-time revenue projections — tonight's forecast within 8% accuracy" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Intelligence Dashboard",
    subtitle: "Nine-tab enterprise intelligence suite",
    icon: BarChart3,
    color: T.amber,
    maxwellMsg: "The enterprise intelligence suite provides everything from swipe heatmaps to financial reconciliation. Venue owners see the full picture in one place — no spreadsheets, no manual reporting.",
    kpis: [
      { label: "Dashboard Modules",    value: 9,   suffix: " tabs",  color: T.amber   },
      { label: "Data Refresh Rate",    value: 60,  suffix: "s",      color: T.green   },
      { label: "Report Auto-Generate", value: 100, suffix: "%",      color: T.blue    },
      { label: "Reconciliation Score", value: 96,  suffix: "/100",   color: T.purple  },
    ],
    content: [
      { label: "Swipe IQ Dashboard",   detail: "Taste Clusters, Revenue Funnel, Craft Compare with animated live counters" },
      { label: "Financial Reconciliation", detail: "5-tab enterprise dashboard — orphan tabs, payout pipeline, alerts, AI insights" },
      { label: "Distributor Reports",  detail: "Per-campaign ROI reports auto-generated at close — zero manual work" },
      { label: "Network Intelligence", detail: "Cross-venue data digests — see what's trending across the entire NOVEE OS network" },
    ],
  },
  {
    id: "scale",
    title: "Multi-Venue Scale",
    subtitle: "From one lounge to a national network",
    icon: Globe,
    color: T.pink,
    maxwellMsg: "NOVEE OS is built for multi-tenant scale from day one. Tenant isolation ensures venues never see each other's data — while the network intelligence layer aggregates anonymized signals across the whole platform.",
    kpis: [
      { label: "Venue Isolation",     value: 100, suffix: "%",     color: T.green   },
      { label: "Network Data Points", value: 2.4, suffix: "M/mo", color: T.pink     },
      { label: "Lounge League Venues",value: 48,  suffix: "",      color: T.gold    },
      { label: "Device Ecosystem",    value: 12,  suffix: " types",color: T.blue    },
    ],
    content: [
      { label: "Tenant Isolation",    detail: "AES-256-GCM field-level encryption and row-level tenant scoping — zero data bleed" },
      { label: "Lounge League",       detail: "Venue competition system — leaderboards, campaign performance, cross-venue rankings" },
      { label: "Device Ecosystem",    detail: "Kiosk, POS, staff tablet, guest QR — all synchronized in real time" },
      { label: "Franchise Ready",     detail: "Central Command enables remote OTA updates, forced refreshes, and kill switches across all venues" },
    ],
  },
];

// ── Slide content card ────────────────────────────────────────────────────────

function SlideContent({ slide }: { slide: typeof SLIDES[number] }) {
  const Icon = slide.icon;
  return (
    <motion.div
      key={slide.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: "100%" }}
    >
      {/* Slide header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: `${slide.color}15`, border: `1px solid ${slide.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={20} color={slide.color} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text }}>
              {slide.title}
            </div>
            <div style={{ fontSize: 11, color: slide.color }}>{slide.subtitle}</div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {slide.kpis.map((kpi) => (
          <motion.div
            key={kpi.label}
            animate={{ boxShadow: [`0 0 0px ${kpi.color}00`, `0 0 16px ${kpi.color}28`, `0 0 0px ${kpi.color}00`] }}
            transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 2 }}
            style={{
              background: `${kpi.color}08`, border: `1px solid ${kpi.color}30`,
              borderRadius: 10, padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "'Cormorant Garamond',serif" }}>
              {kpi.prefix && kpi.prefix}
              <Counter target={kpi.value} suffix={kpi.suffix} />
            </div>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
              {kpi.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature points */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {slide.content.map((pt, i) => (
          <motion.div
            key={pt.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "13px 15px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: slide.color, marginBottom: 5 }}>{pt.label}</div>
            <div style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.6 }}>{pt.detail}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type TrainingSummary = { revenueTonight: number; tabsOpen: number; aiConfidence: number };

export default function TrainingInvestor() {
  const [, navigate]  = useLocation();
  const [slide, setSlide]     = useState(0);
  const [playing, setPlaying] = useState(true);
  const [eventIdx, setEventIdx] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState(LIVE_EVENTS.slice(0, 3));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: summaryData } = useTrainingData<{ summary: TrainingSummary }>("analytics/summary");
  const s = summaryData?.summary;

  useEffect(() => {
    trainingFetch<{ events: Array<{ id: string; type: string; text: string; ts: string }> }>(
      "demo-state/events",
    )
      .then(({ data }) => {
        if (data.events?.length) {
          setVisibleEvents(data.events.slice(0, 3).map((e) => ({ message: e.text, type: e.type, priority: "normal" })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    logTrainingEvent({ eventType: "page_view", page: "investor" });
  }, []);

  const advance = useCallback(() => {
    setSlide((s) => {
      const next = (s + 1) % SLIDES.length;
      logTrainingEvent({ eventType: "slide_advance", page: "investor", stepIndex: next, metadata: { slideId: SLIDES[next]?.id } });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(advance, 12000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, advance]);

  useEffect(() => {
    const t = setInterval(() => {
      setEventIdx((i) => i + 1);
      setVisibleEvents((prev) => {
        const next = [...prev];
        next.unshift(LIVE_EVENTS[eventIdx % LIVE_EVENTS.length]!);
        next.pop();
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [eventIdx]);

  const current = SLIDES[slide]!;
  const [showScript, setShowScript] = useState(false);
  const script = VOICEOVER_SCRIPTS["investor"];
  const cue = script?.cues[slide];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter','SF Pro Display',sans-serif", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: -80, left: "40%",
        width: 600, height: 300,
        background: `radial-gradient(ellipse, ${current.color}10 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0, transition: "background 1s",
      }} />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "11px 24px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/training")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Training
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.05em" }}>
            Investor Demo Mode
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Apple × Tesla × Hospitality × AI Intelligence
          </div>
        </div>

        {/* Slide nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => setSlide(i)} style={{
              width: i === slide ? 20 : 6, height: 6, borderRadius: 3,
              background: i === slide ? current.color : `${T.muted}60`,
              border: "none", cursor: "pointer", padding: 0,
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <button onClick={() => setShowScript((s) => !s)} style={{
          background: showScript ? `${T.gold}18` : "rgba(26,26,27,0.06)",
          border: `1px solid ${showScript ? T.gold + "50" : "rgba(26,26,27,0.14)"}`,
          borderRadius: 7, color: showScript ? T.gold : T.muted, padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, fontSize: 10,
        }}>
          <FileText size={10} /> Script
        </button>
        <button onClick={() => setPlaying((p) => !p)} style={{
          background: `${current.color}15`, border: `1px solid ${current.color}40`,
          borderRadius: 7, color: current.color, padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, fontSize: 10,
        }}>
          {playing ? <Pause size={10} /> : <Play size={10} />}
          {playing ? "Pause" : "Auto"}
        </button>
      </div>
      <TrainingBanner />

      {/* Script overlay */}
      <AnimatePresence>
        {showScript && cue && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0, width: 380,
              background: "#09060f", borderLeft: "1px solid rgba(212,139,0,0.2)",
              zIndex: 60, overflowY: "auto", padding: "20px 22px",
              boxShadow: "-8px 0 32px rgba(26,26,27,0.26)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  Presenter Script
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
                  {cue.slide} · {cue.duration}
                </div>
              </div>
              <button onClick={() => setShowScript(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ height: 1, background: "rgba(212,139,0,0.15)", marginBottom: 16 }} />
            <div style={{ fontSize: 11.5, color: "rgba(26,26,27,0.82)", lineHeight: 2, whiteSpace: "pre-wrap" }}>
              {cue.script}
            </div>
            <div style={{ height: 1, background: "rgba(26,26,27,0.08)", margin: "20px 0 12px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <WifiOff size={9} color="rgba(212,139,0,0.5)" />
              <span style={{ fontSize: 9, color: "rgba(212,139,0,0.5)" }}>Works offline — script stored locally</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", minHeight: "calc(100vh - 61px)", position: "relative", zIndex: 1 }}>

        {/* Slide area */}
        <div style={{ padding: "32px 32px", display: "flex", flexDirection: "column" }}>
          {/* Progress bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {SLIDES.map((s, i) => (
              <div key={s.id} style={{ flex: 1, height: 2, background: i <= slide ? s.color : "rgba(26,26,27,0.10)", borderRadius: 1, transition: "background 0.4s" }} />
            ))}
          </div>

          <div style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              <SlideContent key={slide} slide={current} />
            </AnimatePresence>
          </div>

          {/* Slide navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0} style={{
              background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.muted, padding: "8px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 11,
              opacity: slide === 0 ? 0.3 : 1,
            }}>
              <ArrowLeft size={12} /> Previous
            </button>
            <span style={{ fontSize: 10, color: T.muted, alignSelf: "center" }}>
              {slide + 1} of {SLIDES.length}
            </span>
            <button onClick={() => setSlide((s) => Math.min(SLIDES.length - 1, s + 1))} disabled={slide === SLIDES.length - 1} style={{
              background: `${current.color}15`, border: `1px solid ${current.color}40`,
              borderRadius: 8, color: current.color, padding: "8px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 11,
              opacity: slide === SLIDES.length - 1 ? 0.3 : 1,
            }}>
              Next <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Live sidebar */}
        <div style={{ borderLeft: `1px solid ${T.border}`, padding: "24px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Live — Vault Cigar Lounge
          </div>

          {/* Mini KPIs — real data with static fallback */}
          {[
            { label: "Revenue/hr", value: s ? `$${Math.round((s.revenueTonight ?? 4960) / 8).toLocaleString()}` : "$620", color: T.green },
            { label: "AI Score",   value: s ? `${s.aiConfidence ?? 97}/100`  : "97/100", color: T.purple },
            { label: "Tabs Live",  value: s ? String(s.tabsOpen ?? 6)        : "6",      color: T.gold   },
          ].map(({ label, value, color }) => (
            <motion.div key={label}
              animate={{ borderColor: [`${color}20`, `${color}50`, `${color}20`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                padding: "10px 12px", borderRadius: 9,
                background: `${color}08`, border: `1px solid ${color}30`,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'Cormorant Garamond',serif" }}>{value}</div>
              <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
            </motion.div>
          ))}

          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 8 }}>
            Events
          </div>

          <AnimatePresence mode="popLayout">
            {visibleEvents.map((ev) => (
              <motion.div
                key={ev.message}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: "8px 10px", borderRadius: 7,
                  background: "rgba(26,26,27,0.05)",
                  border: `1px solid rgba(26,26,27,0.09)`,
                }}
              >
                <div style={{ fontSize: 9, color: ev.priority === "high" ? T.gold : ev.priority === "warn" ? T.amber : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                  {ev.type}
                </div>
                <div style={{ fontSize: 10, color: T.light, lineHeight: 1.45 }}>{ev.message}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Maxwell message={current.maxwellMsg} context={`Slide ${slide + 1}: ${current.title}`} />
    </div>
  );
}
