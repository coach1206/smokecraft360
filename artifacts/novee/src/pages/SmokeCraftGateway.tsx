import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
type CraftLevel = "beginner" | "explorer" | "connoisseur" | "master";
type FlavorTexture = "smooth" | "bold";
type FlavorTaste   = "earthy" | "sweet";
type FlavorBurn    = "slow"   | "rich";

interface FlavorProfile { texture: FlavorTexture | null; taste: FlavorTaste | null; burn: FlavorBurn | null; }
interface FlavorBar     { label: string; value: number; }

interface CigarRec {
  name: string; origin: string;
  strength: string; wrapper: string;
  flavor: string; notes: string;
  bars: FlavorBar[];
}

interface RitualState {
  stage: number;
  level: CraftLevel | null;
  flavor: FlavorProfile;
  rec: CigarRec | null;
  pairing: string | null;
  goldenBox: boolean;
  completedAt: string | null;
}

// ── Recommendation engine ──────────────────────────────────────────────────────
const RECS: Record<string, CigarRec> = {
  "smooth-earthy-slow": {
    name: "Davidoff Millennium Blend", origin: "Dominican Republic",
    strength: "Mild–Medium", wrapper: "Ecuador Connecticut",
    flavor: "Creamy · Cedar · Toasted Almond",
    notes: "Opens with cream and cedarwood, evolving into roasted nut and white pepper on the finish. A pillar of refinement.",
    bars: [{ label: "Strength", value: 32 }, { label: "Body", value: 40 }, { label: "Complexity", value: 68 }, { label: "Sweetness", value: 55 }],
  },
  "smooth-sweet-slow": {
    name: "Oliva Serie V Melanio", origin: "Nicaragua",
    strength: "Medium", wrapper: "Ecuadorian Sumatra",
    flavor: "Cocoa · Caramel · Toasted Oak",
    notes: "An award-winning masterpiece with dark chocolate sweetness, subtle nutmeg, and an extraordinarily long finish.",
    bars: [{ label: "Strength", value: 52 }, { label: "Body", value: 55 }, { label: "Complexity", value: 78 }, { label: "Sweetness", value: 72 }],
  },
  "bold-earthy-rich": {
    name: "Padrón 1964 Anniversary", origin: "Nicaragua",
    strength: "Full", wrapper: "Nicaragua Sun-Grown",
    flavor: "Dark Earth · Espresso · Black Pepper",
    notes: "Volcanic soil complexity, aged 4 years minimum. Coffee grounds and dark chocolate dominate with a long, warming finish.",
    bars: [{ label: "Strength", value: 88 }, { label: "Body", value: 85 }, { label: "Complexity", value: 92 }, { label: "Sweetness", value: 28 }],
  },
  "bold-sweet-rich": {
    name: "Liga Privada No. 9", origin: "Nicaragua",
    strength: "Full", wrapper: "CT River Valley Broadleaf",
    flavor: "Dark Chocolate · Espresso · Leather",
    notes: "Drew Estate's crown jewel. Waves of dark cocoa, black cherry, and earthy leather with every draw.",
    bars: [{ label: "Strength", value: 90 }, { label: "Body", value: 88 }, { label: "Complexity", value: 85 }, { label: "Sweetness", value: 42 }],
  },
  "smooth-earthy-rich": {
    name: "Arturo Fuente Opus X", origin: "Dominican Republic",
    strength: "Medium–Full", wrapper: "Dominican Chateau de la Fuente",
    flavor: "Cedar · Amber Honey · Pepper Spice",
    notes: "The first Dominican puro to achieve 'best cigar' status worldwide. Rare complexity with cedar backbone and amber sweetness.",
    bars: [{ label: "Strength", value: 68 }, { label: "Body", value: 72 }, { label: "Complexity", value: 95 }, { label: "Sweetness", value: 48 }],
  },
  "bold-sweet-slow": {
    name: "My Father Le Bijou 1922", origin: "Nicaragua",
    strength: "Full", wrapper: "Broadleaf Oscuro",
    flavor: "Black Pepper · Molasses · Rich Leather",
    notes: "Named for the year the García family began their tobacco tradition. Dark fruit, molasses, and bold Nicaraguan pepper.",
    bars: [{ label: "Strength", value: 85 }, { label: "Body", value: 80 }, { label: "Complexity", value: 76 }, { label: "Sweetness", value: 60 }],
  },
  "smooth-sweet-rich": {
    name: "Ashton Estate Sun Grown", origin: "Dominican Republic",
    strength: "Medium–Full", wrapper: "Cameroon Sun-Grown",
    flavor: "Vanilla Cream · Sweet Spice · Roasted Nut",
    notes: "Crafted from the rarest Cameroon wrappers aged to peak sweetness. Caramel, toasted nuts, and sophisticated spice.",
    bars: [{ label: "Strength", value: 60 }, { label: "Body", value: 65 }, { label: "Complexity", value: 74 }, { label: "Sweetness", value: 78 }],
  },
  "bold-earthy-slow": {
    name: "Perdomo Reserve 10th Anniversary", origin: "Nicaragua",
    strength: "Medium–Full", wrapper: "Nicaragua Sun-Grown Colorado",
    flavor: "Rich Earth · Cedar · Dark Coffee",
    notes: "Aged tobaccos deliver layered earth and cedar, transitioning to dark roasted coffee with a clean, dry finish.",
    bars: [{ label: "Strength", value: 72 }, { label: "Body", value: 70 }, { label: "Complexity", value: 68 }, { label: "Sweetness", value: 35 }],
  },
};

