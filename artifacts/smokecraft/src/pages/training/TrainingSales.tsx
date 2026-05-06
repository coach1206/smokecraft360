/**
 * TrainingSales — /training/sales
 * Guided venue-owner sales presentation with cinematic transitions.
 */

import { useState, useEffect }   from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }           from "wouter";
import { ArrowLeft, ArrowRight, TrendingUp, Heart, DollarSign, Zap, BarChart3, Star, FileText, X } from "lucide-react";
import Maxwell                   from "@/components/Maxwell";
import TrainingBanner             from "@/components/training/TrainingBanner";
import { DEMO_VENUE, DEMO_KPIS, MAXWELL_INTROS } from "@/data/trainingData";
import { VOICEOVER_SCRIPTS }     from "@/data/voiceoverScripts";
import { logTrainingEvent, ensureTrainingSession } from "@/hooks/useTrainingApi";

const T = {
  bg: "#06040a", card: "rgba(255,255,255,0.04)", border: "rgba(201,168,76,0.15)",
  gold: "#c9a84c", text: "rgba(240,232,212,0.92)", muted: "rgba(240,232,212,0.48)",
  light: "rgba(240,232,212,0.75)", green: "#34d399", blue: "#60a5fa",
  amber: "#f59e0b", purple: "#a78bfa",
};

const PITCH_SLIDES = [
  {
    id: "engagement",
    icon: Heart, color: T.gold,
    headline: "Engagement your guests will remember",
    subline: "The swipe experience turns every visit into a personalized journey — not a transaction.",
    stats: [
      { label: "Session Engagement Lift",  value: "+68%",   color: T.gold   },
      { label: "Return Visit Rate",         value: "+34%",   color: T.green  },
      { label: "Avg Session Length",        value: "+12 min",color: T.blue   },
      { label: "Guest Satisfaction",        value: "97%",    color: T.purple },
    ],
    points: [
      "Cinematic onboarding collects palate preferences in under 90 seconds",
      "AI-assigned mentor creates an instant personal connection",
      "Swipe experience adapts in real time to every guest's behavior",
      "Every visit reinforces the guest's relationship with your brand",
    ],
    maxwell: "Engagement is the foundation of retention. When guests feel the venue understands them, they come back. The swipe experience makes that feeling automatic.",
  },
  {
    id: "spend",
    icon: TrendingUp, color: T.green,
    headline: "Meaningful increases in spend per guest",
    subline: "The Revenue Brain identifies upsell windows and presents them to staff in real time.",
    stats: [
      { label: "Avg Tab Value Lift",      value: "+28%", color: T.green  },
      { label: "Upsell Conversion Rate",   value: "34%",  color: T.gold   },
      { label: "Premium Item Selection",   value: "+41%", color: T.amber  },
      { label: "Campaign Revenue Lift",    value: "+18%", color: T.blue   },
    ],
    points: [
      "40% taste / 25% margin weighting ensures every recommendation benefits the venue",
      "Staff upsell alerts surface at the exact moment a guest is most receptive",
      "Partner campaigns boost premium product recommendations with distributor funding",
      "Dynamic pricing ensures revenue integrity — no client-side manipulation",
    ],
    maxwell: "A 28% lift in average tab value means every existing guest is worth 28% more — without acquiring a single new customer. That's the compounding power of intelligence.",
  },
  {
    id: "emotional",
    icon: Star, color: T.purple,
    headline: "Emotional personalization that builds loyalty",
    subline: "Guests don't remember what they bought. They remember how you made them feel.",
    stats: [
      { label: "Loyalty Program Active",   value: "72%",   color: T.purple },
      { label: "Platinum Tier Retention",  value: "94%",   color: T.gold   },
      { label: "Return Guest Rate",        value: "+68%",  color: T.green  },
      { label: "Points Redeemed / Mo",     value: "4,200", color: T.blue   },
    ],
    points: [
      "5-tier progression system creates clear milestones guests want to reach",
      "Maxwell mentor system makes guests feel guided, not sold to",
      "Return guest reward engine auto-applies after every session",
      "Cross-venue identity means guests feel known at every location",
    ],
    maxwell: "Loyalty is emotional, not transactional. When a guest reaches Platinum tier and receives a complimentary vintage cigar, they don't think about the cost — they think about coming back.",
  },
  {
    id: "retention",
    icon: BarChart3, color: T.blue,
    headline: "Retention powered by intelligence, not discounts",
    subline: "The AI continuously learns what brings each guest back — then automates it.",
    stats: [
      { label: "12-Month Retention",     value: "68%",  color: T.blue   },
      { label: "Personalization Score",  value: "97/100",color: T.purple },
      { label: "Prediction Accuracy",    value: "91%",  color: T.green  },
      { label: "Churn Prevention Rate",  value: "43%",  color: T.amber  },
    ],
    points: [
      "Behavioral profiles build across every session — improving automatically with scale",
      "Time-of-day and day-of-week context ensures recommendations always feel relevant",
      "The AI detects disengagement signals before you lose a guest",
      "Return invitations and menu previews are sent via the receipt delivery system",
    ],
    maxwell: "Retention without discounts is only possible when the experience itself is the reward. Axiom OS makes your venue genuinely irreplaceable — not just the most affordable option.",
  },
  {
    id: "operations",
    icon: Zap, color: T.amber,
    headline: "Operational simplicity that scales",
    subline: "One platform. Every operational need. Zero spreadsheets.",
    stats: [
      { label: "Manual Reports Eliminated", value: "100%", color: T.amber  },
      { label: "Inventory Alert Response",  value: "<60s", color: T.green  },
      { label: "Reconciliation Automation", value: "95%",  color: T.gold   },
      { label: "Staff Training Time",       value: "-40%", color: T.blue   },
    ],
    points: [
      "Inventory alerts, reorder workflows, and distributor comms — fully automated",
      "Financial reconciliation runs every 15 minutes — catches issues before they become problems",
      "Staff training via Training Mode reduces onboarding from days to hours",
      "Multi-venue management from a single Central Command dashboard",
    ],
    maxwell: "When operations run themselves, your team focuses entirely on the guest. That's the operational multiplier — better experience with fewer administrative hours.",
  },
];

