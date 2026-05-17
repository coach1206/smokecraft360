/**
 * JourneyPath — Ritual Moment 5 of the Universal Experience Flow.
 *
 * Full-screen interstitial shown between taste/mood selection and the
 * live recommendation reveal. Generates a "Tonight's Journey" path with
 * 4 animated waypoints, each appearing sequentially.
 *
 * Waypoints are per-craft and contextually adapted from the user's
 * selected style and mood when available.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

type CraftType = "smoke" | "pour" | "brew" | "vape" | "wine";

interface Waypoint { icon: string; label: string; desc: string }

const BASE_WAYPOINTS: Record<CraftType, [string, Waypoint[]]> = {
  pour: [
    "Tonight's Journey",
    [
      { icon: "◉", label: "Discovery Pour",       desc: "Your palate, mapped" },
      { icon: "◈", label: "Flavor Expansion",     desc: "Beyond the familiar" },
      { icon: "✦", label: "Signature Cocktail",   desc: "Crafted for your profile" },
      { icon: "⬡", label: "Reserve Unlock",       desc: "If the session earns it" },
    ],
  ],
  brew: [
    "Tonight's Flight",
    [
      { icon: "⊕", label: "Regional Discovery",  desc: "Origins and terroir" },
      { icon: "◉", label: "Barrel Exploration",  desc: "Aged character revealed" },
      { icon: "⬡", label: "Rare Brew Unlock",    desc: "Limited — earned by palate" },
      { icon: "✦", label: "Pairing Finish",      desc: "The complete experience" },
    ],
  ],
  vape: [
    "Tonight's Atmosphere",
    [
      { icon: "∿", label: "Flavor Base",          desc: "Your frequency, identified" },
      { icon: "☁", label: "Cloud Layer",          desc: "Density and texture dialed" },
      { icon: "⚡", label: "Ambient Sync",        desc: "Environment reacts to you" },
      { icon: "◎", label: "Sensory Enhancement",  desc: "Full profile activated" },
    ],
  ],
  wine: [
    "Tonight's Vintage",
    [
      { icon: "○", label: "Varietal Discovery",    desc: "Your palate mapped" },
      { icon: "◈", label: "Terroir Exploration",    desc: "Region and vintage calibrated" },
      { icon: "⬡", label: "Cellar Access",          desc: "Reserve tier unlocked" },
      { icon: "✶", label: "Signature Vintage",      desc: "Your perfect expression awaits" },
    ],
  ],
  smoke: [
    "Tonight's Selection",
    [
      { icon: "∿", label: "Palate Mapping",       desc: "Strength and body calibrated" },
      { icon: "◈", label: "Strength Discovery",   desc: "Your range, established" },
      { icon: "⬡", label: "Reserve Introduction", desc: "Premium access unlocked" },
      { icon: "✦", label: "Signature Moment",     desc: "Your perfect pairing awaits" },
    ],
  ],
};

interface Props {
  craftType:    CraftType;
  accent:       string;
  styleTitle?:  string;
  moodTitle?:   string;
  onContinue:   () => void;
}

const WAYPOINT_DELAY_MS = 520;
const CTA_DELAY_MS = 2_600;

export function JourneyPath({ craftType, accent, styleTitle, moodTitle, onContinue }: Props) {
  const [journeyTitle, waypoints] = BASE_WAYPOINTS[craftType];
  const [revealed, setRevealed]   = useState(0);
  const [showCta,  setShowCta]    = useState(false);

  useEffect(() => {
    let count = 0;
    const tick = () => {
      count++;
      setRevealed(count);
      if (count < waypoints.length) {
        setTimeout(tick, WAYPOINT_DELAY_MS);
      }
    };
    const t1 = setTimeout(tick, 600);
    const t2 = setTimeout(() => setShowCta(true), CTA_DELAY_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [waypoints.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 70,
        background: craftType === "vape"
          ? "radial-gradient(ellipse 70% 50% at 50% 25%, #180038 0%, #030008 100%)"
          : "radial-gradient(ellipse 70% 50% at 50% 25%, #1c0e02 0%, #060402 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 32px",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow pulses */}
      <motion.div
        animate={{ opacity: [0.14, 0.32, 0.14], scale: [1, 1.06, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 55% 40% at 50% 20%, ${accent}28 0%, transparent 72%)`,
          filter: "blur(4px)",
        }}
      />

      {/* Profile context */}
      {(styleTitle || moodTitle) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            marginBottom: 32, display: "flex", gap: 10, flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {styleTitle && (
            <span style={{
              fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
              color: accent, fontWeight: 700, opacity: 0.7,
              border: `1px solid ${accent}35`, borderRadius: 6, padding: "4px 12px",
            }}>{styleTitle}</span>
          )}
          {moodTitle && (
            <span style={{
              fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(240,232,212,0.4)", fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 12px",
            }}>{moodTitle}</span>
          )}
        </motion.div>
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 48 }}
      >
        <div style={{
          fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase",
          color: accent, fontWeight: 600, opacity: 0.65, marginBottom: 12,
        }}>
          Personalized path generated
        </div>
        <h2 style={{
          fontFamily: "var(--app-font-serif, Georgia, serif)",
          fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 700,
          color: "rgba(240,232,212,0.95)", margin: 0, letterSpacing: "-0.01em",
        }}>
          {journeyTitle}
        </h2>
      </motion.div>

      {/* Waypoints */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 0,
        width: "100%", maxWidth: 440, position: "relative",
      }}>
        {/* Vertical connector line */}
        <div style={{
          position: "absolute", left: 21, top: 22, bottom: 22,
          width: 1,
          background: `linear-gradient(180deg, ${accent}60 0%, ${accent}20 100%)`,
          zIndex: 0,
        }} />

        {waypoints.map((wp, i) => (
          <AnimatePresence key={wp.label}>
            {revealed > i && (
              <motion.div
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex", alignItems: "center", gap: 18,
                  padding: "14px 0",
                  position: "relative", zIndex: 1,
                }}
              >
                {/* Node dot */}
                <motion.div
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 }}
                  style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: i === revealed - 1 ? `${accent}22` : "rgba(255,255,255,0.04)",
                    border: i === revealed - 1 ? `1px solid ${accent}70` : "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: i === revealed - 1 ? accent : "rgba(240,232,212,0.35)",
                    boxShadow: i === revealed - 1 ? `0 0 22px ${accent}30` : "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  {wp.icon}
                </motion.div>

                {/* Labels */}
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: i === revealed - 1 ? "rgba(240,232,212,0.95)" : "rgba(240,232,212,0.55)",
                    letterSpacing: "0.02em",
                    transition: "color 0.3s ease",
                  }}>
                    {wp.label}
                  </div>
                  <div style={{
                    fontSize: 11, marginTop: 2,
                    color: i === revealed - 1 ? accent : "rgba(240,232,212,0.25)",
                    letterSpacing: "0.04em",
                    transition: "color 0.3s ease",
                  }}>
                    {wp.desc}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Begin CTA */}
      <AnimatePresence>
        {showCta && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: 52, textAlign: "center" }}
          >
            <motion.button
              type="button"
              onClick={onContinue}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                border: "none", borderRadius: 999,
                padding: "18px 52px",
                color: "#060402", fontWeight: 800,
                fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 10,
                boxShadow: `0 18px 52px ${accent}45`,
              }}
            >
              Begin Your Journey <ChevronRight size={15} />
            </motion.button>
            <p style={{
              margin: "14px 0 0", fontSize: 10,
              color: "rgba(240,232,212,0.22)",
              letterSpacing: "0.08em",
            }}>
              Your selections are remembered
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
