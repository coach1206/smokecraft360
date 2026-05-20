import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { CheatCodeEngine } from "@/components/CheatCodeEngine";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { CigarHero } from "@/components/CigarHero";

const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const GOLD = "#D4AF37";
const PV = {
  enter:  { opacity: 0, x: 50,  scale: 0.97 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -40, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 240, damping: 28 };

/* ─── Mentors ─── */
const MENTORS = [
  {
    id: "dominican", name: "The Dominican Maestro", flag: "🇩🇴",
    country: "Dominican Republic", valley: "Cibao Valley",
    bio: "Old-world master of aged Olor Dominicano. Multi-leaf complexity with deep earth-tone transitions and slow fermentation curves.",
    tags: ["Aged Profiles", "Earth Transitions", "Multi-Leaf"],
    hue: "#1B4BD4", soilTop: "#110A02", soilBot: "#1E1008",
    photo: "mentor_dominican.png",
  },
  {
    id: "nicaraguan", name: "The Nicaraguan Puro Boss", flag: "🇳🇮",
    country: "Nicaragua", valley: "Estelí",
    bio: "Commands volcanic mineral-rich soils for maximum Ligero density. Full-bodied, uncompromising palate intensity with volcanic earth notes.",
    tags: ["Volcanic Soil", "Heavy Ligero", "Full-Body"],
    hue: "#1A8C3A", soilTop: "#061006", soilBot: "#0C1C0A",
    photo: "mentor_nicaraguan.png",
  },
  {
    id: "honduran", name: "The Traditionalist Wrapper", flag: "🇭🇳",
    country: "Honduras", valley: "Jamastran Valley",
    bio: "Flawless sun-grown wrapper selection with microscopic vein concealment and aerodynamic draw precision unmatched in the Americas.",
    tags: ["Wrapper Perfection", "Vein Concealment", "Draw Precision"],
    hue: "#2A7ABF", soilTop: "#060A12", soilBot: "#0C1020",
    photo: "mentor_honduran.png",
  },
];

/* ─── Seeds ─── */
const SEED_PHOTOS: Record<string,string> = {
  criollo: "tobacco_criollo.png",
  corojo:  "tobacco_corojo.png",
  connecticut: "tobacco_connecticut.png",
};

const SEEDS = [
  {
    id: "criollo", name: "Criollo '98", origin: "Cuban-Seed · Dominican Republic",
    profile: "Delivers deep, traditional earth-toned flavor transitions and heavy spice tracking. Medium-to-full body with secondary dark chocolate, cedar, and aged leather notes across the full smoke.",
    specs: [{ k: "Body", v: "Medium-Full", b: 70 }, { k: "Nicotine", v: "High", b: 78 }, { k: "Burn Rate", v: "Slow / Even", b: 38 }, { k: "Aroma", v: "Earth · Spice", b: 80 }],
    veinColor: "rgba(170,130,45,0.58)", veinW: 2.2, oilSheen: true,
    c1: "#213A10", c2: "#0E1E06", cs: "#3A5C18", tx: 0.62,
    tagline: "Deep earth. Heavy spice tracking.",
    veinDesc: "Balanced vein system with moderate secondary density. Classic Cuban-seed architecture for reliable, consistent draw and even oil channel distribution.",
  },
  {
    id: "corojo", name: "Corojo", origin: "Vuelta Abajo, Cuba · Honduras",
    profile: "A robust, altamente resiliente leaf known for producing intense peppery finishes and high natural oil yield. The thick cuticle locks in volatile aromatic compounds through fermentation.",
    specs: [{ k: "Body", v: "Full", b: 95 }, { k: "Nicotine", v: "Very High", b: 94 }, { k: "Burn Rate", v: "Medium", b: 55 }, { k: "Aroma", v: "Pepper · Oak", b: 90 }],
    veinColor: "rgba(200,155,30,0.68)", veinW: 2.8, oilSheen: true,
    c1: "#162E08", c2: "#080E02", cs: "#2A4A10", tx: 0.73,
    tagline: "Maximum strength. Pepper dominance.",
    veinDesc: "Dense primary vein with aggressive secondary branching. Maximum oil-channel surface area for aromatic concentration and palate intensity.",
  },
  {
    id: "connecticut", name: "Connecticut Shade", origin: "Connecticut River Valley, USA",
    profile: "A delicate, ultra-smooth wrapper leaf delivering creamy tasting notes, mild body, and seamless aesthetics. Grown under cheesecloth shade canopies — the gold standard for premium construction.",
    specs: [{ k: "Body", v: "Mild", b: 22 }, { k: "Nicotine", v: "Low-Medium", b: 28 }, { k: "Burn Rate", v: "Fast / Smooth", b: 78 }, { k: "Aroma", v: "Cream · Hay", b: 45 }],
    veinColor: "rgba(220,205,150,0.26)", veinW: 0.9, oilSheen: false,
    c1: "#4A6E28", c2: "#2E4A14", cs: "#7AAA44", tx: 0.48,
    tagline: "Invisible veins. Creamy aesthetics.",
    veinDesc: "Near-invisible tertiary vein network. Microscopic cross-fibers sealed under the cuticle — standard for premium wrapper aesthetics and consistent draw.",
  },
];

/* ─── Quiz ─── */
const QUIZ = [
  { q: "Which leaf is prized for near-invisible veins, creamy notes, and mild body?", opts: ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"], correct: 2, pen: 2 },
  { q: "Corojo leaf produces which dominant palate characteristic?", opts: ["Creamy sweetness", "Intense peppery strength", "Light cedar notes", "Mild earth tones"], correct: 1, pen: 2 },
  { q: "Criollo '98 is distinguished by its balance of which two qualities?", opts: ["Light color & low nicotine", "Strength & aromatic complexity", "Cedar & mild pepper", "Sweetness & burn rate"], correct: 1, pen: 2 },
];

/* ─── Photorealistic Leaf SVG ─── */
function LeafSVG({ s, scale = 1 }: { s: typeof SEEDS[0]; scale?: number }) {
  const w = Math.round(190 * scale);
  const h = Math.round(280 * scale);
  const fid = `lf_${s.id}`, gid = `lg_${s.id}`, sid = `ls_${s.id}`;
  return (
    <svg width={w} height={h} viewBox="0 0 190 280" fill="none"
      style={{ filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.80)) drop-shadow(0 3px 10px rgba(0,0,0,0.65))" }}>
      <defs>
        <filter id={fid} x="-8%" y="-5%" width="116%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={s.tx} numOctaves="5" seed="9" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix"
            values={s.oilSheen ? "0 0 0 0 0.04 0 0 0 0 0.09 0 0 0 0 0.01 0 0 0 0.50 0" : "0 0 0 0 0.05 0 0 0 0 0.10 0 0 0 0 0.02 0 0 0 0.32 0"}
            in="noise" result="cn" />
          <feComposite in="SourceGraphic" in2="cn" operator="multiply" result="tx" />
          <feGaussianBlur in="tx" stdDeviation="0.25" result="sm" />
          <feComposite in="SourceGraphic" in2="sm" operator="arithmetic" k1="0" k2="0.80" k3="0.20" k4="0" />
        </filter>
        <radialGradient id={gid} cx="37%" cy="24%" r="72%">
          <stop offset="0%"  stopColor={s.cs} />
          <stop offset="38%" stopColor={s.c1} />
          <stop offset="78%" stopColor={s.c2} />
          <stop offset="100%" stopColor="#030702" />
        </radialGradient>
        <linearGradient id={sid} x1="28%" y1="3%" x2="52%" y2="38%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.12)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="M95 5 C120 15,150 35,160 68 C170 100,165 135,157 165 C148 196,132 224,118 248 C110 262,103 274,95 283 C87 274,80 262,72 248 C58 224,42 196,33 165 C25 135,20 100,30 68 C40 35,70 15,95 5Z"
        fill={`url(#${gid})`} filter={`url(#${fid})`} />
      <path d="M95 10 Q95 145 95 277" stroke={s.veinColor} strokeWidth={s.veinW * 1.5} fill="none" strokeLinecap="round" />
      {[34,58,84,110,138,164,190,215].map((y, i) => {
        const sp = 30 - i * 2.8, sw = Math.max(s.veinW * (0.65 - i * 0.045), 0.35);
        return (
          <g key={y}>
            <path d={`M95 ${y} C${95-sp*.45} ${y+11},${95-sp*.88} ${y+20},${95-sp} ${y+27}`} stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
            <path d={`M95 ${y} C${95+sp*.45} ${y+11},${95+sp*.88} ${y+20},${95+sp} ${y+27}`} stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {[50,100,148,195].map((y, i) => {
        const b = 20 - i * 2.5, tw = Math.max(s.veinW * 0.28, 0.22);
        return (
          <g key={`tv${i}`}>
            <line x1={95-b*.42} y1={y} x2={95-b-4} y2={y+16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
            <line x1={95+b*.42} y1={y} x2={95+b+4} y2={y+16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
          </g>
        );
      })}
      {s.oilSheen && <path d="M95 5 C120 15,150 35,160 68 C156 48,140 28,95 17 C50 28,34 48,30 68 C40 35,70 15,95 5Z" fill={`url(#${sid})`} />}
      <ellipse cx="95" cy="13" rx="7" ry="4" fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

/* ─── Left visual panel — cinematic full-bleed ─── */
function LeftPanel({ eyebrow, headline, sub, accent = GOLD }: { eyebrow: string; headline: string; sub?: string; accent?: string }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* ── Real cigar photograph — full bleed ── */}
      <img src={IMG("cigar_hero.png")} alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Dark cinematic overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(6,4,1,0.80) 0%, rgba(4,2,0,0.60) 35%, rgba(8,5,2,0.92) 100%)" }} />
      {/* Amber top glow */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: `radial-gradient(ellipse 85% 60% at 45% 0%, rgba(212,140,30,0.22) 0%, transparent 65%)`, pointerEvents: "none" }} />
      {/* Gold top rim */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}EE, ${accent}88 60%, transparent)`, boxShadow: `0 0 32px 5px ${accent}30`, zIndex: 5 }} />
      {/* Gold right divider */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 1, background: `linear-gradient(180deg, transparent, ${accent}55 35%, ${accent}44 65%, transparent)` }} />

      {/* ── Text anchored bottom ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 52px 52px", zIndex: 2 }}>
        {/* Fade above text */}
        <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, height: 160, background: "linear-gradient(0deg, rgba(5,3,1,0.96) 0%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 11, letterSpacing: "0.58em", textTransform: "uppercase", fontWeight: 800, color: `${accent}80`, marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>
          {eyebrow}
        </div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(54px, 6.5vw, 92px)",
          fontWeight: 300, color: "#F0E8D4", margin: "0 0 22px",
          letterSpacing: "0.03em", lineHeight: 0.98,
          textShadow: `0 0 80px ${accent}22, 0 4px 40px rgba(0,0,0,0.95)`,
          whiteSpace: "pre-line",
        }}>
          {headline}
        </h1>
        {sub && (
          <p style={{ fontSize: 20, color: "rgba(240,232,212,0.48)", lineHeight: 1.58, margin: "0 0 20px", fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            {sub}
          </p>
        )}
        <div style={{ width: 90, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, boxShadow: `0 0 14px ${accent}66` }} />
      </div>
    </div>
  );
}

/* ─── Right glass panel ─── */
function RightPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      justifyContent: "center",
      padding:        "56px 52px",
      background:     "rgba(255,255,255,0.018)",
      backdropFilter: "blur(28px)",
      WebkitBackdropFilter: "blur(28px)",
      overflowY:      "auto",
    }}>
      {children}
    </div>
  );
}

/* ─── Full-bleed split layout ─── */
function Split({ left, right, leftFr = "1fr", rightFr = "1fr" }: { left: React.ReactNode; right: React.ReactNode; leftFr?: string; rightFr?: string }) {
  return (
    <motion.div
      variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
      style={{
        position:             "absolute",
        inset:                "41px 0 0 0",
        display:              "grid",
        gridTemplateColumns:  `${leftFr} ${rightFr}`,
        overflow:             "hidden",
      }}
    >
      {left}
      {right}
    </motion.div>
  );
}

type Step = "demo" | "rules" | "leaderboard" | "mentor" | "seed_canvas" | "quiz" | "posgate";

export function S1_InitGate() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();
  const [step,       setStep]      = useState<Step>("demo");
  const [firstName,  setFirstName] = useState("");
  const [lastName,   setLastName]  = useState("");
  const [phone4,     setPhone4]    = useState("");
  const [age,        setAge]       = useState("");
  const [mentor,     setMentor]    = useState<string | null>(profile.mentor);
  const [seedId,     setSeedId]    = useState("criollo");
  const [selectedNote,    setSelectedNote]    = useState<string | null>(null);
  const [selectedPairing, setSelectedPairing] = useState<string | null>(null);
  useEffect(() => { setSelectedNote(null); setSelectedPairing(null); }, [seedId]);
  const [qIdx,       setQIdx]      = useState(0);
  const [answered,   setAnswered]  = useState<number[]>([]);
  const [wrongFlash, setWrongFlash]= useState(false);
  const [showPOS,    setShowPOS]   = useState(false);
  const [quizPts,    setQuizPts]   = useState(0);

  const go = (s: Step) => setStep(s);
  const canSubmit = firstName.trim() && lastName.trim() && phone4.trim().length === 4 && age;
  const seed = SEEDS.find(s => s.id === seedId)!;

  function submitDemo() {
    if (!canSubmit) return;
    updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone4: phone4.trim().slice(-4), age: parseInt(age) });
    addPoints(10);
    go("rules");
  }

  function answerQuiz(oi: number) {
    if (answered.includes(qIdx)) return;
    const q = QUIZ[qIdx]; const good = oi === q.correct;
    setAnswered(p => [...p, qIdx]);
    if (good) { hapticMilestone(); setQuizPts(p => p + 20); addPoints(20); }
    else { hapticError(); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 700); applyPenalty(q.pen); }
    setTimeout(() => {
      if (qIdx < QUIZ.length - 1) setQIdx(i => i + 1);
      else { updateProfile({ quizScore: quizPts + (good ? 20 : 0) }); go("posgate"); }
    }, 880);
  }

  function handlePOSUnlock(code: string) {
    updateProfile({ receiptCode: code });
    hapticMilestone(); setShowPOS(false);
    setPhase("s2_terroir");
  }

  /* ── Step progress dots ── */
  const STEPS: Step[] = ["demo","rules","leaderboard","mentor","seed_canvas","quiz","posgate"];

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <BackButton />

      {/* Step dots */}
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 7, zIndex: 30 }}>
        {STEPS.map(s => (
          <div key={s} style={{
            width: 24, height: 4, borderRadius: 2,
            background: s === step ? GOLD : "rgba(255,255,255,0.14)",
            boxShadow: s === step ? `0 0 8px ${GOLD}` : "none",
            transition: "all 0.28s",
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════ DEMO ══════════════ */}
        {step === "demo" && (
          <Split key="demo"
            leftFr="1.1fr" rightFr="0.9fr"
            left={
              <LeftPanel
                eyebrow="Session 1 of 4 · Step 1.1"
                headline={`Welcome\nto the\nBlend`}
                sub="Register to begin your personal 4-session cigar science journey. Your score lives on the wall display for the entire table to see."
              />
            }
            right={
              <RightPanel>
                <Eyebrow>Guest Registration</Eyebrow>
                <SectionTitle>Your Profile</SectionTitle>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                  <Row>
                    <BigInput ph="FIRST NAME" val={firstName} fn={setFirstName} />
                    <BigInput ph="LAST NAME"  val={lastName}  fn={setLastName} />
                  </Row>
                  <Row>
                    <BigInput ph="LAST 4 DIGITS" val={phone4}
                      fn={v => setPhone4(v.replace(/\D/g,"").slice(0,4))}
                      extra={{ letterSpacing: "0.30em" }} maxLen={4} />
                    <BigInput ph="AGE" val={age} fn={setAge} type="number"
                      extra={{ width: 140, flexShrink: 0 }} />
                  </Row>
                </div>

                <GoldBtn disabled={!canSubmit} onClick={submitDemo}>CONTINUE →</GoldBtn>
              </RightPanel>
            }
          />
        )}

        {/* ══════════════ RULES — THE GOLDEN BOX ══════════════ */}
        {step === "rules" && (
          <motion.div key="rules" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Top Header Bar ── */}
            <div style={{
              flexShrink: 0, textAlign: "center", padding: "18px 48px 14px",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(212,175,55,0.18)",
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.55em", color: "rgba(212,175,55,0.65)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                SmokeCraft 360 · Kiosk Edition
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 48, fontWeight: 700, color: GOLD,
                margin: "0 0 4px", letterSpacing: "0.12em", textTransform: "uppercase",
                textShadow: `0 0 60px ${GOLD}55, 0 2px 16px rgba(0,0,0,0.90)`,
                lineHeight: 1,
              }}>The Golden Box</h1>
              <div style={{ fontSize: 16, letterSpacing: "0.38em", color: "rgba(240,232,212,0.45)", fontWeight: 400, fontStyle: "italic" }}>
                Compete. Learn. Ascend.
              </div>
            </div>

            {/* ── 3-Column Body ── */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 260px", overflow: "hidden" }}>

              {/* ── LEFT: Rules of Play ── */}
              <div style={{
                borderRight: "1px solid rgba(212,175,55,0.12)",
                background: "rgba(0,0,0,0.50)", backdropFilter: "blur(16px)",
                padding: "28px 22px", display: "flex", flexDirection: "column", gap: 0,
                overflowY: "auto",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 28, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.40em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Rules of Play</span>
                </div>
                <p style={{ fontSize: 16, color: "rgba(240,232,212,0.42)", lineHeight: 1.6, margin: "0 0 24px" }}>
                  Every action is scored. Learn the system before you build your blend.
                </p>
                {[
                  { icon: "◎", label: "Score Points",   sub: "Complete actions & challenges" },
                  { icon: "▲", label: "Climb Ranks",    sub: "Earn XP to level up" },
                  { icon: "⬡", label: "Unlock Rewards", sub: "Badges, blends, gear & more" },
                  { icon: "♛", label: "Earn Respect",   sub: "Compete. Be recognized. Lead." },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
                    <span style={{ fontSize: 20, color: GOLD, flexShrink: 0, marginTop: 2, opacity: 0.85 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#F0E8D4", marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.40)", lineHeight: 1.4 }}>{r.sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{
                  marginTop: "auto", background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.36em", color: `${GOLD}90`, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}>💡 Tip</div>
                  <p style={{ fontSize: 15, color: "rgba(240,232,212,0.55)", lineHeight: 1.55, margin: 0 }}>
                    The better your decisions, the higher you climb.
                  </p>
                </div>
              </div>

              {/* ── CENTER: Contest Levels + Bottom Progress ── */}
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Contest Levels heading */}
                <div style={{
                  flexShrink: 0, padding: "20px 32px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.30)",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.26em", color: "#F0E8D4", textTransform: "uppercase", marginBottom: 4 }}>Contest Levels</div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", letterSpacing: "0.16em" }}>Progress through the ranks. Master the leaf.</div>
                  </div>
                </div>

                {/* 4 Tier Cards */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, overflow: "hidden" }}>
                  {[
                    {
                      num: 1, name: "Novice", sub: "The Beginning",
                      xp: "0 – 999 XP", color: "#C8322A", glow: "rgba(200,50,42,0.28)",
                      badge: "🔥", desc: "You're learning the basics. Every decision builds your foundation.",
                      skills: ["Learn cigar basics", "Identify simple flavors", "Complete intro challenges"],
                    },
                    {
                      num: 2, name: "Enthusiast", sub: "Fueled by Passion",
                      xp: "1,000 – 4,999 XP", color: GOLD, glow: "rgba(212,175,55,0.28)",
                      badge: "🕯", desc: "You understand more. Your palate is growing. Your choices matter.",
                      skills: ["Understand regions", "Master pairings", "Score higher to climb"],
                    },
                    {
                      num: 3, name: "Connoisseur", sub: "Refined & Focused",
                      xp: "5,000 – 14,999 XP", color: "#9B59B6", glow: "rgba(155,89,182,0.28)",
                      badge: "💎", desc: "You appreciate complexity. You see what others overlook.",
                      skills: ["Identify flavor transitions", "Know aging & construction", "Compete at a higher level"],
                    },
                    {
                      num: 4, name: "Aficionado", sub: "The Ultimate Status",
                      xp: "15,000+ XP", color: "#D4820A", glow: "rgba(212,130,10,0.28)",
                      badge: "♛", desc: "You live the culture. You don't just smoke — you understand the leaf.",
                      skills: ["Master sensory analysis", "Lead & mentor others", "Top of the leaderboard"],
                    },
                  ].map((tier, i) => (
                    <div key={tier.name} style={{
                      display: "flex", flexDirection: "column",
                      borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      background: "rgba(0,0,0,0.22)",
                      padding: "20px 18px",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* Top glow accent */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${tier.color}AA, transparent)` }} />

                      {/* Badge circle */}
                      <div style={{ textAlign: "center", marginBottom: 12 }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 64, height: 64, borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, ${tier.color}44, rgba(0,0,0,0.70))`,
                          border: `2px solid ${tier.color}66`,
                          boxShadow: `0 0 28px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                          fontSize: 28, position: "relative",
                        }}>
                          <span style={{ position: "absolute", top: -10, right: -10, width: 22, height: 22, borderRadius: "50%", background: tier.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#000", fontFamily: "'Inter',sans-serif" }}>{tier.num}</span>
                          {tier.badge}
                        </div>
                      </div>

                      {/* Name */}
                      <div style={{ textAlign: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#F0E8D4", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 2 }}>{tier.name}</div>
                        <div style={{ fontSize: 12, letterSpacing: "0.22em", color: tier.color, fontWeight: 700, textTransform: "uppercase" }}>{tier.sub}</div>
                      </div>

                      {/* Desc */}
                      <p style={{ fontSize: 15, color: "rgba(240,232,212,0.48)", lineHeight: 1.55, textAlign: "center", margin: "0 0 14px" }}>{tier.desc}</p>

                      {/* Skills checklist */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                        {tier.skills.map(sk => (
                          <div key={sk} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: tier.color, fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 15, color: "rgba(240,232,212,0.58)", lineHeight: 1.4 }}>{sk}</span>
                          </div>
                        ))}
                      </div>

                      {/* XP range badge */}
                      <div style={{
                        marginTop: 16, textAlign: "center",
                        background: `${tier.color}18`,
                        border: `1px solid ${tier.color}44`,
                        borderRadius: 8, padding: "8px 10px",
                        fontSize: 16, fontWeight: 900, color: tier.color,
                        letterSpacing: "0.06em", fontFamily: "'Inter',sans-serif",
                      }}>
                        {tier.xp}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Bottom Progress Bar ── */}
                <div style={{
                  flexShrink: 0,
                  background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)",
                  borderTop: "1px solid rgba(212,175,55,0.14)",
                  padding: "14px 24px",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                  gap: 20, alignItems: "center",
                }}>
                  {/* Your Progress */}
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 30%, rgba(212,175,55,0.40), rgba(0,0,0,0.70))",
                      border: `2px solid ${GOLD}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>🎩</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Your Progress</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "0.04em" }}>ENTHUSIAST</div>
                      <div style={{ fontSize: 15, color: "rgba(240,232,212,0.55)" }}>{profile.points} XP</div>
                    </div>
                  </div>
                  {/* Next Milestone */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 4 }}>Next Milestone</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#F0E8D4" }}>
                      {Math.max(0, 1000 - profile.points)} <span style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", fontWeight: 400 }}>XP</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(240,232,212,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" }}>to reach Connoisseur</div>
                    <div style={{ marginTop: 6, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (profile.points / 1000) * 100)}%`, background: GOLD, borderRadius: 2, boxShadow: `0 0 8px ${GOLD}` }} />
                    </div>
                  </div>
                  {/* Earn Badges */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 8 }}>Earn Badges</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["🔥","🕯","💎","♛"].map((b, i) => (
                        <div key={i} style={{
                          width: 36, height: 36, borderRadius: "50%", fontSize: 18,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: i === 0 ? "rgba(200,50,42,0.20)" : "rgba(255,255,255,0.06)",
                          border: i === 0 ? "1px solid rgba(200,50,42,0.50)" : "1px solid rgba(255,255,255,0.10)",
                          boxShadow: i === 0 ? "0 0 14px rgba(200,50,42,0.30)" : "none",
                        }}>{b}</div>
                      ))}
                    </div>
                  </div>
                  {/* Unlock Rewards */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 6 }}>Unlock Rewards</div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", lineHeight: 1.5 }}>Exclusive blends,<br />gear, and experiences<br />await...</div>
                  </div>
                  {/* CTA button */}
                  <motion.button type="button"
                    onPointerDown={() => go("leaderboard")}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: "16px 28px",
                      background: `linear-gradient(135deg, ${GOLD} 0%, #B8920A 100%)`,
                      border: "none", borderRadius: 10,
                      color: "#080502", fontSize: 16, fontWeight: 900,
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      cursor: "pointer", fontFamily: "'Inter',sans-serif",
                      boxShadow: `0 0 28px rgba(212,175,55,0.35), 0 6px 20px rgba(0,0,0,0.60)`,
                      whiteSpace: "nowrap",
                    }}>
                    📊 View Leaderboard
                  </motion.button>
                </div>
              </div>

              {/* ── RIGHT: The Golden Cigar Box ── */}
              <div style={{
                borderLeft: "1px solid rgba(212,175,55,0.12)",
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.44em", color: `${GOLD}80`, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>The Golden</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.12em", textTransform: "uppercase" }}>Cigar Box</div>
                </div>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <img
                    src={IMG("golden_box.png")}
                    alt="The Golden Cigar Box"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Bottom fade */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(0deg, rgba(0,0,0,0.80), transparent)" }} />
                  {/* Gold rim */}
                  <div style={{ position: "absolute", inset: 0, border: `1px solid ${GOLD}22`, pointerEvents: "none" }} />
                </div>
                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(212,175,55,0.10)" }}>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.38)", lineHeight: 1.55, fontStyle: "italic" }}>
                    SmokeCraft 360 — Collector's Kiosk Edition
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ LEADERBOARD — THE GOLDEN BOX ══════════════ */}
        {step === "leaderboard" && (
          <motion.div key="leaderboard" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", overflow: "hidden" }}>

            {/* ── LEFT PANEL ── */}
            <div style={{
              width: 420, flexShrink: 0, display: "flex", flexDirection: "column",
              borderRight: "1px solid rgba(212,175,55,0.14)",
              background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)",
              overflowY: "auto",
            }}>
              {/* Header area with golden box photo */}
              <div style={{ position: "relative", height: 160, flexShrink: 0, overflow: "hidden" }}>
                <img src={IMG("golden_box.png")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.85) 100%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: `0 0 40px ${GOLD}66` }}>
                    The Golden Box
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: "0.44em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", marginTop: 2 }}>
                    Compete. Learn. Ascend.
                  </div>
                </div>
              </div>

              {/* Tagline text */}
              <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 15, color: "rgba(240,232,212,0.45)", lineHeight: 1.60, margin: 0, textAlign: "center" }}>
                  The Golden Box is SmokeCraft 360's elite challenge system.<br />
                  Every decision you make affects your rank, reputation, and rewards.<br />
                  <span style={{ color: GOLD, fontStyle: "italic" }}>Study the leaf. Build wisely. Earn your place.</span>
                </p>
              </div>

              {/* Rules of Play */}
              <div style={{ padding: "16px 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 20, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.44em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Rules of Play</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
                </div>
                {[
                  { icon: "◎", label: "Score Points", body: "Complete challenges, tasting rounds, mentor quizzes, and pairing decisions to earn XP." },
                  { icon: "📈", label: "Climb the Ranks", body: "Advance through the four official SmokeCraft stages and prove your mastery." },
                  { icon: "⬡", label: "Earn Badges", body: "Unlock exclusive achievement badges that represent your knowledge, skill, and prestige." },
                  { icon: "⬡", label: "Unlock Rewards", body: "Higher ranks unlock rare blends, VIP experiences, exclusive events, and premium gear." },
                  { icon: "⚠", label: "Penalties", body: "Poor decisions and incorrect selections may reduce your points. Not every move earns respect." },
                ].map((r, i) => (
                  <div key={r.label} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, color: i === 4 ? "#C8322A" : GOLD, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.42)", lineHeight: 1.55 }}>{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contest Levels compact list */}
              <div style={{ padding: "12px 24px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 20, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.44em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Contest Levels</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
                </div>
                {[
                  { badge: "🔥", name: "Novice",       sub: "The Beginning",      xp: "0 – 999 XP",          color: "#C8322A", desc: "Learn cigar basics, flavor recognition, and foundational pairing techniques." },
                  { badge: "🕯", name: "Enthusiast",   sub: "Fueled by Passion",  xp: "1,000 – 4,999 XP",   color: GOLD,      desc: "Understand regions, wrappers, construction, and pairing synergy." },
                  { badge: "💎", name: "Connoisseur",  sub: "Refined & Focused",  xp: "5,000 – 14,999 XP",  color: "#9B59B6", desc: "Recognize flavor transitions, aging, fermentation, and advanced blend structure." },
                  { badge: "♛",  name: "Aficionado",  sub: "The Ultimate Status", xp: "15,000+ XP",          color: "#D4820A", desc: "Master sensory analysis, pairing intelligence, cigar culture, and strategic competition." },
                ].map(t => (
                  <div key={t.name} style={{
                    display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14,
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${t.color}22`,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `radial-gradient(circle at 35% 30%, ${t.color}33, rgba(0,0,0,0.60))`,
                      border: `1.5px solid ${t.color}55`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>{t.badge}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.xp}</span>
                      </div>
                      <div style={{ fontSize: 11, color: t.color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>{t.sub}</div>
                      <div style={{ fontSize: 13, color: "rgba(240,232,212,0.40)", lineHeight: 1.45 }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Golden Box Prize */}
              <div style={{
                margin: "12px 24px 24px",
                background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.28)",
                borderRadius: 12, padding: "14px 18px",
                display: "flex", gap: 14, alignItems: "center",
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>The Golden Box Prize</div>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.45)", lineHeight: 1.55 }}>
                    Reserved for top-ranking competitors. Inside: rare blends, exclusive gear, and experiences that can't be bought.
                  </div>
                </div>
                <motion.button type="button" onPointerDown={() => go("mentor")}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flexShrink: 0, padding: "10px 16px",
                    background: "rgba(212,175,55,0.14)", border: `1px solid ${GOLD}55`,
                    borderRadius: 8, color: GOLD, fontSize: 13, fontWeight: 800,
                    letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap",
                  }}>
                  View Prize Pool →
                </motion.button>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Rank status top bar */}
              <div style={{
                flexShrink: 0, display: "flex", alignItems: "stretch",
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(212,175,55,0.14)",
              }}>
                {/* Your rank */}
                <div style={{ padding: "16px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                    background: "radial-gradient(circle at 35% 30%, rgba(212,175,55,0.38), rgba(0,0,0,0.70))",
                    border: `2px solid ${GOLD}55`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>🎩</div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.36em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Your Rank</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, letterSpacing: "0.06em" }}>ENTHUSIAST</div>
                    <div style={{ fontSize: 16, color: "rgba(240,232,212,0.60)", fontWeight: 600 }}>{profile.points.toLocaleString()} XP</div>
                  </div>
                </div>
                {/* Next rank */}
                <div style={{ padding: "16px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.36em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 4 }}>Next Rank</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#9B59B6", letterSpacing: "0.06em" }}>CONNOISSEUR</div>
                  <div style={{ fontSize: 14, color: "rgba(240,232,212,0.40)" }}>{Math.max(0, 5000 - profile.points).toLocaleString()} XP to go</div>
                  <div style={{ marginTop: 6, height: 3, width: 140, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (profile.points / 5000) * 100)}%`, background: "#9B59B6", borderRadius: 2 }} />
                  </div>
                </div>
                {/* Rewards */}
                <div style={{ padding: "16px 24px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎁</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase" }}>Rewards</div>
                </div>
                {/* Badges */}
                <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⭐</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase" }}>Badges</div>
                </div>
                {/* Spacer + CTA */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 24px" }}>
                  <GoldBtn onClick={() => go("mentor")} style={{ padding: "14px 28px", fontSize: 16 }}>
                    SELECT MENTOR →
                  </GoldBtn>
                </div>
              </div>

              {/* Live Leaderboard table */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0 24px" }}>
                {/* Table header */}
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  background: "rgba(8,5,2,0.95)", backdropFilter: "blur(12px)",
                  padding: "14px 28px 12px",
                  borderBottom: "1px solid rgba(212,175,55,0.12)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A", flexShrink: 0 }} />
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase" }}>Live Leaderboard</span>
                    <span style={{ fontSize: 12, color: "rgba(240,232,212,0.32)", letterSpacing: "0.18em", textTransform: "uppercase" }}>· Updated Just Now</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 130px 110px 120px", gap: 0, padding: "0 4px" }}>
                    {["Rank","Contestant","Level","XP","Badges"].map(h => (
                      <div key={h} style={{ fontSize: 11, letterSpacing: "0.32em", color: "rgba(240,232,212,0.28)", textTransform: "uppercase", fontWeight: 800 }}>{h}</div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {[
                  { rank: 1,  handle: "TheCigarLion",   real: "Alex Martinez",      xp: 18750, tier: "Aficionado",  badge: "♛",  tColor: "#D4820A", badges: ["♛","💎","🔥"], extra: "+3" },
                  { rank: 2,  handle: "Aficionado_D",   real: "Darnell Washington", xp: 16420, tier: "Connoisseur", badge: "💎", tColor: "#9B59B6", badges: ["💎","🕯","🔥"], extra: "+2" },
                  { rank: 3,  handle: "SmoothDraws",    real: "Marcus Tate",         xp: 14980, tier: "Connoisseur", badge: "💎", tColor: "#9B59B6", badges: ["💎","🕯","🔥"], extra: "+4" },
                  { rank: 4,  handle: "Ash&Oak",        real: "Brandon Hill",        xp: 13250, tier: "Connoisseur", badge: "💎", tColor: "#9B59B6", badges: ["💎","🕯"],       extra: "+1" },
                  { rank: 5,  handle: "LeafScholar",    real: "Jasmine Cole",        xp: 12760, tier: "Connoisseur", badge: "💎", tColor: "#9B59B6", badges: ["♛","💎"],       extra: "+2" },
                  { rank: 6,  handle: "BourbonLeaf",    real: "Tyler Bennett",       xp: 10850, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["♛","🔥"],       extra: "+1" },
                  { rank: 7,  handle: "CigarSensei",    real: "Ethan Reynolds",      xp:  9430, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["💎","🔥"],       extra: "+2" },
                  { rank: 8,  handle: "PuffProfessor",  real: "Daniel Cooper",       xp:  8910, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["🔥","⭐"],       extra: "+1" },
                  { rank: 9,  handle: "VintageVisions", real: "Robert King",         xp:  7650, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["♛","🔥"],       extra: "+2" },
                  { rank: 10, handle: "CedarRoomKing",  real: "Kevin Brooks",        xp:  6980, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["🔥"],            extra: "+1" },
                ].map((row, i) => {
                  const isTop3 = row.rank <= 3;
                  const rankColor = row.rank === 1 ? GOLD : row.rank === 2 ? "#C0C0C0" : row.rank === 3 ? "#CD7F32" : "rgba(240,232,212,0.30)";
                  return (
                    <motion.div key={row.rank}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.32, ease: [0.22,1,0.36,1] }}
                      style={{
                        display: "grid", gridTemplateColumns: "52px 1fr 130px 110px 120px",
                        alignItems: "center", gap: 0,
                        padding: "12px 28px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isTop3 ? `rgba(212,175,55,${0.04 - i*0.01})` : "transparent",
                        transition: "background 0.2s",
                      }}>
                      {/* Rank */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isTop3 ? `radial-gradient(circle at 35% 30%, ${rankColor}44, rgba(0,0,0,0.60))` : "rgba(255,255,255,0.05)",
                          border: isTop3 ? `2px solid ${rankColor}88` : "1px solid rgba(255,255,255,0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: isTop3 ? 15 : 14, fontWeight: 900, color: rankColor,
                          boxShadow: isTop3 ? `0 0 16px ${rankColor}44` : "none",
                        }}>{row.rank}</div>
                      </div>
                      {/* Contestant */}
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: `radial-gradient(circle at 35% 30%, ${row.tColor}33, rgba(0,0,0,0.55))`,
                          border: `1.5px solid ${row.tColor}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16,
                        }}>🎩</div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.02em" }}>{row.handle}</div>
                          <div style={{ fontSize: 13, color: "rgba(240,232,212,0.35)" }}>{row.real}</div>
                        </div>
                      </div>
                      {/* Level */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, ${row.tColor}33, rgba(0,0,0,0.55))`,
                          border: `1.5px solid ${row.tColor}55`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14,
                        }}>{row.badge}</div>
                      </div>
                      {/* XP */}
                      <div style={{ fontSize: 17, fontWeight: 800, color: row.tColor, letterSpacing: "0.04em" }}>
                        {row.xp.toLocaleString()} XP
                      </div>
                      {/* Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {row.badges.map((b, bi) => (
                          <div key={bi} style={{
                            width: 26, height: 26, borderRadius: "50%", fontSize: 12,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                          }}>{b}</div>
                        ))}
                        <span style={{ fontSize: 13, color: row.tColor, fontWeight: 700, marginLeft: 2 }}>{row.extra}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ MENTOR ══════════════ */}
        {step === "mentor" && (
          <motion.div key="mentor" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Mentor header strip */}
            <div style={{
              flexShrink: 0, padding: "28px 48px 20px",
              background: "rgba(0,0,0,0.40)", backdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(212,175,55,0.12)",
            }}>
              <Eyebrow>Step 1.4 · Master Blender Selection</Eyebrow>
              <SectionTitle style={{ margin: 0 }}>Choose Your Guide</SectionTitle>
            </div>

            {/* 3-column mentor cards — full bleed */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", overflow: "hidden" }}>
              {MENTORS.map(m => {
                const active = mentor === m.id;
                return (
                  <motion.button key={m.id} type="button"
                    onPointerDown={() => { setMentor(m.id); updateProfile({ mentor: m.id }); }}
                    whileTap={{ scale: 0.985 }}
                    style={{
                      position:   "relative",
                      display:    "flex",
                      flexDirection: "column",
                      border:     "none",
                      borderRight: "1px solid rgba(255,255,255,0.05)",
                      cursor:     "pointer",
                      textAlign:  "left",
                      padding:    0,
                      overflow:   "hidden",
                      fontFamily: "'Inter', sans-serif",
                      background: "transparent",
                      transition: "all 0.28s",
                      outline:    "none",
                    }}
                  >
                    {/* ── Real portrait photo — full bleed top ── */}
                    <div style={{ flex: "0 0 58%", position: "relative", overflow: "hidden" }}>
                      <img
                        src={IMG(m.photo)}
                        alt={m.name}
                        style={{
                          position: "absolute", inset: 0,
                          width: "100%", height: "100%",
                          objectFit: "cover", objectPosition: "center top",
                          transition: "transform 0.45s ease",
                          transform: active ? "scale(1.04)" : "scale(1.00)",
                        }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      {/* Gradient overlay — darkens bottom for text readability */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: active
                          ? `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%)`
                          : `linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.72) 100%)`,
                        transition: "background 0.30s",
                      }} />
                      {/* Active gold rim */}
                      {active && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${GOLD}55, ${GOLD}, ${GOLD}55)`, boxShadow: `0 0 22px ${GOLD}99` }} />
                      )}
                      {/* Flag badge — bottom left of photo */}
                      <div style={{
                        position: "absolute", bottom: 16, left: 20,
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{m.flag}</span>
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", color: active ? GOLD : "rgba(255,255,255,0.55)", fontWeight: 800, fontFamily: "'Inter',sans-serif", transition: "color 0.28s" }}>{m.country}</div>
                          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif" }}>{m.valley}</div>
                        </div>
                      </div>
                    </div>

                    {/* Info panel */}
                    <div style={{
                      flex: 1,
                      padding: "24px 26px 26px",
                      background: active ? "rgba(212,175,55,0.08)" : "rgba(6,4,2,0.82)",
                      backdropFilter: "blur(20px)",
                      borderTop: `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.30s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: active ? GOLD : "#F0E8D4", transition: "color 0.28s", letterSpacing: "0.01em", lineHeight: 1.2 }}>
                        {m.name}
                      </div>
                      <p style={{ fontSize: 16, color: "rgba(240,232,212,0.55)", lineHeight: 1.58, margin: 0 }}>
                        {m.bio}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: "auto" }}>
                        {m.tags.map(t => (
                          <span key={t} style={{
                            background: active ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${active ? GOLD + "55" : "rgba(255,255,255,0.10)"}`,
                            borderRadius: 4, padding: "6px 14px",
                            fontSize: 11, fontWeight: 700, color: active ? GOLD : "rgba(240,232,212,0.38)",
                            letterSpacing: "0.15em", textTransform: "uppercase", transition: "all 0.28s",
                          }}>{t}</span>
                        ))}
                      </div>
                      {active && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          style={{ fontSize: 13, letterSpacing: "0.28em", textTransform: "uppercase", color: GOLD, fontWeight: 800, fontFamily: "'Inter',sans-serif" }}>
                          ✓ SELECTED
                        </motion.div>
                      )}
                    </div>

                    {/* Active selection border */}
                    {active && (
                      <div style={{
                        position: "absolute", inset: 0,
                        border: `2px solid ${GOLD}`,
                        borderRadius: 0,
                        pointerEvents: "none",
                        boxShadow: `inset 0 0 40px rgba(212,175,55,0.10)`,
                      }} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer CTA */}
            <div style={{
              flexShrink: 0, padding: "20px 48px",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(212,175,55,0.12)",
            }}>
              <GoldBtn disabled={!mentor} onClick={() => mentor && go("seed_canvas")} fullWidth>
                PROCEED TO SEED TEXTURE ANALYSIS →
              </GoldBtn>
            </div>
          </motion.div>
        )}

        {/* ══════════════ SEED CANVAS ══════════════ */}
        {step === "seed_canvas" && (() => {
          type Drink = { icon: string; label: string; category: string; desc: string; score: number };
          const INTEL: Record<string, {
            telemetry: { k: string; v: string; b: number }[];
            notes: string[];
            drinks: Drink[];
            warning: string;
            masterNote: string;
            descLong: string;
            meta: { origin: string; seedType: string; crop: string; aging: string };
          }> = {
            criollo: {
              telemetry: [
                { k: "Body",      v: "Medium-Full",           b: 72 },
                { k: "Nicotine",  v: "High",                  b: 78 },
                { k: "Burn Rate", v: "Slow / Even",           b: 38 },
                { k: "Aroma",     v: "Earth · Spice · Cedar", b: 80 },
                { k: "Finish",    v: "Long · Cocoa · Pepper", b: 75 },
              ],
              notes: ["Dark Chocolate","Cedar","Leather","Espresso","Black Pepper","Roasted Earth","Aged Oak","Cocoa Nib"],
              drinks: [
                { icon:"🥃", label:"Aged Bourbon",   category:"Whiskey",  score:95, desc:"Vanilla and caramel notes mirror Criollo's earth tone. The wood char bridges the spice beautifully." },
                { icon:"🥃", label:"Rye Whiskey",    category:"Whiskey",  score:88, desc:"Peppery rye grain amplifies Criollo's black pepper finish — a bold, layered combination." },
                { icon:"🥃", label:"Cognac VSOP",    category:"Brandy",   score:84, desc:"Dried fruit and floral esters round out Criollo's heavier earth profile with sophistication." },
                { icon:"🍷", label:"Dark Rum",       category:"Rum",      score:82, desc:"Molasses sweetness cuts through Criollo's leather without masking the spice complexity." },
                { icon:"☕", label:"Espresso",        category:"Coffee",   score:80, desc:"Roasted intensity echoes Criollo's dark chocolate notes. A ritual pairing of the highest order." },
                { icon:"🥃", label:"Añejo Tequila",  category:"Agave",    score:74, desc:"Barrel aging softens tequila's heat and introduces oak harmony with the Criollo wrapper." },
                { icon:"🍺", label:"Imperial Stout", category:"Beer",     score:66, desc:"Roasted malt and dark fruit offer a heavy-handed but capable companion to Criollo's strength." },
                { icon:"🥃", label:"Armagnac",       category:"Brandy",   score:60, desc:"A more rustic alternative to Cognac — earthy and assertive, a secondary option for bold palates." },
              ],
              warning: "Avoid overly sweet citrus pairings — they suppress the spice complexity and collapse the finish.",
              masterNote: "Criollo '98 rewards patience. The second third reveals the true spice architecture beneath the earth-toned opening.",
              descLong: "A premium Cuban-seed wrapper grown in the rich soils of the Dominican Republic. Known for its powerful yet refined character, deep complexity, and bold spice transitions.",
              meta: { origin: "D.R.", seedType: "Cuban", crop: "Priming", aging: "18–24 Months" },
            },
            corojo: {
              telemetry: [
                { k: "Body",      v: "Full",                  b: 95 },
                { k: "Nicotine",  v: "Very High",             b: 94 },
                { k: "Burn Rate", v: "Medium",                b: 55 },
                { k: "Aroma",     v: "Pepper · Oak · Spice",  b: 90 },
                { k: "Finish",    v: "Long · Pepper · Oak",   b: 88 },
              ],
              notes: ["Black Pepper","Cedar","Oak","Clove","Espresso","Dark Earth","Raw Tobacco","Charred Wood"],
              drinks: [
                { icon:"🥃", label:"Islay Single Malt", category:"Scotch",   score:96, desc:"Peat smoke and brine from Islay scotch create an almost confrontational but harmonious match with Corojo's intensity." },
                { icon:"🥃", label:"Aged Rum 18yr",     category:"Rum",      score:90, desc:"Long barrel aging softens rum's sweetness just enough to survive Corojo's full-body assault." },
                { icon:"🥃", label:"Cognac XO",         category:"Brandy",   score:86, desc:"XO-grade concentration provides structure and fruit complexity that balances Corojo's pepper dominance." },
                { icon:"🍷", label:"Mezcal Reposado",   category:"Agave",    score:82, desc:"Smoke-on-smoke intensity. Mezcal's agave oils amplify Corojo's deep earth and pepper architecture." },
                { icon:"☕", label:"Black Coffee",      category:"Coffee",   score:80, desc:"Pure, uncut roast bitterness matches Corojo stride for stride — no sweetness to get in the way." },
                { icon:"🍷", label:"Madeira Reserve",   category:"Fortified",score:74, desc:"Oxidative nuttiness and acidity provide a sharp contrast that momentarily tames Corojo's heat." },
                { icon:"🍺", label:"Baltic Porter",     category:"Beer",     score:68, desc:"Dark malt gravity and residual sweetness offer a momentary reprieve between Corojo's pepper waves." },
                { icon:"🥃", label:"Overproof Rum",     category:"Rum",      score:58, desc:"High-proof rum amplifies rather than moderates — only for those who seek maximum intensity." },
              ],
              warning: "Pair with robust spirits only — mild or sweet pairings are completely overwhelmed by Corojo's intensity.",
              masterNote: "Corojo demands a palate that can take the heat. The pepper never relents — but beneath it lies extraordinary oil complexity.",
              descLong: "A highly robust, oil-dense Vuelta Abajo cultivar. Renowned for intense peppery finishes and maximum natural oil yield — the benchmark of full-strength construction.",
              meta: { origin: "Cuba/HN", seedType: "Corojo", crop: "Priming", aging: "24–36 Months" },
            },
            connecticut: {
              telemetry: [
                { k: "Body",      v: "Mild",                      b: 22 },
                { k: "Nicotine",  v: "Low-Medium",                b: 28 },
                { k: "Burn Rate", v: "Fast / Smooth",             b: 78 },
                { k: "Aroma",     v: "Cream · Hay · Floral",      b: 45 },
                { k: "Finish",    v: "Smooth · Cream · Vanilla",  b: 40 },
              ],
              notes: ["Cream","Hay","Vanilla","Floral","Cedar","Light Toast","Sweet Butter","White Tea"],
              drinks: [
                { icon:"🥂", label:"Brut Champagne",  category:"Sparkling", score:96, desc:"Fine bubble acidity lifts Connecticut's creaminess into an extraordinarily refined tasting moment." },
                { icon:"🥃", label:"Light Bourbon",   category:"Whiskey",   score:88, desc:"Low rye content and gentle sweetness complement Connecticut's vanilla and cream without overpowering." },
                { icon:"🍵", label:"White Tea",       category:"Tea",       score:85, desc:"Floral, almost ephemeral character perfectly mirrors Connecticut's aromatic profile." },
                { icon:"🍵", label:"Green Tea",       category:"Tea",       score:82, desc:"Grassy freshness and vegetal notes align naturally with Connecticut's hay and floral dimensions." },
                { icon:"🥂", label:"Blanc de Blancs", category:"Sparkling", score:80, desc:"100% Chardonnay sparkle brings mineral elegance that elevates Connecticut's subtle complexity." },
                { icon:"☕", label:"Milk Coffee",     category:"Coffee",    score:74, desc:"Cream and steamed milk soften any bitterness while the caramel notes sync with vanilla finish." },
                { icon:"🍷", label:"Sauvignon Blanc", category:"Wine",      score:70, desc:"Citrus zest and herbaceous character add brightness without overwhelming the wrapper's delicacy." },
                { icon:"🥂", label:"Dry Rosé",        category:"Wine",      score:64, desc:"Berry notes and crisp acidity offer a gentle, summery complement — best in lighter sessions." },
              ],
              warning: "Never pair with bold spirits — they will completely obliterate the delicate creaminess this wrapper is celebrated for.",
              masterNote: "Connecticut Shade is deceptive in its subtlety. What seems simple reveals layers of creaminess, floral notes, and a seamless burn.",
              descLong: "Grown under cheesecloth shade canopies in the Connecticut River Valley. Prized for near-invisible veins, ultra-smooth draw, and the gold standard for premium wrapper aesthetics.",
              meta: { origin: "CT, USA", seedType: "Shade", crop: "Shade", aging: "12–18 Months" },
            },
          };
          const intel = INTEL[seedId] || INTEL.criollo;
          const activeDrink = intel.drinks.find(d => d.label === selectedPairing) || null;
          return (
          <motion.div key="seed_canvas" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Header ── */}
            <div style={{
              flexShrink: 0, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(212,175,55,0.18)",
              display: "flex", alignItems: "stretch",
            }}>
              <div style={{ flex: 1, padding: "14px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 12, letterSpacing: "0.52em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>
                  SmokeCraft 360 · Kiosk Edition
                </div>
                <h1 style={{
                  fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: 48, fontWeight: 700, color: GOLD,
                  margin: 0, letterSpacing: "0.16em", textTransform: "uppercase",
                  textShadow: `0 0 48px ${GOLD}55`, lineHeight: 1,
                }}>Leaf Recognition Matrix</h1>
                <div style={{ fontSize: 16, color: "rgba(240,232,212,0.35)", letterSpacing: "0.14em", marginTop: 4, fontStyle: "italic" }}>
                  Study the leaf. Understand the blend. Build your palate.
                </div>
              </div>
              <div style={{ padding: "0 32px", display: "flex", alignItems: "center", gap: 12, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 13, letterSpacing: "0.28em", color: "rgba(240,232,212,0.28)", textTransform: "uppercase" }}>Table Kiosk · Active</div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 10px #32B45A" }} />
              </div>
            </div>

            {/* ── Seed Tab Bar ── */}
            <div style={{
              flexShrink: 0, display: "flex",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(212,175,55,0.12)",
            }}>
              {SEEDS.map(s => {
                const active = seedId === s.id;
                return (
                  <motion.button key={s.id} type="button" onPointerDown={() => setSeedId(s.id)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1, border: "none",
                      borderRight: "1px solid rgba(255,255,255,0.05)",
                      borderBottom: active ? `3px solid ${GOLD}` : "3px solid transparent",
                      background: active ? `rgba(212,175,55,0.12)` : "transparent",
                      cursor: "pointer", padding: "16px 28px",
                      display: "flex", alignItems: "center", gap: 16,
                      fontFamily: "'Inter',sans-serif", textAlign: "left",
                      transition: "background 0.22s, border-color 0.22s",
                      boxShadow: active ? `inset 0 -1px 0 ${GOLD}44` : "none",
                    }}>
                    <motion.div
                      animate={{ scale: active ? 1 : 0.92, boxShadow: active ? `0 0 22px ${GOLD}44` : "0 0 0px transparent" }}
                      transition={{ type: "spring", stiffness: 400, damping: 26 }}
                      style={{
                        width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                        background: active ? `radial-gradient(circle at 35% 30%, ${GOLD}44, rgba(0,0,0,0.65))` : "rgba(255,255,255,0.06)",
                        border: active ? `2px solid ${GOLD}77` : "1px solid rgba(255,255,255,0.10)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>🍃</motion.div>
                    <div>
                      <motion.div
                        animate={{ color: active ? GOLD : "rgba(240,232,212,0.50)" }}
                        transition={{ duration: 0.20 }}
                        style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                        {s.name}
                      </motion.div>
                      <div style={{ fontSize: 16, color: "rgba(240,232,212,0.36)", letterSpacing: "0.06em", marginTop: 2 }}>{s.tagline}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* ── Main body ── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

              {/* LEFT — Macro leaf photo (animated on seed change) */}
              <div style={{ flex: "0 0 54%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  {/* Animated image crossfade */}
                  <AnimatePresence mode="sync">
                    <motion.img
                      key={seedId + "_img"}
                      src={IMG(SEED_PHOTOS[seedId] || "tobacco_criollo.png")}
                      alt={seed.name}
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1.0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </AnimatePresence>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.40) 55%, rgba(0,0,0,0.85) 100%)" }} />
                  {/* Bottom content */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 36px 28px" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 260, background: "linear-gradient(0deg, rgba(2,1,0,0.97) 0%, transparent 100%)", zIndex: 0 }} />
                    <AnimatePresence mode="wait">
                      <motion.div key={seedId + "_overlay"}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.40, ease: [0.22,1,0.36,1] }}
                        style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ fontSize: 14, letterSpacing: "0.52em", color: `${GOLD}99`, textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>
                          Macro Specimen
                        </div>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 60, fontWeight: 600, color: "#F0E8D4", lineHeight: 1, textShadow: "0 2px 28px rgba(0,0,0,0.98)", marginBottom: 6 }}>
                          {seed.name}
                        </div>
                        <div style={{ fontSize: 18, letterSpacing: "0.24em", color: "rgba(240,232,212,0.50)", textTransform: "uppercase", marginBottom: 12 }}>{seed.origin}</div>
                        <p style={{ fontSize: 18, color: "rgba(240,232,212,0.55)", lineHeight: 1.60, margin: "0 0 20px", maxWidth: 400 }}>
                          {intel.descLong}
                        </p>
                        <div style={{ display: "flex", gap: 24 }}>
                          {[
                            { label: "Origin",    val: intel.meta.origin },
                            { label: "Seed Type", val: intel.meta.seedType },
                            { label: "Crop",      val: intel.meta.crop },
                            { label: "Aging",     val: intel.meta.aging },
                          ].map(m => (
                            <div key={m.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, opacity: 0.65, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 12, letterSpacing: "0.26em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", fontWeight: 700 }}>{m.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(240,232,212,0.80)" }}>{m.val}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* ── Leaf Comparison Intelligence bar ── */}
                <div style={{
                  flexShrink: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)",
                  borderTop: "1px solid rgba(212,175,55,0.14)", padding: "14px 20px",
                }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.48em", color: `${GOLD}66`, textTransform: "uppercase", fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
                    ─── Leaf Comparison Intelligence ───
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
                    {[
                      { id:"criollo",     name:"Criollo '98",       icon:"🍃", sb:75, cb:80, pb:85, sv:"High",     cv:"High",   pv:"Heavy"     },
                      { id:"corojo",      name:"Corojo",            icon:"🌿", sb:95, cb:55, pb:95, sv:"Very High", cv:"Medium", pv:"Aggressive"},
                      { id:"connecticut", name:"Connecticut Shade", icon:"🍀", sb:20, cb:35, pb:10, sv:"Mild",      cv:"Smooth", pv:"Low"       },
                    ].map(cs => (
                      <motion.button key={cs.id} type="button" onPointerDown={() => setSeedId(cs.id)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          border: "none", cursor: "pointer", textAlign: "left",
                          background: cs.id === seedId ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                          borderRadius: 10, padding: "10px 14px",
                          outline: cs.id === seedId ? `1.5px solid ${GOLD}55` : "1px solid rgba(255,255,255,0.07)",
                          fontFamily: "'Inter',sans-serif",
                          transition: "background 0.20s",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                          background: `radial-gradient(circle at 35% 30%, ${GOLD}28, rgba(0,0,0,0.55))`,
                          border: `1.5px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                        }}>{cs.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: cs.id === seedId ? GOLD : "#F0E8D4", marginBottom: 6 }}>{cs.name}</div>
                          {[{l:"Strength",v:cs.sv,b:cs.sb},{l:"Complexity",v:cs.cv,b:cs.cb},{l:"Spice",v:cs.pv,b:cs.pb}].map(row => (
                            <div key={row.l} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <span style={{ fontSize:13, color:"rgba(240,232,212,0.35)", width:72, flexShrink:0 }}>{row.l}</span>
                              <div style={{ display:"flex", gap:2 }}>
                                {[1,2,3,4,5].map(d => (
                                  <div key={d} style={{
                                    width:9, height:9, borderRadius:2,
                                    background: (row.b/20)>=d ? GOLD : "rgba(255,255,255,0.10)",
                                    boxShadow: (row.b/20)>=d ? `0 0 5px ${GOLD}88` : "none",
                                  }} />
                                ))}
                              </div>
                              <span style={{ fontSize:13, color:"rgba(240,232,212,0.44)" }}>{row.v}</span>
                            </div>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                    {/* Expert insight */}
                    <div style={{ background:"rgba(212,175,55,0.05)", border:`1px solid ${GOLD}22`, borderRadius:10, padding:"10px 14px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                      <div style={{ fontSize:13, letterSpacing:"0.28em", color:`${GOLD}88`, textTransform:"uppercase", fontWeight:800, marginBottom:6 }}>Expert Insight</div>
                      <p style={{ fontSize:14, color:"rgba(240,232,212,0.48)", lineHeight:1.55, margin:0 }}>
                        {seedId==="criollo" ? "Criollo '98 is ideal for those who appreciate bold transitions, deep earth character, and a long, satisfying finish."
                          : seedId==="corojo" ? "Corojo is for the serious palate — high strength, aggressive spice, and a finish that commands full attention."
                          : "Connecticut Shade suits those who value finesse over force — elegance, creaminess, and seamless construction."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — Leaf Intelligence Panel */}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
                borderLeft: "1px solid rgba(212,175,55,0.12)",
                background: "rgba(4,3,1,0.82)", backdropFilter: "blur(24px)",
              }}>
                <div style={{ flexShrink:0, padding:"10px 24px", borderBottom:"1px solid rgba(212,175,55,0.10)", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:18, height:1, background:`${GOLD}44` }} />
                  <span style={{ fontSize:14, letterSpacing:"0.46em", color:`${GOLD}80`, fontWeight:800, textTransform:"uppercase" }}>Leaf Intelligence Panel</span>
                  <div style={{ flex:1, height:1, background:`${GOLD}20` }} />
                </div>

                <div style={{ flex:1, overflowY:"auto", padding:"0 24px 20px" }}>

                  {/* Origin Profile */}
                  <div style={{ padding:"14px 0 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, letterSpacing:"0.36em", color:GOLD, textTransform:"uppercase", fontWeight:800, marginBottom:6 }}>🌍 Origin Profile</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:42, fontWeight:600, color:"#F0E8D4", lineHeight:1, marginBottom:5 }}>{seed.name}</div>
                        <div style={{ fontSize:16, letterSpacing:"0.24em", color:`${GOLD}88`, textTransform:"uppercase", marginBottom:12 }}>{seed.origin}</div>
                        <p style={{ fontSize:18, color:"rgba(240,232,212,0.50)", lineHeight:1.62, margin:0 }}>{seed.profile}</p>
                      </div>
                      <div style={{ width:72, height:56, flexShrink:0, marginLeft:16, borderRadius:8, background:"radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.20), rgba(0,0,0,0.55))", border:"1px solid rgba(212,175,55,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, opacity:0.80 }}>🗺</div>
                    </div>
                  </div>

                  {/* Profile Telemetry */}
                  <div style={{ padding:"14px 0 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:14, letterSpacing:"0.36em", color:GOLD, textTransform:"uppercase", fontWeight:800, marginBottom:14 }}>📊 Profile Telemetry</div>
                    {intel.telemetry.map((sp, ti) => (
                      <div key={sp.k} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:11 }}>
                        <span style={{ fontSize:14, letterSpacing:"0.18em", color:"rgba(240,232,212,0.40)", textTransform:"uppercase", fontWeight:700, width:82, flexShrink:0 }}>{sp.k}</span>
                        <div style={{ flex:1, height:8, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                          <motion.div key={seedId+sp.k}
                            initial={{ width:0 }} animate={{ width:`${sp.b}%` }}
                            transition={{ duration:0.58, delay:ti*0.07, ease:[0.22,1,0.36,1] }}
                            style={{ height:"100%", background:`linear-gradient(90deg, ${GOLD}66, ${GOLD})`, borderRadius:4, boxShadow:`0 0 12px ${GOLD}55` }} />
                        </div>
                        <span style={{ fontSize:16, fontWeight:700, color:"#F0E8D4", textAlign:"right", minWidth:148, flexShrink:0 }}>{sp.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Detectable Notes — interactive chips */}
                  <div style={{ padding:"14px 0 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:14, letterSpacing:"0.36em", color:GOLD, textTransform:"uppercase", fontWeight:800, marginBottom:14 }}>🍫 Detectable Notes</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {intel.notes.map(n => {
                        const on = selectedNote === n;
                        return (
                          <motion.button key={n} type="button"
                            onPointerDown={() => setSelectedNote(on ? null : n)}
                            whileTap={{ scale: 0.93 }}
                            animate={{
                              background: on ? GOLD : "rgba(212,175,55,0.07)",
                              boxShadow: on ? `0 0 18px ${GOLD}66, 0 0 6px ${GOLD}44` : "none",
                            }}
                            transition={{ duration: 0.18 }}
                            style={{
                              border: `1.5px solid ${on ? GOLD : "rgba(212,175,55,0.24)"}`,
                              borderRadius: 8, padding: "8px 16px", cursor: "pointer",
                              fontSize: 18, fontWeight: 700,
                              color: on ? "#000" : "rgba(240,232,212,0.70)",
                              fontFamily: "'Inter',sans-serif",
                              transition: "border-color 0.18s, color 0.18s",
                            }}>
                            {n}
                          </motion.button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {selectedNote && (
                        <motion.div
                          initial={{ opacity:0, height:0, marginTop:0 }} animate={{ opacity:1, height:"auto", marginTop:12 }} exit={{ opacity:0, height:0, marginTop:0 }}
                          transition={{ duration:0.28 }}
                          style={{ background:"rgba(212,175,55,0.10)", border:`1px solid ${GOLD}33`, borderRadius:10, padding:"12px 16px", overflow:"hidden" }}>
                          <div style={{ fontSize:16, fontWeight:800, color:GOLD, marginBottom:4 }}>✓ {selectedNote}</div>
                          <div style={{ fontSize:16, color:"rgba(240,232,212,0.55)", lineHeight:1.55 }}>
                            This note is a primary tasting characteristic of <strong style={{ color:"#F0E8D4" }}>{seed.name}</strong>. Focus on detecting it in the early to mid-third of the smoke.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pairing Intelligence — active drink picker */}
                  <div style={{ padding:"14px 0 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize:14, letterSpacing:"0.36em", color:GOLD, textTransform:"uppercase", fontWeight:800, marginBottom:6 }}>🍾 Pairing Intelligence</div>
                    <div style={{ fontSize:14, letterSpacing:"0.22em", color:"rgba(240,232,212,0.30)", textTransform:"uppercase", marginBottom:14 }}>Select a Pairing to Explore</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:12 }}>
                      {intel.drinks.map(d => {
                        const on = selectedPairing === d.label;
                        return (
                          <motion.button key={d.label} type="button"
                            onPointerDown={() => setSelectedPairing(on ? null : d.label)}
                            whileTap={{ scale: 0.94 }}
                            animate={{
                              background: on ? `rgba(212,175,55,0.20)` : "rgba(255,255,255,0.04)",
                              boxShadow: on ? `0 0 20px ${GOLD}44` : "none",
                            }}
                            transition={{ duration:0.18 }}
                            style={{
                              border: `1.5px solid ${on ? GOLD : "rgba(255,255,255,0.09)"}`,
                              borderRadius:10, padding:"12px 8px", cursor:"pointer",
                              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                              fontFamily:"'Inter',sans-serif",
                              transition:"border-color 0.18s",
                              position:"relative",
                            }}>
                            {on && (
                              <div style={{ position:"absolute", top:6, right:8, fontSize:12, color:GOLD, fontWeight:900 }}>✓</div>
                            )}
                            <span style={{ fontSize:26 }}>{d.icon}</span>
                            <span style={{ fontSize:14, fontWeight:700, color: on ? GOLD : "#F0E8D4", textAlign:"center", lineHeight:1.25 }}>{d.label}</span>
                            <span style={{ fontSize:12, color:"rgba(240,232,212,0.32)", letterSpacing:"0.12em", textTransform:"uppercase" }}>{d.category}</span>
                            {/* Score bar */}
                            <div style={{ width:"80%", height:3, background:"rgba(255,255,255,0.08)", borderRadius:2, marginTop:2 }}>
                              <div style={{ height:"100%", width:`${d.score}%`, background: on ? GOLD : "rgba(212,175,55,0.45)", borderRadius:2 }} />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    {/* Selected drink detail card */}
                    <AnimatePresence mode="wait">
                      {activeDrink ? (
                        <motion.div key={activeDrink.label}
                          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                          transition={{ duration:0.28, ease:[0.22,1,0.36,1] }}
                          style={{ background:"rgba(212,175,55,0.10)", border:`1.5px solid ${GOLD}44`, borderRadius:12, padding:"16px 20px" }}>
                          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                            <span style={{ fontSize:36, flexShrink:0 }}>{activeDrink.icon}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                                <span style={{ fontSize:22, fontWeight:900, color:GOLD }}>{activeDrink.label}</span>
                                <span style={{ fontSize:14, color:"rgba(212,175,55,0.65)", letterSpacing:"0.12em", textTransform:"uppercase" }}>{activeDrink.category}</span>
                              </div>
                              <p style={{ fontSize:18, color:"rgba(240,232,212,0.62)", lineHeight:1.60, margin:"0 0 10px" }}>{activeDrink.desc}</p>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <span style={{ fontSize:14, color:"rgba(240,232,212,0.35)", letterSpacing:"0.18em", textTransform:"uppercase" }}>Pairing Match</span>
                                <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.07)", borderRadius:3 }}>
                                  <motion.div initial={{ width:0 }} animate={{ width:`${activeDrink.score}%` }} transition={{ duration:0.50, ease:[0.22,1,0.36,1] }}
                                    style={{ height:"100%", background:`linear-gradient(90deg, ${GOLD}77, ${GOLD})`, borderRadius:3, boxShadow:`0 0 10px ${GOLD}66` }} />
                                </div>
                                <span style={{ fontSize:16, fontWeight:800, color:GOLD }}>{activeDrink.score}%</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="no-selection"
                          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                          transition={{ duration:0.22 }}
                          style={{ padding:"12px 16px", borderRadius:10, background:"rgba(200,50,42,0.08)", border:"1px solid rgba(200,50,42,0.22)", display:"flex", gap:10, alignItems:"flex-start" }}>
                          <span style={{ fontSize:16, color:"#C8322A", flexShrink:0, marginTop:1 }}>⚠</span>
                          <span style={{ fontSize:16, color:"rgba(240,232,212,0.48)", lineHeight:1.55 }}>
                            <span style={{ color:"#C8322A", fontWeight:700 }}>Pairing Warning: </span>{intel.warning}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Master Notes */}
                  <div style={{ padding:"14px 0 0" }}>
                    <div style={{ fontSize:14, letterSpacing:"0.36em", color:GOLD, textTransform:"uppercase", fontWeight:800, marginBottom:12 }}>📝 Master Notes</div>
                    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                      <div style={{ flex:1, padding:"16px 20px", background:"rgba(212,175,55,0.05)", border:`1px solid ${GOLD}22`, borderLeft:`3px solid ${GOLD}66`, borderRadius:"0 10px 10px 0" }}>
                        <span style={{ fontSize:26, color:`${GOLD}55`, fontFamily:"Georgia,serif", lineHeight:1 }}>"</span>
                        <p style={{ fontSize:20, color:"rgba(240,232,212,0.68)", lineHeight:1.65, margin:"-10px 0 0", fontStyle:"italic" }}>{intel.masterNote}</p>
                      </div>
                      <div style={{ width:64, height:64, flexShrink:0, borderRadius:10, background:"radial-gradient(circle at 35% 30%, rgba(212,175,55,0.24), rgba(0,0,0,0.60))", border:"1px solid rgba(212,175,55,0.24)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>🚬</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ paddingTop:20 }}>
                    <GoldBtn onClick={() => go("quiz")} fullWidth>BEGIN BLIND IDENTIFICATION TEST →</GoldBtn>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          );
        })()}

        {/* ══════════════ QUIZ ══════════════ */}
        {step === "quiz" && (
          <Split key="quiz"
            leftFr="0.85fr" rightFr="1.15fr"
            left={
              <LeftPanel
                eyebrow="Step 1.6 · Blind Identification Test"
                headline={`Identify\nthe Leaf`}
                sub="Study what you've learned. No hints. Each wrong answer costs 2 pts from your session total."
              />
            }
            right={
              <RightPanel>
                {/* Progress */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Eyebrow style={{ margin: 0 }}>Question {qIdx + 1} of {QUIZ.length}</Eyebrow>
                  <span style={{ color: `${GOLD}80`, fontSize: 15, fontWeight: 800 }}>{Math.round((qIdx / QUIZ.length) * 100)}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 32 }}>
                  <motion.div animate={{ width: `${(qIdx / QUIZ.length) * 100}%` }} transition={{ duration: 0.4 }}
                    style={{ height: "100%", background: GOLD, borderRadius: 3, boxShadow: `0 0 12px ${GOLD}66` }} />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={qIdx}
                    initial={{ opacity: 0, x: 38 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ type: "spring", mass: 0.8, stiffness: 280, damping: 26 }}>
                    <h2 style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, color: "#F0E8D4",
                      margin: "0 0 28px", lineHeight: 1.35,
                    }}>{QUIZ[qIdx].q}</h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {QUIZ[qIdx].opts.map((opt, oi) => {
                        const done = answered.includes(qIdx);
                        const correct = oi === QUIZ[qIdx].correct;
                        return (
                          <motion.button key={oi} type="button"
                            onPointerDown={() => !done && answerQuiz(oi)}
                            whileTap={done ? {} : { scale: 0.985 }}
                            animate={
                              done && correct ? { background: "rgba(50,180,90,0.18)", borderColor: "#32B45A" } :
                              done && wrongFlash && !correct ? { background: "rgba(200,50,42,0.14)", borderColor: "#C8322A" } : {}
                            }
                            style={{
                              padding: "20px 24px",
                              background: "rgba(255,255,255,0.028)", backdropFilter: "blur(14px)",
                              border: "1px solid rgba(255,255,255,0.09)", borderRadius: 13,
                              color: "#F0E8D4", fontSize: 24, fontWeight: 500, textAlign: "left",
                              cursor: done ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
                              display: "flex", alignItems: "center", gap: 18,
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px rgba(0,0,0,0.30)",
                              transition: "background 0.22s, border-color 0.22s",
                            }}>
                            <span style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}33`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 900, color: GOLD, flexShrink: 0,
                            }}>{String.fromCharCode(65 + oi)}</span>
                            {opt}
                          </motion.button>
                        );
                      })}
                    </div>
                    <p style={{ color: "rgba(200,50,42,0.65)", fontSize: 20, margin: "18px 0 0", letterSpacing: "0.04em" }}>
                      Wrong answer = −{QUIZ[qIdx].pen} pts from your session total
                    </p>
                  </motion.div>
                </AnimatePresence>
              </RightPanel>
            }
          />
        )}

        {/* ══════════════ POS GATE ══════════════ */}
        {step === "posgate" && (
          <Split key="posgate"
            leftFr="1fr" rightFr="1fr"
            left={
              <LeftPanel
                eyebrow="Session 1 · Complete"
                headline={`Seeds\nPrimed`}
                sub={`Current session score: ${profile.points} pts. Your rank is live on the wall display.`}
              />
            }
            right={
              <RightPanel>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🌱</div>
                <Eyebrow>Session 1 Complete</Eyebrow>
                <SectionTitle>Enter Receipt Code</SectionTitle>
                <p style={{ color: "rgba(240,232,212,0.52)", fontSize: 24, lineHeight: 1.60, marginBottom: 28 }}>
                  Present your table receipt to your server. They will provide a 4–6 character code to unlock Session 2: the Terroir Matrix.
                </p>
                <GoldBtn onClick={() => setShowPOS(true)} fullWidth>ENTER RECEIPT CODE →</GoldBtn>
                <div style={{ marginTop: 28 }}>
                  <CheatCodeEngine />
                </div>
              </RightPanel>
            }
          />
        )}

      </AnimatePresence>
      {showPOS && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}

/* ── Tiny shared components ── */
function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.50em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}
function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: "clamp(32px, 3.8vw, 52px)", fontWeight: 300, color: "#F0E8D4",
      margin: "0 0 28px", letterSpacing: "0.04em", lineHeight: 1.05,
      textShadow: "0 0 40px rgba(212,175,55,0.08)",
      ...style,
    }}>
      {children}
    </h2>
  );
}
function GoldBtn({ children, disabled, onClick, fullWidth, style }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; fullWidth?: boolean; style?: React.CSSProperties;
}) {
  return (
    <motion.button type="button" onPointerDown={!disabled ? onClick : undefined} whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        width: fullWidth ? "100%" : undefined,
        padding: "24px 32px",
        background: disabled
          ? "rgba(255,255,255,0.055)"
          : `linear-gradient(135deg, ${GOLD} 0%, #BF9800 52%, #9A7A14 100%)`,
        border: disabled ? "1px solid rgba(255,255,255,0.09)" : "none",
        borderRadius: 14,
        color: disabled ? "rgba(255,255,255,0.24)" : "#060400",
        fontSize: 18, fontWeight: 900, letterSpacing: "0.26em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
        boxShadow: disabled ? "none" : `0 0 40px rgba(212,175,55,0.24), 0 8px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22)`,
        position: "relative", overflow: "hidden", transition: "all 0.22s",
        ...style,
      }}>
      {!disabled && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "14px 14px 0 0" }} />
      )}
      {children}
    </motion.button>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 14 }}>{children}</div>;
}
function BigInput({ ph, val, fn, type = "text", extra, maxLen }: {
  ph: string; val: string; fn: (v: string) => void; type?: string; extra?: React.CSSProperties; maxLen?: number;
}) {
  return (
    <input type={type} value={val} onChange={e => fn(e.target.value)} placeholder={ph} maxLength={maxLen}
      style={{
        flex: 1, padding: "22px 22px",
        background: "rgba(255,255,255,0.040)",
        border: "1.5px solid rgba(212,175,55,0.20)",
        borderRadius: 13, color: "#F0E8D4",
        fontSize: 24, fontWeight: 700, letterSpacing: "0.06em",
        fontFamily: "'Inter', sans-serif", outline: "none",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.04)",
        boxSizing: "border-box",
        ...extra,
      }} />
  );
}
