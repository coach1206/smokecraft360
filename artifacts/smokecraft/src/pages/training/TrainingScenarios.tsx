/**
 * TrainingScenarios — /training/scenarios
 * Interactive scenario mission engine with 8 training scenarios.
 * Maxwell guides each step. Score tracked per session.
 */

import { useState }              from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }           from "wouter";
import {
  ArrowLeft, ArrowRight, CheckCircle, Star,
  Clock, ChevronRight, Target, Trophy,
} from "lucide-react";
import Maxwell                   from "@/components/Maxwell";
import TrainingBanner             from "@/components/training/TrainingBanner";
import { TRAINING_SCENARIOS, MAXWELL_INTROS } from "@/data/trainingData";

const T = {
  bg: "#06040a", card: "rgba(255,255,255,0.04)", border: "rgba(201,168,76,0.15)",
  gold: "#c9a84c", text: "rgba(240,232,212,0.92)", muted: "rgba(240,232,212,0.48)",
  light: "rgba(240,232,212,0.75)", green: "#34d399", amber: "#f59e0b",
  blue: "#60a5fa", red: "#ef4444", purple: "#a78bfa",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner:     T.green,
  intermediate: T.amber,
  advanced:     T.red,
};

const CATEGORY_COLOR: Record<string, string> = {
  customer:   T.gold,
  operations: T.blue,
  revenue:    T.green,
  ai:         T.purple,
};

