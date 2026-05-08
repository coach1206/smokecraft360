/**
 * AssistedDiscoveryOverlay — smoked glass overlay shown to customers
 * when a staff member activates the operational handoff.
 *
 * The customer experience does NOT freeze — animations continue beneath.
 * The overlay softens the environment and shows a live discovery feed.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HandoffState {
  active:         boolean;
  staffNote:      string;
  recommendation: string | null;
}

interface Props {
  guestProfileId: string | null;
  craftType:      "smoke" | "pour" | "brew" | "vape";
}

const DISCOVERY_MESSAGES = [
  "Analyzing your flavor profile…",
  "Curating tonight's finest selections…",
  "Pairing your preferences with the humidor…",
  "Personalizing your next recommendation…",
  "Synchronizing with the craft intelligence engine…",
];

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#E85D26",
  pour:  "#D4AF37",
  brew:  "#D97706",
  vape:  "#A855F7",
};

export default function AssistedDiscoveryOverlay({ guestProfileId, craftType }: Props) {
  const [handoff,    setHandoff]    = useState<HandoffState | null>(null);
  const [msgIndex,   setMsgIndex]   = useState(0);
  const pollRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const msgRef    = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const accent    = CRAFT_ACCENT[craftType] ?? "#D48B00";

  // Poll for handoff state
  useEffect(() => {
    if (!guestProfileId) return;

    async function checkHandoff() {
      try {
        const res  = await fetch(`/api/staff/handoff-state/${guestProfileId}`);
        if (!res.ok) return;
        const data = await res.json() as HandoffState;
        setHandoff(data.active ? data : null);
      } catch { /* non-fatal */ }
    }

    checkHandoff();
    pollRef.current = setInterval(checkHandoff, 4000);
    return () => { if (pollRef.current !== undefined) clearInterval(pollRef.current); };
  }, [guestProfileId]);

  // Rotate discovery messages
  useEffect(() => {
    if (!handoff?.active) return;
    msgRef.current = setInterval(() => {
      setMsgIndex(i => (i + 1) % DISCOVERY_MESSAGES.length);
    }, 2800);
    return () => { if (msgRef.current !== undefined) clearInterval(msgRef.current); };
  }, [handoff?.active]);

  return (
    <AnimatePresence>
      {handoff?.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         120,
            pointerEvents:  "none",
          }}
        >
          {/* Smoked glass layer — partial opacity so environment shows through */}
          <div style={{
            position:       "absolute",
            inset:          0,
            background:     "rgba(10,10,11,0.62)",
            backdropFilter: "blur(8px) saturate(0.7)",
            WebkitBackdropFilter: "blur(8px) saturate(0.7)",
          }} />

          {/* Axiom rings */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.03, 1] }}
              transition={{
                rotate: { duration: 12 + i * 4, repeat: Infinity, ease: "linear" },
                scale:  { duration: 3,           repeat: Infinity, ease: "easeInOut" },
              }}
              style={{
                position:     "absolute",
                top:          "50%",
                left:         "50%",
                width:        `${120 + i * 60}px`,
                height:       `${120 + i * 60}px`,
                marginTop:    `-${60 + i * 30}px`,
                marginLeft:   `-${60 + i * 30}px`,
                borderRadius: "50%",
                border:       `1px solid ${accent}${i === 0 ? "66" : i === 1 ? "44" : "22"}`,
                pointerEvents:"none",
              }}
            />
          ))}

          {/* Center content */}
          <div style={{
            position:       "absolute",
            top:            "50%",
            left:           "50%",
            transform:      "translate(-50%, -50%)",
            textAlign:      "center",
            width:          "min(86vw, 360px)",
          }}>
            {/* Axiom hexagon icon */}
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   "42px",
                color:      accent,
                marginBottom: "20px",
                textShadow: `0 0 20px ${accent}`,
              }}
            >
              ⬡
            </motion.div>

            {/* Staff note */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontFamily:    "'Cormorant Garamond', serif",
                fontSize:      "20px",
                fontWeight:    600,
                color:         "#F5F2ED",
                marginBottom:  "10px",
                lineHeight:    1.4,
              }}
            >
              {handoff.staffNote}
            </motion.p>

            {/* Rotating discovery message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 6  }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize:   "13px",
                  color:      "#BFB49A",
                  fontStyle:  "italic",
                  marginBottom: "20px",
                  letterSpacing: "0.02em",
                }}
              >
                {DISCOVERY_MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Staff recommendation if pushed */}
            {handoff.recommendation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1    }}
                style={{
                  background:     "rgba(212,139,0,0.12)",
                  border:         `1px solid ${accent}44`,
                  borderRadius:   "12px",
                  padding:        "12px 16px",
                  marginTop:      "8px",
                }}
              >
                <div style={{
                  fontFamily:    "'Cormorant Garamond', serif",
                  fontSize:      "10px",
                  letterSpacing: "0.2em",
                  color:         accent,
                  textTransform: "uppercase",
                  marginBottom:  "6px",
                }}>
                  Tonight's Recommendation
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize:   "16px",
                  color:      "#F5F2ED",
                  fontStyle:  "italic",
                }}>
                  {handoff.recommendation}
                </div>
              </motion.div>
            )}

            {/* Telemetry dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity }}
                  style={{
                    width: "5px", height: "5px", borderRadius: "50%",
                    background: accent,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Top telemetry line */}
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position:  "absolute",
              top:       0,
              left:      0,
              right:     0,
              height:    "2px",
              background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
            }}
          />

          {/* Bottom status bar */}
          <div style={{
            position:      "absolute",
            bottom:        "24px",
            left:          "50%",
            transform:     "translateX(-50%)",
            display:       "flex",
            alignItems:    "center",
            gap:           "8px",
          }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: accent }}
            />
            <span style={{
              fontFamily:    "'Cormorant Garamond', serif",
              fontSize:      "10px",
              color:         "#BFB49A",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              Operational Layer Active
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
