/**
 * EnrollmentFlow — cinematic one-question-at-a-time guest enrollment.
 *
 * Presents 5 questions sequentially with Framer Motion transitions.
 * After the final answer, calls enroll() from GuestProfileContext, then
 * invokes onComplete() so the parent can show MentorReveal.
 *
 * Props:
 *   craftType  — determines which mentor pool is used
 *   onComplete — called after successful enrollment (receives mentor data via context)
 *   onSkip     — called when guest dismisses enrollment (anonymous mode)
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence }      from "framer-motion";
import { ArrowRight, SkipForward }      from "lucide-react";
import { useGuestProfile }              from "@/contexts/GuestProfileContext";

// ── Question definitions ──────────────────────────────────────────────────────

interface TextQuestion {
  type:        "text";
  id:          string;
  prompt:      string;
  sub:         string;
  placeholder: string;
  maxLength?:  number;
  transform?:  (v: string) => string;
  validate?:   (v: string) => boolean;
}

interface ChoiceQuestion {
  type:    "choice";
  id:      string;
  prompt:  string;
  sub:     string;
  options: { value: string; label: string; sub: string }[];
}

type Question = TextQuestion | ChoiceQuestion;

const QUESTIONS: Question[] = [
  {
    type:        "text",
    id:          "firstName",
    prompt:      "What should your mentor call you?",
    sub:         "This is how you'll be addressed throughout your session.",
    placeholder: "Your first name",
    maxLength:   50,
    validate:    (v) => v.trim().length > 0,
  },
  {
    type:        "text",
    id:          "lastInitial",
    prompt:      "And your last initial?",
    sub:         "Combined with your name to create your private lounge identity.",
    placeholder: "e.g. A",
    maxLength:   1,
    transform:   (v) => v.toUpperCase().replace(/[^A-Z]/g, ""),
    validate:    (v) => /^[A-Z]$/.test(v.trim()),
  },
  {
    type:    "choice",
    id:      "atmospherePreference",
    prompt:  "What atmosphere fits tonight?",
    sub:     "Your mentor will tailor commentary to match your mood.",
    options: [
      { value: "solo",        label: "Reflective Solo",  sub: "Quiet. Intentional. Personal." },
      { value: "social",      label: "Social Lounge",    sub: "Shared. Warm. Conversational." },
      { value: "late-night",  label: "Late Night",       sub: "Dark. Deep. Unhurried." },
      { value: "celebration", label: "Celebration",      sub: "Elevated. Commemorating something." },
    ],
  },
  {
    type:    "choice",
    id:      "boldnessPreference",
    prompt:  "Where does your palate naturally land?",
    sub:     "Honest answers lead to better pairings.",
    options: [
      { value: "smooth",      label: "Smooth & Gentle",    sub: "Comfort first. Subtle depth." },
      { value: "balanced",    label: "Balanced & Curious", sub: "Openness to complexity." },
      { value: "bold",        label: "Bold & Complex",     sub: "Strength with intention." },
      { value: "adventurous", label: "Adventurous",        sub: "Edges. Surprises. Evolution." },
    ],
  },
  {
    type:    "choice",
    id:      "experienceLevel",
    prompt:  "How experienced is your palate?",
    sub:     "No wrong answer — it helps us calibrate your first session.",
    options: [
      { value: "new",          label: "New Explorer",  sub: "First time or early stages." },
      { value: "casual",       label: "Casually Curious", sub: "Some experience. Still learning." },
      { value: "experienced",  label: "Experienced",   sub: "Confident. Informed preferences." },
      { value: "connoisseur",  label: "Connoisseur",   sub: "Refined. Highly discerning." },
    ],
  },
];

// ── Ambient particles ─────────────────────────────────────────────────────────

const PARTICLE_COUNT = 18;

function AmbientParticles() {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id:    i,
    x:     `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    dur:   6 + Math.random() * 8,
    size:  1 + Math.random() * 2,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position:        "absolute",
            left:            p.x,
            bottom:          "-4px",
            width:           p.size,
            height:          p.size,
            borderRadius:    "50%",
            background:      "rgba(201,168,76,0.45)",
            boxShadow:       "0 0 4px rgba(201,168,76,0.3)",
          }}
          animate={{ y: [0, -(280 + Math.random() * 200)], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            width:      i === current ? 20 : 6,
            background: i <= current ? "rgba(201,168,76,0.9)" : "rgba(201,168,76,0.2)",
          }}
          transition={{ duration: 0.3 }}
          style={{ height: 6, borderRadius: 3 }}
        />
      ))}
    </div>
  );
}

// ── Slide variants ────────────────────────────────────────────────────────────

const slideVariants = {
  enter:  { opacity: 0, y: 28 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -20 },
};

// ── Main component ────────────────────────────────────────────────────────────

interface EnrollmentFlowProps {
  craftType:  string;
  onComplete: () => void;
  onSkip:     () => void;
}

export default function EnrollmentFlow({ craftType, onComplete, onSkip }: EnrollmentFlowProps) {
  const { enroll }            = useGuestProfile();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textVal, setTextVal] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);

  const question = QUESTIONS[step];

  // Focus text input when step changes
  useEffect(() => {
    if (question.type === "text") {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
    setTextVal("");
    setError("");
  }, [step, question.type]);

  // ── Advance ────────────────────────────────────────────────────────────────

  async function advance(value: string) {
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
      return;
    }

    // All questions answered — enroll
    setBusy(true);
    try {
      await enroll({
        firstName:            newAnswers.firstName,
        lastInitial:          newAnswers.lastInitial,
        atmospherePreference: newAnswers.atmospherePreference,
        boldnessPreference:   newAnswers.boldnessPreference,
        experienceLevel:      newAnswers.experienceLevel,
        craftType,
      });
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleTextSubmit() {
    const q = question as TextQuestion;
    const raw  = q.transform ? q.transform(textVal) : textVal.trim();
    if (q.validate && !q.validate(raw)) {
      setError("Please enter a valid answer.");
      return;
    }
    advance(raw);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          500,
        background:      "radial-gradient(ellipse at 40% 30%, rgba(201,168,76,0.06) 0%, transparent 60%), #04030200",
        backdropFilter:  "blur(2px)",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "24px",
        overflow:        "hidden",
      }}
    >
      {/* Dark overlay */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "rgba(4,3,2,0.92)",
      }} />

      <AmbientParticles />

      {/* Content card */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 520 }}>

        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <ProgressDots total={QUESTIONS.length} current={step} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <p style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontSize:      "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight:    300,
              color:         "rgba(240,232,212,0.96)",
              lineHeight:    1.25,
              marginBottom:  10,
              textAlign:     "center",
              letterSpacing: "-0.01em",
            }}>
              {question.prompt}
            </p>
            <p style={{
              fontFamily:   "'Inter', sans-serif",
              fontSize:     "0.8rem",
              color:        "rgba(201,168,76,0.55)",
              textAlign:    "center",
              marginBottom: 36,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              {question.sub}
            </p>

            {/* Text input */}
            {question.type === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Hint for last-initial step */}
                {step === 1 && (
                  <p style={{
                    textAlign:     "center",
                    fontSize:      "0.7rem",
                    color:         "rgba(201,168,76,0.45)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    margin:        0,
                  }}>
                    Single letter only — A through Z
                  </p>
                )}
                <input
                  ref={inputRef}
                  value={textVal}
                  maxLength={(question as TextQuestion).maxLength ?? 100}
                  inputMode="text"
                  onChange={e => {
                    const q = question as TextQuestion;
                    const raw = e.target.value;
                    const transformed = q.transform ? q.transform(raw) : raw;
                    // If transform stripped everything and user typed something, show hint
                    if (q.transform && raw.length > 0 && transformed.length === 0) {
                      setError(step === 1 ? "Please enter a letter (A–Z), not a number." : "Please enter a valid answer.");
                    } else {
                      setError("");
                    }
                    setTextVal(transformed);
                  }}
                  onKeyDown={e => { if (e.key === "Enter") handleTextSubmit(); }}
                  placeholder={(question as TextQuestion).placeholder}
                  style={{
                    background:    "rgba(201,168,76,0.06)",
                    border:        "1px solid rgba(201,168,76,0.25)",
                    borderRadius:  10,
                    padding:       "14px 18px",
                    color:         "rgba(240,232,212,0.96)",
                    fontFamily:    "'Cormorant Garamond', Georgia, serif",
                    fontSize:      "1.5rem",
                    fontWeight:    300,
                    textAlign:     "center",
                    outline:       "none",
                    width:         "100%",
                    caretColor:    "rgba(201,168,76,0.8)",
                    letterSpacing: step === 1 ? "0.3em" : undefined,
                  }}
                />
                {error && (
                  <p style={{ color: "rgba(220,80,80,0.8)", fontSize: "0.75rem", textAlign: "center" }}>
                    {error}
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTextSubmit}
                  disabled={busy}
                  style={{
                    alignSelf:     "center",
                    display:       "flex",
                    alignItems:    "center",
                    gap:           8,
                    background:    "rgba(201,168,76,0.12)",
                    border:        "1px solid rgba(201,168,76,0.4)",
                    borderRadius:  8,
                    padding:       "10px 28px",
                    color:         "rgba(201,168,76,0.9)",
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      "0.75rem",
                    fontWeight:    500,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor:        busy ? "not-allowed" : "pointer",
                    opacity:       busy ? 0.6 : 1,
                  }}
                >
                  {busy ? "Enrolling…" : <>Continue <ArrowRight size={13} /></>}
                </motion.button>
              </div>
            )}

            {/* Choice grid */}
            {question.type === "choice" && (
              <div style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr",
                gap:                 10,
              }}>
                {(question as ChoiceQuestion).options.map(opt => (
                  <motion.button
                    key={opt.value}
                    whileHover={{ scale: 1.02, borderColor: "rgba(201,168,76,0.55)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => advance(opt.value)}
                    disabled={busy}
                    style={{
                      background:   "rgba(201,168,76,0.05)",
                      border:       "1px solid rgba(201,168,76,0.18)",
                      borderRadius: 10,
                      padding:      "16px 14px",
                      cursor:       busy ? "not-allowed" : "pointer",
                      textAlign:    "left",
                    }}
                  >
                    <p style={{
                      fontFamily:    "'Cormorant Garamond', Georgia, serif",
                      fontSize:      "1.05rem",
                      fontWeight:    500,
                      color:         "rgba(240,232,212,0.92)",
                      marginBottom:  4,
                      letterSpacing: "-0.01em",
                    }}>
                      {opt.label}
                    </p>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize:   "0.7rem",
                      color:      "rgba(201,168,76,0.5)",
                      lineHeight: 1.4,
                    }}>
                      {opt.sub}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Skip enrollment */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={onSkip}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            background:    "none",
            border:        "none",
            color:         "rgba(201,168,76,0.3)",
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor:        "pointer",
            margin:        "28px auto 0",
            padding:       "4px 8px",
          }}
        >
          <SkipForward size={11} /> Skip enrollment · enter anonymously
        </motion.button>
      </div>
    </motion.div>
  );
}
