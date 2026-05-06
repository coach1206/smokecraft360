/**
 * CinematicTransition — full-screen cinematic transition overlay.
 *
 * Activates between experience→reveal and reveal→order flows.
 * Creates the feeling of a "scene cut" — darken, hold, emerge.
 * Not a loading spinner — purely atmospheric pacing.
 *
 * Usage:
 *   const { triggerTransition, TransitionOverlay } = useCinematicTransition();
 *   // Call triggerTransition() before navigation
 *   // Render <TransitionOverlay /> anywhere in the tree
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TransitionType = "reveal" | "order" | "return";

interface TransitionConfig {
  darkOpacity:  number;
  color:        string;
  holdMs:       number;
  fadeInMs:     number;
  fadeOutMs:    number;
  particles:    boolean;
}

const CONFIGS: Record<TransitionType, TransitionConfig> = {
  reveal: {
    darkOpacity: 0.85,
    color:       "rgba(8,4,1,1)",
    holdMs:      200,
    fadeInMs:    500,
    fadeOutMs:   700,
    particles:   true,
  },
  order: {
    darkOpacity: 0.60,
    color:       "rgba(10,6,2,1)",
    holdMs:      100,
    fadeInMs:    350,
    fadeOutMs:   500,
    particles:   false,
  },
  return: {
    darkOpacity: 0.70,
    color:       "rgba(6,4,8,1)",
    holdMs:      300,
    fadeInMs:    600,
    fadeOutMs:   800,
    particles:   false,
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCinematicTransition() {
  const [visible,  setVisible]  = useState(false);
  const [type,     setType]     = useState<TransitionType>("reveal");
  const [accent,   setAccent]   = useState("#d4af37");
  const callbackRef = useRef<(() => void) | null>(null);

  const triggerTransition = useCallback((
    transitionType: TransitionType,
    accentColor: string,
    onMidpoint?: () => void,
  ) => {
    const cfg = CONFIGS[transitionType];
    setType(transitionType);
    setAccent(accentColor);
    setVisible(true);
    callbackRef.current = onMidpoint ?? null;
    // Midpoint callback after fadeIn + hold
    if (onMidpoint) {
      setTimeout(onMidpoint, cfg.fadeInMs + cfg.holdMs);
    }
    // Auto-hide after full sequence
    setTimeout(() => setVisible(false), cfg.fadeInMs + cfg.holdMs + cfg.fadeOutMs);
  }, []);

  return { triggerTransition, visible, type, accent };
}

// ── Transition Overlay ────────────────────────────────────────────────────────

interface OverlayProps {
  visible: boolean;
  type:    TransitionType;
  accent:  string;
}

export function CinematicTransitionOverlay({ visible, type, accent }: OverlayProps) {
  const cfg = CONFIGS[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: {
              duration: cfg.fadeInMs / 1000,
              ease:     [0.4, 0, 0.6, 1],
            },
          }}
          style={{
            position:      "fixed",
            inset:         0,
            zIndex:        200,
            pointerEvents: "none",
            background:    cfg.color,
            opacity:       cfg.darkOpacity,
          }}
        >
          {/* Reveal transition: dramatic particle burst */}
          {type === "reveal" && cfg.particles && (
            <RevealBurst accent={accent} />
          )}

          {/* Return transition: soft welcome shimmer */}
          {type === "return" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: cfg.fadeInMs / 1000, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: 600,
                color:    `${accent}CC`,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontFamily: "'Playfair Display', serif",
              }}>
                Welcome back to your atmosphere
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Reveal burst ──────────────────────────────────────────────────────────────

function RevealBurst({ accent }: { accent: string }) {
  return (
    <>
      {/* Central glow swell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.45, 0], scale: [0.4, 2.2, 3.0] }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:     "absolute",
          top: "50%", left: "50%",
          transform:    "translate(-50%, -50%)",
          width:        300, height: 300,
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${accent}80 0%, ${accent}20 50%, transparent 70%)`,
          willChange:   "transform, opacity",
        }}
      />
      {/* Ring pulse */}
      <motion.div
        initial={{ opacity: 0.6, scale: 0.6 }}
        animate={{ opacity: 0, scale: 2.5 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        style={{
          position:     "absolute",
          top: "50%", left: "50%",
          transform:    "translate(-50%, -50%)",
          width:        200, height: 200,
          borderRadius: "50%",
          border:       `2px solid ${accent}60`,
          willChange:   "transform, opacity",
        }}
      />
    </>
  );
}

// ── Session return banner ─────────────────────────────────────────────────────

interface ReturnBannerProps {
  visible:    boolean;
  craftType:  string;
  accentColor: string;
  onDismiss:  () => void;
}

export function SessionReturnBanner({
  visible, craftType, accentColor, onDismiss,
}: ReturnBannerProps) {
  const CRAFT_LABELS: Record<string, string> = {
    smoke: "SmokeCraft 360",
    pour:  "PourCraft 360",
    brew:  "BrewCraft 360",
    vape:  "VapeCraft 360",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={onDismiss}
          style={{
            position:   "fixed",
            top:        72,
            left:       "50%",
            transform:  "translateX(-50%)",
            zIndex:     150,
            cursor:     "pointer",
            background: "rgba(10,8,5,0.88)",
            border:     `1px solid ${accentColor}35`,
            borderRadius: 14,
            padding:    "10px 24px",
            display:    "flex",
            alignItems: "center",
            gap:        10,
            backdropFilter: "blur(16px)",
            boxShadow:  `0 4px 24px rgba(0,0,0,0.5), 0 0 24px ${accentColor}15`,
          }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: accentColor,
            }}
          />
          <span style={{
            fontSize: 12, color: `${accentColor}CC`,
            fontWeight: 600, letterSpacing: "0.08em",
          }}>
            Welcome back to your atmosphere
          </span>
          <span style={{ fontSize: 11, color: "rgba(240,232,216,0.35)" }}>
            · {CRAFT_LABELS[craftType] ?? craftType}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