function getRec(flavor: FlavorProfile, level: CraftLevel | null): CigarRec {
  if (level === "beginner") return RECS["smooth-earthy-slow"];
  return RECS[`${flavor.texture || "smooth"}-${flavor.taste || "earthy"}-${flavor.burn || "slow"}`] ?? RECS["smooth-earthy-slow"];
}

// ── Persistence ────────────────────────────────────────────────────────────────
const LS_KEY = "NOVEE_SC_RITUAL_v1";

const BLANK: RitualState = {
  stage: 1,
  level: null,
  flavor: { texture: null, taste: null, burn: null },
  rec: null,
  pairing: null,
  goldenBox: false,
  completedAt: null,
};

function loadState(): RitualState {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...BLANK, ...JSON.parse(s) };
  } catch { /* */ }
  return BLANK;
}

// ── Deterministic ember positions ──────────────────────────────────────────────
const EMBERS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: ((i * 3.33 + 5) % 100),
  size: 1.5 + (i % 5) * 0.5,
  duration: 5 + (i % 6),
  delay: (i * 0.31) % 8,
  drift: ((i % 7) - 3) * 12,
}));

const WISPS = [
  { x: "10%", w: 300, h: 500, dur: 14, delay: 0   },
  { x: "30%", w: 220, h: 420, dur: 19, delay: 2.5 },
  { x: "52%", w: 360, h: 580, dur: 16, delay: 1   },
  { x: "70%", w: 200, h: 400, dur: 21, delay: 4   },
  { x: "86%", w: 280, h: 460, dur: 15, delay: 0.8 },
];

// ── Shared stage-transition variants ──────────────────────────────────────────
const FADE: Parameters<typeof motion.div>[0] = {
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -18 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

// ── Shared style tokens ───────────────────────────────────────────────────────
const AMBER     = "#C4610A";
const GOLD      = "rgba(212,175,55,1)";
const CREAM     = "#F0EDE8";
const DIM       = "rgba(240,237,232,0.40)";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";
const INTER     = "'Inter', -apple-system, sans-serif";

// ── Reusable components ───────────────────────────────────────────────────────
function NavBar({ onBack, label = "← Craft Portal" }: { onBack: () => void; label?: string }) {
  return (
    <>
      <button onClick={onBack} style={{
        position: "fixed", top: 28, left: 36, background: "none", border: "none",
        cursor: "pointer", fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase",
        color: "rgba(240,237,232,0.25)", fontFamily: INTER, transition: "color 0.2s", zIndex: 100,
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,237,232,0.55)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(240,237,232,0.25)"; }}
      >
        {label}
      </button>
      <div style={{
        position: "fixed", top: 28, right: 36, fontSize: 7, letterSpacing: "0.44em",
        textTransform: "uppercase", color: "rgba(212,175,55,0.30)", fontFamily: INTER, zIndex: 100,
      }}>
        NOVEE OS
      </div>
    </>
  );
}

function StageProgress({ stage, total = 10 }: { stage: number; total?: number }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === stage ? 20 : 5, height: 2, borderRadius: 2,
          background: i + 1 === stage ? AMBER : i + 1 < stage ? "rgba(196,97,10,0.35)" : "rgba(255,255,255,0.10)",
          transition: "all 0.4s ease",
        }} />
      ))}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "rgba(196,97,10,0.04)" : "rgba(196,97,10,0.09)",
      border: `1px solid ${disabled ? "rgba(196,97,10,0.18)" : "rgba(196,97,10,0.45)"}`,
      color: disabled ? "rgba(240,237,232,0.30)" : "rgba(240,237,232,0.85)",
      fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
      padding: "16px 28px", cursor: disabled ? "not-allowed" : "pointer",
      width: "100%", fontFamily: INTER,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "background 0.28s, border-color 0.28s, color 0.28s, transform 0.22s",
    }}
      onMouseEnter={e => { if (!disabled) { const b = e.currentTarget; b.style.background = "rgba(196,97,10,0.16)"; b.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.background = disabled ? "rgba(196,97,10,0.04)" : "rgba(196,97,10,0.09)"; b.style.transform = "translateY(0)"; }}
    >
      <span>{children}</span>
      <span style={{ fontSize: 12, opacity: 0.55 }}>→</span>
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(240,237,232,0.10)",
      color: "rgba(240,237,232,0.40)", fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
      padding: "13px 28px", cursor: "pointer", width: "100%", fontFamily: INTER,
      transition: "border-color 0.25s, color 0.25s, transform 0.22s",
    }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = "rgba(240,237,232,0.25)"; b.style.color = "rgba(240,237,232,0.65)"; b.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(240,237,232,0.10)"; b.style.color = "rgba(240,237,232,0.40)"; b.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
}

function Rule() {
  return <div style={{ width: 48, height: 1, background: `linear-gradient(90deg, transparent, rgba(196,97,10,0.50), transparent)`, margin: "24px auto" }} />;
}

