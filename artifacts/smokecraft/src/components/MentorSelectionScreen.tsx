/**
 * MentorSelectionScreen — Interactive 3-card mentor selector.
 *
 * Replaces the auto-assign step. Guest taps one of three mentor cards to choose
 * their AI Sage. The chosen mentor ID is passed to onSelect().
 *
 * Mentors shown are filtered to the craft type (smoke/pour/brew/vape), up to 3.
 * Archetype labels: Dominican Master, Boutique Maverick, Cuban Sage (smoke).
 */

import { useState, useEffect }    from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight }  from "lucide-react";

const C = {
  bg:      "#0A0704",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.55)",
  border:  "rgba(212,139,0,0.18)",
  text:    "#F0E8D4",
  muted:   "rgba(245,235,215,0.42)",
};

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#D48B00",
  pour:  "#c87820",
  brew:  "#e6c76a",
  vape:  "#8b5cf6",
};

interface MentorDef {
  id:         string;
  name:       string;
  origin:     string;
  philosophy: string;
  style:      string;
  greeting:   string;
  traits:     string[];
  craftType:  string;
  archetype?: string;
}

interface MentorSelectionScreenProps {
  craftType:  string;
  onSelect:   (mentorId: string) => void;
}

export default function MentorSelectionScreen({ craftType, onSelect }: MentorSelectionScreenProps) {
  const [mentors,  setMentors]  = useState<MentorDef[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [loading,  setLoading]  = useState(true);

  const accent = CRAFT_ACCENT[craftType] ?? C.gold;

  useEffect(() => {
    fetch(`/api/enrollment/mentors?craftType=${craftType}`)
      .then(r => r.json())
      .then(data => {
        const pool: MentorDef[] = (data.mentors ?? []).slice(0, 3);
        // Assign archetype labels for smoke craft
        if (craftType === "smoke" && pool.length >= 3) {
          pool[0] = { ...pool[0]!, archetype: "Dominican Master" };
          pool[1] = { ...pool[1]!, archetype: "Boutique Maverick" };
          pool[2] = { ...pool[2]!, archetype: "Cuban Sage" };
        }
        setMentors(pool);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [craftType]);

  function handleConfirm() {
    if (!selected) return;
    setBusy(true);
    onSelect(selected);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          480,
        background:      `radial-gradient(ellipse at 50% 25%, ${accent}08 0%, transparent 55%), ${C.bg}`,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "32px 20px",
        overflowY:       "auto",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: "center", marginBottom: 32 }}
      >
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      "0.6rem",
          fontWeight:    600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color:         `${accent}80`,
          marginBottom:  12,
        }}>
          CHOOSE YOUR AI SAGE
        </p>
        <h2 style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(1.8rem, 4.5vw, 2.4rem)",
          fontWeight:    300,
          color:         C.text,
          letterSpacing: "-0.02em",
          marginBottom:  8,
        }}>
          Who will guide your sessions?
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize:   "0.76rem",
          color:      C.muted,
          lineHeight: 1.5,
        }}>
          This mentor becomes the persistent voice of your experience — reading your palate and evolving with you.
        </p>
      </motion.div>

      {/* Mentor cards */}
      {loading ? (
        <div style={{ color: C.muted, fontFamily: "'Inter', sans-serif", fontSize: "0.8rem" }}>
          Loading mentors…
        </div>
      ) : (
        <div style={{
          display:             "grid",
          gridTemplateColumns: `repeat(${Math.min(mentors.length, 3)}, 1fr)`,
          gap:                 12,
          width:               "100%",
          maxWidth:            640,
          marginBottom:        32,
        }}>
          {mentors.map((mentor, i) => {
            const isSelected = selected === mentor.id;
            return (
              <motion.button
                key={mentor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelected(mentor.id)}
                style={{
                  background:    isSelected
                    ? `linear-gradient(160deg, ${accent}18 0%, ${accent}06 100%)`
                    : "rgba(255,255,255,0.025)",
                  border:        `1.5px solid ${isSelected ? `${accent}70` : C.border}`,
                  borderRadius:  14,
                  padding:       "22px 16px 18px",
                  cursor:        "pointer",
                  textAlign:     "center",
                  position:      "relative",
                  transition:    "border-color 0.2s, background 0.2s",
                  boxShadow:     isSelected ? `0 0 24px ${accent}18` : "none",
                }}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="mentor-selected"
                    style={{
                      position:   "absolute",
                      top:        10, right: 10,
                      width:      18, height: 18,
                      borderRadius: "50%",
                      background:  accent,
                      display:     "flex",
                      alignItems:  "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#000" }} />
                  </motion.div>
                )}

                {/* Avatar monogram */}
                <div style={{
                  width:          52, height: 52,
                  borderRadius:   "50%",
                  background:     `radial-gradient(135deg, ${accent}20 0%, transparent 80%)`,
                  border:         `1px solid ${accent}35`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  margin:         "0 auto 14px",
                }}>
                  <span style={{
                    fontFamily:    "'Cormorant Garamond', Georgia, serif",
                    fontSize:      "1.3rem",
                    fontWeight:    300,
                    color:         accent,
                  }}>
                    {mentor.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Archetype label */}
                {mentor.archetype && (
                  <p style={{
                    fontFamily:    "'Inter', sans-serif",
                    fontSize:      "0.58rem",
                    fontWeight:    600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color:         `${accent}70`,
                    marginBottom:  6,
                  }}>
                    {mentor.archetype}
                  </p>
                )}

                <p style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      "1.05rem",
                  fontWeight:    500,
                  color:         C.text,
                  marginBottom:  6,
                }}>
                  {mentor.name}
                </p>
                <p style={{
                  fontFamily:    "'Inter', sans-serif",
                  fontSize:      "0.65rem",
                  color:         `${accent}55`,
                  letterSpacing: "0.04em",
                  marginBottom:  10,
                  textTransform: "uppercase",
                }}>
                  {mentor.origin}
                </p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize:   "0.85rem",
                  fontStyle:  "italic",
                  color:      C.muted,
                  lineHeight: 1.45,
                }}>
                  {mentor.philosophy}
                </p>

                {/* Traits */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
                  {(mentor.traits ?? []).map((t: string) => (
                    <span
                      key={t}
                      style={{
                        fontFamily:    "'Inter', sans-serif",
                        fontSize:      "0.58rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color:         `${accent}50`,
                        border:        `1px solid ${accent}20`,
                        borderRadius:  20,
                        padding:       "2px 8px",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Confirm button */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: `0 0 28px ${accent}28` }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              disabled={busy}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           10,
                background:    `linear-gradient(135deg, ${accent}20 0%, ${accent}08 100%)`,
                border:        `1px solid ${accent}55`,
                borderRadius:  10,
                padding:       "14px 40px",
                color:         accent,
                fontFamily:    "'Inter', sans-serif",
                fontSize:      "0.78rem",
                fontWeight:    600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor:        busy ? "not-allowed" : "pointer",
                opacity:       busy ? 0.7 : 1,
              }}
            >
              <Sparkles size={14} />
              {busy ? "Assigning…" : "Confirm My Sage"}
              <ChevronRight size={14} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
