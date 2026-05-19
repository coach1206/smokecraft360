import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

/* ── Weighted-spring page transition ── */
const PV = {
  enter:  { opacity: 0, x: 60,  scale: 0.95 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -50, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 260, damping: 28 };

/* ── Mentors ── */
const MENTORS = [
  {
    id:       "dominican_maestro",
    name:     "The Dominican Maestro",
    flag:     "🇩🇴",
    country:  "Dominican Republic",
    valley:   "Cibao Valley",
    bio:      "Old-world master of aged Olor Dominicano and Piloto Cubano blending. Delivers smooth, multi-leaf complexity with deep earth-tone transitions and slow fermentation curves that produce some of the world's most refined cigars.",
    tags:     ["Aged Profiles", "Multi-Leaf Complexity", "Earth Transitions"],
    soilGrad: ["#1A0D04", "#2E1808", "#4A2C10"],
    rimColor: "#1B4BD4",
  },
  {
    id:       "nicaraguan_boss",
    name:     "The Nicaraguan Puro Boss",
    flag:     "🇳🇮",
    country:  "Nicaragua",
    valley:   "Estelí",
    bio:      "Commands volcanic mineral-rich soils of Jalapa and Estelí for maximum Ligero density. Full-bodied, uncompromising palate intensity with volcanic earth notes and a combustion profile that dominates the room.",
    tags:     ["Volcanic Soil", "Heavy Ligero", "Full-Body Mastery"],
    soilGrad: ["#080F06", "#101808", "#1C2E0E"],
    rimColor: "#1A8C3A",
  },
  {
    id:       "honduran_wrapper",
    name:     "The Traditionalist Wrapper",
    flag:     "🇭🇳",
    country:  "Honduras",
    valley:   "Jamastran Valley",
    bio:      "Flawless sun-grown wrapper selection with microscopic vein concealment and aerodynamic draw precision. The Jamastran Valley produces near-invisible vein structure and silky combustion unmatched in the Americas.",
    tags:     ["Wrapper Perfection", "Vein Concealment", "Draw Precision"],
    soilGrad: ["#0A0F14", "#101820", "#1A2830"],
    rimColor: "#2A7ABF",
  },
];

/* ── Seed data ── */
const SEEDS = [
  {
    id:      "criollo",
    name:    "Criollo '98",
    origin:  "Cuban-Seed Lineage · Dominican Republic",
    profile: "Traditional Cuban-seed genetics. Delivers deep, earth-toned flavor transitions with heavy spice tracking across the full smoke length. Medium-to-full body with secondary chocolate and cedar notes.",
    specs:   [
      { k: "Body",      v: "Medium-Full",  bar: 70 },
      { k: "Nicotine",  v: "High",         bar: 78 },
      { k: "Burn Rate", v: "Slow / Even",  bar: 38 },
      { k: "Aroma",     v: "Earth · Spice",bar: 80 },
    ],
    veinColor:  "rgba(170,130,45,0.55)",
    veinWidth:  2.0,
    oilSheen:   true,
    dark:       true,
    textureSeed: 0.62,
    leafH1:     "#213A10",
    leafH2:     "#0E1E06",
    leafS:      "#3A5C18",
  },
  {
    id:      "corojo",
    name:    "Corojo",
    origin:  "Vuelta Abajo, Cuba · Honduras",
    profile: "Highly robust, oil-dense leaf. Produces intense peppery finishes with maximum natural oil saturation. The thick cuticle locks in volatile aromatic compounds through fermentation — the most aggressive palate profile available.",
    specs:   [
      { k: "Body",      v: "Full",          bar: 95 },
      { k: "Nicotine",  v: "Very High",     bar: 94 },
      { k: "Burn Rate", v: "Medium",        bar: 55 },
      { k: "Aroma",     v: "Pepper · Oak",  bar: 90 },
    ],
    veinColor:  "rgba(200,155,30,0.65)",
    veinWidth:  2.6,
    oilSheen:   true,
    dark:       true,
    textureSeed: 0.72,
    leafH1:     "#162E08",
    leafH2:     "#080E02",
    leafS:      "#2A4A10",
  },
  {
    id:      "connecticut",
    name:    "Connecticut Shade",
    origin:  "Connecticut River Valley, USA",
    profile: "Ultra-smooth, delicate wrapper leaf grown under cheesecloth shade canopies. Delivers creamy tasting notes with mild body and near-invisible veins. The gold standard for mild-bodied, aesthetically flawless construction.",
    specs:   [
      { k: "Body",      v: "Mild",           bar: 22 },
      { k: "Nicotine",  v: "Low-Medium",     bar: 28 },
      { k: "Burn Rate", v: "Fast / Smooth",  bar: 78 },
      { k: "Aroma",     v: "Cream · Hay",    bar: 45 },
    ],
    veinColor:  "rgba(220,205,150,0.25)",
    veinWidth:  0.9,
    oilSheen:   false,
    dark:       false,
    textureSeed: 0.48,
    leafH1:     "#4A6E28",
    leafH2:     "#2E4A14",
    leafS:      "#7AAA44",
  },
];

/* ── Quiz ── */
const QUIZ = [
  {
    q:       "Which leaf is prized for near-invisible veins, creamy notes, and a mild, smooth body?",
    opts:    ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"],
    correct: 2,
    penalty: 2,
  },
  {
    q:       "Corojo leaf produces which dominant palate characteristic?",
    opts:    ["Creamy sweetness", "Intense peppery strength", "Light cedar notes", "Mild earth tones"],
    correct: 1,
    penalty: 2,
  },
  {
    q:       "Criollo '98 is distinguished by its balance of which two qualities?",
    opts:    ["Light color & low nicotine", "Strength & aromatic complexity", "Cedar & mild pepper", "Sweetness & burn rate"],
    correct: 1,
    penalty: 2,
  },
];

/* ── Photorealistic leaf SVG ── */
function LeafSVG({ seed }: { seed: typeof SEEDS[0] }) {
  const filterId   = `lt_${seed.id}`;
  const gradId     = `lg_${seed.id}`;
  const shineId    = `ls_${seed.id}`;

  return (
    <svg width="200" height="290" viewBox="0 0 200 290" fill="none" style={{ filter: `drop-shadow(0 8px 28px rgba(0,0,0,0.70))` }}>
      <defs>
        {/* Leaf surface noise texture */}
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={seed.textureSeed} numOctaves="5" seed="8" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix"
            values={seed.dark
              ? "0 0 0 0 0.04  0 0 0 0 0.08  0 0 0 0 0.01  0 0 0 0.45 0"
              : "0 0 0 0 0.06  0 0 0 0 0.10  0 0 0 0 0.02  0 0 0 0.28 0"
            }
            in="noise" result="colorNoise" />
          <feComposite in="SourceGraphic" in2="colorNoise" operator="multiply" result="textured" />
          <feGaussianBlur in="textured" stdDeviation="0.3" result="smoothed" />
          <feComposite in="SourceGraphic" in2="smoothed" operator="arithmetic" k1="0" k2="0.85" k3="0.15" k4="0" />
        </filter>

        {/* Main leaf gradient */}
        <radialGradient id={gradId} cx="38%" cy="25%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={seed.leafS}  stopOpacity="1" />
          <stop offset="40%"  stopColor={seed.leafH1}  stopOpacity="1" />
          <stop offset="80%"  stopColor={seed.leafH2}  stopOpacity="1" />
          <stop offset="100%" stopColor="#040902"       stopOpacity="1" />
        </radialGradient>

        {/* Oil sheen gradient */}
        <linearGradient id={shineId} x1="30%" y1="5%" x2="55%" y2="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" stopOpacity="1" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Leaf shape — natural irregular bezier outline */}
      <path
        d="M100 6
           C122 14, 148 30, 158 60
           C168 88, 164 118, 158 148
           C152 178, 140 210, 126 238
           C116 258, 108 274, 100 284
           C92 274, 84 258, 74 238
           C60 210, 48 178, 42 148
           C36 118, 32 88, 42 60
           C52 30, 78 14, 100 6Z"
        fill={`url(#${gradId})`}
        filter={`url(#${filterId})`}
      />

      {/* Primary vein */}
      <path
        d="M100 12 C100 80, 100 180, 100 278"
        stroke={seed.veinColor}
        strokeWidth={seed.veinWidth * 1.4}
        fill="none"
        strokeLinecap="round"
      />

      {/* Secondary veins — left */}
      {[38, 60, 84, 108, 132, 158, 180, 204].map((y, i) => {
        const offset = 28 - i * 2.2;
        const sw     = seed.veinWidth * (0.7 - i * 0.05);
        return (
          <path key={`vL${i}`}
            d={`M100 ${y} C${100 - offset * 0.5} ${y + 10}, ${100 - offset * 0.85} ${y + 18}, ${100 - offset} ${y + 24}`}
            stroke={seed.veinColor} strokeWidth={Math.max(sw, 0.4)} fill="none" strokeLinecap="round" />
        );
      })}

      {/* Secondary veins — right */}
      {[38, 60, 84, 108, 132, 158, 180, 204].map((y, i) => {
        const offset = 28 - i * 2.2;
        const sw     = seed.veinWidth * (0.7 - i * 0.05);
        return (
          <path key={`vR${i}`}
            d={`M100 ${y} C${100 + offset * 0.5} ${y + 10}, ${100 + offset * 0.85} ${y + 18}, ${100 + offset} ${y + 24}`}
            stroke={seed.veinColor} strokeWidth={Math.max(sw, 0.4)} fill="none" strokeLinecap="round" />
        );
      })}

      {/* Tertiary veins — left */}
      {[48, 96, 144, 192].map((y, i) => {
        const base = 22 - i * 2;
        const tw   = seed.veinWidth * 0.30;
        return (
          <path key={`tvL${i}`}
            d={`M${100 - base * 0.45} ${y} L${100 - base - 4} ${y + 14}`}
            stroke={seed.veinColor} strokeWidth={Math.max(tw, 0.25)} fill="none" strokeLinecap="round" />
        );
      })}

      {/* Tertiary veins — right */}
      {[48, 96, 144, 192].map((y, i) => {
        const base = 22 - i * 2;
        const tw   = seed.veinWidth * 0.30;
        return (
          <path key={`tvR${i}`}
            d={`M${100 + base * 0.45} ${y} L${100 + base + 4} ${y + 14}`}
            stroke={seed.veinColor} strokeWidth={Math.max(tw, 0.25)} fill="none" strokeLinecap="round" />
        );
      })}

      {/* Oil sheen overlay */}
      {seed.oilSheen && (
        <path
          d="M100 6 C122 14, 148 30, 158 60 C155 45, 138 28, 100 14 C62 28, 45 45, 42 60 C52 30, 78 14, 100 6Z"
          fill={`url(#${shineId})`}
        />
      )}

      {/* Tip highlight */}
      <ellipse cx="100" cy="14" rx="6" ry="4" fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

type Step = "demo" | "rules" | "leaderboard" | "mentor" | "seed_canvas" | "quiz" | "posgate";

export function S1_InitGate() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();

  const [step,      setStep]      = useState<Step>("demo");
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName,  setLastName]  = useState(profile.lastName  || "");
  const [phone4,    setPhone4]    = useState(profile.phone4    || "");
  const [age,       setAge]       = useState(profile.age ? String(profile.age) : "");
  const [mentor,    setMentor]    = useState<string | null>(profile.mentor);
  const [seedId,    setSeedId]    = useState("criollo");
  const [qIdx,      setQIdx]      = useState(0);
  const [answered,  setAnswered]  = useState<number[]>([]);
  const [wrongFlash,setWrongFlash]= useState(false);
  const [showPOS,   setShowPOS]   = useState(false);
  const [quizPts,   setQuizPts]   = useState(0);

  function go(s: Step) { setStep(s); }

  function submitDemo() {
    if (!firstName.trim() || !lastName.trim() || phone4.trim().length < 4 || !age) return;
    updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone4: phone4.trim().slice(-4), age: parseInt(age) });
    addPoints(10);
    go("rules");
  }

  function answerQuiz(oi: number) {
    if (answered.includes(qIdx)) return;
    const q = QUIZ[qIdx];
    const good = oi === q.correct;
    setAnswered(prev => [...prev, qIdx]);
    if (good) { hapticMilestone(); setQuizPts(p => p + 20); addPoints(20); }
    else { hapticError(); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 700); applyPenalty(q.penalty); }
    setTimeout(() => {
      if (qIdx < QUIZ.length - 1) setQIdx(i => i + 1);
      else { updateProfile({ quizScore: quizPts + (good ? 20 : 0) }); go("posgate"); }
    }, 880);
  }

  function handlePOSUnlock(code: string) {
    updateProfile({ receiptCode: code });
    hapticMilestone();
    setShowPOS(false);
    setPhase("s2_terroir");
  }

  const canSubmit   = firstName.trim() && lastName.trim() && phone4.trim().length === 4 && age;
  const activeSeed  = SEEDS.find(s => s.id === seedId)!;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <BackButton />

      {/* Top chrome bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}66 30%, ${GOLD}AA 50%, ${GOLD}66 70%, transparent)`,
        boxShadow: `0 0 30px 2px rgba(212,175,55,0.22)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "100px 48px 60px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── Demo ── */}
          {step === "demo" && (
            <motion.div key="demo" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 700 }}>
              <Eyebrow>Session 1 · Guest Registration</Eyebrow>
              <Heading>Your Profile</Heading>

              <GlassCard style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { ph: "FIRST NAME", val: firstName, fn: setFirstName },
                    { ph: "LAST NAME",  val: lastName,  fn: setLastName  },
                  ].map(f => (
                    <input key={f.ph} type="text" value={f.val} onChange={e => f.fn(e.target.value)}
                      placeholder={f.ph} style={inp} />
                  ))}
                  <div style={{ display: "flex", gap: 14 }}>
                    <input type="text" value={phone4}
                      onChange={e => setPhone4(e.target.value.replace(/\D/g,"").slice(0,4))}
                      placeholder="LAST 4 OF PHONE" maxLength={4}
                      style={{ ...inp, flex: 1, letterSpacing: "0.26em" }} />
                    <input type="number" value={age} min={21} max={99}
                      onChange={e => setAge(e.target.value)} placeholder="AGE"
                      style={{ ...inp, width: 140 }} />
                  </div>
                </div>
              </GlassCard>

              <PrimaryBtn disabled={!canSubmit} onClick={submitDemo}>CONTINUE →</PrimaryBtn>
            </motion.div>
          )}

          {/* ── Golden Box Rules ── */}
          {step === "rules" && (
            <motion.div key="rules" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 820 }}>
              <Eyebrow>Session 1 · Step 1.3 · The Golden Box</Eyebrow>
              <Heading style={{ marginBottom: 10 }}>Rules of the Golden Box</Heading>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 19, margin: "0 0 32px", lineHeight: 1.55 }}>
                Every decision is measured. Understand the scoring mechanics before you play.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {[
                  { icon: "✦", title: "Visual Accuracy & Structural Synergy",     badge: "+10 XP", detail: "Each architecturally correct blend decision and visually coherent design choice earns +10 XP.", gain: true },
                  { icon: "⚠", title: "Mentor Blind Quiz Failures",               badge: "−2 PTS", detail: "Incorrect answers during the Seed Priming blind test deduct 2 pts from your running total.", gain: false },
                  { icon: "💨", title: "Volatile Blend — Airflow Collapse",        badge: "−5 PTS", detail: "Excess Ligero beyond structural tolerance collapses the draw — each violation costs −5 PTS.", gain: false },
                  { icon: "🔁", title: "Spend-Based Recovery · Cheat Codes",      badge: "2×  3×  5×", detail: "Table orders recover ALL lost points and multiply your score: Cigar+Drink (2×), Double Pour (3×), Grand Slam Trifecta — Cigar+Drink+Food (5× + wipes penalties).", gain: true },
                ].map(r => (
                  <div key={r.title} style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    background: r.gain ? "rgba(212,175,55,0.05)" : "rgba(200,50,42,0.05)",
                    border:     `1px solid ${r.gain ? "rgba(212,175,55,0.22)" : "rgba(200,50,42,0.22)"}`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    backdropFilter: "blur(12px)",
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0, marginTop: 1, lineHeight: 1 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#F0E8D4", letterSpacing: "0.02em" }}>{r.title}</span>
                        <span style={{
                          background: r.gain ? "rgba(212,175,55,0.18)" : "rgba(200,50,42,0.18)",
                          border: `1px solid ${r.gain ? GOLD + "55" : "rgba(200,50,42,0.55)"}`,
                          borderRadius: 8, padding: "4px 12px",
                          fontSize: 13, fontWeight: 900,
                          color: r.gain ? GOLD : "#C8322A",
                          letterSpacing: "0.12em", flexShrink: 0, marginLeft: 12,
                        }}>{r.badge}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "rgba(240,232,212,0.48)", margin: 0, lineHeight: 1.55 }}>{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <PrimaryBtn onClick={() => go("leaderboard")}>ACCEPT & INITIALIZE →</PrimaryBtn>
            </motion.div>
          )}

          {/* ── Leaderboard ── */}
          {step === "leaderboard" && (
            <motion.div key="leaderboard" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 780 }}>
              <Eyebrow>Session 1 · Live Competition</Eyebrow>
              <Heading>Tonight's Rankings</Heading>
              <GlassCard><LeaderboardTicker /></GlassCard>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 19, margin: "24px 0 32px", lineHeight: 1.6 }}>
                Welcome, <strong style={{ color: "#F0E8D4" }}>{firstName}</strong>. Outperform the tables and push to the top of tonight's wall display.
              </p>
              <PrimaryBtn onClick={() => go("mentor")}>SELECT YOUR MENTOR →</PrimaryBtn>
            </motion.div>
          )}

          {/* ── Mentor Portfolio ── */}
          {step === "mentor" && (
            <motion.div key="mentor" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 1020 }}>
              <Eyebrow>Session 1 · Step 1.4 · Master Blender Selection</Eyebrow>
              <Heading style={{ marginBottom: 8 }}>Choose Your Guide</Heading>
              <p style={{ color: "rgba(240,232,212,0.38)", fontSize: 18, margin: "0 0 28px" }}>
                Your mentor defines your expertise path, scoring bonuses, and blend philosophy.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28 }}>
                {MENTORS.map(m => {
                  const active = mentor === m.id;
                  return (
                    <motion.button key={m.id} type="button"
                      onPointerDown={() => { setMentor(m.id); updateProfile({ mentor: m.id }); }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background:     active
                          ? `linear-gradient(155deg, ${m.rimColor}18, rgba(0,0,0,0.70))`
                          : "rgba(255,255,255,0.022)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        border:         active ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.09)",
                        borderRadius:   18,
                        padding:        0,
                        cursor:         "pointer",
                        textAlign:      "left",
                        fontFamily:     "'Inter', sans-serif",
                        overflow:       "hidden",
                        boxShadow:      active
                          ? `0 0 50px rgba(212,175,55,0.22), 0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)`
                          : "0 4px 24px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)",
                        transition:     "all 0.28s",
                      }}
                    >
                      {/* Soil-terrain header */}
                      <div style={{
                        background: `
                          radial-gradient(ellipse 80% 70% at 40% 50%, ${m.rimColor}22 0%, transparent 65%),
                          linear-gradient(180deg, ${m.soilGrad[0]} 0%, ${m.soilGrad[1]} 50%, ${m.soilGrad[2]} 100%)
                        `,
                        height:         148,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        flexDirection:  "column",
                        gap:            12,
                        position:       "relative",
                        overflow:       "hidden",
                        borderBottom:   `1px solid rgba(255,255,255,0.06)`,
                      }}>
                        {/* Soil grain texture */}
                        <div style={{
                          position: "absolute", inset: 0, opacity: 0.07,
                          backgroundImage: `radial-gradient(rgba(255,220,120,0.8) 1px, transparent 1px)`,
                          backgroundSize: "10px 10px",
                        }} />

                        {/* Obsidian glass flag frame */}
                        <div style={{
                          width:          100,
                          height:         100,
                          borderRadius:   "50%",
                          background:     `radial-gradient(circle at 30% 25%, ${m.rimColor}28, rgba(8,8,12,0.92))`,
                          border:         `2.5px solid ${active ? GOLD : m.rimColor + "60"}`,
                          boxShadow:      active
                            ? `0 0 30px ${GOLD}55, 0 0 60px ${GOLD}22, inset 0 0 20px rgba(0,0,0,0.70)`
                            : `0 0 20px ${m.rimColor}22, inset 0 0 20px rgba(0,0,0,0.70)`,
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          fontSize:       48,
                          backdropFilter: "blur(6px)",
                          transition:     "border-color 0.28s, box-shadow 0.28s",
                          position:       "relative",
                          zIndex:         2,
                        }}>
                          {m.flag}
                        </div>

                        {/* Active gold rim top-line */}
                        {active && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 2,
                            background: `linear-gradient(90deg, transparent, ${GOLD}BB, transparent)`,
                          }} />
                        )}
                      </div>

                      {/* Card body */}
                      <div style={{ padding: "20px 20px 22px" }}>
                        <div style={{
                          fontSize:      18,
                          fontWeight:    800,
                          color:         active ? GOLD : "#F0E8D4",
                          letterSpacing: "0.02em",
                          marginBottom:  3,
                          transition:    "color 0.28s",
                        }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 11, letterSpacing: "0.20em", textTransform: "uppercase", color: `${m.rimColor}CC`, fontWeight: 700, marginBottom: 12 }}>
                          {m.country} · {m.valley}
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(240,232,212,0.45)", lineHeight: 1.60, margin: "0 0 14px" }}>
                          {m.bio}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {m.tags.map(t => (
                            <span key={t} style={{
                              background:    active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.05)",
                              border:        `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.10)"}`,
                              borderRadius:  6,
                              padding:       "4px 10px",
                              fontSize:      10,
                              fontWeight:    700,
                              color:         active ? GOLD : "rgba(240,232,212,0.38)",
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              transition:    "all 0.28s",
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <PrimaryBtn disabled={!mentor} onClick={() => mentor && go("seed_canvas")}>
                PROCEED TO SEED TEXTURE ANALYSIS →
              </PrimaryBtn>
            </motion.div>
          )}

          {/* ── Seed Quality Texture Canvas ── */}
          {step === "seed_canvas" && (
            <motion.div key="seed_canvas" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 1100 }}>
              <Eyebrow>Session 1 · Step 1.5 · Seed Quality Intelligence</Eyebrow>
              <Heading style={{ marginBottom: 8 }}>Leaf Recognition Matrix</Heading>
              <p style={{ color: "rgba(240,232,212,0.38)", fontSize: 18, margin: "0 0 22px" }}>
                Study each leaf's structural anatomy before the blind identification test.
              </p>

              {/* Seed tabs */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {SEEDS.map(s => (
                  <motion.button key={s.id} type="button"
                    onPointerDown={() => setSeedId(s.id)}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      flex:          1,
                      padding:       "16px",
                      background:    seedId === s.id ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(14px)",
                      border:        seedId === s.id ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.09)",
                      borderRadius:  12,
                      color:         seedId === s.id ? GOLD : "rgba(240,232,212,0.40)",
                      fontSize:      16,
                      fontWeight:    700,
                      cursor:        "pointer",
                      fontFamily:    "'Inter', sans-serif",
                      letterSpacing: "0.04em",
                      transition:    "all 0.22s",
                      boxShadow:     seedId === s.id ? `0 0 24px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.08)` : "none",
                    }}>
                    {s.name}
                  </motion.button>
                ))}
              </div>

              {/* Split canvas */}
              <AnimatePresence mode="wait">
                <motion.div key={seedId}
                  initial={{ opacity: 0, x: 30, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 300, damping: 28 }}
                  style={{
                    display:      "grid",
                    gridTemplateColumns: "1fr 1fr",
                    background:   "rgba(255,255,255,0.022)",
                    backdropFilter: "blur(22px)",
                    WebkitBackdropFilter: "blur(22px)",
                    border:       `1px solid rgba(212,175,55,0.18)`,
                    borderRadius: 20,
                    overflow:     "hidden",
                    boxShadow:    "0 12px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
                    minHeight:    480,
                  }}
                >
                  {/* LEFT — Photorealistic leaf render */}
                  <div style={{
                    background: `
                      radial-gradient(ellipse 70% 60% at 40% 35%, ${activeSeed.leafS}44 0%, transparent 55%),
                      radial-gradient(ellipse 50% 40% at 70% 75%, ${activeSeed.leafH1}33 0%, transparent 50%),
                      linear-gradient(170deg, ${activeSeed.leafH1}DD 0%, ${activeSeed.leafH2}FF 55%, #030804 100%)
                    `,
                    display:    "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position:   "relative",
                    overflow:   "hidden",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {/* Grain noise overlay */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}>
                      <filter id="grain">
                        <feTurbulence type="fractalNoise" baseFrequency="0.70" numOctaves="4" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                      </filter>
                      <rect width="100%" height="100%" filter="url(#grain)" />
                    </svg>

                    {/* Light ray */}
                    <div style={{
                      position:   "absolute",
                      top:        "-10%",
                      left:       "25%",
                      width:      2,
                      height:     "65%",
                      background: "linear-gradient(180deg, rgba(255,255,200,0.08) 0%, transparent 100%)",
                      transform:  "rotate(12deg)",
                      pointerEvents: "none",
                    }} />

                    <div style={{ position: "relative", zIndex: 2 }}>
                      <LeafSVG seed={activeSeed} />
                    </div>

                    <div style={{
                      position:      "absolute",
                      bottom:        16, left: 16,
                      fontSize:      9,
                      letterSpacing: "0.32em",
                      color:         "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      fontWeight:    700,
                    }}>
                      MACRO LEAF · LIVE RENDER · {activeSeed.name.toUpperCase()}
                    </div>
                  </div>

                  {/* RIGHT — Telemetry specs */}
                  <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column", gap: 22 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        {activeSeed.origin}
                      </div>
                      <h3 style={{
                        fontFamily:    "'Cormorant Garamond', Georgia, serif",
                        fontSize:      34,
                        fontWeight:    400,
                        color:         "#F0E8D4",
                        margin:        "0 0 14px",
                        letterSpacing: "0.04em",
                        lineHeight:    1.1,
                      }}>
                        {activeSeed.name}
                      </h3>
                      <p style={{ fontSize: 15, color: "rgba(240,232,212,0.50)", lineHeight: 1.68, margin: 0 }}>
                        {activeSeed.profile}
                      </p>
                    </div>

                    {/* Spec bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {activeSeed.specs.map(sp => (
                        <div key={sp.k}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(240,232,212,0.35)", fontWeight: 700 }}>{sp.k}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#F0E8D4" }}>{sp.v}</span>
                          </div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
                            <motion.div
                              key={seedId + sp.k}
                              initial={{ width: 0 }}
                              animate={{ width: `${sp.bar}%` }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              style={{
                                height:       "100%",
                                background:   `linear-gradient(90deg, ${GOLD}88, ${GOLD})`,
                                borderRadius: 3,
                                boxShadow:    `0 0 8px ${GOLD}50`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Structural callout */}
                    <div style={{
                      background:   "rgba(212,175,55,0.06)",
                      border:       "1px solid rgba(212,175,55,0.18)",
                      borderRadius: 12,
                      padding:      "14px 16px",
                    }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.28em", color: `${GOLD}70`, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                        Vein Architecture
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.55)", lineHeight: 1.55 }}>
                        {seedId === "connecticut"
                          ? "Near-invisible tertiary vein network — microscopic cross-fibers sealed under the cuticle. Standard for premium aesthetics."
                          : seedId === "corojo"
                          ? "Dense primary vein with aggressive secondary branching. Maximum oil-channel surface area for aromatic intensity."
                          : "Balanced vein system with moderate secondary density. Classic architecture for reliable draw and combustion consistency."
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <PrimaryBtn onClick={() => go("quiz")} style={{ marginTop: 24 }}>
                BEGIN BLIND IDENTIFICATION TEST →
              </PrimaryBtn>
            </motion.div>
          )}

          {/* ── Blind Quiz ── */}
          {step === "quiz" && (
            <motion.div key="quiz" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 740 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Eyebrow style={{ margin: 0 }}>Session 1 · Blind Identification Test</Eyebrow>
                <span style={{ color: `${GOLD}80`, fontSize: 15, fontWeight: 800 }}>{qIdx + 1} / {QUIZ.length}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginBottom: 32 }}>
                <motion.div animate={{ width: `${(qIdx / QUIZ.length) * 100}%` }} transition={{ duration: 0.4 }}
                  style={{ height: "100%", background: GOLD, borderRadius: 2, boxShadow: `0 0 10px ${GOLD}66` }} />
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={qIdx}
                  initial={{ opacity: 0, x: 36, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  exit={{ opacity: 0, x: -28 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 280, damping: 26 }}
                >
                  <h2 style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(22px, 3.2vw, 34px)",
                    fontWeight: 400, color: "#F0E8D4",
                    margin: "0 0 28px", lineHeight: 1.38,
                  }}>
                    {QUIZ[qIdx].q}
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {QUIZ[qIdx].opts.map((opt, oi) => {
                      const isAnswered = answered.includes(qIdx);
                      const isCorrect  = oi === QUIZ[qIdx].correct;
                      return (
                        <motion.button key={oi} type="button"
                          onPointerDown={() => !isAnswered && answerQuiz(oi)}
                          whileTap={isAnswered ? {} : { scale: 0.98 }}
                          animate={
                            isAnswered && isCorrect ? { background: "rgba(50,180,90,0.16)", borderColor: "#32B45A" } :
                            isAnswered && wrongFlash && !isCorrect ? { background: "rgba(200,50,42,0.12)", borderColor: "#C8322A" } : {}
                          }
                          style={{
                            padding: "19px 22px",
                            background: "rgba(255,255,255,0.03)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            borderRadius: 12,
                            color: "#F0E8D4", fontSize: 19, fontWeight: 500,
                            textAlign: "left", cursor: isAnswered ? "default" : "pointer",
                            fontFamily: "'Inter', sans-serif",
                            display: "flex", alignItems: "center", gap: 16,
                            transition: "background 0.22s, border-color 0.22s",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                          }}
                        >
                          <span style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "rgba(212,175,55,0.08)",
                            border: `1px solid ${GOLD}33`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 900, color: GOLD, flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p style={{ color: "rgba(200,50,42,0.60)", fontSize: 13, margin: "14px 0 0", letterSpacing: "0.06em" }}>
                    Wrong answer = −{QUIZ[qIdx].penalty} pts
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── POS Gate ── */}
          {step === "posgate" && (
            <motion.div key="posgate" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 700, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🌱</div>
              <Eyebrow>Session 1 · Complete</Eyebrow>
              <Heading style={{ color: GOLD }}>Seeds Primed</Heading>
              <p style={{ color: "rgba(240,232,212,0.45)", fontSize: 20, margin: "0 0 10px" }}>
                Session score: <strong style={{ color: GOLD }}>{profile.points} pts</strong>
              </p>
              <p style={{ color: "rgba(240,232,212,0.36)", fontSize: 18, margin: "0 0 36px", lineHeight: 1.6 }}>
                Present your receipt code to your server and enter it below to unlock the Terroir Matrix.
              </p>
              <PrimaryBtn onClick={() => setShowPOS(true)}
                style={{ boxShadow: `0 0 48px rgba(212,175,55,0.28), 0 8px 32px rgba(0,0,0,0.60)` }}>
                ENTER RECEIPT CODE →
              </PrimaryBtn>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {showPOS && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}

/* ── Shared primitives ── */
function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.42em", color: "rgba(212,175,55,0.70)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px", ...style }}>
      {children}
    </p>
  );
}
function Heading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: "clamp(28px, 4vw, 48px)",
      fontWeight: 300, color: "#F0E8D4",
      margin: "0 0 36px", letterSpacing: "0.05em",
      textShadow: "0 0 40px rgba(212,175,55,0.10)",
      ...style,
    }}>
      {children}
    </h2>
  );
}
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:     "rgba(255,255,255,0.028)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border:         "1px solid rgba(212,175,55,0.14)",
      borderRadius:   16,
      padding:        "24px",
      boxShadow:      "0 8px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}