export default function TrainingSales() {
  const [, navigate] = useLocation();
  const [slide, setSlide] = useState(0);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    logTrainingEvent({ eventType: "page_view", page: "sales" });
    void ensureTrainingSession("sales").catch(() => {});
  }, []);
  const current = PITCH_SLIDES[slide]!;
  const Icon = current.icon;
  const script = VOICEOVER_SCRIPTS["sales"];
  const cue = script?.cues[slide];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
      {/* Glow */}
      <div style={{
        position: "fixed", top: -60, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 200,
        background: `radial-gradient(ellipse, ${current.color}10 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0, transition: "background 0.8s",
      }} />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/training")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Training
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif" }}>
            Sales Presentation — Venue Owner
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {DEMO_VENUE.name} · Chicago, Illinois
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {PITCH_SLIDES.map((_, i) => (
            <div key={i} onClick={() => setSlide(i)} style={{
              width: i === slide ? 18 : 6, height: 6, borderRadius: 3,
              background: i <= slide ? current.color : "rgba(255,255,255,0.1)",
              cursor: "pointer", transition: "all 0.25s",
            }} />
          ))}
        </div>
        <button onClick={() => setShowScript((s) => !s)} style={{
          background: showScript ? `${T.gold}18` : "rgba(255,255,255,0.04)",
          border: `1px solid ${showScript ? T.gold + "50" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 7, color: showScript ? T.gold : T.muted, padding: "6px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, fontSize: 10,
        }}>
          <FileText size={10} /> Script
        </button>
      </div>
      <TrainingBanner />

      {/* Sales script overlay */}
      <AnimatePresence>
        {showScript && cue && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0, width: 380,
              background: "#09060f", borderLeft: "1px solid rgba(201,168,76,0.2)",
              zIndex: 60, overflowY: "auto", padding: "20px 22px",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  Sales Talking Points
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
                  {cue.slide} · {cue.duration}
                </div>
              </div>
              <button onClick={() => setShowScript(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ height: 1, background: "rgba(201,168,76,0.15)", marginBottom: 16 }} />
            <div style={{ fontSize: 11.5, color: "rgba(240,232,212,0.85)", lineHeight: 2, whiteSpace: "pre-wrap" }}>
              {cue.script}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px", position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Slide header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 13,
                background: `${current.color}15`, border: `1px solid ${current.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={22} color={current.color} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text }}>
                  {current.headline}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{current.subline}</div>
              </div>
            </div>

            {/* Stat grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
              {current.stats.map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    background: `${s.color}08`, border: `1px solid ${s.color}25`,
                    borderRadius: 10, padding: "14px",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Cormorant Garamond',serif" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Points */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "22px 24px", marginBottom: 24,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {current.points.map((pt, i) => (
                  <motion.div
                    key={pt}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.07 }}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                  >
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: current.color, flexShrink: 0, marginTop: 7,
                    }} />
                    <div style={{ fontSize: 12.5, color: T.light, lineHeight: 1.65 }}>{pt}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0} style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 9, color: T.muted, padding: "10px 18px", cursor: "pointer",
            fontSize: 12, display: "flex", alignItems: "center", gap: 6,
            opacity: slide === 0 ? 0.3 : 1,
          }}>
            <ArrowLeft size={12} /> Previous
          </button>
          <button onClick={() => {
            if (slide < PITCH_SLIDES.length - 1) {
              const next = slide + 1;
              setSlide(next);
              logTrainingEvent({ eventType: "slide_advance", page: "sales", stepIndex: next, metadata: { slideId: PITCH_SLIDES[next]?.id } });
            } else {
              navigate("/training");
            }
          }} style={{
            background: slide === PITCH_SLIDES.length - 1 ? T.green : current.color,
            border: "none", borderRadius: 9, color: "#06040a",
            padding: "10px 22px", cursor: "pointer", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {slide === PITCH_SLIDES.length - 1 ? "Finish" : "Next"} <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <Maxwell message={current.maxwell} context={`Slide ${slide + 1}: ${current.id}`} />
    </div>
  );
}
