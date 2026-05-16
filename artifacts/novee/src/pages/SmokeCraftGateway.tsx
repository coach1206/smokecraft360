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
  stage: 1, level: null,
  flavor: { texture: null, taste: null, burn: null },
  rec: null, pairing: null, goldenBox: false, completedAt: null,
};

function loadState(): RitualState {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...BLANK, ...JSON.parse(s) };
  } catch { /* */ }
  return BLANK;
}

// ── Deterministic particle positions ──────────────────────────────────────────
const EMBERS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: ((i * 3.57 + 4) % 100),
  size: 1.5 + (i % 5) * 0.6,
  duration: 6 + (i % 7),
  delay: (i * 0.37) % 9,
  drift: ((i % 7) - 3) * 14,
}));

const SMOKE_BLOBS = [
  { x: "8%",  w: 600, h: 700, dur: 22, delay: 0   },
  { x: "24%", w: 480, h: 580, dur: 17, delay: 3   },
  { x: "46%", w: 700, h: 800, dur: 25, delay: 1.2 },
  { x: "63%", w: 420, h: 540, dur: 19, delay: 5   },
  { x: "79%", w: 550, h: 650, dur: 20, delay: 0.6 },
  { x: "92%", w: 380, h: 480, dur: 16, delay: 8   },
];

// ── Shared variants ────────────────────────────────────────────────────────────
const FADE: Parameters<typeof motion.div>[0] = {
  initial:    { opacity: 0, y: 28 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -20 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD_GRADIENT = "linear-gradient(135deg, #dfba73 0%, #fbf5b7 50%, #9e7831 100%)";
const GOLD_SOLID    = "#dfba73";
const CREAM_BRIGHT  = "#fffcf5";
const CREAM_DIM     = "rgba(245,246,247,0.65)";
const CORMORANT     = '"Cormorant Garamond", Georgia, serif';
const INTER         = '"Inter", -apple-system, sans-serif';

// ── Shared UI primitives ───────────────────────────────────────────────────────
function ObsidianPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(15,15,15,0.65)",
      border: "1px solid rgba(212,175,55,0.15)",
      borderRadius: 8,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.92)",
      padding: "52px 56px",
      width: "100%",
      maxWidth: 960,
      ...style,
    }}>
      {children}
    </div>
  );
}

function GoldHeading({ children, size = "3.2rem" }: { children: React.ReactNode; size?: string }) {
  return (
    <h2 style={{
      fontFamily: CORMORANT,
      fontSize: size,
      fontWeight: 300,
      letterSpacing: "0.10em",
      textTransform: "uppercase",
      background: "linear-gradient(180deg, #ffffff 0%, #dfba73 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      margin: "0 0 28px",
      lineHeight: 1.1,
    }}>
      {children}
    </h2>
  );
}

function LoungeText({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize: 22,
      lineHeight: 1.80,
      color: CREAM_DIM,
      fontFamily: INTER,
      fontWeight: 300,
      letterSpacing: "0.02em",
      margin: "0 0 32px",
      ...style,
    }}>
      {children}
    </p>
  );
}

function GoldRule() {
  return (
    <div style={{
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(223,186,115,0.55), transparent)",
      margin: "28px 0",
    }} />
  );
}

