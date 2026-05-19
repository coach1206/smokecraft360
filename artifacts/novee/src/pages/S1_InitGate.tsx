import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

const MENTORS = [
  { id: "don_aurelio",   name: "Don Aurelio",    craft: "Habano Traditionalist", glyph: "🕯" },
  { id: "senora_criollo", name: "Señora Criollo", craft: "New World Artisan",     glyph: "🌿" },
  { id: "master_vance",  name: "Master Vance",   craft: "Connecticut Devotee",   glyph: "⚗" },
  { id: "professor_k",   name: "Professor K",    craft: "Soil & Terroir",        glyph: "🔬" },
  { id: "lady_faulkner", name: "Lady Faulkner",  craft: "Pairing Sommelier",     glyph: "🍷" },
  { id: "iron_rojas",    name: "Hierro Rojas",   craft: "Strength & Ligero",     glyph: "🔥" },
];

const QUIZ_QUESTIONS = [
  {
    id: "q1",
    question: "Which tobacco leaf is known for its oily sheen and mild, creamy combustion?",
    options: ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"],
    correct: 2,
    penalty: 5,
  },
  {
    id: "q2",
    question: "The Corojo leaf originates primarily from which region?",
    options: ["Dominican Republic", "Ecuador", "Vuelta Abajo, Cuba", "Nicaragua"],
    correct: 2,
    penalty: 5,
  },
  {
    id: "q3",
    question: "Criollo '98 is prized for its balance of which two characteristics?",
    options: [
      "Sweetness & Burn Rate",
      "Strength & Aroma Complexity",
      "Light Color & Low Nicotine",
      "Cedar Notes & Mild Pepper",
    ],
    correct: 1,
    penalty: 5,
  },
];

type Step = "demo" | "leaderboard" | "mentor" | "quiz" | "posgate";

