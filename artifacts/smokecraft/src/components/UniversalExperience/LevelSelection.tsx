/**
 * LevelSelection — Stage 3 of the Universal Experience Flow.
 *
 * Per-craft experience level tiers. Controls UI complexity,
 * educational depth, recommendation complexity, and progression speed.
 *
 * Selected level is persisted to sessionStorage so CraftFlow
 * can adapt its recommendation language accordingly.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import { SignalVisualizationEngine } from "@/engines/SignalVisualizationEngine";

/** sessionStorage key — EEIS overlay reads this to show live journey tier */
export const EEIS_JOURNEY_KEY = "axiom_eeis_journey";

type CraftType = "smoke" | "pour" | "brew" | "vape";

export type ExperienceLevel =
  | "curious"
  | "explorer"
  | "enthusiast"
  | "scholar"
  | "master";

interface LevelTier {
  id:       ExperienceLevel;
  title:    string;
  badge:    string;
  desc:     string;
  unlocks:  string;
  locked:   boolean;
}

const TIERS: Record<CraftType, LevelTier[]> = {
  pour: [
    { id: "curious",    title: "Curious Guest",     badge: "I",   desc: "Exploring spirits for the first time. Simple guidance, bold discovery.", unlocks: "Core pours + flavor maps", locked: false },
    { id: "explorer",   title: "Cocktail Explorer", badge: "II",  desc: "Moving beyond the basics. Regional spirits, classic cocktails.", unlocks: "Cocktail pairings + mixology notes", locked: false },
    { id: "enthusiast", title: "Spirit Enthusiast", badge: "III", desc: "Understanding the craft. Distilleries, terroir, aging.", unlocks: "Rare bottles + distillery profiles", locked: false },
    { id: "scholar",    title: "Mixology Scholar",  badge: "IV",  desc: "Deep knowledge of flavor architecture and balance.", unlocks: "Reserve expressions + blind tastings", locked: false },
    { id: "master",     title: "Reserve Master",    badge: "V",   desc: "Connoisseur-level access. The finest expressions, curated for you.", unlocks: "Reserve room access + private allocations", locked: true },
  ],
  brew: [
    { id: "curious",    title: "Casual Drinker",  badge: "I",   desc: "Beer is pleasure. Keep it approachable, keep it good.", unlocks: "Core tap list + session ales", locked: false },
    { id: "explorer",   title: "Craft Curious",   badge: "II",  desc: "Ready to go beyond lagers. Exploring styles and small producers.", unlocks: "Craft flights + style guides", locked: false },
    { id: "enthusiast", title: "Hop Explorer",    badge: "III", desc: "Understanding IBUs, dry-hopping, and regional terroir.", unlocks: "Limited releases + hop profiles", locked: false },
    { id: "scholar",    title: "Beer Scholar",    badge: "IV",  desc: "Studying the science of fermentation and yeast character.", unlocks: "Barrel-aged selections + cellar notes", locked: false },
    { id: "master",     title: "Master Taster",   badge: "V",   desc: "Certified palate. Reserve access and rare seasonal unlocks.", unlocks: "Cellar reserves + brewery partner exclusives", locked: true },
  ],
  vape: [
    { id: "curious",    title: "Flavor Curious",      badge: "I",   desc: "Just discovering what flavor can be. Start simple, explore freely.", unlocks: "Core flavor profiles + device guide", locked: false },
    { id: "explorer",   title: "Cloud Explorer",      badge: "II",  desc: "Ready to layer flavors and experiment with cloud volume.", unlocks: "Flavor layering + cloud density settings", locked: false },
    { id: "enthusiast", title: "Atmosphere Builder",  badge: "III", desc: "Crafting environments with flavor. Mood-driven sessions.", unlocks: "Mood-sync blends + ambient pairing", locked: false },
    { id: "scholar",    title: "Flavor Architect",    badge: "IV",  desc: "Designing complex flavor systems with precision and intention.", unlocks: "Reserve blends + terpene mapping", locked: false },
    { id: "master",     title: "Sensory Master",      badge: "V",   desc: "Heightened sensory intelligence. Full system unlocked.", unlocks: "Exclusive releases + custom blend access", locked: true },
  ],
  smoke: [
    { id: "curious",    title: "First Smoke",          badge: "I",   desc: "Your journey begins. Mild, approachable, and full of discovery.", unlocks: "Entry selections + flavor intro", locked: false },
    { id: "explorer",   title: "Cigar Curious",        badge: "II",  desc: "Moving into the craft — wrappers, binders, fillers.", unlocks: "Blend profiles + regional origins", locked: false },
    { id: "enthusiast", title: "Blend Explorer",       badge: "III", desc: "Understanding construction, aging, and terroir.", unlocks: "Premium blends + vintage selections", locked: false },
    { id: "scholar",    title: "Connoisseur",          badge: "IV",  desc: "Deep knowledge of tobacco culture and aging science.", unlocks: "Reserve room + aged expressions", locked: false },
    { id: "master",     title: "Reserve Master",       badge: "V",   desc: "Elite access. The rarest cigars, curated for your palate.", unlocks: "Allocated releases + humidor access", locked: true },
  ],
};

