import { useState } from "react";
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
  const [firstName,  setFirstName] = useState(profile.firstName || "");
  const [lastName,   setLastName]  = useState(profile.lastName  || "");
  const [phone4,     setPhone4]    = useState(profile.phone4    || "");
  const [age,        setAge]       = useState(profile.age ? String(profile.age) : "");
  const [mentor,     setMentor]    = useState<string | null>(profile.mentor);
  const [seedId,     setSeedId]    = useState("criollo");
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

        {/* ══════════════ RULES ══════════════ */}
        {step === "rules" && (
          <Split key="rules"
            leftFr="0.75fr" rightFr="1.25fr"
            left={
              <LeftPanel
                eyebrow="Step 1.3 · The Golden Box"
                headline={`Rules\nof Play`}
                sub="Every action is scored. Learn the system before you build your blend."
              />
            }
            right={
              <RightPanel>
                <Eyebrow>Scoring Mechanics</Eyebrow>
                <SectionTitle style={{ marginBottom: 20 }}>The Golden Box</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                  {[
                    { icon: "✦", t: "Visual Accuracy & Synergy",      badge: "+10 XP", body: "Each correct architecture decision earns +10 XP.", gain: true },
                    { icon: "⚠", t: "Mentor Blind Quiz Failures",     badge: "−2 PTS", body: "Each wrong Seed Priming answer deducts 2 pts.",    gain: false },
                    { icon: "💨", t: "Volatile Blend · Draw Collapse", badge: "−5 PTS", body: "Excess Ligero collapses airflow — −5 PTS each.",    gain: false },
                    { icon: "🔁", t: "Table Orders · Cheat Codes",    badge: "2× 3× 5×", body: "Cigar+Drink (2×) · Double Pour (3×) · Grand Slam (5× — wipes all penalties).", gain: true },
                  ].map(r => (
                    <div key={r.t} style={{
                      display: "flex", gap: 18, alignItems: "flex-start",
                      background: r.gain ? "rgba(212,175,55,0.06)" : "rgba(200,50,42,0.06)",
                      border: `1px solid ${r.gain ? "rgba(212,175,55,0.28)" : "rgba(200,50,42,0.28)"}`,
                      borderRadius: 14, padding: "20px 22px",
                    }}>
                      <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1, marginTop: 4 }}>{r.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 24, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.2 }}>{r.t}</span>
                          <span style={{
                            background: r.gain ? "rgba(212,175,55,0.18)" : "rgba(200,50,42,0.18)",
                            border: `1px solid ${r.gain ? GOLD + "66" : "rgba(200,50,42,0.66)"}`,
                            borderRadius: 8, padding: "6px 14px", fontSize: 18, fontWeight: 900,
                            color: r.gain ? GOLD : "#C8322A", letterSpacing: "0.08em", flexShrink: 0,
                          }}>{r.badge}</span>
                        </div>
                        <p style={{ fontSize: 20, color: "rgba(240,232,212,0.55)", margin: 0, lineHeight: 1.55 }}>{r.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <GoldBtn onClick={() => go("leaderboard")}>ACCEPT & INITIALIZE →</GoldBtn>
              </RightPanel>
            }
          />
        )}

        {/* ══════════════ LEADERBOARD ══════════════ */}
        {step === "leaderboard" && (
          <Split key="leaderboard"
            leftFr="0.8fr" rightFr="1.2fr"
            left={
              <LeftPanel
                eyebrow="Step 1.2 · Live Competition"
                headline={`Tonight's\nRankings`}
                sub={`Welcome, ${firstName}. Your session is now tracked and visible on the wall display.`}
              />
            }
            right={
              <RightPanel>
                <Eyebrow>Live Table Standings</Eyebrow>
                <SectionTitle style={{ marginBottom: 18 }}>Current Leaderboard</SectionTitle>
                <div style={{
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,175,55,0.14)",
                  borderRadius: 14, padding: "20px", marginBottom: 24,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}>
                  <LeaderboardTicker />
                </div>
                <GoldBtn onClick={() => go("mentor")}>SELECT YOUR MENTOR →</GoldBtn>
              </RightPanel>
            }
          />
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
        {step === "seed_canvas" && (
          <motion.div key="seed_canvas" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Seed tab bar */}
            <div style={{
              flexShrink: 0, display: "flex", alignItems: "stretch",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(212,175,55,0.12)",
            }}>
              <div style={{ padding: "20px 40px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Eyebrow style={{ margin: "0 0 2px" }}>Step 1.5</Eyebrow>
                <SectionTitle style={{ margin: 0, fontSize: 22 }}>Leaf Recognition Matrix</SectionTitle>
              </div>
              {SEEDS.map(s => (
                <motion.button key={s.id} type="button" onPointerDown={() => setSeedId(s.id)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1, border: "none", borderRight: "1px solid rgba(255,255,255,0.05)",
                    background: seedId === s.id ? "rgba(212,175,55,0.10)" : "transparent",
                    cursor: "pointer", padding: "18px 28px",
                    borderBottom: seedId === s.id ? `3px solid ${GOLD}` : "3px solid transparent",
                    fontFamily: "'Inter', sans-serif", textAlign: "left",
                    transition: "all 0.22s",
                  }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: seedId === s.id ? GOLD : "rgba(240,232,212,0.55)", marginBottom: 4, transition: "color 0.22s" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(240,232,212,0.35)", letterSpacing: "0.10em" }}>{s.tagline}</div>
                </motion.button>
              ))}
            </div>

            {/* Main split */}
            <AnimatePresence mode="wait">
              <motion.div key={seedId}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ type: "spring", mass: 0.7, stiffness: 320, damping: 28 }}
                style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}
              >
                {/* LEFT — Real tobacco leaf photograph */}
                <div style={{ position: "relative", overflow: "hidden", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                  <img
                    src={IMG(SEED_PHOTOS[seedId] || "tobacco_criollo.png")}
                    alt={seed.name}
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "cover", objectPosition: "center",
                    }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Dark vignette overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(170deg, rgba(4,2,0,0.35) 0%, rgba(4,2,0,0.55) 100%)",
                  }} />
                  {/* Bottom fade for label */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
                    background: "linear-gradient(0deg, rgba(4,2,0,0.88) 0%, transparent 100%)",
                  }} />
                  {/* Amber top glow */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "40%",
                    background: `radial-gradient(ellipse at 40% 0%, ${seed.cs}30 0%, transparent 65%)`,
                    pointerEvents: "none",
                  }} />
                  {/* Specimen label bottom-left */}
                  <div style={{ position: "absolute", bottom: 28, left: 32, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 32, height: 1, background: `${GOLD}66` }} />
                      <span style={{ fontSize: 10, letterSpacing: "0.44em", color: `${GOLD}BB`, textTransform: "uppercase", fontWeight: 800, fontFamily: "'Inter',sans-serif" }}>
                        MACRO SPECIMEN
                      </span>
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 42, fontWeight: 300, color: "#F0E8D4", lineHeight: 1, textShadow: "0 2px 20px rgba(0,0,0,0.90)" }}>
                      {seed.name}
                    </div>
                    <div style={{ fontSize: 13, letterSpacing: "0.20em", color: "rgba(240,232,212,0.45)", fontFamily: "'Inter',sans-serif" }}>
                      {seed.origin}
                    </div>
                  </div>
                </div>

                {/* RIGHT — Telemetry */}
                <div style={{
                  background: "rgba(8,6,3,0.70)",
                  backdropFilter: "blur(24px)",
                  padding: "40px 44px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  overflowY: "auto",
                }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.44em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                      {seed.origin}
                    </div>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 44, fontWeight: 400, color: "#F0E8D4", margin: "0 0 14px", letterSpacing: "0.04em", lineHeight: 1.05 }}>
                      {seed.name}
                    </h2>
                    <p style={{ fontSize: 22, color: "rgba(240,232,212,0.55)", lineHeight: 1.65, margin: 0 }}>{seed.profile}</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontWeight: 800, marginBottom: 2 }}>
                      Profile Telemetry
                    </div>
                    {seed.specs.map(sp => (
                      <div key={sp.k}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,232,212,0.42)", fontWeight: 700 }}>{sp.k}</span>
                          <span style={{ fontSize: 24, fontWeight: 800, color: "#F0E8D4" }}>{sp.v}</span>
                        </div>
                        <div style={{ height: 9, background: "rgba(255,255,255,0.07)", borderRadius: 5, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.50)" }}>
                          <motion.div key={seedId + sp.k}
                            initial={{ width: 0 }} animate={{ width: `${sp.b}%` }}
                            transition={{ duration: 0.60, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})`, borderRadius: 5, boxShadow: `0 0 14px ${GOLD}66` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 14, padding: "22px 24px" }}>
                    <div style={{ fontSize: 12, letterSpacing: "0.32em", color: `${GOLD}90`, textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>
                      Vein Architecture
                    </div>
                    <p style={{ fontSize: 20, color: "rgba(240,232,212,0.65)", lineHeight: 1.62, margin: 0 }}>
                      {seed.veinDesc}
                    </p>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <GoldBtn onClick={() => go("quiz")} fullWidth>BEGIN BLIND IDENTIFICATION TEST →</GoldBtn>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

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