function PrimaryBtn({ children, disabled, onClick, style }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <motion.button type="button" onPointerDown={!disabled ? onClick : undefined} whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        marginTop: 24, width: "100%", padding: "23px",
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(135deg, ${GOLD} 0%, #B8960A 55%, #9A7A14 100%)`,
        border:        disabled ? "1px solid rgba(255,255,255,0.09)" : "none",
        borderRadius:  13,
        color:         disabled ? "rgba(255,255,255,0.25)" : "#080501",
        fontSize:      20, fontWeight: 900, letterSpacing: "0.24em", textTransform: "uppercase",
        cursor:        disabled ? "not-allowed" : "pointer",
        fontFamily:    "'Inter', sans-serif",
        transition:    "all 0.22s",
        boxShadow:     disabled ? "none" : "0 0 40px rgba(212,175,55,0.20), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.20)",
        position:      "relative",
        overflow:      "hidden",
        ...style,
      }}>
      {!disabled && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, transparent 100%)",
          borderRadius: "13px 13px 0 0",
        }} />
      )}
      {children}
    </motion.button>
  );
}
const inp: React.CSSProperties = {
  padding: "20px 22px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(212,175,55,0.18)",
  borderRadius: 12,
  color: "#F0E8D4",
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: "0.07em",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};
