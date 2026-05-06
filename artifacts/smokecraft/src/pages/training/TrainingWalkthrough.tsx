/**
 * TrainingWalkthrough — /training/walkthrough
 * 10-step venue setup touchscreen walkthrough.
 */

import { useState }              from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }           from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle, Building2, Package, Users, Megaphone, Star, BarChart3, DollarSign, Monitor, Zap, Play, FileText, X } from "lucide-react";
import Maxwell                   from "@/components/Maxwell";
import TrainingBanner             from "@/components/training/TrainingBanner";
import { VOICEOVER_SCRIPTS }     from "@/data/voiceoverScripts";

const T = {
  bg: "#06040a", card: "rgba(255,255,255,0.04)", border: "rgba(201,168,76,0.15)",
  gold: "#c9a84c", text: "rgba(240,232,212,0.92)", muted: "rgba(240,232,212,0.48)",
  light: "rgba(240,232,212,0.75)", green: "#34d399",
};

const STEPS = [
  {
    num: 1, title: "Welcome to Axiom OS", icon: Star, color: "#c9a84c",
    desc: "You're about to set up a fully intelligent venue experience. This walkthrough covers every system — from inventory to AI recommendations — in 10 guided steps.",
    action: "Let's begin your venue setup",
    maxwell: "Welcome. Axiom OS is designed to be operational within one session. Every step here directly activates a system that will start working for your venue tonight.",
    detail: "No technical knowledge required. Each step is designed for venue owners, not developers.",
  },
  {
    num: 2, title: "Venue Configuration", icon: Building2, color: "#60a5fa",
    desc: "Enter your venue name, location, seating capacity, and operating hours. This data personalizes every Axiom system to your specific context.",
    action: "Configure your venue profile",
    maxwell: "Your venue configuration is the foundation. The recommendation engine uses your seating capacity to calculate optimal table management. Operating hours influence time-of-day recommendation context.",
    detail: "You can update these settings at any time from the Settings panel.",
  },
  {
    num: 3, title: "Inventory Setup", icon: Package, color: "#f59e0b",
    desc: "Add your cigar, spirits, vape, and brew inventory. Set starting quantities and reorder thresholds. The AI begins learning your menu immediately.",
    action: "Import or enter your inventory",
    maxwell: "The inventory you add here becomes the foundation of your recommendation engine. The AI learns which items pair well together, which move fastest, and which deserve premium placement.",
    detail: "Import via CSV or enter manually. Distributor catalogs can be synced automatically.",
  },
  {
    num: 4, title: "Staff Onboarding", icon: Users, color: "#34d399",
    desc: "Add your team members and assign roles. Each role gets a customized view of the Axiom platform — staff see what they need, nothing more.",
    action: "Add your first staff member",
    maxwell: "Role-based access is security and simplicity combined. A bartender doesn't need to see financial reconciliation data. A venue owner needs everything. Right-size access from day one.",
    detail: "Staff can complete role-based Training Mode before their first shift.",
  },
  {
    num: 5, title: "Campaign Setup", icon: Megaphone, color: "#f472b6",
    desc: "Activate distributor partnerships and set up your first brand campaign. Campaigns boost featured products in the recommendation engine automatically.",
    action: "Connect your first distributor",
    maxwell: "Your first campaign is the fastest ROI in this walkthrough. Distributors pay for recommendation placement — you earn incremental revenue without changing your operations at all.",
    detail: "Campaign budgets are enforced automatically. You'll never overspend a partner allocation.",
  },
  {
    num: 6, title: "Guest Experience Demo", icon: Play, color: "#a78bfa",
    desc: "Walk through a complete guest experience — enrollment, mentor assignment, swipe experience, and order completion. See exactly what your guests will see.",
    action: "Start the guest experience demo",
    maxwell: "This is the moment guests become believers in your venue. The swipe experience is not just a recommendation tool — it's an entertainment experience. Guests remember it.",
    detail: "Complete a full demo session to see how the AI responds to preference signals.",
  },
  {
    num: 7, title: "Analytics Overview", icon: BarChart3, color: "#06b6d4",
    desc: "Explore your analytics dashboard — revenue trends, guest behavior, AI performance, inventory health, and campaign ROI. All in real time.",
    action: "Explore your analytics",
    maxwell: "The analytics suite eliminates guesswork. You'll know exactly what's working, what needs attention, and what your revenue will look like at end of night — before the night is over.",
    detail: "The Swipe IQ dashboard shows exactly how guests interact with the AI recommendation engine.",
  },
  {
    num: 8, title: "Revenue Engine", icon: DollarSign, color: "#34d399",
    desc: "Review your revenue configuration — tab management, loyalty settings, payout pipeline, and the financial reconciliation system.",
    action: "Configure your revenue settings",
    maxwell: "The revenue engine runs silently in the background. The reconciliation worker catches issues before they become problems. Your payout pipeline ensures venue proceeds are always moving correctly.",
    detail: "Set your platform fee acknowledgment and payout schedule in this step.",
  },
  {
    num: 9, title: "Device Control", icon: Monitor, color: "#f59e0b",
    desc: "Register your kiosk, POS devices, and staff tablets. Configure display modes, burn-in protection, and OTA update settings.",
    action: "Register your first device",
    maxwell: "Central Command gives you remote control over every device in your venue — from here, or from anywhere in the world. OTA updates roll out silently without guest disruption.",
    detail: "Kiosk burn-in protection is active by default — pixel-shift technology protects your screens.",
  },
  {
    num: 10, title: "Full Launch", icon: Zap, color: "#d4af37",
    desc: "Your venue is configured. Staff are onboarded. Inventory is live. Campaigns are active. The AI has begun learning. You're ready to open.",
    action: "Launch Vault Cigar Lounge",
    maxwell: "This is the moment the system becomes alive. From tonight forward, every guest interaction teaches the AI. Every session improves the recommendation. The longer it runs, the better it gets.",
    detail: "Launch readiness checklist verifies all systems before you go live.",
  },
];

