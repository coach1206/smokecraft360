/**
 * PosXPFeedback — Cinematic synergy XP overlay driven by PosContext.synergyXP.
 *
 * Renders whenever an external POS order triggers a cigar/spirit/food synergy
 * award.  Auto-dismisses after 2.4 s.  Mounts globally inside PosProvider so
 * it fires regardless of which page the staff is on.
 *
 * Visual language:
 *   Gain ≥ 10 XP  — golden starburst pulse + smoke ring expand
 *   Gain  < 10 XP  — warm amber shimmer, smaller scale
 *   All gains      — large bold "+N XP" text with breakdown label
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePosContext } from "@/contexts/PosContext";

const AUTO_DISMISS_MS = 2400;

export function PosXPFeedback() {
  const { synergyXP, dismissSynergyXP } = usePosContext();

  // Auto-dismiss
  useEffect(() => {
    if (!synergyXP) return;
    const t = setTimeout(dismissSynergyXP, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [synergyXP, dismissSynergyXP]);

  const isBig = (synergyXP?.xpAwarded ?? 0) >= 10;

  return (
    <AnimatePresence>
      {synergyXP && synergyXP.xpAwarded > 0 && (
        <motion.div
          key="pos-xp-feedback"
          initial={{ opacity: 0, scale: 0.6, y: 40 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{   opacity: 0, scale: 0.8,  y: -30 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          onClick={dismissSynergyXP}
          style={{
            position:     "fixed",
            bottom:       "6rem",
            left:         "50%",
            transform:    "translateX(-50%)",
            zIndex:       9999,
            pointerEvents:"auto",
            cursor:       "pointer",
            display:      "flex",
            flexDirection:"column",
            alignItems:   "center",
            gap:          "0.25rem",
          }}
        >
          {/* Outer glow ring — only for big gains */}
          {isBig && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0   }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{
                position:    "absolute",
                inset:       0,
                borderRadius:"50%",
                background:  "radial-gradient(circle, rgba(212,175,55,0.55) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Main pill */}
          <motion.div
            animate={isBig
              ? { boxShadow: ["0 0 12px #D4AF37", "0 0 36px #D4AF37", "0 0 12px #D4AF37"] }
              : { boxShadow: "0 0 10px rgba(212,175,55,0.4)" }
            }
            transition={{ duration: 0.6, repeat: isBig ? 2 : 0 }}
            style={{
              background:   "linear-gradient(135deg, rgba(10,8,4,0.96) 0%, rgba(30,22,4,0.96) 100%)",
              border:       "1px solid #D4AF37",
              borderRadius: "1.5rem",
              padding:      "0.7rem 2.2rem",
              backdropFilter: "blur(18px)",
              display:      "flex",
              flexDirection:"column",
              alignItems:   "center",
              minWidth:     "14rem",
            }}
          >
            <span style={{
              fontFamily:   "'Cormorant Garamond', serif",
              fontSize:     "clamp(2rem, 6vw, 3rem)",
              fontWeight:   700,
              color:        "#D4AF37",
              letterSpacing:"0.06em",
              lineHeight:   1,
            }}>
              +{synergyXP.xpAwarded} XP
            </span>
            <span style={{
              fontFamily:   "sans-serif",
              fontSize:     "1rem",
              fontWeight:   600,
              color:        "rgba(212,175,55,0.75)",
              letterSpacing:"0.12em",
              textTransform:"uppercase",
              marginTop:    "0.2rem",
            }}>
              {synergyXP.breakdown}
            </span>
            {synergyXP.multiplier > 1 && (
              <span style={{
                fontSize:   "0.85rem",
                color:      "#fff",
                opacity:    0.6,
                marginTop:  "0.1rem",
              }}>
                ×{synergyXP.multiplier} multiplier active
              </span>
            )}
          </motion.div>

          {/* Starburst particles — big gains only */}
          {isBig && Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * 360;
            const rad   = (angle * Math.PI) / 180;
            return (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x:       Math.cos(rad) * 60,
                  y:       Math.sin(rad) * 60,
                  opacity: 0,
                  scale:   0.3,
                }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                style={{
                  position:    "absolute",
                  width:       8,
                  height:      8,
                  borderRadius:"50%",
                  background:  "#D4AF37",
                  top:         "50%",
                  left:        "50%",
                  marginTop:   -4,
                  marginLeft:  -4,
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