function MachinedBtn({ children, onClick, disabled, variant = "primary" }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "gold";
}) {
  const base: React.CSSProperties = {
    padding: "20px 48px",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    fontFamily: INTER,
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    width: "100%",
    transition: "all 0.35s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(180deg, #2e3136 0%, #111214 100%)",
      border: `1px solid ${GOLD_SOLID}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 20px rgba(0,0,0,0.60)",
      color: CREAM_BRIGHT,
      opacity: disabled ? 0.42 : 1,
    },
    ghost: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "rgba(245,246,247,0.55)",
    },
    gold: {
      background: "linear-gradient(180deg, rgba(223,186,115,0.20) 0%, rgba(158,120,49,0.12) 100%)",
      border: "1px solid rgba(223,186,115,0.55)",
      color: GOLD_SOLID,
    },
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.01, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...styles[variant] }}
    >
      <span>{children}</span>
      <span style={{ fontSize: 14, opacity: 0.55 }}>
        {variant === "ghost" ? "↩" : "→"}
      </span>
    </motion.button>
  );
}

function SelectionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        background: selected ? "rgba(35,38,44,0.95)" : "rgba(12,13,15,0.65)",
        border: selected ? `2px solid ${GOLD_SOLID}` : "1px solid rgba(255,255,255,0.10)",
        boxShadow: selected ? `0 0 24px rgba(223,186,115,0.12)` : "none",
        borderRadius: 6,
        padding: "32px 28px",
        cursor: "pointer",
        transition: "all 0.30s ease",
      }}
    >
      {children}
    </motion.div>
  );
}

function StageTag({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: 11,
      fontFamily: INTER,
      letterSpacing: "0.40em",
      textTransform: "uppercase",
      color: "rgba(223,186,115,0.60)",
      margin: "0 0 20px",
    }}>
      {label}
    </p>
  );
}

function NavBar({ onBack, label = "← Craft Portal" }: { onBack: () => void; label?: string }) {
  return (
    <>
      <motion.button
        whileHover={{ opacity: 0.85 }}
        onClick={onBack}
        style={{
          position: "fixed", top: 28, left: 36, background: "none", border: "none",
          cursor: "pointer", fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase",
          color: "rgba(245,246,247,0.28)", fontFamily: INTER, zIndex: 100,
        }}
      >
        {label}
      </motion.button>
      <div style={{
        position: "fixed", top: 28, right: 36, fontSize: 9, letterSpacing: "0.44em",
        textTransform: "uppercase", color: "rgba(223,186,115,0.35)", fontFamily: INTER, zIndex: 100,
      }}>
        NOVEE OS
      </div>
    </>
  );
}

function StageProgress({ stage, total = 10 }: { stage: number; total?: number }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", gap: 7, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === stage ? 24 : 6, height: 2, borderRadius: 2,
          background: i + 1 === stage ? GOLD_SOLID : i + 1 < stage ? "rgba(223,186,115,0.38)" : "rgba(255,255,255,0.10)",
          transition: "all 0.4s ease",
        }} />
      ))}
    </div>
  );
}

// ── Stage 1: Opening ──────────────────────────────────────────────────────────
function Stage1({ onBegin, onContinue, hasSession, sessionMsg }: {
  onBegin: () => void; onContinue: () => void; hasSession: boolean; sessionMsg: string | null;
}) {
  return (
    <motion.div key="s1" {...FADE} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 680, padding: "0 40px" }}>
      <div style={{ fontSize: 22, color: "rgba(223,186,115,0.50)", marginBottom: 32, letterSpacing: "0.3em" }}>◈</div>

      <h1 style={{
        fontFamily: CORMORANT,
        fontSize: "clamp(52px, 9vw, 88px)",
        fontWeight: 200,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        background: "linear-gradient(180deg, #ffffff 0%, #dfba73 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        margin: 0,
        lineHeight: 1,
      }}>
        Welcome to
        <span style={{ display: "block", fontSize: "0.62em", letterSpacing: "0.16em", marginTop: 4 }}>SmokeCraft 360</span>
        <span style={{ display: "block", fontSize: "0.22em", letterSpacing: "0.42em", fontWeight: 300, marginTop: 10, color: "rgba(223,186,115,0.75)", WebkitTextFillColor: "rgba(223,186,115,0.75)" }}>LUXURY CIGAR MASTERCLASS</span>
      </h1>

      <GoldRule />

      <p style={{
        fontFamily: CORMORANT,
        fontSize: 26,
        fontWeight: 300,
        fontStyle: "italic",
        color: CREAM_BRIGHT,
        letterSpacing: "0.04em",
        lineHeight: 1.75,
        margin: "0 0 52px",
      }}>
        "A cigar is more than tobacco.<br />
        It is atmosphere. Timing. Ritual. Presence."
      </p>

      {sessionMsg && (
        <p style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(223,186,115,0.80)", marginBottom: 18, fontFamily: INTER }}>
          {sessionMsg}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 420 }}>
        <MachinedBtn onClick={onBegin}>Begin The Experience</MachinedBtn>

        <MachinedBtn onClick={onContinue} variant={hasSession ? "ghost" : "ghost"}>
          Continue Session
        </MachinedBtn>

        <MachinedBtn onClick={() => window.location.href = "/?challenge=golden_box"} variant="gold">
          Golden Box Challenge
        </MachinedBtn>
      </div>

      <p style={{ fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", color: "rgba(245,246,247,0.18)", marginTop: 48, fontFamily: INTER }}>
        10 Stages · E.A.T. Ritual Protocol · NOVEE OS 1.0
      </p>
    </motion.div>
  );
}

// ── Stage 2: Orientation Chamber ──────────────────────────────────────────────
function Stage2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const pillars = [
    { icon: "◈", title: "Flavor Ritual",   desc: "A curated sensory journey maps your palate to premium tobacco blends sourced from four continents." },
    { icon: "⬡", title: "Pairing Culture", desc: "Master the art of pairing cigars with aged bourbon, single malt scotch, cognac, and espresso." },
    { icon: "△", title: "XP Progression",  desc: "Every stage unlocks deeper knowledge, rare blend access, and membership tier advancement." },
    { icon: "◇", title: "Golden Box",       desc: "An optional connoisseur challenge. Complete it to unlock signature blend personalization." },
  ];
  return (
    <motion.div key="s2" {...FADE} style={{ width: "100%", maxWidth: 960, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Orientation Chamber" />
        <GoldHeading>The SmokeCraft Masterclass Philosophy</GoldHeading>

        <LoungeText>
          SmokeCraft 360 decouples software from art. Inside this sanctuary, you are not configuring metrics—you are controlling environment, sourcing legacy assets, and executing a precision ritual.
        </LoungeText>
        <LoungeText style={{ marginBottom: 40 }}>
          Through this guided progression, you will map your personal flavor profile, select a legacy master roller mentor, cultivate your foundational tobacco assets down to the seed, and unlock access to the private Signature Humidor Studio.
        </LoungeText>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48 }}>
          {pillars.map(p => (
            <div key={p.title} style={{
              background: "rgba(223,186,115,0.04)", border: "1px solid rgba(223,186,115,0.16)",
              padding: "28px 28px", borderRadius: 6,
            }}>
              <div style={{ fontSize: 22, color: "rgba(223,186,115,0.55)", marginBottom: 14 }}>{p.icon}</div>
              <div style={{ fontSize: 12, letterSpacing: "0.30em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 12, fontFamily: INTER, fontWeight: 600 }}>{p.title}</div>
              <p style={{ fontSize: 18, color: CREAM_DIM, lineHeight: 1.70, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{p.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MachinedBtn onClick={onNext}>Begin The Journey</MachinedBtn>
          <MachinedBtn onClick={onBack} variant="ghost">Back to Portal</MachinedBtn>
        </div>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 3: Experience Level Selection ───────────────────────────────────────
function Stage3({ onSelect, onBack }: { onSelect: (level: CraftLevel) => void; onBack: () => void }) {
  const levels: { id: CraftLevel; title: string; sub: string }[] = [
    { id: "beginner",    title: "Beginner Ritual",     sub: "First time exploring premium cigars. Guided and gentle." },
    { id: "explorer",    title: "Explorer Ritual",     sub: "Familiar with cigars. Ready to deepen your palate." },
    { id: "connoisseur", title: "Connoisseur Session", sub: "Experienced smoker seeking refined, curated selections." },
    { id: "master",      title: "Master Experience",   sub: "Seasoned aficionado pursuing the pinnacle blends." },
  ];
  return (
    <motion.div key="s3" {...FADE} style={{ width: "100%", maxWidth: 960, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Stage 3 of 10" />
        <GoldHeading>Select Your Experience Level</GoldHeading>
        <LoungeText style={{ marginBottom: 40 }}>
          Your experience level calibrates the intensity, depth, and selection criteria of the entire ritual. Choose honestly.
        </LoungeText>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48 }}>
          {levels.map(lv => (
            <SelectionCard key={lv.id} selected={false} onClick={() => onSelect(lv.id)}>
              <h3 style={{ fontFamily: CORMORANT, fontSize: 28, fontWeight: 400, color: CREAM_BRIGHT, margin: "0 0 12px" }}>{lv.title}</h3>
              <p style={{ fontSize: 18, color: CREAM_DIM, lineHeight: 1.65, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{lv.sub}</p>
            </SelectionCard>
          ))}
        </div>

        <MachinedBtn onClick={onBack} variant="ghost">Back</MachinedBtn>
      </ObsidianPanel>
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
      a: [
        { v: "smooth" as FlavorTexture, title: "Smooth", sub: "Creamy · Silky · Refined" },
        { v: "bold" as FlavorTexture,   title: "Bold",   sub: "Dense · Powerful · Complex" },
      ],
    },
    {
      key: "taste" as const, label: "Flavor Identity",
      q: "Which flavor axis speaks to your palate?",
      a: [
        { v: "earthy" as FlavorTaste, title: "Earthy", sub: "Cedar · Leather · Soil · Wood" },
        { v: "sweet"  as FlavorTaste, title: "Sweet",  sub: "Cocoa · Caramel · Dark Fruit · Honey" },
      ],
    },
    {
      key: "burn" as const, label: "Burn Intensity",
      q: "How do you prefer the intensity to reveal itself?",
      a: [
        { v: "slow" as FlavorBurn, title: "Slow Burn",      sub: "Gradual · Meditative · Long Evolution" },
        { v: "rich" as FlavorBurn, title: "Rich Intensity",  sub: "Immediate · Powerful · Full Impact" },
      ],
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
    <motion.div key="s4" {...FADE} style={{ width: "100%", maxWidth: 800, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label={`Stage 4 · Question ${step + 1} of 3`} />

        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === step ? 32 : 8, height: 3, borderRadius: 3,
              background: i < step ? "rgba(223,186,115,0.55)" : i === step ? GOLD_SOLID : "rgba(255,255,255,0.12)",
              transition: "all 0.4s ease",
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.40 }}>
            <p style={{ fontSize: 13, letterSpacing: "0.38em", textTransform: "uppercase", color: CREAM_DIM, marginBottom: 16, fontFamily: INTER }}>{q.label}</p>
            <GoldHeading size="2.6rem">{q.q}</GoldHeading>
            <GoldRule />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 36 }}>
              {q.a.map(opt => (
                <SelectionCard key={opt.v} selected={false} onClick={() => pick(opt.v as FlavorTexture & FlavorTaste & FlavorBurn)}>
                  <h3 style={{ fontFamily: CORMORANT, fontSize: 32, fontWeight: 300, color: CREAM_BRIGHT, margin: "0 0 14px", letterSpacing: "0.06em" }}>{opt.title}</h3>
                  <p style={{ fontSize: 18, color: CREAM_DIM, letterSpacing: "0.14em", fontFamily: INTER, fontWeight: 300, margin: 0 }}>{opt.sub}</p>
                </SelectionCard>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <MachinedBtn onClick={step > 0 ? () => setStep(s => s - 1) : onBack} variant="ghost">
          {step > 0 ? "← Previous" : "Back"}
        </MachinedBtn>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 5: Wrapper & Cut Education ─────────────────────────────────────────
function Stage5({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const wrappers = [
    { name: "Claro",    hue: "#D4C5A0", desc: "Light. Mild Connecticut shade. Smooth, creamy, subtle — the gateway wrapper." },
    { name: "Colorado", hue: "#8B6340", desc: "Medium brown. The sweet spot. Balanced earth, wood, and light spice." },
    { name: "Maduro",   hue: "#4A2C14", desc: "Dark. Fermented longer. Rich cocoa, dark fruit, natural sweetness." },
    { name: "Oscuro",   hue: "#1E0D06", desc: "Darkest. Maximum fermentation. Bold, intense — full complexity unleashed." },
  ];
  const cuts = [
    { name: "Straight Cut", icon: "⌇", desc: "Clean, direct draw. Classic and reliable." },
    { name: "V-Cut",        icon: "∨", desc: "Channel cut. Concentrated draw, deeper smoke concentration." },
    { name: "Punch Cut",    icon: "⊙", desc: "Circular piercing. Preserves wrapper integrity, focused smoke." },
  ];

  return (
    <motion.div key="s5" {...FADE} style={{ width: "100%", maxWidth: 960, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Stage 5 · Education" />
        <GoldHeading>Wrapper & Cut Mastery</GoldHeading>
        <LoungeText>
          Every cigar's personality begins with its leaf. Understand the wrapper spectrum and the art of the cut before your recommendation is revealed.
        </LoungeText>

        <p style={{ fontSize: 13, letterSpacing: "0.30em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 20, fontFamily: INTER }}>Wrapper Spectrum</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
          {wrappers.map(w => (
            <div key={w.name} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", padding: "22px 18px", borderRadius: 6 }}>
              <div style={{ width: "100%", height: 44, borderRadius: 4, background: w.hue, marginBottom: 16, opacity: 0.88 }} />
              <div style={{ fontSize: 13, letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(245,246,247,0.80)", marginBottom: 10, fontFamily: INTER, fontWeight: 600 }}>{w.name}</div>
              <p style={{ fontSize: 16, color: CREAM_DIM, lineHeight: 1.65, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{w.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, letterSpacing: "0.30em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 20, fontFamily: INTER }}>The Cut</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
          {cuts.map(c => (
            <div key={c.name} style={{ background: "rgba(223,186,115,0.03)", border: "1px solid rgba(223,186,115,0.14)", padding: "24px 20px", borderRadius: 6 }}>
              <div style={{ fontSize: 28, color: "rgba(223,186,115,0.60)", marginBottom: 14 }}>{c.icon}</div>
              <div style={{ fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 10, fontFamily: INTER, fontWeight: 600 }}>{c.name}</div>
              <p style={{ fontSize: 17, color: CREAM_DIM, lineHeight: 1.65, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{c.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MachinedBtn onClick={onNext}>I'm Ready</MachinedBtn>
          <MachinedBtn onClick={onBack} variant="ghost">Back</MachinedBtn>
        </div>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 6: AI Recommendation Reveal ────────────────────────────────────────
function Stage6({ rec, onNext, onBack }: { rec: CigarRec; onNext: () => void; onBack: () => void }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 700); return () => clearTimeout(t); }, []);

  return (
    <motion.div key="s6" {...FADE} style={{ width: "100%", maxWidth: 860, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Stage 6 · Recommendation Reveal" />

        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, color: "rgba(223,186,115,0.40)", marginBottom: 24 }}>◈</div>
              <p style={{ fontFamily: CORMORANT, fontSize: 24, fontStyle: "italic", color: CREAM_DIM, letterSpacing: "0.06em" }}>
                Analysing your palate profile…
              </p>
            </motion.div>
          ) : (
            <motion.div key="reveal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
              <GoldHeading size="2.8rem">Your Recommendation</GoldHeading>
              <GoldRule />

              <div style={{ background: "rgba(223,186,115,0.04)", border: "1px solid rgba(223,186,115,0.22)", padding: "40px 36px", borderRadius: 6, marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                  <h3 style={{ fontFamily: CORMORANT, fontSize: 38, fontWeight: 300, color: CREAM_BRIGHT, margin: 0, letterSpacing: "0.06em" }}>{rec.name}</h3>
                  <span style={{
                    background: "rgba(223,186,115,0.12)", border: "1px solid rgba(223,186,115,0.35)",
                    fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase",
                    padding: "8px 16px", color: GOLD_SOLID, fontFamily: INTER, whiteSpace: "nowrap",
                    borderRadius: 3,
                  }}>{rec.strength}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                  {[["Origin", rec.origin], ["Wrapper", rec.wrapper], ["Flavor Identity", rec.flavor]].map(([k, v]) => (
                    <div key={k} style={{ gridColumn: k === "Flavor Identity" ? "1 / -1" : "auto" }}>
                      <p style={{ fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(245,246,247,0.35)", margin: "0 0 6px", fontFamily: INTER }}>{k}</p>
                      <p style={{ fontSize: 19, color: CREAM_DIM, margin: 0, fontFamily: INTER, fontWeight: 300 }}>{v}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 28 }}>
                  {rec.bars.map(bar => (
                    <div key={bar.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,246,247,0.45)", fontFamily: INTER }}>{bar.label}</span>
                        <span style={{ fontSize: 13, color: GOLD_SOLID, fontFamily: INTER }}>{bar.value}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bar.value}%` }}
                          transition={{ duration: 1.3, delay: 0.4, ease: "easeOut" }}
                          style={{ height: "100%", background: GOLD_GRADIENT, borderRadius: 3 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ fontFamily: CORMORANT, fontSize: 21, fontStyle: "italic", color: CREAM_DIM, lineHeight: 1.75, margin: 0, letterSpacing: "0.04em" }}>{rec.notes}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MachinedBtn onClick={onNext}>Select Your Pairing</MachinedBtn>
                <MachinedBtn onClick={onBack} variant="ghost">Back</MachinedBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 7: Pairing Chamber ──────────────────────────────────────────────────
