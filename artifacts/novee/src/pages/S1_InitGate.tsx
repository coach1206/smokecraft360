import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const PV = { enter: { opacity: 0, x: 60, scale: 0.95 }, active: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -50, scale: 0.98 } };
const PT = { type: "spring" as const, mass: 0.9, stiffness: 260, damping: 28 };

/* ─ Mentors ─ */
const MENTORS = [
  {
    id: "dominican", name: "The Dominican Maestro", flag: "🇩🇴",
    country: "Dominican Republic", valley: "Cibao Valley",
    bio: "Old-world master of aged Olor Dominicano. Delivers smooth, multi-leaf complexity with deep earth-tone transitions and slow fermentation curves that produce some of the world's most refined cigars.",
    tags: ["Aged Profiles", "Earth Transitions", "Multi-Leaf"],
    hue: "#1B4BD4", soilTop: "#110A02", soilBot: "#1E1008",
  },
  {
    id: "nicaraguan", name: "The Nicaraguan Puro Boss", flag: "🇳🇮",
    country: "Nicaragua", valley: "Estelí",
    bio: "Commands mineral-rich volcanic soils for maximum Ligero density. Full-bodied, uncompromising palate intensity with volcanic earth and an aggressive combustion profile that dominates the room.",
    tags: ["Volcanic Soil", "Heavy Ligero", "Full-Body"],
    hue: "#1A8C3A", soilTop: "#061006", soilBot: "#0C1C0A",
  },
  {
    id: "honduran", name: "The Traditionalist Wrapper", flag: "🇭🇳",
    country: "Honduras", valley: "Jamastran Valley",
    bio: "Flawless sun-grown wrapper selection. Microscopic vein concealment and aerodynamic draw precision from the Jamastran Valley — near-invisible vein structure and silky combustion unmatched in the Americas.",
    tags: ["Wrapper Perfection", "Vein Concealment", "Draw Precision"],
    hue: "#2A7ABF", soilTop: "#060A12", soilBot: "#0C1020",
  },
];

/* ─ Seeds ─ */
const SEEDS = [
  {
    id: "criollo", name: "Criollo '98", origin: "Cuban-Seed · Dominican Republic",
    profile: "Traditional Cuban-seed genetics. Delivers deep, earth-toned flavor transitions with heavy spice tracking. Medium-to-full body with secondary chocolate and cedar notes throughout the smoke.",
    specs: [{ k: "Body", v: "Medium-Full", b: 70 }, { k: "Nicotine", v: "High", b: 78 }, { k: "Burn Rate", v: "Slow / Even", b: 38 }, { k: "Aroma", v: "Earth · Spice", b: 80 }],
    veinColor: "rgba(170,130,45,0.58)", veinW: 2.1, oilSheen: true,
    c1: "#213A10", c2: "#0E1E06", cs: "#3A5C18", tx: 0.62,
  },
  {
    id: "corojo", name: "Corojo", origin: "Vuelta Abajo, Cuba · Honduras",
    profile: "Highly robust, oil-dense leaf. Produces intense peppery finishes with maximum natural oil saturation. The thick cuticle locks in volatile aromatic compounds through fermentation.",
    specs: [{ k: "Body", v: "Full", b: 95 }, { k: "Nicotine", v: "Very High", b: 94 }, { k: "Burn Rate", v: "Medium", b: 55 }, { k: "Aroma", v: "Pepper · Oak", b: 90 }],
    veinColor: "rgba(200,155,30,0.68)", veinW: 2.7, oilSheen: true,
    c1: "#162E08", c2: "#080E02", cs: "#2A4A10", tx: 0.73,
  },
  {
    id: "connecticut", name: "Connecticut Shade", origin: "Connecticut River Valley, USA",
    profile: "Ultra-smooth delicate wrapper leaf grown under cheesecloth shade canopies. Delivers creamy tasting notes with mild body and near-invisible veins — the gold standard for aesthetic construction.",
    specs: [{ k: "Body", v: "Mild", b: 22 }, { k: "Nicotine", v: "Low-Medium", b: 28 }, { k: "Burn Rate", v: "Fast / Smooth", b: 78 }, { k: "Aroma", v: "Cream · Hay", b: 45 }],
    veinColor: "rgba(220,205,150,0.26)", veinW: 0.9, oilSheen: false,
    c1: "#4A6E28", c2: "#2E4A14", cs: "#7AAA44", tx: 0.48,
  },
];

