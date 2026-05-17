/**
 * ChallengeModal — AI-generated craft knowledge challenge.
 * Appears after every 5th swipe. Earns or deducts XP based on answer.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ChallengeQuestion {
  challengeId?:   string;
  question:       string;
  options:        string[];
  correctIndex:   number;
  explanation:    string;
}

interface Props {
  challenge:    ChallengeQuestion | null;
  craftType:    "smoke" | "pour" | "brew" | "vape" | "wine";
  guestLevel:   string;
  onAnswer:     (wasCorrect: boolean, xp: number) => void;
  onDismiss:    () => void;
}

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#E85D26",
  pour:  "#D4AF37",
  brew:  "#D97706",
  vape:  "#A855F7",
};

const CRAFT_LABEL: Record<string, string> = {
  smoke: "SmokeCraft",
  pour:  "PourCraft",
  brew:  "BrewCraft",
  vape:  "VapeCraft",
};

const XP_MAP: Record<string, number> = {
  explorer:    20,
  enthusiast:  25,
  specialist:  30,
  aficionado:  40,
};

export default function ChallengeModal({ challenge, craftType, guestLevel, onAnswer, onDismiss }: Props) {
  const [selected,  setSelected]  = useState<number | null>(null);
  const [revealed,  setRevealed]  = useState(false);
  const accent  = CRAFT_ACCENT[craftType] ?? "#D48B00";
  const xpValue = XP_MAP[guestLevel] ?? 20;

  function handleSelect(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);

    const wasCorrect = idx === challenge!.correctIndex;
    const xpAwarded  = wasCorrect ? xpValue : -5;

    // Report to backend
    if (challenge?.challengeId) {
      fetch("/api/mentor/answer-challenge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ challengeId: challenge.challengeId, selectedIndex: idx }),
      }).catch(() => {/* non-fatal */});
    }

    // Delay so user can read explanation
    setTimeout(() => {
      onAnswer(wasCorrect, xpAwarded);
      onDismiss();
      setSelected(null);
      setRevealed(false);
    }, 2600);
  }

  function optionStyle(idx: number): React.CSSProperties {
    if (!revealed) return {
      background:  "rgba(255,255,255,0.05)",
      border:      "1px solid rgba(255,255,255,0.10)",
      color:       "#F5F2ED",
      cursor:      "pointer",
    };
    if (idx === challenge!.correctIndex) return {
      background:  "rgba(126,200,160,0.18)",
      border:      "1px solid rgba(126,200,160,0.55)",
      color:       "#7EC8A0",
      cursor:      "default",
    };
    if (idx === selected && idx !== challenge!.correctIndex) return {
      background:  "rgba(239,68,68,0.12)",
      border:      "1px solid rgba(239,68,68,0.4)",
      color:       "#ef4444",
      cursor:      "default",
    };
    return {
      background:  "rgba(255,255,255,0.03)",
      border:      "1px solid rgba(255,255,255,0.06)",
      color:       "#6B5E4E",
      cursor:      "default",
    };
  }

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         150,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "rgba(8,6,4,0.88)",
            backdropFilter: "blur(10px)",
            padding:        "24px",
          }}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.95, opacity: 0, y: 8  }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              width:          "min(96vw, 460px)",
              background:     "rgba(26,26,27,0.95)",
              border:         `1px solid ${accent}44`,
              borderRadius:   "20px",
              padding:        "28px 24px",
              boxShadow:      `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${accent}18`,
              position:       "relative",
              overflow:       "hidden",
            }}
          >
            {/* Craft accent top bar */}
            <div style={{
              position:   "absolute",
              top:        0, left: 0, right: 0,
              height:     "2px",
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            }} />

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "8px",
                }}>
                  <div style={{
                    padding:       "3px 10px",
                    borderRadius:  "6px",
                    background:    `${accent}18`,
                    border:        `1px solid ${accent}33`,
                    fontSize:      "10px",
                    color:         accent,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    fontFamily:    "'Cormorant Garamond', serif",
                  }}>
                    {CRAFT_LABEL[craftType]} · Challenge
                  </div>
                  <div style={{
                    padding:       "3px 10px",
                    borderRadius:  "6px",
                    background:    "rgba(212,139,0,0.12)",
                    border:        "1px solid rgba(212,139,0,0.25)",
                    fontSize:      "10px",
                    color:         "#D48B00",
                    letterSpacing: "0.08em",
                    fontFamily:    "'Cormorant Garamond', serif",
                  }}>
                    +{xpValue} XP
                  </div>
                </div>

                <button
                  onClick={onDismiss}
                  style={{
                    background:  "transparent",
                    border:      "none",
                    color:       "#6B5E4E",
                    fontSize:    "18px",
                    cursor:      "pointer",
                    lineHeight:  1,
                    padding:     "4px",
                  }}
                >
                  ×
                </button>
              </div>

              <h2 style={{
                fontFamily:  "'Cormorant Garamond', serif",
                fontSize:    "20px",
                fontWeight:  600,
                color:       "#F5F2ED",
                marginTop:   "14px",
                marginBottom: 0,
                lineHeight:  1.4,
              }}>
                {challenge.question}
              </h2>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {challenge.options.map((opt, idx) => (
                <motion.button
                  key={idx}
                  whileTap={!revealed ? { scale: 0.98 } : {}}
                  onClick={() => handleSelect(idx)}
                  style={{
                    padding:      "12px 14px",
                    borderRadius: "10px",
                    textAlign:    "left",
                    fontFamily:   "'Cormorant Garamond', serif",
                    fontSize:     "15px",
                    fontWeight:   selected === idx && revealed ? 600 : 400,
                    transition:   "background 0.25s, border-color 0.25s",
                    width:        "100%",
                    ...optionStyle(idx),
                  }}
                >
                  <span style={{ color: "#6B5E4E", marginRight: "8px", fontFamily: "monospace", fontSize: "12px" }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                  {revealed && idx === challenge.correctIndex && (
                    <span style={{ marginLeft: "8px", color: "#7EC8A0" }}>✓</span>
                  )}
                  {revealed && idx === selected && idx !== challenge.correctIndex && (
                    <span style={{ marginLeft: "8px", color: "#ef4444" }}>✗</span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.35 }}
                  style={{
                    background:    "rgba(255,255,255,0.04)",
                    border:        "1px solid rgba(255,255,255,0.08)",
                    borderRadius:  "10px",
                    padding:       "12px 14px",
                    overflow:      "hidden",
                  }}
                >
                  <div style={{
                    fontSize:      "10px",
                    color:         accent,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase" as const,
                    marginBottom:  "6px",
                    fontFamily:    "'Cormorant Garamond', serif",
                  }}>
                    {selected === challenge.correctIndex ? "Correct" : "Explanation"}
                  </div>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize:   "14px",
                    color:      "#BFB49A",
                    fontStyle:  "italic",
                    margin:     0,
                    lineHeight: 1.55,
                  }}>
                    {challenge.explanation}
                  </p>

                  <div style={{
                    marginTop:  "10px",
                    fontSize:   "13px",
                    fontFamily: "'Cormorant Garamond', serif",
                    color:      selected === challenge.correctIndex ? "#7EC8A0" : "#ef4444",
                    fontWeight: 600,
                  }}>
                    {selected === challenge.correctIndex
                      ? `+${xpValue} XP awarded`
                      : "−5 XP — knowledge builds with each attempt"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
