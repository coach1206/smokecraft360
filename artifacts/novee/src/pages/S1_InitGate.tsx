import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

/* ─── Shared weighted-spring transition variants ─── */
const PAGE_VARIANTS = {
  enter:  { opacity: 0, x: 60,  scale: 0.95 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -50, scale: 0.98 },
};
const PAGE_TRANSITION = {
  type:    "spring" as const,
  mass:    0.9,
  stiffness: 260,
  damping: 28,
  duration: 0.35,
};

/* ─── MENTORS ─── */
const MENTORS = [
  {
    id:      "dominican_maestro",
    name:    "The Dominican Maestro",
    flag:    "🇩🇴",
    country: "Dominican Republic",
    valley:  "Cibao Valley",
    profile: "Smooth, multi-leaf complexity with old-world aging metrics. Masters the art of blending aged Olor Dominicano with Piloto Cubano for deep, earthy transitions.",
    specialty: "Multi-Leaf Complexity · Aged Profiles",
    color:   "#1B4BD4",
    accent:  "#D42B2B",
  },
  {
    id:      "nicaraguan_boss",
    name:    "The Nicaraguan Puro Boss",
    flag:    "🇳🇮",
    country: "Nicaragua",
    valley:  "Estelí",
    profile: "Full-bodied volcanic soil optimization. Commands heavy, high-strength Ligero processing from mineral-rich Jalapa and Estelí soils — uncompromising palate intensity.",
    specialty: "Volcanic Soil · Ligero Dominance",
    color:   "#1A8C3A",
    accent:  "#FFFFFF",
  },
  {
    id:      "honduran_wrapper",
    name:    "The Traditionalist Wrapper",
    flag:    "🇭🇳",
    country: "Honduras",
    valley:  "Jamastran Valley",
    profile: "Flawless sun-grown wrapper selection with microscopic vein concealment and aerodynamic draw precision. The finest aesthetic and structural control in the Americas.",
    specialty: "Wrapper Perfection · Draw Precision",
    color:   "#1B4BD4",
    accent:  "#009B77",
  },
];

/* ─── QUIZ ─── */
const QUIZ_QUESTIONS = [
  {
    question: "Which tobacco leaf is prized for its oily sheen and creamy, mild combustion with nearly invisible veins?",
    options:  ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"],
    correct:  2,
    penalty:  2,
  },
  {
    question: "The Corojo leaf produces which dominant characteristic on the palate?",
    options:  ["Creamy sweetness", "Intense, peppery strength", "Light cedar notes", "Mild earth tones"],
    correct:  1,
    penalty:  2,
  },
  {
    question: "Criollo '98 is distinguished by its balance of which two qualities?",
    options:  [
      "Light color & low nicotine",
      "Strength & aromatic complexity",
      "Cedar notes & mild pepper",
      "Sweetness & burn rate",
    ],
    correct:  1,
    penalty:  2,
  },
];

/* ─── SEED DATA ─── */
const SEEDS = [
  {
    id:      "criollo",
    name:    "Criollo '98",
    origin:  "Cuban-seed lineage · Dominican Republic",
    profile: "Traditional Cuban-seed genetics. Delivers deep, earth-toned transitions with heavy spice tracking and a slow, even burn. Medium-to-full body with chocolate and cedar secondary notes.",
    specs:   [
      { label: "Body",       val: "Medium-Full" },
      { label: "Nicotine",   val: "High"        },
      { label: "Burn Rate",  val: "Slow"        },
      { label: "Aroma",      val: "Earth · Spice" },
    ],
    leafColor1: "#2D4A1E",
    leafColor2: "#4A6B2A",
    veins:     "rgba(180,140,60,0.45)",
  },
  {
    id:      "corojo",
    name:    "Corojo",
    origin:  "Vuelta Abajo, Cuba / Honduras",
    profile: "Highly robust, oil-dense leaf producing intense peppery finishes and maximum palate strength. The Corojo's thick cuticle locks in volatile aromatic oils through fermentation.",
    specs:   [
      { label: "Body",       val: "Full"         },
      { label: "Nicotine",   val: "Very High"    },
      { label: "Burn Rate",  val: "Medium"       },
      { label: "Aroma",      val: "Pepper · Oak" },
    ],
    leafColor1: "#1E3D0E",
    leafColor2: "#3A5C18",
    veins:     "rgba(200,160,40,0.55)",
  },
  {
    id:      "connecticut",
    name:    "Connecticut Shade",
    origin:  "Connecticut River Valley, USA",
    profile: "Ultra-smooth delicate wrapper leaf grown under cheesecloth shade canopies. Delivers creamy tasting notes with mild body, seamless aesthetics, and near-invisible veins.",
    specs:   [
      { label: "Body",       val: "Mild"             },
      { label: "Nicotine",   val: "Low-Medium"       },
      { label: "Burn Rate",  val: "Fast"             },
      { label: "Aroma",      val: "Cream · Hay"      },
    ],
    leafColor1: "#5A7A2E",
    leafColor2: "#8AAA4A",
    veins:     "rgba(220,200,140,0.30)",
  },
];