const QUIZ = [
  { q: "Which leaf is prized for near-invisible veins, creamy notes, and mild body?", opts: ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"], correct: 2, pen: 2 },
  { q: "Corojo leaf produces which dominant palate characteristic?", opts: ["Creamy sweetness", "Intense peppery strength", "Light cedar notes", "Mild earth tones"], correct: 1, pen: 2 },
  { q: "Criollo '98 is distinguished by its balance of which two qualities?", opts: ["Light color & low nicotine", "Strength & aromatic complexity", "Cedar & mild pepper", "Sweetness & burn rate"], correct: 1, pen: 2 },
];

/* ─ Leaf SVG ─ */
function LeafSVG({ s }: { s: typeof SEEDS[0] }) {
  const fid = `lf_${s.id}`, gid = `lg_${s.id}`, sid = `ls_${s.id}`;
  return (
    <svg width="190" height="280" viewBox="0 0 190 280" fill="none"
      style={{ filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.75)) drop-shadow(0 2px 8px rgba(0,0,0,0.60))" }}>
      <defs>
        <filter id={fid} x="-8%" y="-5%" width="116%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={s.tx} numOctaves="5" seed="9" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix"
            values={s.oilSheen ? "0 0 0 0 0.04  0 0 0 0 0.09  0 0 0 0 0.01  0 0 0 0.50 0" : "0 0 0 0 0.05  0 0 0 0 0.10  0 0 0 0 0.02  0 0 0 0.32 0"}
            in="noise" result="cn" />
          <feComposite in="SourceGraphic" in2="cn" operator="multiply" result="tx" />
          <feGaussianBlur in="tx" stdDeviation="0.25" result="sm" />
          <feComposite in="SourceGraphic" in2="sm" operator="arithmetic" k1="0" k2="0.80" k3="0.20" k4="0" />
        </filter>
        <radialGradient id={gid} cx="37%" cy="24%" r="72%">
          <stop offset="0%"   stopColor={s.cs} />
          <stop offset="38%"  stopColor={s.c1} />
          <stop offset="78%"  stopColor={s.c2} />
          <stop offset="100%" stopColor="#030702" />
        </radialGradient>
        <linearGradient id={sid} x1="28%" y1="3%" x2="52%" y2="38%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.12)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Leaf outline — natural irregular bezier */}
      <path d="M95 5 C120 15,150 35,160 68 C170 100,165 135,157 165 C148 196,132 224,118 248 C110 262,103 274,95 283 C87 274,80 262,72 248 C58 224,42 196,33 165 C25 135,20 100,30 68 C40 35,70 15,95 5Z"
        fill={`url(#${gid})`} filter={`url(#${fid})`} />

      {/* Primary vein */}
      <path d="M95 10 Q95 145 95 277" stroke={s.veinColor} strokeWidth={s.veinW * 1.5} fill="none" strokeLinecap="round" />

      {/* Secondary veins L/R */}
      {[34, 58, 84, 110, 138, 164, 190, 215].map((y, i) => {
        const sp = 30 - i * 2.8;
        const sw = Math.max(s.veinW * (0.65 - i * 0.045), 0.35);
        return (
          <g key={y}>
            <path d={`M95 ${y} C${95 - sp * 0.45} ${y + 11},${95 - sp * 0.88} ${y + 20},${95 - sp} ${y + 27}`}
              stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
            <path d={`M95 ${y} C${95 + sp * 0.45} ${y + 11},${95 + sp * 0.88} ${y + 20},${95 + sp} ${y + 27}`}
              stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Tertiary veins */}
      {[50, 100, 148, 195].map((y, i) => {
        const b = 20 - i * 2.5;
        const tw = Math.max(s.veinW * 0.28, 0.22);
        return (
          <g key={`tv${i}`}>
            <line x1={95 - b * 0.42} y1={y} x2={95 - b - 4} y2={y + 16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
            <line x1={95 + b * 0.42} y1={y} x2={95 + b + 4} y2={y + 16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
          </g>
        );
      })}

      {/* Oil sheen */}
      {s.oilSheen && (
        <path d={`M95 5 C120 15,150 35,160 68 C156 48,140 28,95 17 C50 28,34 48,30 68 C40 35,70 15,95 5Z`}
          fill={`url(#${sid})`} />
      )}
      <ellipse cx="95" cy="13" rx="7" ry="4" fill="rgba(255,255,255,0.07)" />
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
    const q = QUIZ[qIdx];
    const good = oi === q.correct;
    setAnswered(prev => [...prev, qIdx]);
    if (good) { hapticMilestone(); setQuizPts(p => p + 20); addPoints(20); }
    else { hapticError(); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 700); applyPenalty(q.pen); }
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

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      <BackButton />

      {/* Session label — top left below back button */}
      <div style={{
        position: "absolute", top: 54, left: 32,
        fontSize: 9, letterSpacing: "0.44em", textTransform: "uppercase",
        color: "rgba(212,175,55,0.50)", fontWeight: 800, zIndex: 20,
      }}>
        Session 1 of 4
      </div>

      {/* Step indicator — top right */}
      <div style={{
        position: "absolute", top: 54, right: 32,
        display: "flex", gap: 8, zIndex: 20,
      }}>
        {(["demo","rules","leaderboard","mentor","seed_canvas","quiz","posgate"] as Step[]).map(s => (
          <div key={s} style={{
            width: 28, height: 4, borderRadius: 2,
            background: s === step ? GOLD : "rgba(255,255,255,0.12)",
            boxShadow: s === step ? `0 0 8px ${GOLD}88` : "none",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      {/* ── Full-screen content area ── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "90px 64px 64px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ══ DEMO ══ */}
          {step === "demo" && (
            <motion.div key="demo" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 760 }}>
              {/* Full-bleed panel header */}
              <div style={{ marginBottom: 40, textAlign: "center" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.50em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 10 }}>
                  Step 1.1 · Guest Registration
                </div>
                <h1 style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      "clamp(48px, 5.5vw, 72px)",
                  fontWeight:    300,
                  color:         "#F0E8D4",
                  margin:        0,
                  letterSpacing: "0.05em",
                  lineHeight:    1,
                  textShadow:    "0 0 60px rgba(212,175,55,0.15)",
                }}>
                  Your Profile
                </h1>
                <div style={{ margin: "14px auto 0", width: 200, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}66, transparent)` }} />
              </div>

              {/* Glass form panel */}
              <div style={{
                background:     "rgba(255,255,255,0.030)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border:         "1px solid rgba(212,175,55,0.18)",
                borderRadius:   20,
                padding:        "36px",
                boxShadow:      "0 24px 80px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(0,0,0,0.20)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { ph: "FIRST NAME", val: firstName, fn: setFirstName },
                      { ph: "LAST NAME",  val: lastName,  fn: setLastName  },
                    ].map(f => (
                      <input key={f.ph} type="text" value={f.val} onChange={e => f.fn(e.target.value)}
                        placeholder={f.ph} style={{ ...INP, flex: 1 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <input type="text" value={phone4}
                      onChange={e => setPhone4(e.target.value.replace(/\D/g,"").slice(0,4))}
                      placeholder="LAST 4 OF PHONE" maxLength={4}
                      style={{ ...INP, flex: 1, letterSpacing: "0.30em" }} />
                    <input type="number" value={age} min={21} max={99}
                      onChange={e => setAge(e.target.value)}
                      placeholder="AGE" style={{ ...INP, width: 160 }} />
                  </div>
                </div>
              </div>

              <PBtn disabled={!canSubmit} onClick={submitDemo}>CONTINUE →</PBtn>
            </motion.div>
          )}

          {/* ══ RULES ══ */}
          {step === "rules" && (
            <motion.div key="rules" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 880 }}>
              <PageHeader eyebrow="Step 1.3 · The Golden Box" title="Rules of Play" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                {[
                  { icon: "✦", title: "Visual Accuracy & Structural Synergy", badge: "+10 XP", body: "Each correct blend architecture decision and visually coherent design choice earns +10 XP toward your session total.", gain: true },
                  { icon: "⚠", title: "Mentor Blind Quiz Failures", badge: "−2 PTS", body: "Each incorrect answer during the Seed Priming test deducts 2 pts from your running total.", gain: false },
                  { icon: "💨", title: "Volatile Blend · Airflow Collapse", badge: "−5 PTS", body: "Excess Ligero beyond structural tolerance collapses the draw — each violation costs −5 PTS.", gain: false },
                  { icon: "🔁", title: "Table Cheat Codes · Full Recovery", badge: "2×  3×  5×", body: "Order trackside to multiply: Cigar+Drink (2×), Double Pour (3×), Grand Slam Trifecta (5× + wipes all penalties).", gain: true },
                ].map(r => (
                  <div key={r.title} style={{
                    background:     r.gain ? "rgba(212,175,55,0.05)" : "rgba(200,50,42,0.05)",
                    backdropFilter: "blur(18px)",
                    border:         `1px solid ${r.gain ? "rgba(212,175,55,0.22)" : "rgba(200,50,42,0.22)"}`,
                    borderRadius:   14,
                    padding:        "22px 20px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 22, lineHeight: 1 }}>{r.icon}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.2 }}>{r.title}</span>
                      </div>
                      <span style={{
                        background: r.gain ? "rgba(212,175,55,0.18)" : "rgba(200,50,42,0.18)",
                        border: `1px solid ${r.gain ? GOLD + "55" : "rgba(200,50,42,0.55)"}`,
                        borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 900,
                        color: r.gain ? GOLD : "#C8322A", letterSpacing: "0.10em", flexShrink: 0,
                      }}>{r.badge}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(240,232,212,0.46)", margin: 0, lineHeight: 1.58 }}>{r.body}</p>
                  </div>
                ))}
              </div>

              <PBtn onClick={() => go("leaderboard")}>ACCEPT & INITIALIZE →</PBtn>
            </motion.div>
          )}

          {/* ══ LEADERBOARD ══ */}
          {step === "leaderboard" && (
            <motion.div key="leaderboard" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 820 }}>
              <PageHeader eyebrow="Step 1.2 · Tonight's Competition" title="Live Rankings" />
              <GlassPanel><LeaderboardTicker /></GlassPanel>
              <p style={{ color: "rgba(240,232,212,0.38)", fontSize: 19, margin: "20px 0 28px", lineHeight: 1.6, textAlign: "center" }}>
                Welcome, <strong style={{ color: "#F0E8D4" }}>{firstName}</strong>. Your session is now active. Compete against all tables on display.
              </p>
              <PBtn onClick={() => go("mentor")}>SELECT YOUR MENTOR →</PBtn>
            </motion.div>
          )}

          {/* ══ MENTOR ══ */}
          {step === "mentor" && (
            <motion.div key="mentor" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 1080 }}>
              <PageHeader eyebrow="Step 1.4 · Master Blender Selection" title="Choose Your Guide" />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
                {MENTORS.map(m => {
                  const active = mentor === m.id;
                  return (
                    <motion.button key={m.id} type="button"
                      onPointerDown={() => { setMentor(m.id); updateProfile({ mentor: m.id }); }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background:     "rgba(255,255,255,0.024)",
                        backdropFilter: "blur(22px)",
                        WebkitBackdropFilter: "blur(22px)",
                        border:         active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.09)",
                        borderRadius:   18,
                        padding:        0,
                        cursor:         "pointer",
                        textAlign:      "left",
                        fontFamily:     "'Inter', sans-serif",
                        overflow:       "hidden",
                        boxShadow:      active
                          ? `0 0 60px rgba(212,175,55,0.25), 0 16px 60px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.10)`
                          : "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                        transition:     "all 0.28s",
                      }}
                    >
                      {/* Terrain header */}
                      <div style={{
                        height:         160,
                        background:     `
                          radial-gradient(ellipse 80% 70% at 40% 55%, ${m.hue}22 0%, transparent 65%),
                          linear-gradient(175deg, ${m.soilTop} 0%, ${m.soilBot} 100%)
                        `,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        flexDirection:  "column",
                        gap:            12,
                        position:       "relative",
                        borderBottom:   "1px solid rgba(255,255,255,0.06)",
                        overflow:       "hidden",
                      }}>
                        {/* Mineral dot grid */}
                        <div style={{
                          position: "absolute", inset: 0, opacity: 0.09,
                          backgroundImage: `radial-gradient(${m.hue} 1px, transparent 1px)`,
                          backgroundSize: "12px 12px",
                        }} />
                        {/* Active gold rim */}
                        {active && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 2,
                            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                            boxShadow: `0 0 12px ${GOLD}88`,
                          }} />
                        )}
                        {/* Flag circle */}
                        <div style={{
                          width:         108,
                          height:        108,
                          borderRadius:  "50%",
                          background:    `radial-gradient(circle at 30% 25%, ${m.hue}28, rgba(6,6,10,0.94))`,
                          border:        `2.5px solid ${active ? GOLD : m.hue + "55"}`,
                          boxShadow:     active
                            ? `0 0 36px ${GOLD}55, 0 0 70px ${GOLD}22, inset 0 0 22px rgba(0,0,0,0.70)`
                            : `0 0 18px ${m.hue}22, inset 0 0 22px rgba(0,0,0,0.70)`,
                          display:       "flex",
                          alignItems:    "center",
                          justifyContent:"center",
                          fontSize:      52,
                          backdropFilter:"blur(6px)",
                          position:      "relative",
                          zIndex:        2,
                          transition:    "all 0.28s",
                        }}>
                          {m.flag}
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: "20px 20px 22px" }}>
                        <div style={{ fontSize: 19, fontWeight: 800, color: active ? GOLD : "#F0E8D4", letterSpacing: "0.02em", marginBottom: 3, transition: "color 0.28s" }}>{m.name}</div>
                        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: `${m.hue}CC`, fontWeight: 700, marginBottom: 12 }}>{m.country} · {m.valley}</div>
                        <p style={{ fontSize: 13, color: "rgba(240,232,212,0.44)", lineHeight: 1.62, margin: "0 0 14px" }}>{m.bio}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {m.tags.map(t => (
                            <span key={t} style={{
                              background: active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.09)"}`,
                              borderRadius: 6, padding: "4px 10px",
                              fontSize: 10, fontWeight: 700, color: active ? GOLD : "rgba(240,232,212,0.36)",
                              letterSpacing: "0.14em", textTransform: "uppercase", transition: "all 0.28s",
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <PBtn disabled={!mentor} onClick={() => mentor && go("seed_canvas")}>
                PROCEED TO SEED TEXTURE ANALYSIS →
              </PBtn>
            </motion.div>
          )}

          {/* ══ SEED CANVAS ══ */}
          {step === "seed_canvas" && (
            <motion.div key="seed_canvas" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 1120 }}>
              <PageHeader eyebrow="Step 1.5 · Seed Quality Intelligence" title="Leaf Recognition Matrix" />

              {/* Seed tabs */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {SEEDS.map(s => (
                  <motion.button key={s.id} type="button" onPointerDown={() => setSeedId(s.id)} whileTap={{ scale: 0.96 }}
                    style={{
                      flex: 1, padding: "16px",
                      background:    seedId === s.id ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(16px)",
                      border:        seedId === s.id ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.09)",
                      borderRadius:  12,
                      color:         seedId === s.id ? GOLD : "rgba(240,232,212,0.42)",
                      fontSize:      17, fontWeight: 700, cursor: "pointer",
                      fontFamily:    "'Inter', sans-serif", letterSpacing: "0.04em",
                      transition:    "all 0.22s",
                      boxShadow:     seedId === s.id ? `0 0 24px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.08)` : "none",
                    }}>
                    {s.name}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={seedId}
                  initial={{ opacity: 0, x: 32, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 300, damping: 28 }}
                  style={{
                    display:      "grid",
                    gridTemplateColumns: "420px 1fr",
                    background:   "rgba(255,255,255,0.024)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border:       `1px solid rgba(212,175,55,0.16)`,
                    borderRadius: 20,
                    overflow:     "hidden",
                    boxShadow:    "0 20px 70px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.06)",
                    minHeight:    500,
                  }}
                >
                  {/* LEFT — Leaf render */}
                  <div style={{
                    background: `
                      radial-gradient(ellipse 65% 55% at 38% 32%, ${seed.cs}44 0%, transparent 52%),
                      radial-gradient(ellipse 45% 38% at 65% 72%, ${seed.c1}33 0%, transparent 48%),
                      linear-gradient(170deg, ${seed.c1}EE 0%, ${seed.c2}FF 55%, #020602 100%)
                    `,
                    display:    "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position:   "relative",
                    overflow:   "hidden",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {/* SVG noise grain */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, pointerEvents: "none" }}>
                      <filter id="grain2">
                        <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                      </filter>
                      <rect width="100%" height="100%" filter="url(#grain2)" />
                    </svg>

                    {/* Light ray simulation */}
                    <div style={{
                      position:   "absolute", top: "-5%", left: "28%",
                      width:      3, height: "70%",
                      background: "linear-gradient(180deg, rgba(255,255,200,0.10) 0%, transparent 100%)",
                      transform:  "rotate(14deg)", pointerEvents: "none",
                    }} />
                    <div style={{
                      position:   "absolute", top: "-5%", left: "48%",
                      width:      1, height: "60%",
                      background: "linear-gradient(180deg, rgba(255,255,200,0.06) 0%, transparent 100%)",
                      transform:  "rotate(8deg)", pointerEvents: "none",
                    }} />

                    <LeafSVG s={seed} />

                    <div style={{
                      position: "absolute", bottom: 14, left: 16,
                      fontSize: 9, letterSpacing: "0.34em", color: "rgba(255,255,255,0.22)",
                      textTransform: "uppercase", fontWeight: 700,
                    }}>
                      MACRO LEAF · LIVE RENDER
                    </div>
                  </div>

                  {/* RIGHT — Specs */}
                  <div style={{ padding: "38px 34px", display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.40em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        {seed.origin}
                      </div>
                      <h3 style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 36, fontWeight: 400, color: "#F0E8D4",
                        margin: "0 0 14px", letterSpacing: "0.04em", lineHeight: 1.1,
                      }}>
                        {seed.name}
                      </h3>
                      <p style={{ fontSize: 15, color: "rgba(240,232,212,0.50)", lineHeight: 1.68, margin: 0 }}>
                        {seed.profile}
                      </p>
                    </div>

                    {/* Spec bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {seed.specs.map(sp => (
                        <div key={sp.k}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                            <span style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(240,232,212,0.32)", fontWeight: 700 }}>{sp.k}</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4" }}>{sp.v}</span>
                          </div>
                          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.40)" }}>
                            <motion.div
                              key={seedId + sp.k}
                              initial={{ width: 0 }}
                              animate={{ width: `${sp.b}%` }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              style={{
                                height: "100%",
                                background: `linear-gradient(90deg, ${GOLD}77, ${GOLD})`,
                                borderRadius: 3,
                                boxShadow: `0 0 10px ${GOLD}55`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vein callout */}
                    <div style={{
                      background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.16)",
                      borderRadius: 12, padding: "16px 18px",
                    }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.28em", color: `${GOLD}70`, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                        Vein Architecture
                      </div>
                      <p style={{ fontSize: 13, color: "rgba(240,232,212,0.52)", lineHeight: 1.58, margin: 0 }}>
                        {seedId === "connecticut"
                          ? "Near-invisible tertiary vein network. Microscopic cross-fibers sealed under the cuticle — standard for premium wrapper aesthetics."
                          : seedId === "corojo"
                          ? "Dense primary vein with aggressive secondary branching. Maximum oil-channel surface area for aromatic concentration."
                          : "Balanced vein system with moderate secondary density. Classic Cuban-seed architecture for reliable draw consistency."
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <PBtn onClick={() => go("quiz")} style={{ marginTop: 20 }}>BEGIN BLIND IDENTIFICATION TEST →</PBtn>
            </motion.div>
          )}

          {/* ══ QUIZ ══ */}
          {step === "quiz" && (
            <motion.div key="quiz" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 780 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <PageHeader eyebrow="Step 1.6 · Blind Identification Test" title="Identify the Leaf" noMargin />
                <span style={{ color: `${GOLD}80`, fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{qIdx + 1} / {QUIZ.length}</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 32 }}>
                <motion.div animate={{ width: `${(qIdx / QUIZ.length) * 100}%` }} transition={{ duration: 0.4 }}
                  style={{ height: "100%", background: GOLD, borderRadius: 3, boxShadow: `0 0 12px ${GOLD}66` }} />
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={qIdx}
                  initial={{ opacity: 0, x: 38, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -28 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 280, damping: 26 }}
                >
                  <h2 style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(24px, 3.4vw, 36px)",
                    fontWeight: 400, color: "#F0E8D4",
                    margin: "0 0 28px", lineHeight: 1.35,
                  }}>{QUIZ[qIdx].q}</h2>

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
                            padding: "20px 24px",
                            background: "rgba(255,255,255,0.030)",
                            backdropFilter: "blur(14px)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            borderRadius: 13,
                            color: "#F0E8D4", fontSize: 20, fontWeight: 500,
                            textAlign: "left", cursor: isAnswered ? "default" : "pointer",
                            fontFamily: "'Inter', sans-serif",
                            display: "flex", alignItems: "center", gap: 18,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px rgba(0,0,0,0.30)",
                            transition: "background 0.22s, border-color 0.22s",
                          }}
                        >
                          <span style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}33`,
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
                  <p style={{ color: "rgba(200,50,42,0.58)", fontSize: 13, margin: "14px 0 0", letterSpacing: "0.06em" }}>
                    Wrong answer = −{QUIZ[qIdx].pen} pts
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ POS GATE ══ */}
          {step === "posgate" && (
            <motion.div key="posgate" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
              style={{ width: "100%", maxWidth: 720, textAlign: "center" }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>🌱</div>
              <PageHeader eyebrow="Session 1 · Complete" title="Seeds Primed" center />
              <p style={{ color: "rgba(240,232,212,0.44)", fontSize: 20, margin: "0 0 8px" }}>
                Current score: <strong style={{ color: GOLD }}>{profile.points} pts</strong>
              </p>
              <p style={{ color: "rgba(240,232,212,0.34)", fontSize: 17, margin: "0 0 36px", lineHeight: 1.6 }}>
                Present your receipt code to your table server, then enter it below to access the Terroir Matrix.
              </p>
              <PBtn onClick={() => setShowPOS(true)} style={{ boxShadow: `0 0 56px rgba(212,175,55,0.30), 0 8px 36px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.22)` }}>
                ENTER RECEIPT CODE →
              </PBtn>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {showPOS && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}

/* ── Shared primitives ── */
function PageHeader({ eyebrow, title, noMargin, center }: { eyebrow: string; title: string; noMargin?: boolean; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: noMargin ? 0 : 32 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.46em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 8 }}>{eyebrow}</div>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "clamp(36px, 4.2vw, 54px)",
        fontWeight: 300, color: "#F0E8D4",
        margin: 0, letterSpacing: "0.04em",
        textShadow: "0 0 40px rgba(212,175,55,0.10)",
      }}>{title}</h2>
    </div>
  );
}
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", backdropFilter: "blur(22px)",
      WebkitBackdropFilter: "blur(22px)", border: "1px solid rgba(212,175,55,0.14)",
      borderRadius: 16, padding: "22px",
      boxShadow: "0 12px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>{children}</div>
  );
}
function PBtn({ children, disabled, onClick, style }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <motion.button type="button" onPointerDown={!disabled ? onClick : undefined} whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        marginTop: 22, width: "100%", padding: "24px",
        background: disabled ? "rgba(255,255,255,0.055)" : `linear-gradient(135deg, ${GOLD} 0%, #BF9800 55%, #9A7A14 100%)`,
        border: disabled ? "1px solid rgba(255,255,255,0.09)" : "none",
        borderRadius: 14,
        color: disabled ? "rgba(255,255,255,0.24)" : "#060400",
        fontSize: 19, fontWeight: 900, letterSpacing: "0.26em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Inter', sans-serif",
        boxShadow: disabled ? "none" : "0 0 40px rgba(212,175,55,0.22), 0 8px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
        position: "relative", overflow: "hidden",
        transition: "all 0.22s",
        ...style,
      }}>
      {!disabled && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "14px 14px 0 0" }} />
      )}
      {children}
    </motion.button>
  );
}
const INP: React.CSSProperties = {
  padding: "22px 22px",
  background: "rgba(255,255,255,0.040)",
  border: "1px solid rgba(212,175,55,0.18)",
  borderRadius: 12,
  color: "#F0E8D4",
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: "0.07em",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.04)",
};