// ── Stage 1: Opening ──────────────────────────────────────────────────────────
function Stage1({ onBegin, onContinue, hasSession, sessionMsg }: { onBegin: () => void; onContinue: () => void; hasSession: boolean; sessionMsg: string | null }) {
  return (
    <motion.div key="s1" {...FADE} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 520, padding: "0 32px" }}>
      <div style={{ fontSize: 18, color: "rgba(196,97,10,0.55)", marginBottom: 28, letterSpacing: "0.3em" }}>◈</div>

      <h1 style={{
        fontFamily: CORMORANT, fontSize: "clamp(42px, 8vw, 76px)", fontWeight: 200,
        letterSpacing: "0.12em", color: CREAM, margin: 0, lineHeight: 1, textTransform: "uppercase",
      }}>
        Welcome to
        <span style={{ display: "block", fontSize: "0.62em", letterSpacing: "0.16em", color: CREAM, marginTop: 2 }}>SmokeCraft 360</span>
        <span style={{ display: "block", fontSize: "0.26em", letterSpacing: "0.38em", color: "rgba(196,97,10,0.80)", fontWeight: 300, marginTop: 8 }}>LUXURY CIGAR MASTERCLASS</span>
      </h1>

      <Rule />

      <p style={{
        fontFamily: CORMORANT, fontSize: "clamp(14px, 2vw, 17px)", fontWeight: 300, fontStyle: "italic",
        color: "rgba(240,237,232,0.50)", letterSpacing: "0.08em", lineHeight: 1.75, margin: "0 0 48px",
      }}>
        A cigar is more than tobacco.<br />
        It is atmosphere. Timing. Ritual. Presence.
      </p>

      {sessionMsg && (
        <p style={{ fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(196,97,10,0.75)", marginBottom: 16 }}>
          {sessionMsg}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        <PrimaryBtn onClick={onBegin}>Begin Experience</PrimaryBtn>

        <button onClick={onContinue} style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(240,237,232,0.10)",
          color: hasSession ? "rgba(240,237,232,0.65)" : "rgba(240,237,232,0.28)",
          fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
          padding: "16px 28px", cursor: "pointer", width: "100%", fontFamily: INTER,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border-color 0.25s, color 0.25s",
        }}
          onMouseEnter={e => { if (hasSession) { const b = e.currentTarget; b.style.borderColor = "rgba(240,237,232,0.26)"; } }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(240,237,232,0.10)"; }}
        >
          <span>Continue Session</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasSession ? AMBER : "rgba(255,255,255,0.14)", boxShadow: hasSession ? `0 0 8px ${AMBER}` : "none", flexShrink: 0 }} />
        </button>

        <button onClick={() => window.location.href = "/?challenge=golden_box"} style={{
          background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.14)",
          color: "rgba(212,175,55,0.40)", fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
          padding: "14px 28px", cursor: "pointer", width: "100%", fontFamily: INTER,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border-color 0.25s, color 0.25s",
        }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = "rgba(212,175,55,0.30)"; b.style.color = "rgba(212,175,55,0.65)"; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "rgba(212,175,55,0.14)"; b.style.color = "rgba(212,175,55,0.40)"; }}
        >
          <span>Golden Box Challenge</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>◇</span>
        </button>
      </div>

      <p style={{ fontSize: 7, letterSpacing: "0.36em", textTransform: "uppercase", color: "rgba(240,237,232,0.14)", marginTop: 40, fontFamily: INTER }}>
        10 Stages · E.A.T. Ritual Protocol · NOVEE OS 1.0
      </p>
    </motion.div>
  );
}

