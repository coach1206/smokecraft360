/**
 * AxiomDemo — /demo/axiom-experience
 *
 * Investor-facing guided story mode demonstrating the full NOVEE OS experience loop.
 * Uses cinematic visuals + real system data where available.
 *
 * Safety: No POST calls that create persistent data. All read-only API access.
 * Demo sessions are purely visual — never written to DB.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Play, Pause, ChevronRight, RotateCcw, X,
  Brain, Flame, Waves, BarChart2, ShoppingBag, TrendingUp,
  Check, ArrowRight,
} from "lucide-react";

// ── Demo data fallbacks (curated, premium) ────────────────────────────────────

const DEMO_ITEMS = [
  { id: "d1", title: "Padron 1964 Anniversary",  type: "smoke", tags: ["bold", "rich", "cedar"], score: 92, price: "$28" },
  { id: "d2", title: "Arturo Fuente Opus X",      type: "smoke", tags: ["complex", "spicy", "full body"], score: 89, price: "$34" },
  { id: "d3", title: "Rocky Patel Vintage 1990",  type: "smoke", tags: ["aged", "reserve", "smooth"], score: 86, price: "$22" },
  { id: "d4", title: "Cohiba Behike BHK 52",      type: "smoke", tags: ["premium", "rare", "luxury"], score: 94, price: "$45" },
];

const DEMO_STEPS = [
  {
    id: "craft",
    step: 1,
    title: "Guest selects a craft",
    subtitle: "The journey begins at the Craft Hub",
    body: "A guest arrives and browses four distinct craft experiences. They choose SmokeCraft — the premium cigar journey.",
    icon: Flame,
    accent: "#D48B00",
  },
  {
    id: "swipe",
    step: 2,
    title: "System learns preference",
    subtitle: "Universal Swipe Engine + Memory Brain",
    body: "The guest swipes through flavor profiles. Each decision is captured — bold vs mild, complex vs smooth. The Memory Brain builds a real-time taste vector.",
    icon: Brain,
    accent: "#8b5cf6",
  },
  {
    id: "atmosphere",
    step: 3,
    title: "Atmosphere adapts",
    subtitle: "Predictive Experience Orchestrator",
    body: "The orchestrator detects a premium-intent profile. Atmosphere intensity lifts, pacing slows to cinematic, the environment deepens to match the mood.",
    icon: Waves,
    accent: "#0891b2",
  },
  {
    id: "revenue",
    step: 4,
    title: "Revenue Brain ranks inventory",
    subtitle: "40% taste · 25% margin · 15% stock · 20% reliability",
    body: "The scoring engine evaluates every in-stock item against the guest's taste vector, margin targets, and venue reliability data. Out-of-stock items are hard-blocked.",
    icon: BarChart2,
    accent: "#16a34a",
  },
  {
    id: "reveal",
    step: 5,
    title: "Reveal converts to order",
    subtitle: "Add-to-Order Pipeline · Inventory Reservations",
    body: "The top-ranked cigars are revealed cinematically. The guest taps Add — a 15-minute inventory reservation is created instantly. No double-sells possible.",
    icon: ShoppingBag,
    accent: "#D48B00",
  },
  {
    id: "analytics",
    step: 6,
    title: "Analytics records behavior",
    subtitle: "Swipe Intelligence · Orchestration IQ",
    body: "Every swipe, mood signal, recommendation, and conversion is captured. The venue sees real-time behavioral intelligence — what converts, what doesn't, why.",
    icon: TrendingUp,
    accent: "#ea580c",
  },
] as const;

type StepId = typeof DEMO_STEPS[number]["id"];
const STEP_DURATION_MS = 6000;

// ── Craft tiles (Step 1) ──────────────────────────────────────────────────────

const CRAFTS = [
  { id: "smoke", label: "SmokeCraft", emoji: "", accent: "#D48B00" },
  { id: "pour",  label: "PourCraft",  emoji: "🥃", accent: "#8b5cf6" },
  { id: "brew",  label: "BrewCraft",  emoji: "🍺", accent: "#16a34a" },
  { id: "vape",  label: "VapeCraft",  emoji: "💨", accent: "#0891b2" },
];

function CraftHubVisual({ active }: { active: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!active) { setSelected(null); return; }
    const t1 = setTimeout(() => setSelected("smoke"), 900);
    return () => clearTimeout(t1);
  }, [active]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 0" }}>
      {CRAFTS.map((craft, i) => (
        <motion.div
          key={craft.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: selected === craft.id ? 1.04 : 1 }}
          transition={{ delay: i * 0.12 + 0.2, duration: 0.4 }}
          style={{
            background: selected === craft.id
              ? `linear-gradient(135deg, ${craft.accent}25, ${craft.accent}10)`
              : "rgba(26,26,27,0.08)",
            border: `1px solid ${selected === craft.id ? craft.accent + "60" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 14,
            padding: "20px 16px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.3s ease",
          }}
          onClick={() => setSelected(craft.id)}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>{craft.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: selected === craft.id ? craft.accent : "rgba(240,232,216,0.7)", letterSpacing: "0.06em" }}>
            {craft.label}
          </div>
          {selected === craft.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 8, display: "flex", justifyContent: "center" }}
            >
              <span style={{
                background: craft.accent, borderRadius: 20,
                padding: "2px 10px", fontSize: 10, fontWeight: 800,
                color: "#1A1410", letterSpacing: "0.1em",
              }}>SELECTED</span>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Swipe cards (Step 2) ──────────────────────────────────────────────────────

function SwipeVisual({ active }: { active: boolean }) {
  const [swipeIdx, setSwipeIdx] = useState(0);
  const [action, setAction]     = useState<"add" | "skip" | null>(null);

  useEffect(() => {
    if (!active) { setSwipeIdx(0); setAction(null); return; }
    let idx = 0;
    const interval = setInterval(() => {
      const dir = idx % 3 === 1 ? "skip" : "add";
      setAction(dir);
      setTimeout(() => {
        setAction(null);
        setSwipeIdx(p => (p + 1) % DEMO_ITEMS.length);
      }, 600);
      idx++;
    }, 1400);
    return () => clearInterval(interval);
  }, [active]);

  const card = DEMO_ITEMS[swipeIdx % DEMO_ITEMS.length]!;

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <motion.div
        key={swipeIdx}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1, y: 0,
          x: action === "add" ? 80 : action === "skip" ? -80 : 0,
          rotate: action === "add" ? 8 : action === "skip" ? -8 : 0,
        }}
        transition={{ duration: 0.35 }}
        style={{
          background: "linear-gradient(145deg, rgba(26,26,27,0.11), rgba(26,26,27,0.06))",
          border: "1px solid rgba(26,26,27,0.14)",
          borderRadius: 18, padding: "22px 20px",
          width: "100%", maxWidth: 280,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(240,232,216,0.9)", marginBottom: 8 }}>{card.title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {card.tags.map(tag => (
            <span key={tag} style={{
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)",
              fontSize: 11, color: "#D48B00", fontWeight: 600,
            }}>{tag}</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "rgba(240,232,216,0.4)" }}>Score: {card.score}</div>
      </motion.div>

      {/* ADD / SKIP overlay */}
      <AnimatePresence>
        {action && (
          <motion.div
            key={action}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: 12,
              [action === "add" ? "left" : "right"]: 8,
              padding: "6px 14px", borderRadius: 10,
              background: action === "add" ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
              border: `2px solid ${action === "add" ? "#34d399" : "#ef4444"}`,
              color: action === "add" ? "#34d399" : "#ef4444",
              fontSize: 13, fontWeight: 800, letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {action === "add" ? <><Check size={13} strokeWidth={3} /> ADD</> : <>SKIP <X size={13} strokeWidth={3} /></>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Atmosphere visual (Step 3) ────────────────────────────────────────────────

function AtmosphereVisual({ active }: { active: boolean }) {
  const [intensity, setIntensity] = useState(40);
  const metrics = [
    { label: "Glow Strength",    value: intensity,           color: "#D48B00" },
    { label: "Motion Calmness",  value: Math.round(intensity * 0.85), color: "#8b5cf6" },
    { label: "Premium Intent",   value: Math.round(intensity * 0.9),  color: "#0891b2" },
    { label: "Atm. Intensity",   value: intensity,           color: "#ea580c" },
  ];

  useEffect(() => {
    if (!active) { setIntensity(40); return; }
    let v = 40;
    const iv = setInterval(() => {
      v = Math.min(88, v + 3);
      setIntensity(v);
      if (v >= 88) clearInterval(iv);
    }, 80);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          height: 60, borderRadius: 14,
          background: `radial-gradient(ellipse at 50% 50%, rgba(212,139,0,${intensity / 200}) 0%, transparent 70%)`,
          border: "1px solid rgba(212,139,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#D48B00", fontWeight: 600,
        }}
      >
        Atmosphere Intensity: {intensity}%
      </motion.div>

      {metrics.map(m => (
        <div key={m.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "rgba(240,232,216,0.55)" }}>{m.label}</span>
            <span style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.value}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(26,26,27,0.08)", borderRadius: 4, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${m.value}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%", background: m.color, borderRadius: 4 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Revenue Brain visual (Step 4) ─────────────────────────────────────────────

function RevenueBrainVisual({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, [active]);

  const ranked = [...DEMO_ITEMS].sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ranked.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -20 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: i === 0 ? "rgba(212,139,0,0.1)" : "rgba(26,26,27,0.06)",
            border: `1px solid ${i === 0 ? "rgba(212,139,0,0.3)" : "rgba(26,26,27,0.10)"}`,
            borderRadius: 10, padding: "12px 14px",
          }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: i === 0 ? "#D48B00" : "rgba(26,26,27,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
            color: i === 0 ? "#1A1410" : "rgba(240,232,216,0.4)",
            flexShrink: 0,
          }}>#{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(240,232,216,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.title}
            </div>
            <div style={{ height: 3, background: "rgba(26,26,27,0.10)", borderRadius: 2, marginTop: 5 }}>
              <motion.div
                animate={{ width: `${item.score}%` }}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.6 }}
                style={{ height: "100%", background: i === 0 ? "#D48B00" : "#8b5cf6", borderRadius: 2 }}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#D48B00", flexShrink: 0 }}>{item.score}</div>
          <div style={{ fontSize: 11, color: "rgba(240,232,216,0.4)", flexShrink: 0 }}>{item.price}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Reveal visual (Step 5) ────────────────────────────────────────────────────

function RevealVisual({ active }: { active: boolean }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const top3 = [...DEMO_ITEMS].sort((a, b) => b.score - a.score).slice(0, 3);

  useEffect(() => {
    if (!active) { setAdded(new Set()); return; }
    const t = setTimeout(() => setAdded(new Set([top3[0]!.id])), 2500);
    return () => clearTimeout(t);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {top3.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 + 0.1 }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: added.has(item.id) ? "rgba(52,211,153,0.08)" : "rgba(26,26,27,0.07)",
            border: `1px solid ${added.has(item.id) ? "#34d39940" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, padding: "14px 16px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(240,232,216,0.9)", marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: "rgba(240,232,216,0.4)" }}>
              Match score: <span style={{ color: "#D48B00", fontWeight: 600 }}>{item.score}%</span>
              <span style={{ margin: "0 8px", opacity: 0.3 }}>·</span>
              {item.price}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setAdded(p => new Set([...p, item.id]))}
            style={{
              background: added.has(item.id) ? "#34d399" : "#D48B00",
              border: "none", borderRadius: 8, padding: "7px 14px",
              color: "#1A1410", fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {added.has(item.id) ? <><Check size={11} strokeWidth={3} /> Added</> : <>Add</>}
          </motion.button>
        </motion.div>
      ))}
      {added.size > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
            fontSize: 11, color: "#34d399", fontWeight: 600,
          }}
        >
          ✓ Inventory reserved · 15-minute hold active · No double-sells possible
        </motion.div>
      )}
    </div>
  );
}

// ── Analytics visual (Step 6) ─────────────────────────────────────────────────

function AnimCounter2({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const iv = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(start);
      if (start >= target) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [target, duration]);
  return <>{value.toLocaleString()}</>;
}

function AnalyticsVisual({ active }: { active: boolean }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (!active) { setGo(false); return; }
    const t = setTimeout(() => setGo(true), 200);
    return () => clearTimeout(t);
  }, [active]);

  const stats = [
    { label: "Swipe Sessions",     value: 347,  color: "#D48B00", icon: Brain  },
    { label: "Recommendations",    value: 289,  color: "#8b5cf6", icon: TrendingUp },
    { label: "Orders Created",     value: 184,  color: "#16a34a", icon: ShoppingBag },
    { label: "Conversion Rate",    value: 63,   color: "#0891b2", icon: BarChart2, suffix: "%" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{
            background: `${s.color}0F`,
            border: `1px solid ${s.color}25`,
            borderRadius: 12, padding: "16px 14px",
          }}
        >
          <s.icon size={14} color={s.color} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>
            {go ? <AnimCounter2 target={s.value} /> : 0}{s.suffix ?? ""}
          </div>
          <div style={{ fontSize: 11, color: "rgba(240,232,216,0.45)", marginTop: 4 }}>{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Step visual router ────────────────────────────────────────────────────────

function StepVisual({ stepId, active }: { stepId: StepId; active: boolean }) {
  if (stepId === "craft")      return <CraftHubVisual active={active} />;
  if (stepId === "swipe")      return <SwipeVisual active={active} />;
  if (stepId === "atmosphere") return <AtmosphereVisual active={active} />;
  if (stepId === "revenue")    return <RevenueBrainVisual active={active} />;
  if (stepId === "reveal")     return <RevealVisual active={active} />;
  if (stepId === "analytics")  return <AnalyticsVisual active={active} />;
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AxiomDemo() {
  const [, navigate]    = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [playing,     setPlaying]     = useState(false);
  const [started,     setStarted]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressMV = useMotionValue(0);

  const step = DEMO_STEPS[currentStep]!;
  const isLast = currentStep === DEMO_STEPS.length - 1;

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const startTimer = useCallback(() => {
    clearTimer();
    progressMV.set(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / STEP_DURATION_MS) * 100);
      progressMV.set(pct);
      if (pct >= 100) {
        clearTimer();
        setCurrentStep(p => {
          const next = p + 1;
          if (next >= DEMO_STEPS.length) { setPlaying(false); return p; }
          return next;
        });
      }
    }, 32);
  }, [progressMV]);

  useEffect(() => {
    if (playing) startTimer();
    else clearTimer();
    return clearTimer;
  }, [playing, currentStep, startTimer]);

  function handleStart() {
    setStarted(true);
    setCurrentStep(0);
    setPlaying(true);
  }

  function handlePause() { setPlaying(p => !p); }

  function handleNext() {
    if (isLast) return;
    clearTimer();
    progressMV.set(0);
    setCurrentStep(p => p + 1);
    if (playing) setTimeout(startTimer, 50);
  }

  function handleReset() {
    clearTimer();
    setCurrentStep(0);
    setPlaying(false);
    setStarted(false);
    progressMV.set(0);
  }

  const progressWidth = useTransform(progressMV, v => `${v}%`);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #0d0a08 0%, #F5F2ED 60%, #F5F2ED 100%)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Ambient background glow ── */}
      <motion.div
        animate={{ opacity: [0.15, 0.28, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 40%, ${step.accent}18 0%, transparent 65%)`,
        }}
      />

      {/* ── Header bar ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", flexShrink: 0,
        borderBottom: "1px solid rgba(26,26,27,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Brain size={14} color="#D48B00" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,232,216,0.9)", letterSpacing: "0.04em" }}>
              NOVEE OS
            </div>
            <div style={{ fontSize: 9, color: "rgba(212,139,0,0.6)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Experience Validation · Investor Mode
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {DEMO_STEPS.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => { clearTimer(); progressMV.set(0); setCurrentStep(i); setStarted(true); }}
              animate={{ scale: i === currentStep ? 1 : 0.85 }}
              style={{
                width: i === currentStep ? 20 : 7,
                height: 7, borderRadius: 4,
                background: i === currentStep ? s.accent : i < currentStep ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                border: "none", cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(26,26,27,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 12px",
            color: "rgba(240,232,216,0.5)", fontSize: 12, cursor: "pointer",
          }}
        >
          <X size={12} /> Exit
        </button>
      </div>

      {/* ── Step progress bar ── */}
      {started && (
        <div style={{ height: 2, background: "rgba(26,26,27,0.08)", position: "relative", flexShrink: 0 }}>
          <motion.div style={{ height: "100%", background: step.accent, width: progressWidth }} />
        </div>
      )}

      {/* ── Main content area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 5 }}>

        {!started ? (
          /* ── Landing / start screen ── */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 24px", textAlign: "center",
          }}>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                width: 72, height: 72, borderRadius: 20, marginBottom: 24,
                background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Brain size={32} color="#D48B00" />
            </motion.div>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: "rgba(240,232,216,0.95)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              The NOVEE Experience
            </h1>
            <p style={{ fontSize: 14, color: "rgba(240,232,216,0.45)", margin: "0 0 32px", maxWidth: 380, lineHeight: 1.7 }}>
              A guided 6-step demonstration of the full experience loop — from craft selection through behavioral AI, cinematic reveal, and real-time analytics.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 36, maxWidth: 420 }}>
              {DEMO_STEPS.map((s, i) => (
                <div key={s.id} style={{
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)",
                  borderRadius: 10, padding: "10px 8px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, color: s.accent, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: "rgba(240,232,216,0.55)" }}>{s.title}</div>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStart}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "linear-gradient(135deg, #D48B00, #b8952a)",
                border: "none", borderRadius: 14, padding: "14px 32px",
                color: "#1A1410", fontSize: 15, fontWeight: 800,
                cursor: "pointer", letterSpacing: "0.04em",
                boxShadow: "0 8px 32px rgba(212,139,0,0.3)",
              }}
            >
              <Play size={16} fill="currentColor" /> Start Demo
            </motion.button>
            <p style={{ marginTop: 14, fontSize: 11, color: "rgba(240,232,216,0.25)" }}>
              Read-only mode · No production data is created
            </p>
          </div>
        ) : (
          /* ── Active demo steps ── */
          <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>

            {/* Left: Narration */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.35 }}
                style={{
                  width: "42%", padding: "28px 28px 20px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  borderRight: "1px solid rgba(26,26,27,0.08)",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: `${step.accent}15`, border: `1px solid ${step.accent}30`,
                  borderRadius: 8, padding: "5px 12px",
                  marginBottom: 20, alignSelf: "flex-start",
                }}>
                  <step.icon size={13} color={step.accent} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: step.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Step {step.step} of {DEMO_STEPS.length}
                  </span>
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 800, color: "rgba(240,232,216,0.95)", margin: "0 0 8px", lineHeight: 1.25 }}>
                  {step.title}
                </h2>
                <p style={{ fontSize: 12, color: step.accent, fontWeight: 600, margin: "0 0 16px", letterSpacing: "0.04em" }}>
                  {step.subtitle}
                </p>
                <p style={{ fontSize: 13, color: "rgba(240,232,216,0.55)", margin: 0, lineHeight: 1.75 }}>
                  {step.body}
                </p>

                {/* Next hint */}
                {!isLast && (
                  <div style={{
                    marginTop: 24, display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: "rgba(240,232,216,0.25)",
                  }}>
                    <ArrowRight size={12} />
                    Next: {DEMO_STEPS[currentStep + 1]?.title}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Right: Visual */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{ flex: 1, padding: "28px 24px", overflowY: "auto" }}
              >
                <StepVisual stepId={step.id} active={true} />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      {started && (
        <div style={{
          flexShrink: 0, position: "relative", zIndex: 10,
          borderTop: "1px solid rgba(26,26,27,0.08)",
          padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
        }}>
          <button
            onClick={handleReset}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(26,26,27,0.07)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "7px 14px",
              color: "rgba(240,232,216,0.5)", fontSize: 12, cursor: "pointer",
            }}
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button
            onClick={handlePause}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(26,26,27,0.09)", border: "1px solid rgba(26,26,27,0.14)",
              borderRadius: 8, padding: "7px 16px",
              color: "rgba(240,232,216,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
          </button>

          <button
            onClick={handleNext}
            disabled={isLast}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isLast ? "rgba(212,139,0,0.1)" : "#D48B00",
              border: "none", borderRadius: 8, padding: "7px 16px",
              color: isLast ? "rgba(212,139,0,0.4)" : "#1A1410",
              fontSize: 12, fontWeight: 700, cursor: isLast ? "not-allowed" : "pointer",
            }}
          >
            Next Step <ChevronRight size={12} />
          </button>

          <div style={{ position: "absolute", right: 20, fontSize: 11, color: "rgba(240,232,216,0.25)" }}>
            {currentStep + 1} / {DEMO_STEPS.length}
          </div>
        </div>
      )}
    </div>
  );
}