export function S1_InitGate() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();

  const [step, setStep]               = useState<Step>("demo");
  const [firstName, setFirstName]     = useState(profile.firstName || "");
  const [lastName, setLastName]       = useState(profile.lastName  || "");
  const [phone4, setPhone4]           = useState(profile.phone4    || "");
  const [age, setAge]                 = useState<string>(profile.age ? String(profile.age) : "");
  const [mentor, setMentor]           = useState<string | null>(profile.mentor);
  const [qIdx, setQIdx]               = useState(0);
  const [quizScore, setQuizScore]     = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number[]>([]);
  const [wrongFlash, setWrongFlash]   = useState(false);
  const [showPOSGate, setShowPOSGate] = useState(false);

  /* helpers */
  function touch() { playClick(); hapticClick(); }

  function goStep(s: Step) {
    touch();
    setStep(s);
  }

  /* S1-A: Demographics submit */
  function submitDemo() {
    if (!firstName.trim() || !lastName.trim() || !phone4.trim() || !age) return;
    touch();
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone4: phone4.trim().slice(-4),
      age: parseInt(age),
    });
    addPoints(10);
    goStep("leaderboard");
  }

  /* S1-C: Mentor select */
  function selectMentor(id: string) {
    touch();
    setMentor(id);
    updateProfile({ mentor: id });
  }

  /* S1-D: Quiz answer */
  function answerQuiz(optIdx: number) {
    if (quizAnswered.includes(qIdx)) return;
    touch();
    const q = QUIZ_QUESTIONS[qIdx];
    const correct = optIdx === q.correct;
    setQuizAnswered(prev => [...prev, qIdx]);

    if (correct) {
      hapticMilestone();
      const pts = 20;
      setQuizScore(prev => prev + pts);
      addPoints(pts);
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
        updateProfile({ quizScore: quizScore + (correct ? 20 : 0) });
        goStep("posgate");
      }
    }, 900);
  }

  /* S1-E: POS unlock */
  function handlePOSUnlock(code: string) {
    updateProfile({ receiptCode: code });
    hapticMilestone();
    setShowPOSGate(false);
    setPhase("s2_terroir");
  }

  const canSubmitDemo = firstName.trim() && lastName.trim() && phone4.trim().length === 4 && age;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      <BackButton />

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1100,
        height: 380,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 48px 48px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── STEP A: Demographics ── */}
          {step === "demo" && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 680 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 1 · Initialization Gate
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(30px, 4vw, 48px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 36px",
                letterSpacing: "0.05em",
              }}>
                Guest Profile
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "FIRST NAME", val: firstName, set: setFirstName, type: "text" },
                  { label: "LAST NAME",  val: lastName,  set: setLastName,  type: "text" },
                ].map(f => (
                  <input
                    key={f.label}
                    type={f.type}
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.label}
                    style={{
                      padding: "20px 22px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(212,175,55,0.22)",
                      borderRadius: 12,
                      color: "#F0E8D4",
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      fontFamily: "'Inter', sans-serif",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                ))}
                <div style={{ display: "flex", gap: 16 }}>
                  <input
                    type="text"
                    value={phone4}
                    onChange={e => setPhone4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="LAST 4 OF PHONE"
                    maxLength={4}
                    style={{
                      flex: 1,
                      padding: "20px 22px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(212,175,55,0.22)",
                      borderRadius: 12,
                      color: "#F0E8D4",
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "0.22em",
                      fontFamily: "'Inter', sans-serif",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="AGE"
                    min={21}
                    max={99}
                    style={{
                      width: 140,
                      padding: "20px 22px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(212,175,55,0.22)",
                      borderRadius: 12,
                      color: "#F0E8D4",
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <motion.button
                type="button"
                onPointerDown={submitDemo}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 28,
                  width: "100%",
                  padding: "22px",
                  background: canSubmitDemo
                    ? `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`
                    : "rgba(255,255,255,0.06)",
                  border: canSubmitDemo ? "none" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  color: canSubmitDemo ? "#0A0604" : "rgba(255,255,255,0.28)",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: canSubmitDemo ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                CONTINUE →
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP B: Leaderboard ── */}
          {step === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 760 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 1 · Live Lounge Competition
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(30px, 4vw, 48px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 32px",
                letterSpacing: "0.05em",
              }}>
                Tonight's Leaderboard
              </h2>

              <LeaderboardTicker />

              <p style={{
                color: "rgba(240,232,212,0.40)",
                fontSize: 18,
                margin: "28px 0 36px",
                lineHeight: 1.6,
              }}>
                Welcome, <strong style={{ color: "#F0E8D4" }}>{firstName}</strong>. Your session
                begins now. Outperform the tables and push your score to the top of tonight's display.
              </p>

              <motion.button
                type="button"
                onPointerDown={() => goStep("mentor")}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
                  border: "none",
                  borderRadius: 12,
                  color: "#0A0604",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                SELECT YOUR MENTOR →
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP C: Mentor ── */}
          {step === "mentor" && (
            <motion.div
              key="mentor"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 820 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 1 · Mentor Selection
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
                letterSpacing: "0.05em",
              }}>
                Choose Your Guide
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 32px" }}>
                Your mentor shapes your journey and scoring bonuses.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 32,
              }}>
                {MENTORS.map(m => {
                  const active = mentor === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      type="button"
                      onPointerDown={() => selectMentor(m.id)}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background: active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                        border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 14,
                        padding: "24px 18px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: active ? `0 0 28px rgba(212,175,55,0.20)` : "none",
                        transition: "all 0.22s",
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 10 }}>{m.glyph}</div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: active ? GOLD : "#F0E8D4",
                        marginBottom: 6,
                        letterSpacing: "0.04em",
                        transition: "color 0.22s",
                      }}>
                        {m.name}
                      </div>
                      <div style={{
                        fontSize: 12,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: active ? `${GOLD}88` : "rgba(240,232,212,0.36)",
                        transition: "color 0.22s",
                      }}>
                        {m.craft}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                type="button"
                onPointerDown={() => mentor && goStep("quiz")}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: mentor
                    ? `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`
                    : "rgba(255,255,255,0.06)",
                  border: mentor ? "none" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  color: mentor ? "#0A0604" : "rgba(255,255,255,0.28)",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: mentor ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                BEGIN SEED PRIMING TEST →
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP D: Blind Quiz ── */}
          {step === "quiz" && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
                  Session 1 · Seed Priming Blind Test
                </p>
                <span style={{ color: `${GOLD}80`, fontSize: 14, fontWeight: 700, letterSpacing: "0.10em" }}>
                  {qIdx + 1} / {QUIZ_QUESTIONS.length}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 32 }}>
                <motion.div
                  animate={{ width: `${((qIdx) / QUIZ_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: "100%", background: GOLD, borderRadius: 2 }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={qIdx}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(24px, 3.2vw, 36px)",
                    fontWeight: 400,
                    color: "#F0E8D4",
                    margin: "0 0 32px",
                    lineHeight: 1.35,
                    letterSpacing: "0.03em",
                  }}>
                    {QUIZ_QUESTIONS[qIdx].question}
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {QUIZ_QUESTIONS[qIdx].options.map((opt, oi) => {
                      const answered = quizAnswered.includes(qIdx);
                      const isCorrect = oi === QUIZ_QUESTIONS[qIdx].correct;
                      return (
                        <motion.button
                          key={oi}
                          type="button"
                          onPointerDown={() => !answered && answerQuiz(oi)}
                          whileTap={answered ? {} : { scale: 0.98 }}
                          animate={
                            answered && isCorrect ? { background: "rgba(50,180,90,0.20)", borderColor: "#32B45A" } :
                            answered && wrongFlash && !isCorrect ? { background: "rgba(200,50,42,0.16)", borderColor: "#C8322A" } :
                            {}
                          }
                          style={{
                            padding: "20px 24px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 12,
                            color: "#F0E8D4",
                            fontSize: 20,
                            fontWeight: 500,
                            textAlign: "left",
                            cursor: answered ? "default" : "pointer",
                            fontFamily: "'Inter', sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            transition: "background 0.2s, border-color 0.2s",
                          }}
                        >
                          <span style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "rgba(212,175,55,0.10)",
                            border: `1px solid ${GOLD}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 800,
                            color: GOLD,
                            flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>

                  <p style={{
                    color: "rgba(200,50,42,0.70)",
                    fontSize: 14,
                    margin: "18px 0 0",
                    letterSpacing: "0.08em",
                  }}>
                    Wrong answer = −{QUIZ_QUESTIONS[qIdx].penalty} pts
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── STEP E: POS Gate ── */}
          {step === "posgate" && (
            <motion.div
              key="posgate"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 680, textAlign: "center" }}
            >
              <div style={{ fontSize: 64, marginBottom: 24 }}>🌱</div>
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
                Session 1 · Complete
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 16px",
                letterSpacing: "0.05em",
              }}>
                Seeds Primed
              </h2>
              <p style={{
                color: "rgba(240,232,212,0.45)",
                fontSize: 20,
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}>
                Session score: <strong style={{ color: GOLD }}>{profile.points} pts</strong>
              </p>
              <p style={{
                color: "rgba(240,232,212,0.40)",
                fontSize: 18,
                margin: "0 0 36px",
                lineHeight: 1.6,
              }}>
                To ferment your seeds and access the Terroir Matrix, present your receipt code to your
                table server and enter it below.
              </p>

              <motion.button
                type="button"
                onPointerDown={() => { touch(); setShowPOSGate(true); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
                  border: "none",
                  borderRadius: 12,
                  color: "#0A0604",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 0 36px rgba(212,175,55,0.28)`,
                }}
              >
                ENTER RECEIPT CODE →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {showPOSGate && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}
