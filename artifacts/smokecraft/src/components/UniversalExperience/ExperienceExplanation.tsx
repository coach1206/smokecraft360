/**
 * ExperienceExplanation — Stage 2 of the Universal Experience Flow.
 *
 * Shown after the atmospheric chamber intro, before level selection.
 * Explains in a luxurious, mysterious tone what the experience is,
 * what users unlock, how mastery works, and how personalization evolves.
 *
 * Intentionally avoids instructional language.
 * Each craft has its own opening quote and discovery pillars.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

type CraftType = "smoke" | "pour" | "brew" | "vape";

interface CraftExplanation {
  quote:   string[];
  sub:     string;
  pillars: { icon: string; title: string; desc: string }[];
}

const EXPLANATIONS: Record<CraftType, CraftExplanation> = {
  pour: {
    quote: ["Tonight is not about", "ordering a drink.", "It's about crafting", "an experience."],
    sub: "PourCraft 360 — Sommelier Intelligence Engine",
    pillars: [
      { icon: "◈", title: "Unlock Hidden Journeys",    desc: "Reserve experiences only reveal themselves to those who seek them." },
      { icon: "◎", title: "Evolve Your Taste Identity", desc: "Every selection refines your palate signature. Nothing is forgotten." },
      { icon: "⬡", title: "Discover Reserve Pours",    desc: "Rare bottles and limited expressions surface as you progress." },
      { icon: "✦", title: "Build a Sensory Profile",   desc: "The engine learns what moves you and crafts the perfect path forward." },
    ],
  },
  brew: {
    quote: ["Every brew tells a story.", "Tonight,", "you discover yours."],
    sub: "BrewCraft 360 — Brewmaster Intelligence Engine",
    pillars: [
      { icon: "⊕", title: "Master Flavor Families",     desc: "From bitter horizons to barrel-aged warmth — your spectrum expands." },
      { icon: "◉", title: "Unlock Seasonal Rarities",   desc: "Limited batches and cellared flights appear only when earned." },
      { icon: "⬡", title: "Build Your Brewery Profile", desc: "Your tasting history shapes every future recommendation." },
      { icon: "✦", title: "Create Your Signature Path", desc: "No two journeys are alike. Yours begins right now." },
    ],
  },
  vape: {
    quote: ["Flavor is atmosphere.", "Atmosphere is experience."],
    sub: "VapeCraft 360 — Sensory Atmosphere Engine",
    pillars: [
      { icon: "◎", title: "Create Your Atmosphere",    desc: "Your flavor frequency becomes your identity. Shape it deliberately." },
      { icon: "∿", title: "Evolve Your Cloud Signature", desc: "Each session deepens your sensory signature and unlocks new layers." },
      { icon: "⚡", title: "Unlock Hidden Frequencies", desc: "Rare blends surface as your profile matures — no shortcut exists." },
      { icon: "✦", title: "Ambient Sync Intelligence",  desc: "The environment reacts to your choices. Nothing here is passive." },
    ],
  },
  smoke: {
    quote: ["The finest leaf", "tells its story", "in silence."],
    sub: "SmokeCraft 360 — Connoisseur Intelligence Engine",
    pillars: [
      { icon: "∿", title: "Discover Reserve Selections", desc: "Aged rarities reveal themselves only to those with a refined profile." },
      { icon: "◈", title: "Build Your Connoisseur Identity", desc: "Strength, wrapper, origin — your preferences become permanent." },
      { icon: "✦", title: "Unlock Aged Expressions",    desc: "Limited cellar releases appear as your discovery deepens." },
      { icon: "◉", title: "Master the Flavor Spectrum", desc: "From mild Connecticut to full-bodied Maduro — map your true range." },
    ],
  },
};

interface Props {
  craftType:   CraftType;
  accent:      string;
  onContinue:  () => void;
  onBack:      () => void;
}

const STAGGER = 0.12;

export function ExperienceExplanation({ craftType, accent, onContinue, onBack }: Props) {
  const cfg = EXPLANATIONS[craftType];
  const [quoteIdx, setQuoteIdx] = useState(-1);
  const [showPillars, setShowPillars] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    // Reveal quote lines one at a time
    let line = 0;
    const tick = () => {
      if (line < cfg.quote.length) {
        setQuoteIdx(line);
        line++;
        setTimeout(tick, 620);
      } else {
        setTimeout(() => setShowPillars(true), 300);
        setTimeout(() => setShowCta(true), 900);
      }
    };
    const t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [cfg.quote.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: craftType === "vape"
          ? "radial-gradient(ellipse 80% 60% at 50% 30%, #1a0040 0%, #030008 100%)"
          : "radial-gradient(ellipse 80% 60% at 50% 30%, #1a0e04 0%, #060402 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 32px 40px",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.18, 0.38, 0.18] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${accent}22 0%, transparent 70%)`,
        }}
      />

      {/* Back */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onBack}
        style={{
          position: "absolute", top: 20, left: 20,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "8px 16px",
          color: "rgba(240,232,212,0.35)",
          fontSize: 11, letterSpacing: "0.1em",
          cursor: "pointer", zIndex: 10,
        }}
      >
        ← Back
      </motion.button>

      {/* Sub-label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase",
          color: accent, fontWeight: 600, marginBottom: 32, textAlign: "center",
        }}
      >
        {cfg.sub}
      </motion.div>

      {/* Quote lines */}
      <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 560 }}>
        {cfg.quote.map((line, i) => (
          <AnimatePresence key={i}>
            {quoteIdx >= i && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: "clamp(22px, 4.2vw, 40px)",
                  fontWeight: 700,
                  color: i === cfg.quote.length - 1 ? accent : "rgba(240,232,212,0.92)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                  letterSpacing: i === cfg.quote.length - 1 ? "0.02em" : "0",
                }}
              >
                {line}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Discovery pillars */}
      <AnimatePresence>
        {showPillars && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              width: "100%",
              maxWidth: 580,
              marginBottom: 40,
            }}
          >
            {cfg.pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * STAGGER, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${accent}28`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex", flexDirection: "column", gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, color: accent }}>{p.icon}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "rgba(240,232,212,0.85)",
                  }}>{p.title}</span>
                </div>
                <p style={{
                  margin: 0, fontSize: 11, lineHeight: 1.55,
                  color: "rgba(240,232,212,0.38)",
                }}>{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {showCta && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={onContinue}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              border: "none", borderRadius: 999,
              padding: "17px 48px",
              color: "#060402", fontWeight: 800,
              fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase",
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 10,
              boxShadow: `0 16px 48px ${accent}45`,
            }}
          >
            Choose Your Level <ChevronRight size={15} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