function Stage7({ rec, onSelect, onBack }: { rec: CigarRec; onSelect: (pairing: string) => void; onBack: () => void }) {
  const pairings = [
    { id: "bourbon",  icon: "🥃", title: "Aged Bourbon",        sub: "Sweet oak, vanilla, caramel — amplifies creamy notes" },
    { id: "scotch",   icon: "◈",  title: "Single Malt Scotch",  sub: "Smoky peat, dried fruit — bridges earthy profiles" },
    { id: "cognac",   icon: "⬡",  title: "Fine Cognac",         sub: "Floral, grape, spice — elevates complexity" },
    { id: "espresso", icon: "☕", title: "Double Espresso",     sub: "Dark roast, bitter finish — intensifies dark notes" },
    { id: "stout",    icon: "⊙",  title: "Dark Stout",          sub: "Roasted malt, chocolate — mirrors bold profiles" },
  ];

  return (
    <motion.div key="s7" {...FADE} style={{ width: "100%", maxWidth: 860, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Stage 7 · Pairing Chamber" />
        <GoldHeading>Complete Your Experience</GoldHeading>
        <LoungeText>
          Pairing with <em style={{ color: CREAM_BRIGHT, fontStyle: "italic" }}>{rec.name}</em> — select the companion that elevates your session.
        </LoungeText>
        <GoldRule />

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
          {pairings.map(p => (
            <motion.button
              key={p.id}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(p.id)}
              style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(223,186,115,0.16)",
                padding: "24px 28px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 24,
                textAlign: "left", borderRadius: 6, transition: "all 0.25s ease",
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(223,186,115,0.07)"; b.style.borderColor = "rgba(223,186,115,0.40)"; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.02)"; b.style.borderColor = "rgba(223,186,115,0.16)"; }}
            >
              <div style={{ fontSize: 28, width: 44, textAlign: "center", color: "rgba(223,186,115,0.65)", flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, letterSpacing: "0.24em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 7, fontFamily: INTER, fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 18, color: CREAM_DIM, fontFamily: INTER, fontWeight: 300 }}>{p.sub}</div>
              </div>
              <span style={{ fontSize: 18, color: "rgba(223,186,115,0.45)" }}>→</span>
            </motion.button>
          ))}
        </div>

        <MachinedBtn onClick={onBack} variant="ghost">Back</MachinedBtn>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 8: Golden Box Challenge ─────────────────────────────────────────────
function Stage8({ onAccept, onSkip, onBack }: { onAccept: () => void; onSkip: () => void; onBack: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <motion.div key="s8" {...FADE} style={{ width: "100%", maxWidth: 760, padding: "0 32px" }}>
      <ObsidianPanel>
        <StageTag label="Stage 8 · Optional" />
        <GoldHeading>Golden Box Challenge</GoldHeading>
        <GoldRule />

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <motion.div
            onClick={() => setOpened(true)}
            whileHover={!opened ? { scale: 1.06, boxShadow: "0 0 40px rgba(223,186,115,0.20)" } : {}}
            whileTap={!opened ? { scale: 0.97 } : {}}
            style={{
              width: 130, height: 130, margin: "0 auto 36px",
              background: opened ? "rgba(223,186,115,0.14)" : "rgba(223,186,115,0.06)",
              border: `2px solid ${opened ? "rgba(223,186,115,0.65)" : "rgba(223,186,115,0.24)"}`,
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: opened ? "default" : "pointer",
              transition: "all 0.5s ease",
              boxShadow: opened ? "0 0 48px rgba(223,186,115,0.16)" : "none",
            }}
          >
            <span style={{ fontSize: opened ? 48 : 36, transition: "font-size 0.4s", color: GOLD_SOLID }}>
              {opened ? "◈" : "◇"}
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            {!opened ? (
              <motion.p key="hint" exit={{ opacity: 0 }}
                style={{ fontFamily: CORMORANT, fontSize: 24, fontStyle: "italic", color: CREAM_DIM, lineHeight: 1.75 }}>
                A hidden challenge awaits connoisseurs.<br />Tap the Golden Box to reveal it.
              </motion.p>
            ) : (
              <motion.div key="challenge" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ background: "rgba(223,186,115,0.05)", border: "1px solid rgba(223,186,115,0.22)", padding: "32px 36px", borderRadius: 6, marginBottom: 12, textAlign: "left" }}>
                  <p style={{ fontSize: 12, letterSpacing: "0.36em", textTransform: "uppercase", color: GOLD_SOLID, marginBottom: 16, fontFamily: INTER }}>Challenge Revealed</p>
                  <p style={{ fontFamily: CORMORANT, fontSize: 24, color: CREAM_BRIGHT, lineHeight: 1.75, margin: 0 }}>
                    "Name three premium cigar-producing regions and one signature blend from each — without assistance."
                  </p>
                  <p style={{ fontSize: 18, color: CREAM_DIM, marginTop: 20, fontFamily: INTER, fontWeight: 300 }}>
                    Completing this challenge unlocks the Signature Humidor Studio and personalized blend access.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {opened && <MachinedBtn onClick={onAccept}>Accept The Challenge</MachinedBtn>}
          <MachinedBtn onClick={onSkip} variant="ghost">Skip For Now</MachinedBtn>
          <MachinedBtn onClick={onBack} variant="ghost">Back</MachinedBtn>
        </div>
      </ObsidianPanel>
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
    <motion.div key="s9" {...FADE} style={{ width: "100%", maxWidth: 860, padding: "0 32px" }}>
      <ObsidianPanel>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, color: GOLD_SOLID, marginBottom: 20, letterSpacing: "0.2em" }}>✦</div>
          <StageTag label="Stage 9 · Session Complete" />
          <GoldHeading>Your Craft Identity</GoldHeading>
          <GoldRule />
        </div>

        <div style={{ background: "rgba(223,186,115,0.04)", border: "1px solid rgba(223,186,115,0.18)", padding: "36px 40px", borderRadius: 6, marginBottom: 28 }}>
          {[
            ["Experience Level",   state.level ? levelLabels[state.level] : "—"],
            ["Flavor Identity",    `${state.flavor.texture ?? "—"} · ${state.flavor.taste ?? "—"} · ${state.flavor.burn ?? "—"}`],
            ["Recommended Blend",  rec?.name ?? "—"],
            ["Strength Profile",   rec?.strength ?? "—"],
            ["Flavor Notes",       rec?.flavor ?? "—"],
            ["Pairing Selection",  state.pairing ? pairingLabels[state.pairing] : "None selected"],
            ["Golden Box",         state.goldenBox ? "Challenge Accepted ◈" : "Deferred"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,246,247,0.38)", fontFamily: INTER, flexShrink: 0, marginRight: 20 }}>{k}</span>
              <span style={{ fontSize: 18, color: CREAM_DIM, textAlign: "right", fontFamily: INTER, fontWeight: 300 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(223,186,115,0.05)", border: "1px solid rgba(223,186,115,0.22)", padding: "24px 32px", borderRadius: 6, marginBottom: 36, textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: GOLD_SOLID, margin: "0 0 10px", fontFamily: INTER }}>Unlocked</p>
          <p style={{ fontFamily: CORMORANT, fontSize: 26, color: CREAM_BRIGHT, margin: 0, letterSpacing: "0.06em" }}>Signature Humidor Studio</p>
          <p style={{ fontSize: 18, color: CREAM_DIM, margin: "10px 0 0", fontFamily: INTER, fontWeight: 300 }}>Your personalized legacy collection awaits.</p>
        </div>

        <MachinedBtn onClick={onNext}>Enter Humidor Studio</MachinedBtn>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Stage 10: Signature Humidor Studio ───────────────────────────────────────
function Stage10({ onBack }: { onBack: () => void }) {
  return (
    <motion.div key="s10" {...FADE} style={{ width: "100%", maxWidth: 860, padding: "0 32px" }}>
      <ObsidianPanel>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, color: GOLD_SOLID, marginBottom: 20, letterSpacing: "0.2em" }}>◈</div>
          <StageTag label="Stage 10 · Exclusive Access" />
          <GoldHeading>Signature Humidor Studio</GoldHeading>
          <p style={{ fontFamily: CORMORANT, fontSize: 22, fontStyle: "italic", color: CREAM_DIM, letterSpacing: "0.06em", margin: "0 0 32px" }}>
            Legacy Reserve Collection
          </p>
          <GoldRule />
        </div>

        <div style={{ background: "rgba(223,186,115,0.04)", border: "1px solid rgba(223,186,115,0.22)", padding: "44px 48px", borderRadius: 6, marginBottom: 36 }}>
          <LoungeText style={{ textAlign: "center", marginBottom: 36 }}>
            Your personalized humidor is ready for configuration. Select from curated legacy blends, adjust your flavor preferences, and build your signature collection.
          </LoungeText>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {["Legacy Blends", "Wrapper Selection", "Flavor Tuning", "Pairing Library", "Member Profile", "Reserve Access"].map(f => (
              <div key={f} style={{ padding: "18px 16px", background: "rgba(223,186,115,0.04)", border: "1px solid rgba(223,186,115,0.14)", borderRadius: 4, textAlign: "center" }}>
                <p style={{ fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD_SOLID, margin: 0, fontFamily: INTER }}>{f}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MachinedBtn onClick={() => {}} variant="gold">Open Legacy Collection</MachinedBtn>
          <MachinedBtn onClick={onBack} variant="ghost">Return to Portal</MachinedBtn>
        </div>
      </ObsidianPanel>
    </motion.div>
  );
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────
export default function SmokeCraftGateway() {
  const [, navigate] = useLocation();
  // Always boot Stage 1 — never restore a prior session from localStorage.
  // CraftPortalHome clears NOVEE_SC_RITUAL_v1 on every entry, and this line
  // is a second hard guarantee: fresh mount = Stage 1, no exceptions.
  const [rs, setRs]   = useState<RitualState>(BLANK);
  const [entered, setEntered] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setEntered(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(rs)); } catch { /* */ } }, [rs]);

  const patch = useCallback((p: Partial<RitualState>) => setRs(prev => ({ ...prev, ...p })), []);
  const goTo  = useCallback((stage: number) => patch({ stage }), [patch]);

  const hasSession = rs.stage > 1 && !rs.completedAt;

  function handleContinue() {
    if (!hasSession) {
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
      position: "fixed", inset: 0,
      background: "#000000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", overflowY: "auto",
      color: CREAM_BRIGHT,
      opacity: entered ? 1 : 0,
      transition: "opacity 0.90s ease",
      fontFamily: INTER,
    }}>
      {/* Cinematic ambient amber glow — 3% overlay, pointer-events off */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,176,0,0.03) 0%, transparent 58%)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, pointerEvents: "none", zIndex: 0,
        height: "45%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(255,176,0,0.02) 0%, transparent 70%)" }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;1,300&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes smoke-rise {
          0%   { transform: translateY(0) scaleX(1); opacity: 0; }
          8%   { opacity: 1; }
          82%  { opacity: 0.18; }
          100% { transform: translateY(-115vh) scaleX(1.7); opacity: 0; }
        }
        @keyframes ember-rise {
          0%   { transform: translate(0, 0); opacity: 0; }
          5%   { opacity: 0.90; }
          78%  { opacity: 0.50; }
          100% { transform: translate(var(--edrift), -95vh); opacity: 0; }
        }
      `}</style>

      {/* ── Volumetric smoke blobs ──────────────────────────────────────── */}
      {SMOKE_BLOBS.map((s, i) => (
        <div key={i} style={{
          position: "absolute", bottom: -80, left: s.x,
          width: s.w, height: s.h,
          background: "radial-gradient(ellipse, rgba(200,180,155,0.09) 0%, transparent 72%)",
          filter: "blur(60px)",
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
          boxShadow: "0 0 5px rgba(196,97,10,0.60)",
          animation: `ember-rise ${e.duration}s ${e.delay}s ease-out infinite`,
          "--edrift": `${e.drift}px`,
          pointerEvents: "none",
        } as React.CSSProperties} />
      ))}

      {/* ── Vignette ─────────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 35%, rgba(3,2,1,0.90) 100%)" }} />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      {rs.stage > 1
        ? <NavBar onBack={handleBack} label={`← Stage ${rs.stage - 1}`} />
        : <NavBar onBack={() => navigate("/")} label="← Craft Portal" />
      }

      {/* ── Progress dots ────────────────────────────────────────────────── */}
      {rs.stage > 1 && <StageProgress stage={rs.stage} />}

      {/* ── Stage content ────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "center", width: "100%", minHeight: "100%", padding: "80px 0 80px" }}>
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
            <Stage9 key="s9" state={rs} onNext={() => goTo(10)} />
          )}
          {rs.stage === 10 && (
            <Stage10 key="s10" onBack={() => navigate("/")} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
