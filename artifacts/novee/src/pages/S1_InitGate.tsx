import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { CigarHero } from "@/components/CigarHero";

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
  },
  {
    id: "nicaraguan", name: "The Nicaraguan Puro Boss", flag: "🇳🇮",
    country: "Nicaragua", valley: "Estelí",
    bio: "Commands volcanic mineral-rich soils for maximum Ligero density. Full-bodied, uncompromising palate intensity with volcanic earth notes.",
    tags: ["Volcanic Soil", "Heavy Ligero", "Full-Body"],
    hue: "#1A8C3A", soilTop: "#061006", soilBot: "#0C1C0A",
  },
  {
    id: "honduran", name: "The Traditionalist Wrapper", flag: "🇭🇳",
    country: "Honduras", valley: "Jamastran Valley",
    bio: "Flawless sun-grown wrapper selection with microscopic vein concealment and aerodynamic draw precision unmatched in the Americas.",
    tags: ["Wrapper Perfection", "Vein Concealment", "Draw Precision"],
    hue: "#2A7ABF", soilTop: "#060A12", soilBot: "#0C1020",
  },
];

/* ─── Seeds ─── */
const SEEDS = [
  {
    id: "criollo", name: "Criollo '98", origin: "Cuban-Seed · Dominican Republic",
    profile: "Traditional Cuban-seed genetics. Deep, earth-toned flavor transitions with heavy spice tracking. Medium-to-full body with secondary chocolate and cedar notes.",
    specs: [{ k: "Body", v: "Medium-Full", b: 70 }, { k: "Nicotine", v: "High", b: 78 }, { k: "Burn Rate", v: "Slow / Even", b: 38 }, { k: "Aroma", v: "Earth · Spice", b: 80 }],
    veinColor: "rgba(170,130,45,0.58)", veinW: 2.2, oilSheen: true,
    c1: "#213A10", c2: "#0E1E06", cs: "#3A5C18", tx: 0.62,
    tagline: "The classic. Heavy earth, deep spice.",
  },
  {
    id: "corojo", name: "Corojo", origin: "Vuelta Abajo, Cuba · Honduras",
    profile: "Oil-dense, highly robust. Intense peppery finishes with maximum natural oil saturation. The thick cuticle locks in volatile aromatic compounds through fermentation.",
    specs: [{ k: "Body", v: "Full", b: 95 }, { k: "Nicotine", v: "Very High", b: 94 }, { k: "Burn Rate", v: "Medium", b: 55 }, { k: "Aroma", v: "Pepper · Oak", b: 90 }],
    veinColor: "rgba(200,155,30,0.68)", veinW: 2.8, oilSheen: true,
    c1: "#162E08", c2: "#080E02", cs: "#2A4A10", tx: 0.73,
    tagline: "Maximum strength. Pepper dominance.",
  },
  {
    id: "connecticut", name: "Connecticut Shade", origin: "Connecticut River Valley, USA",
    profile: "Ultra-smooth delicate wrapper grown under cheesecloth shade canopies. Creamy tasting notes, mild body, near-invisible veins — the gold standard for aesthetic construction.",
    specs: [{ k: "Body", v: "Mild", b: 22 }, { k: "Nicotine", v: "Low-Medium", b: 28 }, { k: "Burn Rate", v: "Fast / Smooth", b: 78 }, { k: "Aroma", v: "Cream · Hay", b: 45 }],
    veinColor: "rgba(220,205,150,0.26)", veinW: 0.9, oilSheen: false,
    c1: "#4A6E28", c2: "#2E4A14", cs: "#7AAA44", tx: 0.48,
    tagline: "Invisible veins. Creamy, smooth.",
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
    <div style={{
      position:       "relative",
      display:        "flex",
      flexDirection:  "column",
      overflow:       "hidden",
      borderRight:    "1px solid rgba(212,175,55,0.18)",
    }}>
      {/* ── Deep obsidian base ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(165deg, #110C04 0%, #070502 55%, #0A0703 100%)",
      }} />

      {/* Brushed horizontal titanium grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.032,
        backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.7) 1px, transparent 2px, transparent 12px)",
      }} />

      {/* Gold top-rim */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accent}EE 0%, ${accent}66 70%, transparent 100%)`,
        boxShadow: `0 0 28px 4px ${accent}30`,
        zIndex: 5,
      }} />

      {/* ── CIGAR HERO — upper 58% ── */}
      <div style={{
        position: "relative",
        flex: "0 0 58%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "28px 32px 12px",
      }}>
        {/* Ember ambient light behind cigar — glows from the right */}
        <div style={{
          position: "absolute",
          top: "30%", right: "-5%",
          width: "55%", height: "55%",
          background: "radial-gradient(ellipse at 70% 50%, rgba(255,100,20,0.22) 0%, rgba(255,60,0,0.08) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Cool ambient counter-light from left */}
        <div style={{
          position: "absolute",
          top: "20%", left: "-5%",
          width: "40%", height: "60%",
          background: "radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Surface reflection stripe */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "25%",
          background: "linear-gradient(0deg, rgba(212,175,55,0.06) 0%, transparent 100%)",
          pointerEvents: "none",
        }} />
        <CigarHero wrapperTone="criollo" />
      </div>

      {/* ── Text block — lower 42% ── */}
      <div style={{
        position: "relative",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 52px 52px",
        zIndex: 2,
      }}>
        {/* Vignette above text */}
        <div style={{
          position: "absolute", top: "-60px", left: 0, right: 0, height: 80,
          background: "linear-gradient(180deg, transparent, rgba(8,5,2,0.70))",
          pointerEvents: "none",
        }} />

        <div style={{
          fontSize: 10, letterSpacing: "0.56em", textTransform: "uppercase",
          fontWeight: 800, color: `${accent}70`, marginBottom: 16,
          fontFamily: "'Inter', sans-serif",
        }}>
          {eyebrow}
        </div>
        <h1 style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(44px, 5vw, 76px)",
          fontWeight:    300,
          color:         "#F0E8D4",
          margin:        "0 0 18px",
          letterSpacing: "0.04em",
          lineHeight:    1.02,
          textShadow:    `0 0 60px ${accent}20, 0 2px 30px rgba(0,0,0,0.90)`,
        }}>
          {headline}
        </h1>
        {sub && (
          <p style={{ fontSize: 17, color: "rgba(240,232,212,0.42)", lineHeight: 1.62, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            {sub}
          </p>
        )}
        <div style={{ marginTop: 22, width: 72, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, boxShadow: `0 0 10px ${accent}55` }} />
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
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: "✦", t: "Visual Accuracy & Synergy",    badge: "+10 XP", body: "Each correct architecture decision earns +10 XP.", gain: true },
                    { icon: "⚠", t: "Mentor Blind Quiz Failures",   badge: "−2 PTS", body: "Each wrong Seed Priming answer deducts 2 pts.",    gain: false },
                    { icon: "💨", t: "Volatile Blend · Draw Collapse", badge: "−5 PTS", body: "Excess Ligero collapses airflow — −5 PTS each.",  gain: false },
                    { icon: "🔁", t: "Table Orders · Cheat Codes",  badge: "2× 3× 5×", body: "Cigar+Drink (2×) · Double Pour (3×) · Grand Slam (5× + wipes penalties).", gain: true },
                  ].map(r => (
                    <div key={r.t} style={{
                      display: "flex", gap: 14, alignItems: "flex-start",
                      background: r.gain ? "rgba(212,175,55,0.05)" : "rgba(200,50,42,0.05)",
                      border: `1px solid ${r.gain ? "rgba(212,175,55,0.22)" : "rgba(200,50,42,0.22)"}`,
                      borderRadius: 14, padding: "16px 18px",
                    }}>
                      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{r.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#F0E8D4" }}>{r.t}</span>
                          <span style={{
                            background: r.gain ? "rgba(212,175,55,0.16)" : "rgba(200,50,42,0.16)",
                            border: `1px solid ${r.gain ? GOLD + "55" : "rgba(200,50,42,0.55)"}`,
                            borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 900,
                            color: r.gain ? GOLD : "#C8322A", letterSpacing: "0.08em", flexShrink: 0,
                          }}>{r.badge}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(240,232,212,0.46)", margin: 0, lineHeight: 1.55 }}>{r.body}</p>
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
                    {/* Terrain full-bleed top */}
                    <div style={{
                      flex:       "0 0 55%",
                      background: `
                        radial-gradient(ellipse 80% 70% at 40% 55%, ${m.hue}28 0%, transparent 65%),
                        linear-gradient(175deg, ${m.soilTop} 0%, ${m.soilBot} 100%)
                      `,
                      display:    "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position:   "relative",
                      overflow:   "hidden",
                    }}>
                      {/* Active gold overlay */}
                      {active && (
                        <div style={{ position: "absolute", inset: 0, background: `rgba(212,175,55,0.06)`, transition: "opacity 0.28s" }} />
                      )}
                      {/* Active top rim */}
                      {active && (
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GOLD}44, ${GOLD}, ${GOLD}44)`, boxShadow: `0 0 18px ${GOLD}88` }} />
                      )}
                      {/* Mineral grid */}
                      <div style={{
                        position: "absolute", inset: 0, opacity: active ? 0.14 : 0.07,
                        backgroundImage: `radial-gradient(${m.hue} 1px, transparent 1px)`,
                        backgroundSize: "14px 14px",
                        transition: "opacity 0.28s",
                      }} />
                      {/* Flag circle */}
                      <div style={{
                        width:         130,
                        height:        130,
                        borderRadius:  "50%",
                        background:    `radial-gradient(circle at 32% 28%, ${m.hue}32, rgba(6,6,10,0.96))`,
                        border:        `3px solid ${active ? GOLD : m.hue + "50"}`,
                        boxShadow:     active
                          ? `0 0 48px ${GOLD}55, 0 0 90px ${GOLD}22, inset 0 0 28px rgba(0,0,0,0.75)`
                          : `0 0 22px ${m.hue}22, inset 0 0 28px rgba(0,0,0,0.75)`,
                        display:       "flex",
                        alignItems:    "center",
                        justifyContent:"center",
                        fontSize:      62,
                        zIndex:        2,
                        position:      "relative",
                        transition:    "all 0.28s",
                      }}>
                        {m.flag}
                      </div>
                    </div>

                    {/* Info panel */}
                    <div style={{
                      flex: 1,
                      padding: "22px 24px 24px",
                      background: active
                        ? "rgba(212,175,55,0.06)"
                        : "rgba(8,6,3,0.70)",
                      backdropFilter: "blur(14px)",
                      borderTop: `1px solid ${active ? GOLD + "33" : "rgba(255,255,255,0.06)"}`,
                      transition: "all 0.28s",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: active ? GOLD : "#F0E8D4", marginBottom: 4, transition: "color 0.28s", letterSpacing: "0.01em" }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: `${m.hue}CC`, fontWeight: 700, marginBottom: 14 }}>
                        {m.country} · {m.valley}
                      </div>
                      <p style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", lineHeight: 1.60, margin: "0 0 16px" }}>
                        {m.bio}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {m.tags.map(t => (
                          <span key={t} style={{
                            background: active ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.09)"}`,
                            borderRadius: 6, padding: "5px 11px",
                            fontSize: 10, fontWeight: 700, color: active ? GOLD : "rgba(240,232,212,0.36)",
                            letterSpacing: "0.14em", textTransform: "uppercase", transition: "all 0.28s",
                          }}>{t}</span>
                        ))}
                      </div>
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
                    background: seedId === s.id ? "rgba(212,175,55,0.09)" : "transparent",
                    cursor: "pointer", padding: "18px 28px",
                    borderBottom: seedId === s.id ? `3px solid ${GOLD}` : "3px solid transparent",
                    fontFamily: "'Inter', sans-serif", textAlign: "left",
                    transition: "all 0.22s",
                  }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: seedId === s.id ? GOLD : "rgba(240,232,212,0.50)", marginBottom: 3, transition: "color 0.22s" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(240,232,212,0.28)", letterSpacing: "0.12em" }}>{s.tagline}</div>
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
                {/* LEFT — Full-bleed photorealistic leaf render */}
                <div style={{
                  position:   "relative",
                  background: `
                    radial-gradient(ellipse 68% 58% at 38% 35%, ${seed.cs}48 0%, transparent 52%),
                    radial-gradient(ellipse 48% 40% at 68% 75%, ${seed.c1}36 0%, transparent 48%),
                    linear-gradient(168deg, ${seed.c1}F0 0%, ${seed.c2}FF 55%, #020602 100%)
                  `,
                  display:    "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow:   "hidden",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {/* SVG grain */}
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, pointerEvents: "none" }}>
                    <filter id="grain3">
                      <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
                      <feColorMatrix type="saturate" values="0" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#grain3)" />
                  </svg>

                  {/* Light shafts */}
                  {[{ l: "28%", r: "14deg", op: 0.10, w: 3 }, { l: "46%", r: "7deg", op: 0.06, w: 1.5 }].map((ls, i) => (
                    <div key={i} style={{
                      position: "absolute", top: "-8%", left: ls.l,
                      width: ls.w, height: "72%",
                      background: "linear-gradient(180deg, rgba(255,255,200,1) 0%, transparent 100%)",
                      transform: `rotate(${ls.r})`,
                      opacity: ls.op, pointerEvents: "none",
                    }} />
                  ))}

                  <LeafSVG s={seed} scale={1.5} />

                  {/* Specimen label */}
                  <div style={{
                    position: "absolute", bottom: 20, left: 24,
                    display: "flex", gap: 16, alignItems: "center",
                  }}>
                    <div style={{ width: 28, height: 1, background: `${GOLD}44` }} />
                    <span style={{ fontSize: 9, letterSpacing: "0.42em", color: "rgba(255,255,255,0.26)", textTransform: "uppercase", fontWeight: 700 }}>
                      MACRO RENDER · {seed.name.toUpperCase()}
                    </span>
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
                    <p style={{ fontSize: 16, color: "rgba(240,232,212,0.50)", lineHeight: 1.68, margin: 0 }}>{seed.profile}</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.38em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", fontWeight: 700, marginBottom: 2 }}>
                      Profile Telemetry
                    </div>
                    {seed.specs.map(sp => (
                      <div key={sp.k}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(240,232,212,0.32)", fontWeight: 700 }}>{sp.k}</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#F0E8D4" }}>{sp.v}</span>
                        </div>
                        <div style={{ height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 4, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.45)" }}>
                          <motion.div key={seedId + sp.k}
                            initial={{ width: 0 }} animate={{ width: `${sp.b}%` }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}77, ${GOLD})`, borderRadius: 4, boxShadow: `0 0 12px ${GOLD}55` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.16)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.30em", color: `${GOLD}70`, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                      Vein Architecture
                    </div>
                    <p style={{ fontSize: 14, color: "rgba(240,232,212,0.52)", lineHeight: 1.60, margin: 0 }}>
                      {seedId === "connecticut"
                        ? "Near-invisible tertiary vein network. Microscopic cross-fibers sealed under the cuticle — standard for premium wrapper aesthetics."
                        : seedId === "corojo"
                        ? "Dense primary vein with aggressive secondary branching. Maximum oil-channel surface area for aromatic concentration and intensity."
                        : "Balanced vein system with moderate secondary density. Classic Cuban-seed architecture for reliable, consistent draw."}
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
                              color: "#F0E8D4", fontSize: 19, fontWeight: 500, textAlign: "left",
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
                    <p style={{ color: "rgba(200,50,42,0.58)", fontSize: 13, margin: "14px 0 0", letterSpacing: "0.06em" }}>
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
                <div style={{ fontSize: 60, marginBottom: 24 }}>🌱</div>
                <Eyebrow>Next Step</Eyebrow>
                <SectionTitle>Enter Receipt Code</SectionTitle>
                <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 17, lineHeight: 1.65, marginBottom: 32 }}>
                  Present your table receipt to your server. They will provide a 4–6 character code that unlocks Session 2: the Terroir Matrix.
                </p>
                <GoldBtn onClick={() => setShowPOS(true)} fullWidth>ENTER RECEIPT CODE →</GoldBtn>
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
