/**
 * Craft360Shell — Universal 3-Stage Experience Flow
 *
 * Stage 1: INTRO  — Cinematic title + craft quote (auto-advances 4s or tap)
 * Stage 2: FLAVOR — 4 sensory note cards, guest picks 1–2, then "BEGIN CREATION"
 * Stage 3: CREATE — Craft-specific 3D/CSS creation suite (passed as render prop)
 *
 * Each craft page imports this shell and passes its config + creation suite.
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence }                           from "framer-motion";
import { useLocation }                                       from "wouter";
import { useExperience }                                     from "@/contexts/ExperienceContext";
import { EeisIntelLayer }                                    from "@/components/eeis/EeisIntelLayer";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface FlavorNote {
  id:    string;
  label: string;
  icon:  string;
  desc:  string;
}

export interface MentorProfile {
  name:       string;
  title:      string;
  philosophy: string;
}

export interface Craft360Config {
  craftId:    "smoke" | "pour" | "brew" | "vape";
  title:      string;
  subtitle:   string;
  quote:      string;
  accent:     string;
  dimAccent:  string;
  mentor:     MentorProfile;
  flavors:    FlavorNote[];  // exactly 4
  particles:  string[];      // 3 CSS color strings for ambient particles
}

type Stage = "intro" | "flavor" | "create";

// ── Ambient particles ──────────────────────────────────────────────────────────
function AmbientParticles({ colors, craftId }: { colors: string[]; craftId: string }) {
  const count = 9;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const color = colors[i % colors.length];
        const size  = craftId === "brew" ? 3 + (i % 3)    // bubbles bigger
                    : craftId === "vape" ? 8 + (i % 6)    // vapor wisps wider
                    : 2 + (i % 2);
        const blur  = craftId === "vape" ? 12 + i * 2 : craftId === "brew" ? 0 : 1;
        return (
          <motion.div
            key={i}
            style={{
              position:     "absolute",
              width:         size,
              height:        craftId === "vape" ? size * 2.5 : size,
              borderRadius:  craftId === "brew" ? "50%" : craftId === "vape" ? "40% 60% 60% 40% / 60% 30% 70% 40%" : "50%",
              background:    color,
              left:          `${8 + (i * 11) % 84}%`,
              bottom:        craftId === "brew" ? "-10px" : `${10 + (i * 9) % 70}%`,
              filter:        blur ? `blur(${blur}px)` : "none",
              opacity:       0,
            }}
            animate={{
              y:       craftId === "brew"  ? [0, -(180 + i * 30), -(360 + i * 40)]
                     : craftId === "vape"  ? [0, -(60 + i * 8), -(30 + i * 4), -(90 + i * 12)]
                     :                       [-(8 + i * 3), (8 + i * 3), -(8 + i * 3)],
              opacity: craftId === "brew"  ? [0, 0.55, 0]
                     : craftId === "vape"  ? [0, 0.18, 0.10, 0]
                     :                       [0.12, 0.55, 0.12],
              x:       craftId === "vape" ? [0, i % 2 === 0 ? 16 : -16, 0] : 0,
            }}
            transition={{
              duration:   craftId === "brew" ? 5 + i * 0.6
                        : craftId === "vape" ? 8 + i * 1.2
                        : 4 + i * 0.7,
              repeat:     Infinity,
              ease:       "easeInOut",
              delay:      i * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Stage 1: Intro ─────────────────────────────────────────────────────────────
function IntroStage({
  config,
  onAdvance,
}: {
  config:    Craft360Config;
  onAdvance: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onAdvance, 4200);
    return () => clearTimeout(t);
  }, [onAdvance]);

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.7 }}
      onClick={onAdvance}
      style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", zIndex: 10, padding: "0 40px",
        textAlign: "center",
      }}
    >
      {/* Craft badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        style={{
          display:       "inline-block",
          background:    `${config.accent}18`,
          border:        `1px solid ${config.accent}55`,
          color:         config.accent,
          fontSize:      8,
          letterSpacing: "0.28em",
          padding:       "6px 18px",
          borderRadius:  999,
          marginBottom:  28,
          fontFamily:    "'Space Mono', monospace",
        }}
      >
        ◈ AXIOM OS · {config.craftId.toUpperCase()}CRAFT 360
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
        transition={{ duration: 1.2, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize:      "clamp(36px, 7vw, 80px)",
          fontWeight:    300,
          color:         "#F5F2ED",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          margin:        "0 0 16px",
          lineHeight:    1.05,
        }}
      >
        {config.title}
      </motion.h1>

      {/* Subtitle */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.7 }}
        style={{
          width: 64, height: 1,
          background: config.accent,
          margin: "0 auto 20px",
          transformOrigin: "center",
        }}
      />
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.85 }}
        style={{
          fontSize:      "clamp(13px, 2vw, 18px)",
          color:         `${config.accent}BB`,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily:    "'Space Mono', monospace",
          marginBottom:  36,
        }}
      >
        {config.subtitle}
      </motion.p>

      {/* Quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, delay: 1.2 }}
        style={{
          fontSize:      "clamp(14px, 1.8vw, 19px)",
          color:         "rgba(245,242,237,0.50)",
          maxWidth:      580,
          lineHeight:    1.75,
          fontStyle:     "italic",
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          marginBottom:  48,
        }}
      >
        "{config.quote}"
      </motion.p>

      {/* Tap hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, delay: 2, repeat: Infinity }}
        style={{
          fontSize: 8, color: "rgba(245,242,237,0.30)",
          letterSpacing: "0.2em", fontFamily: "'Space Mono', monospace",
        }}
      >
        TAP TO CONTINUE
      </motion.div>
    </motion.div>
  );
}

// ── Stage 2: Flavor notes ──────────────────────────────────────────────────────
function FlavorStage({
  config,
  selected,
  onToggle,
  onAdvance,
}: {
  config:    Craft360Config;
  selected:  Set<string>;
  onToggle:  (id: string) => void;
  onAdvance: () => void;
}) {
  return (
    <motion.div
      key="flavor"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.6 }}
      style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 10, padding: "20px 28px",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: "center", marginBottom: 32 }}
      >
        <div style={{
          fontSize: 8, color: `${config.accent}80`, letterSpacing: "0.26em",
          fontFamily: "'Space Mono', monospace", marginBottom: 10,
        }}>
          SELECT YOUR SENSORY PROFILE
        </div>
        <div style={{
          fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 300,
          color: "#F5F2ED", letterSpacing: "0.18em",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}>
          {config.mentor.name}
        </div>
        <div style={{
          fontSize: 9, color: `${config.accent}70`, letterSpacing: "0.14em",
          fontFamily: "'Space Mono', monospace", marginTop: 4,
        }}>
          {config.mentor.title}
        </div>
      </motion.div>

      {/* Flavor grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12, width: "100%", maxWidth: 520, marginBottom: 28,
      }}>
        {config.flavors.map((f, i) => {
          const active = selected.has(f.id);
          return (
            <motion.button
              key={f.id}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(f.id)}
              style={{
                background:  active ? `${config.accent}18` : "rgba(245,242,237,0.03)",
                border:      `1px solid ${active ? config.accent : "rgba(245,242,237,0.10)"}`,
                borderRadius: 12,
                padding:     "18px 16px",
                cursor:      "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                textAlign:   "left",
                transition:  "border-color 0.2s, background 0.2s",
                boxShadow:   active ? `0 0 20px ${config.accent}22` : "none",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <div style={{
                fontSize: 9, fontWeight: 700, color: active ? config.accent : "rgba(245,242,237,0.70)",
                letterSpacing: "0.16em", textTransform: "uppercase",
                fontFamily: "'Space Mono', monospace", marginBottom: 5,
              }}>{f.label}</div>
              <div style={{
                fontSize: 10, color: "rgba(245,242,237,0.38)",
                lineHeight: 1.5, fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}>{f.desc}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Mentor philosophy */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          fontSize: 11, color: "rgba(245,242,237,0.30)", fontStyle: "italic",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          textAlign: "center", maxWidth: 400, marginBottom: 24, lineHeight: 1.6,
        }}
      >
        "{config.mentor.philosophy}"
      </motion.p>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.96 }}
        onClick={onAdvance}
        style={{
          padding:     "14px 48px", borderRadius: 999,
          background:  `linear-gradient(135deg, ${config.accent}28, ${config.accent}12)`,
          border:      `1px solid ${config.accent}`,
          color:       config.accent, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", cursor: "pointer",
          touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
          fontFamily:  "'Space Mono', monospace",
          boxShadow:   `0 0 28px ${config.accent}20`,
        }}
      >
        BEGIN CREATION ›
      </motion.button>
    </motion.div>
  );
}