export default function TrainingWalkthrough() {
  const [, navigate] = useLocation();
  const [step, setStep]       = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const current = STEPS[step]!;
  const Icon = current.icon;
  const [showScript, setShowScript] = useState(false);
  const script = VOICEOVER_SCRIPTS["walkthrough"];
  const cue = script?.cues[step];

  function advance() {
    setCompleted((c) => new Set([...c, step]));
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else navigate("/training");
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
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
            Venue Walkthrough
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Step {step + 1} of {STEPS.length}
          </div>
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: completed.has(i) ? 14 : i === step ? 18 : 6,
              height: 6, borderRadius: 3, cursor: "pointer",
              background: completed.has(i) ? T.green : i === step ? T.gold : "rgba(255,255,255,0.1)",
              transition: "all 0.2s",
            }} onClick={() => setStep(i)} />
          ))}
          <button onClick={() => setShowScript((s) => !s)} style={{
            background: showScript ? `${T.gold}18` : "rgba(255,255,255,0.04)",
            border: `1px solid ${showScript ? T.gold + "50" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 7, color: showScript ? T.gold : T.muted, padding: "5px 9px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3, fontSize: 9, marginLeft: 6,
          }}>
            <FileText size={9} /> Script
          </button>
        </div>
      </div>

      {/* Script overlay */}
      <AnimatePresence>
        {showScript && cue && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0, width: 360,
              background: "#09060f", borderLeft: "1px solid rgba(201,168,76,0.2)",
              zIndex: 60, overflowY: "auto", padding: "20px 22px",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                  Walkthrough Script
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>
                  Step {step + 1} · {cue.duration}
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

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${T.gold}, ${current.color})`, borderRadius: 1 }}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <TrainingBanner />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Step icon + number */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <motion.div
                animate={{ boxShadow: [`0 0 0px ${current.color}00`, `0 0 24px ${current.color}40`, `0 0 0px ${current.color}00`] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: `${current.color}12`, border: `1px solid ${current.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon size={28} color={current.color} />
              </motion.div>
              <div>
                <div style={{ fontSize: 10, color: current.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 4 }}>
                  Step {current.num} of {STEPS.length}
                </div>
                <div style={{ fontSize: 26, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text }}>
                  {current.title}
                </div>
              </div>
            </div>

            {/* Main description */}
            <div style={{
              background: `${current.color}06`, border: `1px solid ${current.color}20`,
              borderRadius: 14, padding: "24px 28px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, color: T.light, lineHeight: 1.8, marginBottom: 14 }}>
                {current.desc}
              </div>
              <div style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.6, borderTop: `1px solid ${current.color}20`, paddingTop: 12 }}>
                {current.detail}
              </div>
            </div>

            {/* Action button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={advance}
              style={{
                width: "100%", padding: "18px",
                background: `linear-gradient(135deg, ${current.color}20, ${current.color}10)`,
                border: `1px solid ${current.color}40`,
                borderRadius: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: current.color }}>{current.action}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {step < STEPS.length - 1 ? (
                  <>
                    <span style={{ fontSize: 10, color: T.muted }}>Continue</span>
                    <ArrowRight size={14} color={current.color} />
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 10, color: T.green }}>Launch</span>
                    <CheckCircle size={14} color={T.green} />
                  </>
                )}
              </div>
            </motion.button>

            {/* Nav row */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{
                background: "transparent", border: `1px solid ${T.border}`,
                borderRadius: 9, color: T.muted, padding: "9px 16px", cursor: "pointer",
                fontSize: 11, display: "flex", alignItems: "center", gap: 5,
                opacity: step === 0 ? 0.3 : 1,
              }}>
                <ArrowLeft size={11} /> Back
              </button>
              <div style={{ fontSize: 10, color: T.muted, alignSelf: "center" }}>
                {completed.size} of {STEPS.length} complete
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <Maxwell message={current.maxwell} context={`Step ${current.num}: ${current.title}`} />
    </div>
  );
}