export const SESSION_LEVEL_KEY = "axiom_experience_level";

interface Props {
  craftType:  CraftType;
  accent:     string;
  onSelect:   (level: ExperienceLevel) => void;
  onBack:     () => void;
}

export function LevelSelection({ craftType, accent, onSelect, onBack }: Props) {
  const tiers = TIERS[craftType];
  const [hoverId, setHoverId]   = useState<string | null>(null);
  const [selected, setSelected] = useState<ExperienceLevel | null>(null);

  function handleSelect(tier: LevelTier) {
    if (tier.locked) return;
    setSelected(tier.id);
    sessionStorage.setItem(SESSION_LEVEL_KEY, tier.id);

    // ── EEIS telemetry: write journey selection for staff overlay pickup ──
    sessionStorage.setItem(EEIS_JOURNEY_KEY, JSON.stringify({
      id:    tier.id,
      title: tier.title,
      badge: tier.badge,
      craft: craftType,
      ts:    Date.now(),
    }));

    // ── Fire handoff_signal through the signal visualization engine ──
    // Intensity 90 = high engagement event; staff EEIS will show a golden pulse
    SignalVisualizationEngine.fireSignal("handoff_signal", 90);

    // Dispatch a custom storage event so same-page listeners (EeisOverlay) pick it up
    window.dispatchEvent(new StorageEvent("storage", {
      key:      EEIS_JOURNEY_KEY,
      newValue: sessionStorage.getItem(EEIS_JOURNEY_KEY),
      storageArea: sessionStorage,
    }));

    setTimeout(() => onSelect(tier.id), 480);
  }

  const craftLabel: Record<CraftType, string> = {
    pour: "PourCraft 360", brew: "BrewCraft 360", vape: "VapeCraft 360", smoke: "SmokeCraft 360",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: craftType === "vape"
          ? "radial-gradient(ellipse 80% 60% at 50% 30%, #110028 0%, #030008 100%)"
          : "radial-gradient(ellipse 80% 60% at 50% 30%, #160b02 0%, #060402 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "64px 24px 40px",
        overflowY: "auto",
      }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 50% 35% at 50% 10%, ${accent}22 0%, transparent 70%)`,
        }}
      />

      {/* Back */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={onBack}
        style={{
          position: "fixed", top: 20, left: 20,
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.55 }}
        style={{ textAlign: "center", marginBottom: 40, position: "relative" }}
      >
        <div style={{
          fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase",
          color: accent, fontWeight: 600, marginBottom: 10, opacity: 0.7,
        }}>
          {craftLabel[craftType]}
        </div>
        <h2 style={{
          fontFamily: "var(--app-font-serif, Georgia, serif)",
          fontSize: "clamp(22px, 3.8vw, 36px)", fontWeight: 700,
          color: "rgba(240,232,212,0.95)", margin: 0, lineHeight: 1.1,
        }}>
          Choose Your Experience Level
        </h2>
        <p style={{
          margin: "12px 0 0", fontSize: 13, color: "rgba(240,232,212,0.36)",
          lineHeight: 1.55, maxWidth: 400,
        }}>
          This shapes the depth of your journey — your recommendations, your unlocks, your identity.
        </p>
      </motion.div>

      {/* Level cards */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        width: "100%", maxWidth: 560, position: "relative",
      }}>
        {tiers.map((tier, i) => {
          const isHov  = hoverId === tier.id;
          const isSel  = selected === tier.id;
          const dimmed = selected && selected !== tier.id;

          return (
            <motion.button
              key={tier.id}
              type="button"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: dimmed ? 0.28 : 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileTap={!tier.locked ? { scale: 0.96 } : {}}
              onMouseEnter={() => setHoverId(tier.id)}
              onMouseLeave={() => setHoverId(null)}
              onTouchStart={() => { if (!tier.locked) setHoverId(tier.id); }}
              onTouchEnd={() => setHoverId(null)}
              onClick={() => handleSelect(tier)}
              disabled={tier.locked}
              style={{
                background: isSel
                  ? `linear-gradient(135deg, ${accent}28, ${accent}10)`
                  : isHov
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.03)",
                border: isSel
                  ? `1px solid ${accent}80`
                  : isHov
                    ? `1px solid ${accent}45`
                    : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "18px 22px",
                cursor: tier.locked ? "not-allowed" : "pointer",
                textAlign: "left",
                display: "flex", alignItems: "center", gap: 18,
                transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
                boxShadow: isSel ? `0 0 32px ${accent}28` : "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {/* Badge */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: isSel ? `${accent}22` : "rgba(255,255,255,0.05)",
                border: isSel ? `1px solid ${accent}60` : "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
                color: isSel ? accent : tier.locked ? "rgba(240,232,212,0.2)" : "rgba(240,232,212,0.5)",
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                letterSpacing: "0.06em",
              }}>
                {tier.locked ? <Lock size={13} /> : tier.badge}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: tier.locked
                      ? "rgba(240,232,212,0.25)"
                      : isSel || isHov
                        ? "rgba(240,232,212,0.95)"
                        : "rgba(240,232,212,0.72)",
                    letterSpacing: "0.02em",
                  }}>
                    {tier.title}
                  </span>
                  {tier.locked && (
                    <span style={{
                      fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                      color: "rgba(240,232,212,0.22)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4, padding: "2px 6px",
                    }}>Progression Required</span>
                  )}
                </div>
                <p style={{
                  margin: 0, fontSize: 12, lineHeight: 1.5,
                  color: tier.locked ? "rgba(240,232,212,0.15)" : "rgba(240,232,212,0.40)",
                }}>{tier.desc}</p>
              </div>

              {/* Unlocks */}
              {!tier.locked && (
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{
                    fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                    color: accent, opacity: 0.55, marginBottom: 3,
                  }}>Unlocks</div>
                  <div style={{
                    fontSize: 10, color: "rgba(240,232,212,0.38)",
                    maxWidth: 130, lineHeight: 1.4, textAlign: "right",
                  }}>{tier.unlocks}</div>
                </div>
              )}

              {/* Selected confirm */}
              <AnimatePresence>
                {isSel && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      position: "absolute", right: 20,
                      display: "flex", alignItems: "center", gap: 6,
                      color: accent, fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.12em",
                    }}
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          marginTop: 32, fontSize: 11, color: "rgba(240,232,212,0.22)",
          textAlign: "center", letterSpacing: "0.06em",
        }}
      >
        Your level can be revisited as your experience deepens.
      </motion.p>
    </motion.div>
  );
}