// ── Shell root ─────────────────────────────────────────────────────────────────
export function Craft360Shell({
  config,
  children,
}: {
  config:   Craft360Config;
  children: (selectedFlavors: string[]) => ReactNode;
}) {
  const [, navigate]              = useLocation();
  const [stage, setStage]         = useState<Stage>("intro");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const { setModule } = useExperience();

  // Register active module with central intelligence state on mount
  useEffect(() => {
    if (config.craftId !== "smoke" && config.craftId !== "pour" &&
        config.craftId !== "brew"  && config.craftId !== "vape") return;
    setModule(config.craftId);
  }, [config.craftId, setModule]);

  const toggleFlavor = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 2) {
          const first = next.values().next().value as string;
          next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    if (stage === "create") { setStage("flavor"); return; }
    if (stage === "flavor") { setStage("intro");  return; }
    navigate("/");
  }, [stage, navigate]);

  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden",
      position: "relative", background: "#0A0908",
    }}>
      {/* Ambient atmosphere */}
      <AmbientParticles colors={config.particles} craftId={config.craftId} />

      {/* Background gradient */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 55% at 50% 20%, ${config.dimAccent} 0%, transparent 70%)`,
      }} />

      {/* Back button */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={goBack}
        style={{
          position: "fixed", top: 14, left: 14, zIndex: 300,
          padding: "9px 16px", borderRadius: 999,
          background: "rgba(10,9,8,0.80)",
          border: `1px solid ${config.accent}30`,
          color: `${config.accent}70`, fontSize: 9, letterSpacing: "0.16em",
          cursor: "pointer", touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          fontFamily: "'Space Mono', monospace",
        }}
      >
        ‹ {stage === "intro" ? "PORTAL" : stage === "flavor" ? "BACK" : "FLAVOR"}
      </motion.button>

      {/* Stage content */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%" }}>
        <AnimatePresence mode="wait">
          {stage === "intro" && (
            <IntroStage
              key="intro"
              config={config}
              onAdvance={() => setStage("flavor")}
            />
          )}
          {stage === "flavor" && (
            <FlavorStage
              key="flavor"
              config={config}
              selected={selected}
              onToggle={toggleFlavor}
              onAdvance={() => setStage("create")}
            />
          )}
          {stage === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              style={{ position: "absolute", inset: 0 }}
            >
              {children(Array.from(selected))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* EEIS per-craft intelligence layer — 3-finger activation, staff-only */}
      <EeisIntelLayer craftId={config.craftId} />
    </div>
  );
}

export default Craft360Shell;