type Step = "demo" | "rules" | "leaderboard" | "mentor" | "seed_canvas" | "quiz" | "posgate";

export function S1_InitGate() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();

  const [step, setStep]             = useState<Step>("demo");
  const [firstName, setFirstName]   = useState(profile.firstName || "");
  const [lastName, setLastName]     = useState(profile.lastName  || "");
  const [phone4, setPhone4]         = useState(profile.phone4    || "");
  const [age, setAge]               = useState<string>(profile.age ? String(profile.age) : "");
  const [mentor, setMentor]         = useState<string | null>(profile.mentor);
  const [activeSeed, setActiveSeed] = useState<string>("criollo");
  const [qIdx, setQIdx]             = useState(0);
  const [answered, setAnswered]     = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [showPOS, setShowPOS]       = useState(false);
  const [quizPts, setQuizPts]       = useState(0);

  function touch() { playClick(); hapticClick(); }

  function go(s: Step) { touch(); setStep(s); }

  /* Demo submit */
  function submitDemo() {
    if (!firstName.trim() || !lastName.trim() || phone4.trim().length < 4 || !age) return;
    touch();
    updateProfile({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone4:    phone4.trim().slice(-4),
      age:       parseInt(age),
    });
    addPoints(10);
    go("rules");
  }

  /* Quiz */
  function answerQuiz(oi: number) {
    if (answered.includes(qIdx)) return;
    touch();
    const q    = QUIZ_QUESTIONS[qIdx];
    const good = oi === q.correct;
    setAnswered(prev => [...prev, qIdx]);

    if (good) {
      hapticMilestone();
      setQuizPts(p => p + 20);
      addPoints(20);
    } else {
      hapticError();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 700);
      applyPenalty(q.penalty);
    }

    setTimeout(() => {
      if (qIdx < QUIZ_QUESTIONS.length - 1) {
        setQIdx(i => i + 1);
      } else {
        updateProfile({ quizScore: quizPts + (good ? 20 : 0) });
        go("posgate");
      }
    }, 880);
  }

  function handlePOSUnlock(code: string) {
    updateProfile({ receiptCode: code });
    hapticMilestone();
    setShowPOS(false);
    setPhase("s2_terroir");
  }

  const canSubmit = firstName.trim() && lastName.trim() && phone4.trim().length === 4 && age;
  const activeSeedData = SEEDS.find(s => s.id === activeSeed)!;

  return (
    <div style={{
      position: "fixed",
      inset:    0,
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      <BackButton />

      {/* Ambient glow */}
      <div style={{
        position:  "absolute",
        top:       0,
        left:      "50%",
        transform: "translateX(-50%)",
        width:     1200,
        height:    350,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "100px 48px 48px",
        overflowY:      "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ════════ STEP A: DEMOGRAPHICS ════════ */}
          {step === "demo" && (
            <motion.div key="demo"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 680 }}
            >
              <p style={label}>Session 1 · Guest Registration</p>
              <h2 style={heading}>Guest Profile</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { ph: "FIRST NAME", val: firstName, set: setFirstName },
                  { ph: "LAST NAME",  val: lastName,  set: setLastName  },
                ].map(f => (
                  <input key={f.ph} type="text" value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    style={inputStyle}
                  />
                ))}
                <div style={{ display: "flex", gap: 16 }}>
                  <input type="text" value={phone4}
                    onChange={e => setPhone4(e.target.value.replace(/\D/g,"").slice(0,4))}
                    placeholder="LAST 4 OF PHONE" maxLength={4}
                    style={{ ...inputStyle, flex: 1, letterSpacing: "0.22em" }}
                  />
                  <input type="number" value={age} min={21} max={99}
                    onChange={e => setAge(e.target.value)}
                    placeholder="AGE"
                    style={{ ...inputStyle, width: 140 }}
                  />
                </div>
              </div>

              <motion.button type="button" onPointerDown={submitDemo} whileTap={{ scale: 0.97 }}
                style={canSubmit ? primaryBtn : disabledBtn}>
                CONTINUE →
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP B: GOLDEN BOX RULES ════════ */}
          {step === "rules" && (
            <motion.div key="rules"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 780 }}
            >
              <p style={label}>Session 1 · The Golden Box Rules</p>
              <h2 style={{ ...heading, marginBottom: 8 }}>How Your Points Are Scored</h2>
              <p style={{ color: "rgba(240,232,212,0.42)", fontSize: 18, margin: "0 0 32px", lineHeight: 1.5 }}>
                Every decision you make is measured against the Golden Box standard.
                Understand the rules before you play.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
                {[
                  {
                    icon: "✦",
                    title: "Visual Accuracy & Structural Synergy",
                    detail: "Each correct blend architecture decision and aesthetically coherent design choice earns +10 XP toward your session total.",
                    color: GOLD,
                    dir: "gain",
                    badge: "+10 XP",
                  },
                  {
                    icon: "⚠",
                    title: "Mentor Blind Quiz Failures",
                    detail: "Each incorrect answer during the Seed Priming quiz deducts 2 PTS from your running total — stay sharp on your leaf knowledge.",
                    color: "#C8322A",
                    dir: "loss",
                    badge: "−2 PTS",
                  },
                  {
                    icon: "💨",
                    title: "Volatile Blend Mechanics",
                    detail: "Locking in excess Ligero beyond airflow tolerance collapses the draw — this structural failure costs −5 PTS per violation.",
                    color: "#C87820",
                    dir: "loss",
                    badge: "−5 PTS",
                  },
                  {
                    icon: "🔁",
                    title: "Spend-Based Recovery · Cheat Codes",
                    detail: "Points lost can be FULLY REDEEMED and multiplied at your table. Activate Cheat Codes by placing orders: Cigar+Drink (2×), Double Pour (3×), Grand Slam Trifecta — Cigar+Drink+Food (5× + wipes all penalties).",
                    color: "#32B45A",
                    dir: "gain",
                    badge: "2×  3×  5×",
                  },
                ].map(r => (
                  <div key={r.title} style={{
                    display:      "flex",
                    gap:          18,
                    alignItems:   "flex-start",
                    background:   `rgba(${r.dir === "gain" ? "212,175,55" : "200,50,42"},0.05)`,
                    border:       `1px solid rgba(${r.dir === "gain" ? "212,175,55" : "200,50,42"},0.22)`,
                    borderRadius: 14,
                    padding:      "20px 22px",
                  }}>
                    <span style={{
                      fontSize:   28,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop:  2,
                      color:      r.color,
                    }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: "#F0E8D4", letterSpacing: "0.03em" }}>{r.title}</span>
                        <span style={{
                          background:    `rgba(${r.dir === "gain" ? "212,175,55" : "200,50,42"},0.18)`,
                          border:        `1px solid ${r.color}55`,
                          borderRadius:  8,
                          padding:       "4px 12px",
                          fontSize:      14,
                          fontWeight:    900,
                          color:         r.color,
                          letterSpacing: "0.12em",
                          flexShrink:    0,
                          marginLeft:    14,
                        }}>{r.badge}</span>
                      </div>
                      <p style={{ fontSize: 15, color: "rgba(240,232,212,0.52)", margin: 0, lineHeight: 1.55 }}>{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button type="button" onPointerDown={() => go("leaderboard")} whileTap={{ scale: 0.97 }}
                style={{ ...primaryBtn, boxShadow: `0 0 40px rgba(212,175,55,0.32)` }}>
                ACCEPT & INITIALIZE →
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP C: LEADERBOARD ════════ */}
          {step === "leaderboard" && (
            <motion.div key="leaderboard"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 760 }}
            >
              <p style={label}>Session 1 · Live Lounge Competition</p>
              <h2 style={heading}>Tonight's Rankings</h2>
              <LeaderboardTicker />
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 19, margin: "28px 0 36px", lineHeight: 1.6 }}>
                Welcome, <strong style={{ color: "#F0E8D4" }}>{firstName}</strong>. Your session
                is now initialized. Outperform the tables above and push your score to tonight's
                wall display.
              </p>
              <motion.button type="button" onPointerDown={() => go("mentor")} whileTap={{ scale: 0.97 }}
                style={primaryBtn}>
                SELECT YOUR MENTOR →
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP D: MENTOR PORTFOLIO ════════ */}
          {step === "mentor" && (
            <motion.div key="mentor"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 960 }}
            >
              <p style={label}>Session 1 · Master Blender Selection</p>
              <h2 style={{ ...heading, marginBottom: 8 }}>Choose Your Guide</h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 32px" }}>
                Your mentor defines your journey path, scoring bonuses, and expertise domain.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
                {MENTORS.map(m => {
                  const active = mentor === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      type="button"
                      onPointerDown={() => { touch(); setMentor(m.id); updateProfile({ mentor: m.id }); }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background:   active ? `rgba(212,175,55,0.07)` : "rgba(255,255,255,0.025)",
                        border:       active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 18,
                        padding:      0,
                        cursor:       "pointer",
                        textAlign:    "left",
                        fontFamily:   "'Inter', sans-serif",
                        overflow:     "hidden",
                        boxShadow:    active ? `0 0 36px rgba(212,175,55,0.22), 0 8px 32px rgba(0,0,0,0.50)` : "0 4px 20px rgba(0,0,0,0.40)",
                        transition:   "all 0.26s",
                      }}
                    >
                      {/* Flag portrait header */}
                      <div style={{
                        background: `linear-gradient(145deg, ${m.color}22 0%, rgba(0,0,0,0.60) 100%)`,
                        borderBottom: `1px solid rgba(255,255,255,0.07)`,
                        padding: "28px 24px 22px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}>
                        {/* Obsidian-glass flag frame */}
                        <div style={{
                          width:        88,
                          height:       88,
                          borderRadius: "50%",
                          background:   `radial-gradient(circle at 35% 30%, ${m.color}33, rgba(10,10,15,0.95))`,
                          border:       `2px solid ${active ? GOLD : "rgba(255,255,255,0.14)"}`,
                          boxShadow:    active
                            ? `0 0 24px rgba(212,175,55,0.40), inset 0 0 16px rgba(0,0,0,0.60)`
                            : `inset 0 0 16px rgba(0,0,0,0.60), 0 2px 12px rgba(0,0,0,0.40)`,
                          display:      "flex",
                          alignItems:   "center",
                          justifyContent: "center",
                          fontSize:     42,
                          transition:   "border-color 0.26s, box-shadow 0.26s",
                          backdropFilter: "blur(4px)",
                        }}>
                          {m.flag}
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <div style={{
                            fontSize:   19,
                            fontWeight: 800,
                            color:      active ? GOLD : "#F0E8D4",
                            letterSpacing: "0.03em",
                            lineHeight: 1.2,
                            transition: "color 0.24s",
                            marginBottom: 4,
                          }}>
                            {m.name}
                          </div>
                          <div style={{
                            fontSize:      11,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            color:         active ? `${GOLD}88` : "rgba(240,232,212,0.30)",
                            fontWeight:    700,
                            transition:    "color 0.24s",
                          }}>
                            {m.country} · {m.valley}
                          </div>
                        </div>
                      </div>

                      {/* Profile body */}
                      <div style={{ padding: "18px 20px 20px" }}>
                        <p style={{
                          fontSize:   14,
                          color:      "rgba(240,232,212,0.52)",
                          lineHeight: 1.58,
                          margin:     "0 0 14px",
                        }}>
                          {m.profile}
                        </p>
                        <div style={{
                          display:       "inline-flex",
                          alignItems:    "center",
                          gap:           6,
                          background:    active ? `rgba(212,175,55,0.12)` : "rgba(255,255,255,0.04)",
                          border:        `1px solid ${active ? GOLD + "44" : "rgba(255,255,255,0.08)"}`,
                          borderRadius:  8,
                          padding:       "5px 12px",
                          fontSize:      11,
                          fontWeight:    700,
                          color:         active ? GOLD : "rgba(240,232,212,0.35)",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          transition:    "all 0.24s",
                        }}>
                          <span style={{ fontSize: 8 }}>◆</span>
                          {m.specialty}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button type="button" onPointerDown={() => mentor && go("seed_canvas")} whileTap={{ scale: 0.97 }}
                style={mentor ? primaryBtn : disabledBtn}>
                BEGIN SEED TEXTURE ANALYSIS →
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP E: SEED QUALITY TEXTURE CANVAS ════════ */}
          {step === "seed_canvas" && (
            <motion.div key="seed_canvas"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 1040 }}
            >
              <p style={label}>Session 1 · Seed Priming Intelligence · Step 1.5</p>
              <h2 style={{ ...heading, marginBottom: 8 }}>Leaf Quality Recognition</h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 28px" }}>
                Study each leaf's structure before the blind identification test.
              </p>

              {/* Tab selector */}
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {SEEDS.map(s => (
                  <motion.button
                    key={s.id}
                    type="button"
                    onPointerDown={() => { touch(); setActiveSeed(s.id); }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      flex:          1,
                      padding:       "14px",
                      background:    activeSeed === s.id ? `rgba(212,175,55,0.10)` : "rgba(255,255,255,0.03)",
                      border:        activeSeed === s.id ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                      borderRadius:  10,
                      color:         activeSeed === s.id ? GOLD : "rgba(240,232,212,0.45)",
                      fontSize:      15,
                      fontWeight:    700,
                      cursor:        "pointer",
                      fontFamily:    "'Inter', sans-serif",
                      letterSpacing: "0.05em",
                      transition:    "all 0.22s",
                    }}
                  >
                    {s.name}
                  </motion.button>
                ))}
              </div>

              {/* Split-screen */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSeed}
                  initial={{ opacity: 0, x: 30, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 300, damping: 28 }}
                  style={{
                    display:      "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap:          20,
                    background:   "rgba(255,255,255,0.025)",
                    border:       "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 18,
                    overflow:     "hidden",
                  }}
                >
                  {/* LEFT: Texture render */}
                  <div style={{
                    background: `linear-gradient(160deg,
                      ${activeSeedData.leafColor2}CC 0%,
                      ${activeSeedData.leafColor1}EE 40%,
                      rgba(8,14,4,0.97) 100%)`,
                    minHeight:  380,
                    display:    "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position:   "relative",
                    overflow:   "hidden",
                  }}>
                    {/* Texture noise overlay */}
                    <div style={{
                      position: "absolute",
                      inset:    0,
                      opacity:  0.12,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                      backgroundSize: "180px",
                    }} />

                    {/* SVG Leaf */}
                    <svg width="180" height="260" viewBox="0 0 180 260" fill="none" style={{ position: "relative", zIndex: 2 }}>
                      <defs>
                        <radialGradient id={`lg_${activeSeed}`} cx="38%" cy="28%" r="65%">
                          <stop offset="0%" stopColor={activeSeedData.leafColor2} stopOpacity="1" />
                          <stop offset="55%" stopColor={activeSeedData.leafColor1} stopOpacity="1" />
                          <stop offset="100%" stopColor="rgba(4,8,2,1)" stopOpacity="1" />
                        </radialGradient>
                        <filter id="leafShadow">
                          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.55)" />
                        </filter>
                      </defs>

                      {/* Main leaf shape */}
                      <path
                        d="M90 8 C130 28 158 72 150 130 C142 188 118 238 90 252 C62 238 38 188 30 130 C22 72 50 28 90 8Z"
                        fill={`url(#lg_${activeSeed})`}
                        filter="url(#leafShadow)"
                      />

                      {/* Central vein */}
                      <line x1="90" y1="18" x2="90" y2="245"
                        stroke={activeSeedData.veins}
                        strokeWidth={activeSeed === "connecticut" ? 1.2 : 2.2}
                      />

                      {/* Side veins */}
                      {[40, 68, 96, 124, 152, 178].map((y, i) => {
                        const spread = activeSeed === "connecticut" ? 36 : activeSeed === "corojo" ? 48 : 42;
                        const sw     = activeSeed === "connecticut" ? 0.7 : 1.3;
                        return (
                          <g key={y}>
                            <line x1="90" y1={y} x2={90 - spread + i * 2} y2={y + 18}
                              stroke={activeSeedData.veins} strokeWidth={sw} />
                            <line x1="90" y1={y} x2={90 + spread - i * 2} y2={y + 18}
                              stroke={activeSeedData.veins} strokeWidth={sw} />
                          </g>
                        );
                      })}

                      {/* Oil sheen highlight */}
                      {activeSeed !== "connecticut" && (
                        <path
                          d="M90 8 C115 28 140 60 138 100 C130 80 110 55 90 45 C70 55 52 78 44 98 C42 60 65 28 90 8Z"
                          fill="rgba(255,255,255,0.06)"
                        />
                      )}
                    </svg>

                    {/* Zoom label */}
                    <div style={{
                      position:   "absolute",
                      bottom:     16,
                      left:       16,
                      fontSize:   10,
                      letterSpacing: "0.26em",
                      color:      "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}>
                      MACRO LEAF TEXTURE · LIVE RENDER
                    </div>
                  </div>

                  {/* RIGHT: Educational specs */}
                  <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      <div style={{
                        fontSize:      11,
                        letterSpacing: "0.32em",
                        color:         `${GOLD}80`,
                        textTransform: "uppercase",
                        fontWeight:    700,
                        marginBottom:  6,
                      }}>
                        {activeSeedData.origin}
                      </div>
                      <h3 style={{
                        fontFamily:    "'Cormorant Garamond', Georgia, serif",
                        fontSize:      30,
                        fontWeight:    400,
                        color:         "#F0E8D4",
                        margin:        "0 0 14px",
                        letterSpacing: "0.04em",
                      }}>
                        {activeSeedData.name}
                      </h3>
                      <p style={{
                        fontSize:   16,
                        color:      "rgba(240,232,212,0.52)",
                        lineHeight: 1.65,
                        margin:     0,
                      }}>
                        {activeSeedData.profile}
                      </p>
                    </div>

                    {/* Spec grid */}
                    <div style={{
                      display:             "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap:                 10,
                    }}>
                      {activeSeedData.specs.map(sp => (
                        <div key={sp.label} style={{
                          background:   "rgba(255,255,255,0.04)",
                          border:       "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 10,
                          padding:      "14px 16px",
                        }}>
                          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: `${GOLD}70`, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                            {sp.label}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#F0E8D4" }}>
                            {sp.val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vein density indicator */}
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.22em", color: `${GOLD}60`, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                        Vein Visibility Index
                      </div>
                      <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                        <motion.div
                          key={activeSeed}
                          initial={{ width: 0 }}
                          animate={{
                            width: activeSeed === "connecticut" ? "20%"
                                 : activeSeed === "criollo"     ? "60%"
                                 : "82%",
                          }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            height:       "100%",
                            background:   `linear-gradient(90deg, ${GOLD}66, ${GOLD})`,
                            borderRadius: 4,
                            boxShadow:    `0 0 8px ${GOLD}55`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <motion.button type="button" onPointerDown={() => go("quiz")} whileTap={{ scale: 0.97 }}
                style={{ ...primaryBtn, marginTop: 24 }}>
                BEGIN BLIND IDENTIFICATION TEST →
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP F: BLIND QUIZ ════════ */}
          {step === "quiz" && (
            <motion.div key="quiz"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ ...label, margin: 0 }}>Session 1 · Seed Priming Blind Test</p>
                <span style={{ color: `${GOLD}80`, fontSize: 15, fontWeight: 700 }}>
                  {qIdx + 1} / {QUIZ_QUESTIONS.length}
                </span>
              </div>

              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 32 }}>
                <motion.div
                  animate={{ width: `${(qIdx / QUIZ_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: "100%", background: GOLD, borderRadius: 2 }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={qIdx}
                  initial={{ opacity: 0, x: 36, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  exit={{ opacity: 0, x: -28 }}
                  transition={{ type: "spring", mass: 0.8, stiffness: 280, damping: 26 }}
                >
                  <h2 style={{
                    fontFamily:    "'Cormorant Garamond', Georgia, serif",
                    fontSize:      "clamp(22px, 3.2vw, 34px)",
                    fontWeight:    400,
                    color:         "#F0E8D4",
                    margin:        "0 0 30px",
                    lineHeight:    1.38,
                  }}>
                    {QUIZ_QUESTIONS[qIdx].question}
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    {QUIZ_QUESTIONS[qIdx].options.map((opt, oi) => {
                      const isAnswered = answered.includes(qIdx);
                      const isCorrect  = oi === QUIZ_QUESTIONS[qIdx].correct;
                      return (
                        <motion.button key={oi} type="button"
                          onPointerDown={() => !isAnswered && answerQuiz(oi)}
                          whileTap={isAnswered ? {} : { scale: 0.98 }}
                          animate={
                            isAnswered && isCorrect ? { background: "rgba(50,180,90,0.18)", borderColor: "#32B45A" } :
                            isAnswered && wrongFlash && !isCorrect ? { background: "rgba(200,50,42,0.14)", borderColor: "#C8322A" } :
                            {}
                          }
                          style={{
                            padding:    "19px 22px",
                            background: "rgba(255,255,255,0.04)",
                            border:     "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 12,
                            color:      "#F0E8D4",
                            fontSize:   20,
                            fontWeight: 500,
                            textAlign:  "left",
                            cursor:     isAnswered ? "default" : "pointer",
                            fontFamily: "'Inter', sans-serif",
                            display:    "flex",
                            alignItems: "center",
                            gap:        16,
                            transition: "background 0.22s, border-color 0.22s",
                          }}
                        >
                          <span style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "rgba(212,175,55,0.10)",
                            border: `1px solid ${GOLD}44`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 800, color: GOLD, flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p style={{ color: "rgba(200,50,42,0.65)", fontSize: 14, margin: "18px 0 0" }}>
                    Wrong answer = −{QUIZ_QUESTIONS[qIdx].penalty} pts
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════ STEP G: POS GATE ════════ */}
          {step === "posgate" && (
            <motion.div key="posgate"
              variants={PAGE_VARIANTS} initial="enter" animate="active" exit="exit"
              transition={PAGE_TRANSITION}
              style={{ width: "100%", maxWidth: 680, textAlign: "center" }}
            >
              <div style={{ fontSize: 64, marginBottom: 24 }}>🌱</div>
              <p style={label}>Session 1 · Complete</p>
              <h2 style={{ ...heading, color: GOLD }}>Seeds Primed</h2>
              <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 20, margin: "0 0 10px" }}>
                Session score: <strong style={{ color: GOLD }}>{profile.points} pts</strong>
              </p>
              <p style={{ color: "rgba(240,232,212,0.38)", fontSize: 18, margin: "0 0 36px", lineHeight: 1.6 }}>
                To ferment your seeds and access the Terroir Matrix, present your receipt code
                to your table server and enter it below.
              </p>
              <motion.button type="button" onPointerDown={() => { touch(); setShowPOS(true); }} whileTap={{ scale: 0.97 }}
                style={{ ...primaryBtn, boxShadow: `0 0 36px rgba(212,175,55,0.28)` }}>
                ENTER RECEIPT CODE →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {showPOS && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}

/* ─── Style constants ─── */
const label: React.CSSProperties = {
  fontSize:      10,
  letterSpacing: "0.38em",
  color:         "rgba(212,175,55,0.70)",
  textTransform: "uppercase",
  fontWeight:    700,
  margin:        "0 0 10px",
};

const heading: React.CSSProperties = {
  fontFamily:    "'Cormorant Garamond', Georgia, serif",
  fontSize:      "clamp(28px, 4vw, 48px)",
  fontWeight:    300,
  color:         "#F0E8D4",
  margin:        "0 0 36px",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding:      "20px 22px",
  background:   "rgba(255,255,255,0.04)",
  border:       "1px solid rgba(212,175,55,0.22)",
  borderRadius: 12,
  color:        "#F0E8D4",
  fontSize:     22,
  fontWeight:   600,
  letterSpacing: "0.07em",
  fontFamily:   "'Inter', sans-serif",
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box",
};

const primaryBtn: React.CSSProperties = {
  marginTop:     28,
  width:         "100%",
  padding:       "22px",
  background:    `linear-gradient(135deg, #D4AF37 0%, #9A7A14 100%)`,
  border:        "none",
  borderRadius:  12,
  color:         "#0A0604",
  fontSize:      20,
  fontWeight:    900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  cursor:        "pointer",
  fontFamily:    "'Inter', sans-serif",
};

const disabledBtn: React.CSSProperties = {
  marginTop:     28,
  width:         "100%",
  padding:       "22px",
  background:    "rgba(255,255,255,0.06)",
  border:        "1px solid rgba(255,255,255,0.10)",
  borderRadius:  12,
  color:         "rgba(255,255,255,0.28)",
  fontSize:      20,
  fontWeight:    900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  cursor:        "not-allowed",
  fontFamily:    "'Inter', sans-serif",
};
