import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const COPPER = "#C8762A";

const SPIRIT_QUESTIONS = [
  {
    q: "Which peat level is associated with Islay Scotch whisky's signature smoky character?",
    opts: ["0–10 PPM", "10–30 PPM", "30–50 PPM", "50+ PPM"],
    correct: 3,
  },
  {
    q: "High corn content in Bourbon creates which dominant flavor compound?",
    opts: ["Vanillin", "Lactone", "Ethyl Acetate", "Cinnamaldehyde"],
    correct: 0,
  },
  {
    q: "Which tobacco leaf pairs best with a high-sugar Bourbon finish?",
    opts: ["Connecticut Shade", "Criollo", "Ligero Nicaraguan", "Habano Ecuador"],
    correct: 0,
  },
];

type Step = "spiritquiz" | "sensorytrap" | "leafsliders";

export function S3_FormulationLab() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();

  const [step, setStep]         = useState<Step>("spiritquiz");
  const [qIdx, setQIdx]         = useState(0);
  const [answered, setAnswered] = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [failed, setFailed]     = useState(false);
  const [xpRecovered, setXpRecovered] = useState(false);

  const [volado, setVolado] = useState(profile.volado);
  const [seco, setSeco]     = useState(profile.seco);
  const [ligero, setLigero] = useState(profile.ligero);

  const total = volado + seco + ligero;
  const balanced = total === 100;

  function touch() { playClick(); hapticClick(); }

  function answerSpirit(oi: number) {
    if (answered.includes(qIdx)) return;
    touch();
    const q = SPIRIT_QUESTIONS[qIdx];
    const correct = oi === q.correct;
    setAnswered(prev => [...prev, qIdx]);

    if (correct) {
      hapticMilestone();
      addPoints(20);
    } else {
      hapticError();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 700);
      applyPenalty(10);
      setFailed(true);
    }

    setTimeout(() => {
      if (!correct) {
        setStep("sensorytrap");
        return;
      }
      if (qIdx < SPIRIT_QUESTIONS.length - 1) {
        setQIdx(i => i + 1);
      } else {
        setStep("leafsliders");
      }
    }, 820);
  }

  function handleXPRecovery() {
    touch();
    hapticMilestone();
    addPoints(20);
    setXpRecovered(true);
    setTimeout(() => {
      setFailed(false);
      setStep("leafsliders");
    }, 1200);
  }

  function handleSkipTrap() {
    touch();
    setFailed(false);
    setStep("leafsliders");
  }

  function handleSubmitLeaf() {
    touch();
    if (!balanced) return;
    hapticMilestone();
    updateProfile({ volado, seco, ligero });
    addPoints(30);
    setPhase("s4_vitola");
  }

  const LEAF_SLIDERS = [
    { id: "volado", label: "Volado",  sub: "Burn Physics · Filler Base",    val: volado, set: setVolado, color: "#6AAF3D" },
    { id: "seco",   label: "Seco",    sub: "Aroma Expression · Mid Leaf",   val: seco,   set: setSeco,   color: GOLD     },
    { id: "ligero", label: "Ligero",  sub: "Strength & Oil · Crown Leaf",   val: ligero, set: setLigero, color: COPPER   },
  ] as const;

  /* Leaf texture computed from ratios */
  const thicknessLabel = ligero > 50 ? "Heavy" : ligero > 30 ? "Medium" : "Fine";
  const veinsLabel     = volado > 50 ? "Prominent" : volado > 30 ? "Moderate" : "Delicate";
  const oilLabel       = seco > 50 ? "High Sheen" : seco > 30 ? "Balanced" : "Dry";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      <BackButton />

      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1000,
        height: 320,
        background: "radial-gradient(ellipse at 50% 0%, rgba(200,118,42,0.10) 0%, transparent 70%)",
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

          {/* ── Spirit Quiz ── */}
          {step === "spiritquiz" && (
            <motion.div
              key="spiritquiz"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${COPPER}99`, textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
                  Session 3 · Spirit Alignment Engine
                </p>
                <span style={{ color: `${COPPER}80`, fontSize: 14, fontWeight: 700 }}>
                  {qIdx + 1} / {SPIRIT_QUESTIONS.length}
                </span>
              </div>

              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 32 }}>
                <motion.div
                  animate={{ width: `${(qIdx / SPIRIT_QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: "100%", background: COPPER, borderRadius: 2 }}
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
                    fontSize: "clamp(22px, 3vw, 34px)",
                    fontWeight: 400,
                    color: "#F0E8D4",
                    margin: "0 0 30px",
                    lineHeight: 1.38,
                  }}>
                    {SPIRIT_QUESTIONS[qIdx].q}
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    {SPIRIT_QUESTIONS[qIdx].opts.map((opt, oi) => {
                      const isAnswered = answered.includes(qIdx);
                      const isCorrect = oi === SPIRIT_QUESTIONS[qIdx].correct;
                      return (
                        <motion.button
                          key={oi}
                          type="button"
                          onPointerDown={() => !isAnswered && answerSpirit(oi)}
                          whileTap={isAnswered ? {} : { scale: 0.98 }}
                          animate={
                            isAnswered && isCorrect ? { background: "rgba(50,180,90,0.18)", borderColor: "#32B45A" } :
                            isAnswered && wrongFlash && !isCorrect ? { background: "rgba(200,50,42,0.14)", borderColor: "#C8322A" } :
                            {}
                          }
                          style={{
                            padding: "18px 22px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 12,
                            color: "#F0E8D4",
                            fontSize: 19,
                            fontWeight: 500,
                            textAlign: "left",
                            cursor: isAnswered ? "default" : "pointer",
                            fontFamily: "'Inter', sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            transition: "background 0.2s, border-color 0.2s",
                          }}
                        >
                          <span style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "rgba(200,118,42,0.10)",
                            border: `1px solid ${COPPER}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 800,
                            color: COPPER,
                            flexShrink: 0,
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Sensory Trap ── */}
          {step === "sensorytrap" && (
            <motion.div
              key="sensorytrap"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 680, textAlign: "center" }}
            >
              <motion.div
                animate={{ borderColor: ["#C8322A", "#D4AF37", "#C8322A"] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: "rgba(200,50,42,0.08)",
                  border: "2px solid #C8322A",
                  borderRadius: 20,
                  padding: "44px 40px",
                  marginBottom: 28,
                }}
              >
                <div style={{ fontSize: 52, marginBottom: 18 }}>⚠</div>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  fontWeight: 400,
                  color: "#F0E8D4",
                  margin: "0 0 16px",
                }}>
                  Sensory Alignment Failed
                </h2>
                <p style={{
                  color: "rgba(240,232,212,0.70)",
                  fontSize: 20,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  Your chemical palate requires calibration. Order the{" "}
                  <strong style={{ color: GOLD }}>SmokeCraft Flight</strong> from your table server
                  right now to taste this exact chemical harmony and unlock a{" "}
                  <strong style={{ color: "#32B45A" }}>+20 XP recovery bonus</strong>.
                </p>
              </motion.div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <motion.button
                  type="button"
                  onPointerDown={handleXPRecovery}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: "22px",
                    background: `linear-gradient(135deg, #32B45A 0%, #1A7A36 100%)`,
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: "0.20em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: "0 0 28px rgba(50,180,90,0.28)",
                  }}
                >
                  {xpRecovered ? "✓ +20 XP RECOVERED" : "I ORDERED THE FLIGHT · CLAIM +20 XP"}
                </motion.button>
                <button
                  type="button"
                  onPointerDown={handleSkipTrap}
                  style={{
                    padding: "18px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    color: "rgba(240,232,212,0.40)",
                    fontSize: 16,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Skip recovery — continue without bonus
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Leaf Morphology Sliders ── */}
          {step === "leafsliders" && (
            <motion.div
              key="leafsliders"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 820 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 3 · Leaf Morphology
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(26px, 3.6vw, 44px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
              }}>
                3-Tier Leaf Allocation
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 32px" }}>
                Allocate exactly 100% across all three leaf tiers.
              </p>

              <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
                {/* Sliders column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                  {LEAF_SLIDERS.map(sl => (
                    <div key={sl.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <div>
                          <span style={{ color: sl.color, fontSize: 16, fontWeight: 700 }}>{sl.label}</span>
                          <span style={{ color: "rgba(240,232,212,0.32)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginLeft: 10 }}>
                            {sl.sub}
                          </span>
                        </div>
                        <motion.span key={sl.val} initial={{ scale: 1.18 }} animate={{ scale: 1 }}
                          style={{ color: sl.color, fontSize: 22, fontWeight: 800 }}>
                          {sl.val}%
                        </motion.span>
                      </div>
                      <div style={{ position: "relative", height: 46, display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3 }} />
                        <div style={{
                          position: "absolute", left: 0, width: `${sl.val}%`, height: 5,
                          background: `linear-gradient(90deg, ${sl.color}55, ${sl.color})`,
                          borderRadius: 3, boxShadow: `0 0 10px ${sl.color}50`, transition: "width 0.08s",
                        }} />
                        <input type="range" min={0} max={100} value={sl.val}
                          onChange={e => sl.set(Number(e.target.value))}
                          style={{ position: "absolute", left: 0, right: 0, width: "100%", height: 46, opacity: 0, zIndex: 3, cursor: "pointer", touchAction: "none", margin: 0, padding: 0 }} />
                        <motion.div
                          animate={{ left: `calc(${sl.val}% - 13px)` }}
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                          style={{
                            position: "absolute", width: 26, height: 26, borderRadius: "50%",
                            background: `radial-gradient(circle at 33% 30%, #fff9, ${sl.color} 55%, #4A2800)`,
                            border: `2.5px solid ${sl.color}`,
                            boxShadow: `0 0 16px ${sl.color}88, 0 2px 8px rgba(0,0,0,0.60)`,
                            pointerEvents: "none", top: "50%", transform: "translateY(-50%)", zIndex: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Total indicator */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: balanced ? "rgba(50,180,90,0.08)" : "rgba(200,50,42,0.08)",
                    border: `1.5px solid ${balanced ? "#32B45A" : "#C8322A"}`,
                    borderRadius: 10,
                    transition: "all 0.28s",
                  }}>
                    <span style={{ color: "rgba(240,232,212,0.60)", fontSize: 16, letterSpacing: "0.08em" }}>
                      TOTAL ALLOCATION
                    </span>
                    <span style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: balanced ? "#32B45A" : "#C8322A",
                      transition: "color 0.2s",
                    }}>
                      {total}%
                    </span>
                  </div>
                </div>

                {/* Live texture render */}
                <div style={{
                  width: 220,
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "22px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  alignItems: "center",
                }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.28em", color: `${GOLD}66`, textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
                    Live Texture
                  </p>

                  {/* SVG leaf silhouette */}
                  <svg width="100" height="140" viewBox="0 0 100 140" fill="none">
                    <defs>
                      <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={`hsl(${80 + ligero},${40 + seco * 0.3}%,${25 + volado * 0.2}%)`} />
                        <stop offset="100%" stopColor={`hsl(${60 + seco},${30 + ligero * 0.25}%,${15 + volado * 0.15}%)`} />
                      </linearGradient>
                    </defs>
                    <path
                      d="M50 5 C80 20 90 55 82 90 C74 120 60 135 50 135 C40 135 26 120 18 90 C10 55 20 20 50 5Z"
                      fill="url(#leafGrad)"
                      stroke={GOLD + "44"}
                      strokeWidth="1"
                    />
                    {/* Veins */}
                    <line x1="50" y1="15" x2="50" y2="128" stroke={`rgba(212,175,55,${0.15 + volado * 0.003})`} strokeWidth={1 + volado * 0.025} />
                    {[30, 50, 70, 90].map((y, i) => (
                      <line key={i} x1="50" y1={y}
                        x2={i % 2 === 0 ? 50 - (22 - i * 3) : 50 + (22 - i * 3)} y2={y + 12}
                        stroke={`rgba(212,175,55,${0.10 + volado * 0.002})`} strokeWidth={0.8} />
                    ))}
                  </svg>

                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Thickness", val: thicknessLabel, color: COPPER },
                      { label: "Veins",     val: veinsLabel,     color: "#6AAF3D" },
                      { label: "Oil Sheen", val: oilLabel,       color: GOLD     },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "rgba(240,232,212,0.36)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                type="button"
                onPointerDown={handleSubmitLeaf}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: balanced
                    ? `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`
                    : "rgba(255,255,255,0.06)",
                  border: balanced ? "none" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  color: balanced ? "#0A0604" : "rgba(255,255,255,0.28)",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: balanced ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {balanced ? "LOCK LEAF BLEND → SESSION 4" : `MUST EQUAL 100% (${total}% allocated)`}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
