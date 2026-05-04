import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductResult } from "@/services/api";
import ExperienceFrame from "@/components/ExperienceFrame";
import { getAuthHeaders } from "@/services/auth";

interface TasteChallengeProps {
  product: ProductResult;
  cigar?: ProductResult | null;
  accent?: string;
  testId?: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

const ALL_FLAVORS = [
  "citrus", "caramel", "smoky", "crisp", "oak", "vanilla", "honey",
  "spicy", "fruity", "floral", "cocoa", "dark-chocolate", "nutty",
  "cream", "toasted", "pepper", "earthy", "leather", "cedar", "sweet",
];

const ALL_MOODS = ["relaxed", "social", "bold", "focused", "celebratory", "adventurous"];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateQuestions(p: ProductResult, cigar?: ProductResult | null): Question[] {
  const questions: Question[] = [];
  const notes = p.flavorNotes ?? [];
  const seed = p.name.length * 7 + (p.strength ?? 3) * 13;

  if (notes.length >= 1) {
    const correct = notes[0];
    const distractors = seededShuffle(
      ALL_FLAVORS.filter(f => !notes.includes(f)),
      seed,
    ).slice(0, 3);
    const options = seededShuffle([correct, ...distractors], seed + 1);
    questions.push({
      id: "flavor",
      question: `Which flavor note leads in ${p.name}?`,
      options,
      correctIndex: options.indexOf(correct),
    });
  }

  const strLabels = ["Very light", "Light", "Medium", "Bold", "Very bold"];
  const correctStr = strLabels[Math.min((p.strength ?? 3) - 1, 4)];
  questions.push({
    id: "strength",
    question: `How would you rate the strength of ${p.name}?`,
    options: strLabels,
    correctIndex: strLabels.indexOf(correctStr),
  });

  if (cigar && cigar.name) {
    const correct = cigar.name;
    const fakeCigars = seededShuffle(
      ["Montecristo No. 2", "Arturo Fuente", "Cohiba Robusto", "Padron 1964", "Romeo y Julieta"],
      seed + 2,
    ).filter(c => c !== correct).slice(0, 3);
    const options = seededShuffle([correct, ...fakeCigars], seed + 3);
    questions.push({
      id: "pairing",
      question: `Which cigar did the engine pair with ${p.name}?`,
      options,
      correctIndex: options.indexOf(correct),
    });
  } else {
    const correctMood = p.moodTags?.[0] ?? "relaxed";
    const distractors = seededShuffle(
      ALL_MOODS.filter(m => m !== correctMood),
      seed + 4,
    ).slice(0, 3);
    const options = seededShuffle([correctMood, ...distractors], seed + 5);
    questions.push({
      id: "mood",
      question: `What mood best fits ${p.name}?`,
      options,
      correctIndex: options.indexOf(correctMood),
    });
  }

  return questions;
}

const POINTS_CORRECT = 15;
const POINTS_ATTEMPT = 5;

function awardPoints(points: number) {
  fetch(`${import.meta.env.BASE_URL}api/loyalty/award`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ points, reason: "taste_challenge" }),
  }).catch(() => {});
}

export default function TasteChallenge({ product, cigar, accent = "#D4AF37", testId = "taste-challenge" }: TasteChallengeProps) {
  const questions = useMemo(() => generateQuestions(product, cigar), [product, cigar]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [complete, setComplete] = useState(false);

  const q = questions[qIdx];

  function handleAnswer(optIdx: number) {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    const isCorrect = optIdx === q.correctIndex;
    const pts = isCorrect ? POINTS_CORRECT : POINTS_ATTEMPT;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    awardPoints(pts);
  }

  function next() {
    if (qIdx + 1 >= questions.length) {
      setComplete(true);
      return;
    }
    setQIdx(qIdx + 1);
    setSelected(null);
    setAnswered(false);
  }

  if (complete) {
    const totalPts = score.correct * POINTS_CORRECT + (score.total - score.correct) * POINTS_ATTEMPT;
    return (
      <ExperienceFrame accent={`${accent}44`} padding="24px 28px" testId={testId}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
          <p style={{
            margin: 0, fontSize: 10, letterSpacing: "0.32em",
            textTransform: "uppercase", color: accent, fontWeight: 600,
          }}>
            Challenge Complete
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          data-testid={`${testId}-complete`}
        >
          <h4 style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: 28, fontWeight: 600, margin: "0 0 8px", color: "#FFFFFF",
          }}>
            {score.correct}/{score.total}
          </h4>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#E5E5E5", lineHeight: 1.6 }}>
            {score.correct === score.total
              ? "Perfect score. You know your craft."
              : score.correct >= Math.ceil(score.total / 2)
              ? "Solid palate. Keep tasting."
              : "Every sip teaches something new."}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: accent, fontWeight: 600 }}>
            +{totalPts} pts earned
          </p>
        </motion.div>
      </ExperienceFrame>
    );
  }

  return (
    <ExperienceFrame accent={`${accent}44`} padding="24px 28px" testId={testId}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
          <p style={{
            margin: 0, fontSize: 10, letterSpacing: "0.32em",
            textTransform: "uppercase", color: accent, fontWeight: 600,
          }}>
            Taste Challenge
          </p>
        </div>
        <p style={{
          margin: 0, fontSize: 11, color: "rgba(229,229,229,0.6)",
          letterSpacing: "0.1em",
        }}>
          {qIdx + 1} / {questions.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h4
            data-testid={`${testId}-question`}
            style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: 18, fontWeight: 600, margin: "0 0 18px", color: "#FFFFFF",
              lineHeight: 1.4,
            }}
          >
            {q.question}
          </h4>

          <div style={{ display: "grid", gap: 10 }}>
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isSelected = i === selected;
              let bg = "rgba(255,255,255,0.06)";
              let border = "1px solid rgba(255,255,255,0.1)";
              let color = "#E5E5E5";

              if (answered) {
                if (isCorrect) {
                  bg = "rgba(122,154,106,0.25)";
                  border = "1px solid rgba(122,154,106,0.6)";
                  color = "#FFFFFF";
                } else if (isSelected && !isCorrect) {
                  bg = "rgba(229,129,143,0.2)";
                  border = "1px solid rgba(229,129,143,0.5)";
                  color = "#E5818F";
                }
              }

              return (
                <motion.button
                  key={i}
                  type="button"
                  data-testid={`${testId}-option-${i}`}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  whileHover={answered ? undefined : { scale: 1.02 }}
                  whileTap={answered ? undefined : { scale: 0.98 }}
                  style={{
                    background: bg,
                    border,
                    color,
                    padding: "12px 18px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: answered ? "default" : "pointer",
                    transition: "all 0.25s ease",
                  }}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <p style={{
                margin: 0, fontSize: 12, fontWeight: 600,
                color: selected === q.correctIndex ? "#7A9A6A" : "#E5818F",
              }}>
                {selected === q.correctIndex
                  ? `Correct! +${POINTS_CORRECT} pts`
                  : `+${POINTS_ATTEMPT} pts for trying`}
              </p>
              <button
                type="button"
                data-testid={`${testId}-next`}
                onClick={next}
                style={{
                  background: accent,
                  color: "#0a0604",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {qIdx + 1 >= questions.length ? "Results" : "Next"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </ExperienceFrame>
  );
}