// ── Stage 2: Orientation Chamber ──────────────────────────────────────────────
function Stage2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const pillars = [
    { icon: "◈", title: "Flavor Ritual", desc: "A curated sensory journey maps your palate to premium tobacco blends from four continents." },
    { icon: "⬡", title: "Pairing Culture", desc: "Master the art of pairing cigars with aged bourbon, single malt scotch, cognac, and espresso." },
    { icon: "△", title: "XP Progression", desc: "Every stage unlocks deeper knowledge, rare blend access, and membership tier advancement." },
    { icon: "◇", title: "Golden Box", desc: "An optional connoisseur challenge. Complete it to unlock signature blend personalization." },
  ];
  return (
    <motion.div key="s2" {...FADE} style={{ textAlign: "center", maxWidth: 680, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 16, fontFamily: INTER }}>
        Orientation Chamber
      </p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 8px", textTransform: "uppercase" }}>
        The Ritual Philosophy
      </h2>
      <Rule />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36, textAlign: "left" }}>
        {pillars.map(p => (
          <div key={p.title} style={{
            background: "rgba(196,97,10,0.04)", border: "1px solid rgba(196,97,10,0.14)",
            padding: "22px 22px", borderRadius: 2,
          }}>
            <div style={{ fontSize: 14, color: "rgba(196,97,10,0.60)", marginBottom: 10 }}>{p.icon}</div>
            <div style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: "rgba(196,97,10,0.75)", marginBottom: 8, fontFamily: INTER }}>{p.title}</div>
            <p style={{ fontSize: 12, color: DIM, lineHeight: 1.7, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{p.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        <PrimaryBtn onClick={onNext}>Begin The Journey</PrimaryBtn>
        <GhostBtn onClick={onBack}>Back to Portal</GhostBtn>
      </div>
    </motion.div>
  );
}

// ── Stage 3: Experience Level Selection ───────────────────────────────────────
function Stage3({ onSelect, onBack }: { onSelect: (level: CraftLevel) => void; onBack: () => void }) {
  const levels: { id: CraftLevel; title: string; sub: string; color: string }[] = [
    { id: "beginner",    title: "Beginner Ritual",     sub: "First time exploring premium cigars. Guided and gentle.",        color: "rgba(196,97,10,0.45)" },
    { id: "explorer",    title: "Explorer Ritual",     sub: "Familiar with cigars. Ready to deepen your palate.",             color: "rgba(196,97,10,0.60)" },
    { id: "connoisseur", title: "Connoisseur Session", sub: "Experienced smoker seeking refined, curated selections.",         color: "rgba(196,97,10,0.75)" },
    { id: "master",      title: "Master Experience",   sub: "Seasoned aficionado pursuing the pinnacle blends.",              color: GOLD },
  ];

  return (
    <motion.div key="s3" {...FADE} style={{ textAlign: "center", maxWidth: 680, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 14, fontFamily: INTER }}>Stage 3 of 10</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 8px", textTransform: "uppercase" }}>
        Select Your Experience Level
      </h2>
      <Rule />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        {levels.map(lv => (
          <motion.button key={lv.id} whileHover={{ scale: 1.02 }} onClick={() => onSelect(lv.id)}
            style={{
              background: "rgba(255,255,255,0.02)", border: `1px solid rgba(196,97,10,0.16)`,
              padding: "26px 22px", cursor: "pointer", textAlign: "left", borderRadius: 2,
              transition: "background 0.25s, border-color 0.25s",
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(196,97,10,0.06)"; b.style.borderColor = "rgba(196,97,10,0.36)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.02)"; b.style.borderColor = "rgba(196,97,10,0.16)"; }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.26em", textTransform: "uppercase", color: lv.color, marginBottom: 10, fontFamily: INTER }}>{lv.title}</div>
            <p style={{ fontSize: 11, color: DIM, lineHeight: 1.65, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{lv.sub}</p>
          </motion.button>
        ))}
      </div>
      <GhostBtn onClick={onBack}>Back</GhostBtn>
    </motion.div>
  );
}

// ── Stage 4: Flavor Personality Scan ─────────────────────────────────────────
function Stage4({ onComplete, onBack }: { onComplete: (profile: FlavorProfile) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<FlavorProfile>({ texture: null, taste: null, burn: null });

  const questions = [
    {
      key: "texture" as const, label: "Texture Preference",
      q: "When you draw smoke across your palate, which sensation do you seek?",
      a: [{ v: "smooth" as FlavorTexture, title: "Smooth", sub: "Creamy · Silky · Refined" }, { v: "bold" as FlavorTexture, title: "Bold", sub: "Dense · Powerful · Complex" }],
    },
    {
      key: "taste" as const, label: "Flavor Identity",
      q: "Which flavor axis speaks to your palate?",
      a: [{ v: "earthy" as FlavorTaste, title: "Earthy", sub: "Cedar · Leather · Soil · Wood" }, { v: "sweet" as FlavorTaste, title: "Sweet", sub: "Cocoa · Caramel · Dark Fruit · Honey" }],
    },
    {
      key: "burn" as const, label: "Burn Intensity",
      q: "How do you prefer the intensity to reveal itself?",
      a: [{ v: "slow" as FlavorBurn, title: "Slow Burn", sub: "Gradual · Meditative · Long Evolution" }, { v: "rich" as FlavorBurn, title: "Rich Intensity", sub: "Immediate · Powerful · Full Impact" }],
    },
  ];

  const q = questions[step];

  function pick(val: FlavorTexture | FlavorTaste | FlavorBurn) {
    const updated = { ...profile, [q.key]: val };
    setProfile(updated);
    if (step < 2) {
      setStep(s => s + 1);
    } else {
      onComplete(updated as FlavorProfile);
    }
  }

  return (
    <motion.div key="s4" {...FADE} style={{ textAlign: "center", maxWidth: 560, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 14, fontFamily: INTER }}>
        Stage 4 · Question {step + 1} of 3
      </p>

      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: i === step ? 24 : 6, height: 2, borderRadius: 2, background: i < step ? "rgba(196,97,10,0.55)" : i === step ? AMBER : "rgba(255,255,255,0.12)", transition: "all 0.4s" }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
          <p style={{ fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase", color: DIM, marginBottom: 12, fontFamily: INTER }}>{q.label}</p>
          <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(18px, 2.8vw, 28px)", fontWeight: 300, color: CREAM, margin: "0 0 32px", lineHeight: 1.4, letterSpacing: "0.06em" }}>
            {q.q}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {q.a.map(opt => (
              <motion.button key={opt.v} whileHover={{ scale: 1.02 }} onClick={() => pick(opt.v as FlavorTexture & FlavorTaste & FlavorBurn)}
                style={{
                  background: "rgba(196,97,10,0.05)", border: "1px solid rgba(196,97,10,0.18)",
                  padding: "28px 20px", cursor: "pointer", textAlign: "center", borderRadius: 2,
                  transition: "background 0.25s, border-color 0.25s",
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(196,97,10,0.12)"; b.style.borderColor = "rgba(196,97,10,0.45)"; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(196,97,10,0.05)"; b.style.borderColor = "rgba(196,97,10,0.18)"; }}
              >
                <div style={{ fontFamily: CORMORANT, fontSize: 26, fontWeight: 300, color: CREAM, marginBottom: 8, letterSpacing: "0.06em" }}>{opt.title}</div>
                <div style={{ fontSize: 9, letterSpacing: "0.22em", color: DIM, fontFamily: INTER }}>{opt.sub}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 28 }}>
        <GhostBtn onClick={step > 0 ? () => setStep(s => s - 1) : onBack}>{step > 0 ? "← Previous" : "Back"}</GhostBtn>
      </div>
    </motion.div>
  );
}

// ── Stage 5: Wrapper & Cut Education ─────────────────────────────────────────
function Stage5({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const wrappers = [
    { name: "Claro", hue: "#D4C5A0", desc: "Light. Mild Connecticut shade. Smooth, creamy, subtle — the gateway wrapper." },
    { name: "Colorado", hue: "#8B6340", desc: "Medium brown. The sweet spot. Balanced earth, wood, and light spice." },
    { name: "Maduro", hue: "#4A2C14", desc: "Dark. Fermented longer. Rich cocoa, dark fruit, natural sweetness." },
    { name: "Oscuro", hue: "#1E0D06", desc: "Darkest. Maximum fermentation. Bold, intense — full complexity unleashed." },
  ];
  const cuts = [
    { name: "Straight Cut", icon: "⌇", desc: "Clean, direct draw. Classic and reliable." },
    { name: "V-Cut", icon: "∨", desc: "Channel cut. Concentrated draw, deeper smoke concentration." },
    { name: "Punch Cut", icon: "⊙", desc: "Circular piercing. Preserves wrapper integrity, focused smoke." },
  ];

  return (
    <motion.div key="s5" {...FADE} style={{ textAlign: "center", maxWidth: 700, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 14, fontFamily: INTER }}>Stage 5 · Education</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 6px", textTransform: "uppercase" }}>
        Wrapper & Cut Mastery
      </h2>
      <Rule />

      <p style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: DIM, marginBottom: 14, fontFamily: INTER }}>Wrapper Spectrum</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        {wrappers.map(w => (
          <div key={w.name} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", padding: "18px 14px", borderRadius: 2, textAlign: "left" }}>
            <div style={{ width: "100%", height: 36, borderRadius: 2, background: w.hue, marginBottom: 12, opacity: 0.85 }} />
            <div style={{ fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(240,237,232,0.70)", marginBottom: 7, fontFamily: INTER }}>{w.name}</div>
            <p style={{ fontSize: 10, color: "rgba(240,237,232,0.38)", lineHeight: 1.6, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{w.desc}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 9, letterSpacing: "0.30em", textTransform: "uppercase", color: DIM, marginBottom: 14, fontFamily: INTER }}>The Cut</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
        {cuts.map(c => (
          <div key={c.name} style={{ background: "rgba(196,97,10,0.03)", border: "1px solid rgba(196,97,10,0.12)", padding: "18px 14px", borderRadius: 2 }}>
            <div style={{ fontSize: 20, color: "rgba(196,97,10,0.55)", marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(196,97,10,0.70)", marginBottom: 7, fontFamily: INTER }}>{c.name}</div>
            <p style={{ fontSize: 10, color: DIM, lineHeight: 1.6, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{c.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        <PrimaryBtn onClick={onNext}>I'm Ready</PrimaryBtn>
        <GhostBtn onClick={onBack}>Back</GhostBtn>
      </div>
    </motion.div>
  );
}

// ── Stage 6: AI Recommendation Reveal ────────────────────────────────────────
function Stage6({ rec, onNext, onBack }: { rec: CigarRec; onNext: () => void; onBack: () => void }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 600); return () => clearTimeout(t); }, []);

  return (
    <motion.div key="s6" {...FADE} style={{ textAlign: "center", maxWidth: 580, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 14, fontFamily: INTER }}>Stage 6 · Recommendation Reveal</p>

      <AnimatePresence>
        {!revealed ? (
          <motion.div key="loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "40px 0" }}>
            <div style={{ fontSize: 24, color: "rgba(196,97,10,0.40)", marginBottom: 16 }}>◈</div>
            <p style={{ fontFamily: CORMORANT, fontSize: 18, fontStyle: "italic", color: DIM, letterSpacing: "0.06em" }}>Analysing your palate profile…</p>
          </motion.div>
        ) : (
          <motion.div key="reveal" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div style={{ background: "rgba(196,97,10,0.05)", border: "1px solid rgba(196,97,10,0.22)", padding: "32px 28px", borderRadius: 2, marginBottom: 20, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 7, letterSpacing: "0.40em", textTransform: "uppercase", color: "rgba(196,97,10,0.55)", margin: "0 0 6px", fontFamily: INTER }}>Your Recommendation</p>
                  <h3 style={{ fontFamily: CORMORANT, fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 300, color: CREAM, margin: 0, letterSpacing: "0.06em" }}>{rec.name}</h3>
                </div>
                <span style={{
                  background: "rgba(196,97,10,0.10)", border: "1px solid rgba(196,97,10,0.30)",
                  fontSize: 7, letterSpacing: "0.28em", textTransform: "uppercase", padding: "5px 10px",
                  color: "rgba(196,97,10,0.80)", fontFamily: INTER, whiteSpace: "nowrap",
                }}>{rec.strength}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                {[["Origin", rec.origin], ["Wrapper", rec.wrapper], ["Flavor Identity", rec.flavor]].map(([k, v]) => (
                  <div key={k} style={{ gridColumn: k === "Flavor Identity" ? "1 / -1" : "auto" }}>
                    <p style={{ fontSize: 7, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(240,237,232,0.30)", margin: "0 0 4px", fontFamily: INTER }}>{k}</p>
                    <p style={{ fontSize: 12, color: DIM, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{v}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 18 }}>
                {rec.bars.map(bar => (
                  <div key={bar.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 8, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(240,237,232,0.40)", fontFamily: INTER }}>{bar.label}</span>
                      <span style={{ fontSize: 8, color: "rgba(196,97,10,0.65)", fontFamily: INTER }}>{bar.value}</span>
                    </div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                        style={{ height: "100%", background: `linear-gradient(90deg, rgba(196,97,10,0.60), rgba(212,175,55,0.80))`, borderRadius: 2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: CORMORANT, fontSize: 14, fontStyle: "italic", color: DIM, lineHeight: 1.7, margin: 0, letterSpacing: "0.04em" }}>{rec.notes}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <PrimaryBtn onClick={onNext}>Select Pairing</PrimaryBtn>
              <GhostBtn onClick={onBack}>Back</GhostBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stage 7: Pairing Chamber ──────────────────────────────────────────────────
function Stage7({ rec, onSelect, onBack }: { rec: CigarRec; onSelect: (pairing: string) => void; onBack: () => void }) {
  const pairings = [
    { id: "bourbon",  icon: "🥃", title: "Aged Bourbon",    sub: "Sweet oak, vanilla, caramel — amplifies creamy notes" },
    { id: "scotch",   icon: "◈",  title: "Single Malt Scotch", sub: "Smoky peat, dried fruit — bridges earthy profiles" },
    { id: "cognac",   icon: "⬡",  title: "Fine Cognac",      sub: "Floral, grape, spice — elevates complexity" },
    { id: "espresso", icon: "☕", title: "Double Espresso",  sub: "Dark roast, bitter finish — intensifies dark notes" },
    { id: "stout",    icon: "⊙",  title: "Dark Stout",       sub: "Roasted malt, chocolate — mirrors bold profiles" },
  ];

  return (
    <motion.div key="s7" {...FADE} style={{ textAlign: "center", maxWidth: 620, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 14, fontFamily: INTER }}>Stage 7 · Pairing Chamber</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(22px, 3.2vw, 34px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 6px", textTransform: "uppercase" }}>
        Complete Your Experience
      </h2>
      <p style={{ fontSize: 11, color: DIM, marginBottom: 28, fontFamily: INTER, fontWeight: 300 }}>
        Pairing with <em style={{ color: "rgba(240,237,232,0.65)", fontStyle: "italic" }}>{rec.name}</em>
      </p>
      <Rule />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {pairings.map(p => (
          <motion.button key={p.id} whileHover={{ scale: 1.01, x: 4 }} onClick={() => onSelect(p.id)}
            style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,97,10,0.14)",
              padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 18,
              textAlign: "left", borderRadius: 2, transition: "background 0.25s, border-color 0.25s",
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(196,97,10,0.07)"; b.style.borderColor = "rgba(196,97,10,0.36)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.02)"; b.style.borderColor = "rgba(196,97,10,0.14)"; }}
          >
            <div style={{ fontSize: 20, width: 32, textAlign: "center", color: "rgba(196,97,10,0.60)", flexShrink: 0 }}>{p.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(196,97,10,0.75)", marginBottom: 5, fontFamily: INTER }}>{p.title}</div>
              <div style={{ fontSize: 11, color: DIM, fontFamily: INTER, fontWeight: 300 }}>{p.sub}</div>
            </div>
            <span style={{ fontSize: 12, color: "rgba(196,97,10,0.40)" }}>→</span>
          </motion.button>
        ))}
      </div>
      <GhostBtn onClick={onBack}>Back</GhostBtn>
    </motion.div>
  );
}

// ── Stage 8: Golden Box Challenge ─────────────────────────────────────────────
function Stage8({ onAccept, onSkip, onBack }: { onAccept: () => void; onSkip: () => void; onBack: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <motion.div key="s8" {...FADE} style={{ textAlign: "center", maxWidth: 520, padding: "0 32px", width: "100%" }}>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(212,175,55,0.55)", marginBottom: 14, fontFamily: INTER }}>Stage 8 · Optional</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(26px, 3.8vw, 42px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 6px", textTransform: "uppercase" }}>
        Golden Box Challenge
      </h2>
      <Rule />

      <motion.div
        onClick={() => setOpened(true)}
        style={{
          width: 110, height: 110, margin: "0 auto 28px",
          background: opened ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.06)",
          border: `2px solid ${opened ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)"}`,
          borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: opened ? "default" : "pointer", transition: "all 0.5s",
          boxShadow: opened ? "0 0 32px rgba(212,175,55,0.18)" : "none",
        }}
        whileHover={!opened ? { scale: 1.06, boxShadow: "0 0 20px rgba(212,175,55,0.14)" } : {}}
      >
        <span style={{ fontSize: opened ? 36 : 28, transition: "font-size 0.4s" }}>{opened ? "◈" : "◇"}</span>
      </motion.div>

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.p key="hint" exit={{ opacity: 0 }} style={{ fontFamily: CORMORANT, fontSize: 16, fontStyle: "italic", color: DIM, lineHeight: 1.7, marginBottom: 28 }}>
            A hidden challenge awaits connoisseurs.<br />Tap the Golden Box to reveal it.
          </motion.p>
        ) : (
          <motion.div key="challenge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.20)", padding: "22px 24px", borderRadius: 2, marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontSize: 8, letterSpacing: "0.36em", textTransform: "uppercase", color: "rgba(212,175,55,0.60)", marginBottom: 10, fontFamily: INTER }}>Challenge Revealed</p>
              <p style={{ fontFamily: CORMORANT, fontSize: 16, color: CREAM, lineHeight: 1.7, margin: 0 }}>
                "Name three premium cigar-producing regions and one signature blend from each — without assistance."
              </p>
              <p style={{ fontSize: 10, color: DIM, marginTop: 14, fontFamily: INTER, fontWeight: 300 }}>
                Completing this challenge unlocks the Signature Humidor Studio and personalized blend access.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        {opened && <PrimaryBtn onClick={onAccept}>Accept The Challenge</PrimaryBtn>}
        <GhostBtn onClick={onSkip}>Skip For Now</GhostBtn>
        <GhostBtn onClick={onBack}>Back</GhostBtn>
      </div>
    </motion.div>
  );
}

// ── Stage 9: Session Completion Reveal ────────────────────────────────────────
function Stage9({ state, onNext }: { state: RitualState; onNext: () => void }) {
  const rec = state.rec;
  const pairingLabels: Record<string, string> = {
    bourbon: "Aged Bourbon", scotch: "Single Malt Scotch",
    cognac: "Fine Cognac", espresso: "Double Espresso", stout: "Dark Stout",
  };
  const levelLabels: Record<string, string> = {
    beginner: "Beginner Ritual", explorer: "Explorer Ritual",
    connoisseur: "Connoisseur Session", master: "Master Experience",
  };

  return (
    <motion.div key="s9" {...FADE} style={{ textAlign: "center", maxWidth: 580, padding: "0 32px", width: "100%" }}>
      <div style={{ fontSize: 22, color: "rgba(212,175,55,0.65)", marginBottom: 16, letterSpacing: "0.2em" }}>✦</div>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(196,97,10,0.60)", marginBottom: 12, fontFamily: INTER }}>Stage 9 · Session Complete</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 6px", textTransform: "uppercase" }}>
        Your Craft Identity
      </h2>
      <Rule />

      <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.16)", padding: "28px", borderRadius: 2, marginBottom: 24, textAlign: "left" }}>
        {[
          ["Experience Level", state.level ? levelLabels[state.level] : "—"],
          ["Flavor Identity", `${state.flavor.texture ?? "—"} · ${state.flavor.taste ?? "—"} · ${state.flavor.burn ?? "—"}`],
          ["Recommended Blend", rec?.name ?? "—"],
          ["Strength Profile", rec?.strength ?? "—"],
          ["Flavor Notes", rec?.flavor ?? "—"],
          ["Pairing Selection", state.pairing ? pairingLabels[state.pairing] : "None selected"],
          ["Golden Box", state.goldenBox ? "Challenge Accepted ◈" : "Deferred"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 8, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(240,237,232,0.35)", fontFamily: INTER, flexShrink: 0, marginRight: 16 }}>{k}</span>
            <span style={{ fontSize: 11, color: DIM, textAlign: "right", fontFamily: INTER, fontWeight: 300 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.18)", padding: "16px 20px", borderRadius: 2, marginBottom: 24 }}>
        <p style={{ fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)", margin: "0 0 6px", fontFamily: INTER }}>Unlocked</p>
        <p style={{ fontFamily: CORMORANT, fontSize: 16, color: CREAM, margin: 0, letterSpacing: "0.06em" }}>Signature Humidor Studio</p>
        <p style={{ fontSize: 10, color: DIM, margin: "6px 0 0", fontFamily: INTER, fontWeight: 300 }}>Your personalized legacy collection awaits.</p>
      </div>

      <PrimaryBtn onClick={onNext}>Enter Humidor Studio</PrimaryBtn>
    </motion.div>
  );
}

// ── Stage 10: Signature Humidor Studio ───────────────────────────────────────
function Stage10({ onBack }: { onBack: () => void }) {
  return (
    <motion.div key="s10" {...FADE} style={{ textAlign: "center", maxWidth: 560, padding: "0 32px", width: "100%" }}>
      <div style={{ fontSize: 22, color: "rgba(212,175,55,0.70)", marginBottom: 16, letterSpacing: "0.2em" }}>◈</div>
      <p style={{ fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase", color: "rgba(212,175,55,0.55)", marginBottom: 14, fontFamily: INTER }}>Stage 10 · Exclusive Access</p>
      <h2 style={{ fontFamily: CORMORANT, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 300, letterSpacing: "0.12em", color: CREAM, margin: "0 0 6px", textTransform: "uppercase" }}>
        Signature Humidor Studio
      </h2>
      <p style={{ fontFamily: CORMORANT, fontSize: 14, fontStyle: "italic", color: DIM, letterSpacing: "0.06em", margin: "0 0 6px" }}>
        Legacy Reserve Collection
      </p>
      <Rule />

      <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.20)", padding: "32px", borderRadius: 2, marginBottom: 28 }}>
        <p style={{ fontFamily: CORMORANT, fontSize: 18, color: CREAM, lineHeight: 1.75, margin: "0 0 20px", letterSpacing: "0.04em" }}>
          Your personalized humidor is ready for configuration. Select from curated legacy blends, adjust your flavor preferences, and build your signature collection.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {["Legacy Blends", "Wrapper Selection", "Flavor Tuning", "Pairing Library", "Member Profile", "Reserve Access"].map(f => (
            <div key={f} style={{ padding: "12px 10px", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 2 }}>
              <p style={{ fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(212,175,55,0.55)", margin: 0, fontFamily: INTER }}>{f}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        <button style={{
          background: "linear-gradient(180deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.08) 100%)",
          border: "1px solid rgba(212,175,55,0.40)", color: GOLD,
          fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
          padding: "16px 28px", cursor: "pointer", width: "100%", fontFamily: INTER,
          borderRadius: 2, transition: "background 0.3s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg, rgba(212,175,55,0.26) 0%, rgba(212,175,55,0.14) 100%)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(180deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.08) 100%)"; }}
        >
          Open Legacy Collection
        </button>
        <GhostBtn onClick={onBack}>Return to Portal</GhostBtn>
      </div>
    </motion.div>
  );
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────
export default function SmokeCraftGateway() {
  const [, navigate] = useLocation();
  const [rs, setRs]   = useState<RitualState>(loadState);
  const [entered, setEntered] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setEntered(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(rs)); } catch { /* */ } }, [rs]);

  const patch = useCallback((p: Partial<RitualState>) => setRs(prev => ({ ...prev, ...p })), []);
  const goTo  = useCallback((stage: number) => patch({ stage }), [patch]);

  const hasSession = rs.stage > 1 && !rs.completedAt;

  function handleContinue() {
    if (hasSession) {
      // already restored from localStorage — do nothing, user sees current stage
    } else {
      setSessionMsg("No active session found. Begin a new ritual.");
      setTimeout(() => setSessionMsg(null), 3200);
    }
  }

  function handleBack() {
    if (rs.stage <= 1) navigate("/");
    else goTo(rs.stage - 1);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#060504",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      overflow: "hidden", color: CREAM, overflowY: "auto",
      opacity: entered ? 1 : 0, transition: "opacity 0.9s ease",
      fontFamily: INTER,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;1,300&family=Inter:wght@300;400;500&display=swap');
        @keyframes smoke-rise {
          0%   { transform: translateY(0) scaleX(1); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 0.16; }
          100% { transform: translateY(-110vh) scaleX(1.6); opacity: 0; }
        }
        @keyframes ember-rise {
          0%   { transform: translate(0, 0); opacity: 0; }
          5%   { opacity: 0.85; }
          80%  { opacity: 0.45; }
          100% { transform: translate(var(--edrift), -95vh); opacity: 0; }
        }
      `}</style>

      {/* ── Smoke wisps ─────────────────────────────────────────────────── */}
      {WISPS.map((s, i) => (
        <div key={i} style={{
          position: "absolute", bottom: -60, left: s.x,
          width: s.w, height: s.h,
          background: "radial-gradient(ellipse, rgba(160,140,120,0.10) 0%, transparent 70%)",
          filter: "blur(48px)",
          animation: `smoke-rise ${s.dur}s ${s.delay}s ease-in-out infinite`,
          transformOrigin: "bottom center", pointerEvents: "none",
        }} />
      ))}

      {/* ── Ember particles ──────────────────────────────────────────────── */}
      {EMBERS.map(e => (
        <div key={e.id} style={{
          position: "absolute", bottom: 0, left: `${e.x}%`,
          width: e.size, height: e.size, borderRadius: "50%",
          background: "radial-gradient(circle, #D47A20 0%, #C4610A 60%, transparent 100%)",
          boxShadow: "0 0 4px rgba(196,97,10,0.55)",
          animation: `ember-rise ${e.duration}s ${e.delay}s ease-out infinite`,
          "--edrift": `${e.drift}px`,
          pointerEvents: "none",
        } as React.CSSProperties} />
      ))}

      {/* ── Vignette ────────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,3,2,0.88) 100%)" }} />

      {/* ── Top navigation bar ──────────────────────────────────────────── */}
      {rs.stage > 1
        ? <NavBar onBack={handleBack} label={`← Stage ${rs.stage - 1}`} />
        : <NavBar onBack={() => navigate("/")} label="← Craft Portal" />
      }

      {/* ── Stage progress dots ──────────────────────────────────────────── */}
      {rs.stage > 1 && <StageProgress stage={rs.stage} />}

      {/* ── Stage content ───────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "80px 0 60px" }}>
        <AnimatePresence mode="wait">
          {rs.stage === 1 && (
            <Stage1
              key="s1"
              hasSession={hasSession}
              sessionMsg={sessionMsg}
              onBegin={() => goTo(2)}
              onContinue={handleContinue}
            />
          )}
          {rs.stage === 2 && (
            <Stage2 key="s2" onNext={() => goTo(3)} onBack={() => goTo(1)} />
          )}
          {rs.stage === 3 && (
            <Stage3 key="s3" onSelect={level => { patch({ level }); goTo(4); }} onBack={() => goTo(2)} />
          )}
          {rs.stage === 4 && (
            <Stage4 key="s4" onComplete={flavor => { patch({ flavor }); goTo(5); }} onBack={() => goTo(3)} />
          )}
          {rs.stage === 5 && (
            <Stage5 key="s5" onNext={() => goTo(6)} onBack={() => goTo(4)} />
          )}
          {rs.stage === 6 && (() => {
            const computed = getRec(rs.flavor, rs.level);
            if (!rs.rec) patch({ rec: computed });
            return <Stage6 key="s6" rec={rs.rec ?? computed} onNext={() => goTo(7)} onBack={() => goTo(5)} />;
          })()}
          {rs.stage === 7 && rs.rec && (
            <Stage7 key="s7" rec={rs.rec} onSelect={pairing => { patch({ pairing }); goTo(8); }} onBack={() => goTo(6)} />
          )}
          {rs.stage === 8 && (
            <Stage8
              key="s8"
              onAccept={() => { patch({ goldenBox: true }); goTo(9); }}
              onSkip={() => goTo(9)}
              onBack={() => goTo(7)}
            />
          )}
          {rs.stage === 9 && (
            <Stage9 key="s9" state={rs} onNext={() => { patch({ stage: 10, completedAt: new Date().toISOString() }); }} />
          )}
          {rs.stage === 10 && (
            <Stage10 key="s10" onBack={() => navigate("/")} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