export default function TrainingScenarios() {
  const [, navigate]           = useLocation();
  const [active, setActive]    = useState<string | null>(null);
  const [stepIdx, setStepIdx]  = useState(0);
  const [score, setScore]      = useState(0);
  const [done, setDone]        = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const scenario = active ? TRAINING_SCENARIOS.find((s) => s.id === active) ?? null : null;
  const step     = scenario ? scenario.steps[stepIdx] ?? null : null;

  const POINTS_PER_STEP = 20;

  function startScenario(id: string) {
    setActive(id);
    setStepIdx(0);
    setScore(0);
    setDone(false);
  }

  function nextStep() {
    setScore((s) => s + POINTS_PER_STEP);
    if (scenario && stepIdx < scenario.steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setDone(true);
      setCompletedIds((prev) => new Set([...prev, active!]));
    }
  }

  function exitScenario() {
    setActive(null);
    setStepIdx(0);
    setScore(0);
    setDone(false);
  }

  // ── Scenario detail / active ───────────────────────────────────────────────

  if (active && scenario) {
    const diffColor = DIFFICULTY_COLOR[scenario.difficulty] ?? T.muted;
    const finalScore = done ? score + POINTS_PER_STEP : score;
    const maxScore   = scenario.steps.length * POINTS_PER_STEP;
    const pct        = Math.round((finalScore / maxScore) * 100);

    if (done) {
      return (
        <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ maxWidth: 480, width: "100%", padding: 32, textAlign: "center" }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.2, repeat: 3 }}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `radial-gradient(circle, ${T.gold}30 0%, transparent 70%)`,
                border: `1px solid ${T.gold}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Trophy size={28} color={T.gold} />
            </motion.div>
            <div style={{ fontSize: 28, fontFamily: "'Cormorant Garamond',serif", color: T.gold, marginBottom: 6 }}>
              Scenario Complete
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 28 }}>{scenario.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: T.green, fontFamily: "'Cormorant Garamond',serif" }}>
                  {finalScore}
                </div>
                <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Points Earned</div>
              </div>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 60 ? T.amber : T.red, fontFamily: "'Cormorant Garamond',serif" }}>
                  {pct}%
                </div>
                <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Score</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={exitScenario} style={{
                background: "transparent", border: `1px solid ${T.border}`,
                borderRadius: 9, color: T.muted, padding: "10px 20px", cursor: "pointer", fontSize: 12,
              }}>
                Back to Scenarios
              </button>
              <button onClick={() => navigate("/training/certifications")} style={{
                background: T.gold, border: "none", borderRadius: 9,
                color: "#06040a", padding: "10px 22px", cursor: "pointer", fontSize: 12, fontWeight: 700,
              }}>
                View Certifications
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: `${T.bg}ee`, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`, padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <button onClick={exitScenario} style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 8, color: T.muted, fontSize: 11,
            padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>
            <ArrowLeft size={12} /> Scenarios
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{scenario.title}</div>
            <div style={{ fontSize: 9, color: diffColor, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {scenario.difficulty} · {scenario.category}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>{score} pts</div>
            <div style={{ display: "flex", gap: 3 }} data-scenario-dots>
              {scenario.steps.map((_, i) => (
                <div key={i} style={{
                  width: 18, height: 4, borderRadius: 2,
                  background: i < stepIdx ? T.green : i === stepIdx ? diffColor : "rgba(255,255,255,0.1)",
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
          </div>
        </div>
        <TrainingBanner />

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${diffColor}18`, border: `1px solid ${diffColor}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: diffColor,
                }}>
                  {stepIdx + 1}
                </div>
                <div style={{ fontSize: 10, color: T.muted }}>
                  Step {stepIdx + 1} of {scenario.steps.length}
                </div>
              </div>

              {/* Step card */}
              <div style={{
                background: `${diffColor}08`, border: `1px solid ${diffColor}25`,
                borderRadius: 14, padding: "28px 30px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 20, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: T.text, marginBottom: 14 }}>
                  {step?.title}
                </div>
                <div style={{ fontSize: 13, color: T.light, lineHeight: 1.75 }}>
                  {step?.description}
                </div>
              </div>

              {/* Maxwell guidance card */}
              <div style={{
                background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 11, padding: "16px 18px", marginBottom: 24,
              }}>
                <div style={{ fontSize: 9, color: T.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                  Maxwell
                </div>
                <div style={{ fontSize: 11.5, color: T.light, lineHeight: 1.7, fontStyle: "italic" }}>
                  "{step?.maxwell}"
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={nextStep} style={{
                  background: diffColor, border: "none",
                  borderRadius: 9, color: "#06040a", padding: "11px 26px",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                  {stepIdx < scenario.steps.length - 1 ? (
                    <><CheckCircle size={13} /> Step Complete <ArrowRight size={12} /></>
                  ) : (
                    <><Trophy size={13} /> Finish Scenario</>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <Maxwell message={step?.maxwell ?? ""} context={`${scenario.title} · Step ${stepIdx + 1}`} />
      </div>
    );
  }

  // ── Scenario list ──────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`, padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/training")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.muted, fontSize: 11,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          <ArrowLeft size={12} /> Training
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.gold, fontFamily: "'Cormorant Garamond',serif" }}>
            Training Scenarios
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {completedIds.size} of {TRAINING_SCENARIOS.length} complete
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={{
            background: `${T.gold}15`, border: `1px solid ${T.gold}30`,
            borderRadius: 7, padding: "5px 12px",
            fontSize: 11, color: T.gold, fontWeight: 600,
          }}>
            {completedIds.size * 100} pts earned
          </div>
        </div>
      </div>
      <TrainingBanner />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {TRAINING_SCENARIOS.map((sc, i) => {
            const diffColor = DIFFICULTY_COLOR[sc.difficulty] ?? T.muted;
            const catColor  = CATEGORY_COLOR[sc.category]   ?? T.muted;
            const done      = completedIds.has(sc.id);
            return (
              <motion.button
                key={sc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => startScenario(sc.id)}
                style={{
                  background: done ? `${T.green}08` : T.card,
                  border: `1px solid ${done ? T.green + "40" : T.border}`,
                  borderRadius: 12, padding: "18px 20px", cursor: "pointer",
                  textAlign: "left", transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{sc.title}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{sc.subtitle}</div>
                  </div>
                  {done && <CheckCircle size={16} color={T.green} />}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <span style={{
                    fontSize: 9, color: diffColor, background: `${diffColor}15`,
                    border: `1px solid ${diffColor}30`, borderRadius: 4,
                    padding: "2px 7px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em",
                  }}>{sc.difficulty}</span>
                  <span style={{
                    fontSize: 9, color: catColor, background: `${catColor}15`,
                    border: `1px solid ${catColor}30`, borderRadius: 4,
                    padding: "2px 7px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.1em",
                  }}>{sc.category}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 9, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={9} /> {sc.estimatedMin} min
                    </span>
                    <span style={{ fontSize: 9, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <Target size={9} /> {sc.steps.length} steps
                    </span>
                    <span style={{ fontSize: 9, color: T.gold }}>
                      {sc.steps.length * 20} pts
                    </span>
                  </div>
                  <ChevronRight size={12} color={T.muted} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <Maxwell message={MAXWELL_INTROS.scenarios} context="Scenario Library" />
    </div>
  );
}
