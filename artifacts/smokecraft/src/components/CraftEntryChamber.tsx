/**
 * CraftEntryChamber — Cinematic intro scene between CraftHub portal
 * and the discovery engine.
 *
 * Shows a full-screen atmospheric chamber for each craft type.
 * Session loading happens in the background behind this component;
 * the user experiences atmosphere first, then chooses when to begin.
 *
 * Flow:
 *   "Begin Experience" → if no guestProfile → EnrollmentFlow
 *                     → after enroll → MentorReveal
 *                     → "Begin Session" → onBegin()
 *
 *   If guestProfile already set (fast return or same session):
 *                     → MentorReveal immediately → onBegin()
 *
 * Props:
 *   type     — craft type slug ("smoke" | "pour" | "brew" | "vape" | "wine")
 *   theme    — CraftTheme from craftThemes.ts (accent, bgImage, etc.)
 *   onBegin  — callback when user starts the discovery experience
 *   onBack   — callback to return to CraftHub
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import type { CraftTheme } from "@/lib/craftThemes";
import { AudioWaveToggle }        from "@/contexts/AudioContext";
import { useGuestProfile }        from "@/contexts/GuestProfileContext";
import { SovereignLogoutBadge }   from "@/components/SovereignLogoutBadge";
import EnrollmentFlow             from "@/components/EnrollmentFlow";
import MentorReveal               from "@/components/MentorReveal";
import { generateReturnGreeting }  from "@/lib/mentorIntelligence";

// ── Per-craft chamber configuration ──────────────────────────────────────────

interface ChamberConfig {
  title:       string;
  engine:      string;
  tagline:     string;
  atmosphere:  string;
  images:      string[];
}

const CHAMBER: Record<string, ChamberConfig> = {
  smoke: {
    title:      "SmokeCraft 360",
    engine:     "Connoisseur Intelligence Engine",
    tagline:    "Curated through atmosphere, flavor, strength, and mood.",
    atmosphere: "Aged cedar  ·  Ember warmth  ·  Reserve selections",
    images: [
      "/images/lounge-bg.jpg",
      "/images/scenes/smokecraft-card.jpg",
      "/images/scenes/bold.jpg",
      "/images/scenes/relaxed.jpg",
    ],
  },
  pour: {
    title:      "PourCraft 360",
    engine:     "Sommelier Intelligence Engine",
    tagline:    "Guided by palate, region, and the art of aging.",
    atmosphere: "Single malt  ·  Craft cocktails  ·  Rare reserves",
    images: [
      "/images/pour/pour_whiskey.png",
      "/images/pour/pour_bar.png",
      "/images/pour/pour_aged.png",
      "/images/pour/pour_tasting.png",
    ],
  },
  brew: {
    title:      "BrewCraft 360",
    engine:     "Brewmaster Intelligence Engine",
    tagline:    "From field to tap — crafted for your palate.",
    atmosphere: "Barrel-aged  ·  Craft hops  ·  Seasonal selections",
    images: [
      "/images/brew/brew_taproom.png",
      "/images/brew/brew_barrel.png",
      "/images/brew/brew_flight.png",
      "/images/brew/brew_pouring.png",
    ],
  },
  vape: {
    title:      "VapeCraft 360",
    engine:     "Sensory Atmosphere Engine",
    tagline:    "Your flavor frequency, detected and dialed in.",
    atmosphere: "Neon blends  ·  Reactive atmosphere  ·  AI-powered sessions",
    images: [
      "/images/vape/vape_hookah.png",
      "/images/vape/vape_modern.png",
      "/images/vape/vape_social.png",
      "/images/vape/vape_device.png",
    ],
  },
};

// ── Ambient particles (same visual language as CraftHub) ──────────────────────

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id:  i,
  x:   Math.random() * 100,
  y:   Math.random() * 100,
  r:   1 + Math.random() * 2.2,
  dur: 9 + Math.random() * 13,
  del: Math.random() * 8,
  op:  0.06 + Math.random() * 0.16,
}));

// ── Smoke wisps — atmospheric simulation behind text sections ─────────────────

const WISP_COUNT = 9;

function SmokeWisps({ accent }: { accent: string }) {
  const wisps = useRef(
    Array.from({ length: WISP_COUNT }, (_, i) => ({
      id:   i,
      x:    8 + (i / WISP_COUNT) * 84 + (Math.random() - 0.5) * 12,
      size: 90 + Math.random() * 130,
      dur:  14 + Math.random() * 12,
      del:  Math.random() * 10,
      op:   0.045 + Math.random() * 0.07,
    }))
  ).current;

  return (
    <div
      style={{
        position:      "absolute",
        inset:         0,
        pointerEvents: "none",
        overflow:      "hidden",
        zIndex:        2,
      }}
    >
      {wisps.map(w => (
        <motion.div
          key={w.id}
          initial={{ y: "105%", opacity: 0 }}
          animate={{
            y:       [null, "60%", "20%", "-15%"],
            opacity: [0, w.op * 0.6, w.op, w.op * 0.8, 0],
            x:       [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60],
          }}
          transition={{
            duration:   w.dur,
            delay:      w.del,
            repeat:     Infinity,
            ease:       "easeOut",
            times:      [0, 0.25, 0.65, 1],
          }}
          style={{
            position:     "absolute",
            left:         `${w.x}%`,
            bottom:       0,
            width:        w.size,
            height:       w.size * 1.6,
            borderRadius: "45% 55% 55% 45% / 40% 40% 60% 60%",
            background:   `radial-gradient(ellipse at 50% 65%,
              rgba(180,130,60,0.18) 0%,
              ${accent}10 30%,
              transparent 72%)`,
            filter:       "blur(24px)",
            willChange:   "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

function ChamberParticles({ accent }: { accent: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: accent,
            opacity: p.op,
          }}
          animate={{
            y:       [0, -32, 6, -20, 0],
            x:       [0, 8, -10, 12, 0],
            opacity: [p.op, p.op * 2.4, p.op * 0.3, p.op * 1.8, p.op],
            scale:   [1, 1.5, 0.6, 1.3, 1],
          }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Rotating background images ────────────────────────────────────────────────

const BG_INTERVAL = 4_200;
const BG_FADE     = 900;

function RotatingBackground({ images, accent, isVape = false }: { images: string[]; accent: string; isVape?: boolean }) {
  const [idx,    setIdx]    = useState(0);
  const [fading, setFading] = useState(false);
  const cyan    = "#06b6d4";
  const magenta = "#e879f9";
  const darkRgb = isVape ? "3,0,10" : "6,4,2";
  const imgOp   = isVape ? 0.55 : 0.68;

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % images.length);
        setFading(false);
      }, BG_FADE);
    }, BG_INTERVAL);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <>
      {/* Current image — slow Ken Burns */}
      <motion.div
        key={idx}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        style={{
          position: "absolute", inset: 0,
          backgroundImage:    `url(${images[idx]})`,
          backgroundSize:     "cover",
          backgroundPosition: "center",
          opacity: fading ? 0 : imgOp,
          transition: `opacity ${BG_FADE}ms ease`,
          willChange: "transform, opacity",
        }}
      />
      {/* Layered cinematic gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 30%, ${accent}${isVape ? "28" : "18"} 0%, transparent 70%),
          linear-gradient(180deg,
            rgba(${darkRgb},0.42)  0%,
            rgba(${darkRgb},0.18) 30%,
            rgba(${darkRgb},0.28) 60%,
            rgba(${darkRgb},0.78) 100%
          )
        `,
        pointerEvents: "none",
      }} />
      {/* Vape-only: neon atmosphere layers */}
      {isVape && (
        <>
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:   "absolute",
              inset:      0,
              background: `radial-gradient(ellipse 70% 50% at 25% 80%, ${accent}30 0%, transparent 65%)`,
              filter:     "blur(12px)",
              pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ opacity: [0, 0.45, 0] }}
            transition={{ duration: 10, repeat: Infinity, delay: 3.5, ease: "easeInOut" }}
            style={{
              position:   "absolute",
              inset:      0,
              background: `radial-gradient(ellipse 65% 45% at 78% 15%, ${cyan}28 0%, transparent 65%)`,
              filter:     "blur(10px)",
              pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ opacity: [0, 0.35, 0] }}
            transition={{ duration: 7, repeat: Infinity, delay: 6, ease: "easeInOut" }}
            style={{
              position:   "absolute",
              inset:      0,
              background: `radial-gradient(ellipse 50% 40% at 55% 90%, ${magenta}22 0%, transparent 60%)`,
              filter:     "blur(8px)",
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </>
  );
}

// ── Matte-glass button ────────────────────────────────────────────────────────

interface GlassButtonProps {
  label:    string;
  sub?:     string;
  icon:     React.ReactNode;
  accent:   string;
  onClick:  () => void;
  primary?: boolean;
}

function GlassButton({ label, sub, icon, accent, onClick, primary }: GlassButtonProps) {
  const [hov, setHov] = useState(false);

  return (
    <motion.button
      type="button"
      onTouchStart={() => setHov(true)}
      onTouchEnd={() => setHov(false)}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        position:     "relative",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        padding:      primary ? "18px 32px" : "14px 28px",
        borderRadius: 16,
        cursor:       "pointer",
        width:        "100%",
        background:   hov
          ? `rgba(212,139,0,0.10)`
          : primary
            ? "rgba(12,8,4,0.75)"
            : "rgba(8,5,2,0.60)",
        border:       `1px solid ${hov ? accent : primary ? `${accent}55` : "rgba(26,26,27,0.10)"}`,
        backdropFilter: "blur(20px)",
        boxShadow:    hov
          ? `0 0 28px ${accent}28, inset 0 0 16px ${accent}08`
          : primary
            ? `0 4px 32px rgba(26,26,27,0.22), inset 0 1px 0 rgba(26,26,27,0.06)`
            : "0 2px 16px rgba(26,26,27,0.10)",
        transition:   "all 0.28s ease",
        textAlign:    "left",
      }}
    >
      {/* Amber edge accent (left border) */}
      <div style={{
        position:  "absolute",
        left:      0, top: "20%", bottom: "20%",
        width:     2,
        borderRadius: "0 2px 2px 0",
        background: hov ? accent : primary ? `${accent}80` : `${accent}30`,
        transition: "background 0.28s ease",
      }} />

      <div style={{
        color: hov ? accent : primary ? accent : `${accent}90`,
        transition: "color 0.2s ease",
        flexShrink: 0,
      }}>
        {icon}
      </div>

      <div>
        <div style={{
          fontSize:      primary ? 14 : 13,
          fontWeight:    800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         hov ? accent : primary ? "rgba(240,232,212,0.97)" : "rgba(240,232,212,0.82)",
          transition:    "color 0.2s ease",
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontSize:      11,
            color:         "rgba(240,232,212,0.72)",
            marginTop:     3,
            letterSpacing: "0.04em",
          }}>
            {sub}
          </div>
        )}
      </div>

      {/* Slow pulse ring for primary button */}
      {primary && (
        <motion.div
          style={{
            position:  "absolute",
            inset:     -1,
            borderRadius: 17,
            border:    `1px solid ${accent}`,
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.12, 0.35, 0.12] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}

// ── Step 4: Initiation Chamber content ───────────────────────────────────────

const INITIATION: Record<string, {
  headline:  string;
  levels:    string[];
  goldenBox: string;
  rules:     string[];
}> = {
  smoke: {
    headline:  "SmokeCraft is the art of constructing a cigar experience that reflects instinct, pacing, and palate identity.",
    levels:    ["Curious Guest", "Explorer", "Blender", "Artisan", "Master of Smoke"],
    goldenBox: "The Golden Box reveals itself only to exceptional blend instinct and rare harmony.",
    rules:     ["Balance", "Complexity", "Pairing Intelligence", "Flavor Harmony", "Pacing"],
  },
  pour: {
    headline:  "PourCraft is the science of pairing spirits with palate, moment, and memory.",
    levels:    ["Curious Guest", "Explorer", "Enthusiast", "Mixology Scholar", "Reserve Master"],
    goldenBox: "The Golden Reserve unlocks only for rare palate intelligence and precision pairing.",
    rules:     ["Balance", "Complexity", "Regional Knowledge", "Pairing Precision", "Pour Intuition"],
  },
  brew: {
    headline:  "BrewCraft is the ritual of discovering how craft beer expresses time, grain, and intention.",
    levels:    ["Casual Drinker", "Craft Curious", "Hop Explorer", "Beer Scholar", "Master Taster"],
    goldenBox: "The Golden Tap flows only when your craft instinct and session harmony align perfectly.",
    rules:     ["Style Knowledge", "Flavor Balance", "Pairing Logic", "Session Pacing", "Craft Awareness"],
  },
  vape: {
    headline:  "VapeCraft is the art of building atmosphere through flavor, cloud, and sensory intention.",
    levels:    ["Flavor Curious", "Cloud Explorer", "Atmosphere Builder", "Flavor Architect", "Sensory Master"],
    goldenBox: "The Neon Vault opens only for guests who demonstrate rare sensory intelligence.",
    rules:     ["Flavor Harmony", "Cloud Density", "Atmosphere Match", "Layering Logic", "Session Rhythm"],
  },
};

// ── Step 5: Challenge Path Selector ──────────────────────────────────────────

const CHALLENGE_PATHS = [
  {
    id:    "guided",
    icon:  "◈",
    title: "Guided Ritual",
    desc:  "Your mentor narrates every selection. Ideal for discovery and education.",
  },
  {
    id:    "competitive",
    icon:  "◉",
    title: "Competitive Challenge",
    desc:  "High-stakes scoring. Every swipe is judged. Ranked on the Lounge League.",
  },
  {
    id:    "free",
    icon:  "◌",
    title: "Free Blend Experience",
    desc:  "No guidance. Pure instinct. The rawest expression of your palate.",
  },
];

interface ChallengePathSelectorProps {
  accent:   string;
  onSelect: (path: string) => void;
  onBack:   () => void;
}

function ChallengePathSelector({ accent, onSelect, onBack }: ChallengePathSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         460,
        background:     "rgba(4,2,0,0.97)",
        backdropFilter: "blur(20px)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "40px 24px",
        overflowY:      "auto",
      }}
    >
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        onClick={onBack}
        style={{
          position:       "absolute",
          top: 20, left: 20,
          background:     "rgba(0,0,0,0.55)",
          border:         "1px solid rgba(255,255,255,0.22)",
          borderRadius:   8,
          padding:        "8px 14px",
          color:          "rgba(255,255,255,0.72)",
          fontSize:       11,
          cursor:         "pointer",
          letterSpacing:  "0.08em",
        }}
      >
        ← Back
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 10, letterSpacing: "0.28em", color: accent, textTransform: "uppercase", marginBottom: 10 }}
      >
        Your Ritual Path
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{
          fontSize:      "clamp(22px,4vw,32px)",
          fontWeight:    800,
          color:         "#F0E8D4",
          fontFamily:    "'Playfair Display', serif",
          textAlign:     "center",
          marginBottom:  8,
          letterSpacing: "0.04em",
        }}
      >
        Choose Your Path
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
        style={{ fontSize: 12, color: "rgba(240,232,212,0.40)", textAlign: "center", marginBottom: 36 }}
      >
        This shapes how your ritual unfolds tonight.
      </motion.p>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {CHALLENGE_PATHS.map((path, i) => {
          const isSel = selected === path.id;
          return (
            <motion.button
              key={path.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.09 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(path.id)}
              style={{
                padding:    "20px 22px",
                borderRadius: 14,
                background: isSel ? `${accent}18` : "rgba(255,255,255,0.03)",
                border:     `1px solid ${isSel ? accent : "rgba(255,255,255,0.08)"}`,
                cursor:     "pointer",
                textAlign:  "left",
                transition: "border-color 0.18s, background 0.18s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24, color: isSel ? accent : "rgba(255,255,255,0.28)", lineHeight: 1 }}>
                  {path.icon}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isSel ? accent : "#F0E8D4", fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>
                    {path.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(240,232,212,0.42)", lineHeight: 1.5 }}>
                    {path.desc}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.58 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => { if (selected) onSelect(selected); }}
        style={{
          width:         "100%",
          maxWidth:      380,
          padding:       "16px",
          borderRadius:  13,
          background:    selected
            ? `linear-gradient(135deg, ${accent}, ${accent}99)`
            : "rgba(255,255,255,0.05)",
          border:        selected ? "none" : "1px solid rgba(255,255,255,0.08)",
          color:         selected ? "#060402" : "rgba(240,232,212,0.22)",
          fontSize:      13,
          fontWeight:    800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor:        selected ? "pointer" : "default",
          boxShadow:     selected ? `0 6px 28px ${accent}44` : "none",
          transition:    "all 0.22s ease",
        }}
      >
        Continue
      </motion.button>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  type:    string;
  theme:   CraftTheme;
  onBegin: () => void;
  onBack:  () => void;
}

export function CraftEntryChamber({ type, theme, onBegin, onBack }: Props) {
  const cfg    = CHAMBER[type] ?? CHAMBER.smoke;
  const accent = theme.accent;

  // ── INTRO LOCK — ritual pacing: CTA only appears after 3 seconds ─────────
  const [introReady, setIntroReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIntroReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const { guestProfile, mentor, isReturning, enroll } = useGuestProfile();

  // Memory-aware return greeting — computed once when profile + mentor are known
  const memoryLine = useMemo(() => {
    if (!isReturning || !guestProfile || !mentor) return undefined;
    return generateReturnGreeting(guestProfile, mentor);
  }, [isReturning, guestProfile, mentor]);

  // Ritual flow: chamber (initiation) → challenge (path selection) → enrollment (identity) → mentor (auto-assigned reveal)
  const [scene, setScene] = useState<"chamber" | "challenge" | "enrollment" | "mentor">("chamber");

  function handleBeginClick() {
    const mentorMatchesCraft = mentor?.craftType === type;
    if (guestProfile && mentor && mentorMatchesCraft) {
      // Returning guest with matched mentor — go straight to mentor reveal
      setScene("mentor");
    } else {
      // New guest — enroll first, then meet mentor (challenge path deferred to post-swipe)
      setScene("enrollment");
    }
  }

  function handleChallengeSelect(_path: string) {
    setScene("enrollment");
  }

  async function handleEnrolled(answers: Record<string, string>) {
    try {
      const r    = await fetch(`/api/enrollment/mentors?craftType=${type}`);
      const data = await r.json() as { mentors?: Array<{ id: string }> };
      const pool = data.mentors ?? [];
      const boldness = answers.boldnessPreference ?? "medium";
      let pick: string;
      if      (boldness === "bold" || boldness === "adventurous") pick = pool[0]?.id ?? "traditionalist";
      else if (boldness === "mild")                               pick = pool[Math.min(1, pool.length - 1)]?.id ?? "traditionalist";
      else                                                        pick = pool[Math.min(2, pool.length - 1)]?.id ?? pool[0]?.id ?? "traditionalist";

      const lastName    = answers.lastName;
      const lastInitial = answers.lastInitial ?? (lastName ? lastName[0]!.toUpperCase() : "A");
      await enroll({
        firstName:            answers.firstName ?? "",
        lastInitial,
        lastName,
        phoneLast4:           answers.phoneLast4 || undefined,
        email:                answers.email || undefined,
        gender:               answers.gender || undefined,
        region:               answers.region || undefined,
        atmospherePreference: answers.atmospherePreference || undefined,
        boldnessPreference:   answers.boldnessPreference || undefined,
        experienceLevel:      answers.experienceLevel || undefined,
        craftType:            type as "smoke" | "pour" | "brew" | "vape" | "wine",
        mentorId:             pick,
      });
      setScene("mentor");
    } catch {
      setScene("enrollment");
    }
  }

  function handleSkipEnrollment() {
    onBegin();
  }

  function handleMentorBegin() {
    onBegin();
  }


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:   "fixed",
          inset:      0,
          background: type === "vape" ? "#030008" : "#060402",
          overflow:   "hidden",
          zIndex:     50,
        }}
      >
        {/* ── Atmospheric background ── */}
        <RotatingBackground images={cfg.images} accent={accent} isVape={type === "vape"} />

        {/* ── Smoke wisps — drift upward behind text ── */}
        <SmokeWisps accent={accent} />

        {/* ── Particles ── */}
        <ChamberParticles accent={accent} />

        {/* ── Back button ── */}
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onBack}
          style={{
            position:       "absolute",
            top:            18, left: 20,
            zIndex:         10,
            display:        "flex",
            alignItems:     "center",
            gap:            7,
            background:     "rgba(0,0,0,0.55)",
            border:         "1px solid rgba(255,255,255,0.35)",
            borderRadius:   10,
            padding:        "8px 14px",
            color:          "rgba(255,255,255,0.92)",
            fontSize:       12,
            cursor:         "pointer",
            backdropFilter: "blur(12px)",
            letterSpacing:  "0.06em",
          }}
        >
          <ArrowLeft size={13} /> Portal
        </motion.button>

        {/* ── Top-right controls: mute toggle + optional guest badge ── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            position:    "absolute",
            top:         18, right: 20,
            zIndex:      10,
            display:     "flex",
            alignItems:  "center",
            gap:         8,
          }}
        >
          <AudioWaveToggle />
          {guestProfile && (
            <SovereignLogoutBadge guestProfile={guestProfile} accent={accent} />
          )}
        </motion.div>

        {/* ── Initiation Chamber — scrollable 5-section overview ── */}
        <div style={{
          position:  "absolute",
          inset:     0,
          overflowY: "auto",
          display:   "flex",
          flexDirection: "column",
          alignItems:    "center",
          padding:       "72px 24px 120px",
        }}>
          {/* Glow emblem */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 20 }}
          >
            <motion.div
              animate={{ boxShadow: [`0 0 0px ${accent}00`, `0 0 44px ${accent}55`, `0 0 0px ${accent}00`] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 60, height: 60, borderRadius: "50%",
                background: `${accent}10`, border: `1px solid ${accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Sparkles size={24} color={accent} />
            </motion.div>
          </motion.div>

          {/* Craft title */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6 }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(24px,5vw,40px)", fontWeight: 800,
              color: "rgba(240,232,212,0.96)", letterSpacing: "0.12em",
              textTransform: "uppercase", textAlign: "center",
              lineHeight: 1.05, marginBottom: 6,
            }}
          >
            {cfg.title}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            style={{ fontSize: 9, color: accent, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 28, fontWeight: 600 }}
          >
            The Initiation Chamber
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ width: 100, height: 1, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, marginBottom: 36 }}
          />

          {/* ── 5-section initiation content ── */}
          {(() => {
            const info = INITIATION[type] ?? INITIATION.smoke!;
            const sectionStyle: CSSProperties = {
              width: "100%", maxWidth: 400,
              background: "rgba(0,0,0,0.90)",
              backdropFilter: "blur(60px) brightness(0.15)",
              WebkitBackdropFilter: "blur(60px) brightness(0.15)",
              border: `1px solid ${accent}40`,
              borderRadius: 20, padding: "22px 22px",
              marginBottom: 14,
            };
            const labelStyle: CSSProperties = {
              fontSize: 9, letterSpacing: "0.28em", color: accent,
              textTransform: "uppercase", fontWeight: 700, marginBottom: 8,
            };
            const bodyStyle: CSSProperties = {
              fontSize: 12, color: "rgba(240,232,212,0.68)", lineHeight: 1.65,
            };
            return (
              <>
                {/* WHAT IS IT */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} style={sectionStyle}>
                  <div style={labelStyle}>What is {cfg.title}?</div>
                  <p style={bodyStyle}>{info.headline}</p>
                </motion.div>

                {/* THE LEVELS */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7 }} style={sectionStyle}>
                  <div style={labelStyle}>The Levels</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {info.levels.map((lvl, i) => (
                      <span key={lvl} style={{
                        fontSize: 10, padding: "5px 12px", borderRadius: 20,
                        background: i === 0 ? `${accent}20` : "rgba(255,255,255,0.05)",
                        border: `1px solid ${i === 0 ? accent + "60" : "rgba(255,255,255,0.08)"}`,
                        color: i === 0 ? accent : "rgba(240,232,212,0.55)",
                        letterSpacing: "0.06em",
                      }}>
                        {lvl}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* THE GOLDEN BOX */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.7 }} style={{ ...sectionStyle, borderColor: `${accent}30` }}>
                  <div style={labelStyle}>The Golden Box</div>
                  <p style={{ ...bodyStyle, color: `${accent}cc`, fontStyle: "italic" }}>{info.goldenBox}</p>
                </motion.div>

                {/* THE RULES */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.3, duration: 0.7 }} style={sectionStyle}>
                  <div style={labelStyle}>Ritual Pillars</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {info.rules.map((rule, i) => (
                      <div key={rule} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 9, color: accent, fontWeight: 700, minWidth: 14 }}>{i + 1}.</span>
                        <span style={{ fontSize: 12, color: "rgba(240,232,212,0.62)" }}>{rule}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* THE MENTORS */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.9, duration: 0.7 }} style={sectionStyle}>
                  <div style={labelStyle}>Your Mentor</div>
                  <p style={bodyStyle}>
                    Every guest is guided by a mentor philosophy. Your mentor will be{" "}
                    <span style={{ color: accent, fontWeight: 600 }}>assigned</span> based on
                    your palate preferences — not selected.
                  </p>
                </motion.div>
              </>
            );
          })()}

          {/* BEGIN THE RITUAL — gated by intro lock */}
          <AnimatePresence>
            {introReady ? (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}
              >
                <GlassButton
                  label={guestProfile ? `Continue, ${guestProfile.firstName}` : "Begin the Ritual"}
                  sub={guestProfile ? "Welcome back — your mentor awaits" : "Choose your path and meet your mentor"}
                  icon={<Sparkles size={18} />}
                  accent={accent}
                  onClick={handleBeginClick}
                  primary
                />
                <GlassButton
                  label="Quick Match"
                  sub="Skip straight to recommendations"
                  icon={<Zap size={16} />}
                  accent={accent}
                  onClick={onBegin}
                />
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 24 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${accent}40`, borderTopColor: accent }}
                />
                <span style={{ fontSize: 8, color: `${accent}55`, letterSpacing: "0.22em", fontFamily: "monospace" }}>
                  RITUAL ASCENDING…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom ambient status bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            position:       "absolute",
            bottom:         0, left: 0, right: 0,
            padding:        "12px 24px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            24,
            borderTop:      `1px solid ${accent}14`,
            background:     "rgba(0,0,0,0.88)",
            backdropFilter: "blur(20px)",
          }}
        >
          {["Palate Profile", "Ritual Ranking", "Ambiance Ready"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.div
                style={{ width: 4, height: 4, borderRadius: "50%", background: accent }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1] }}
                transition={{ duration: 2.2, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span style={{
                fontSize: 9, color: "rgba(240,232,212,0.58)",
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Step 5: Challenge Path Selection ── */}
      <AnimatePresence>
        {scene === "challenge" && (
          <ChallengePathSelector
            accent={accent}
            onSelect={handleChallengeSelect}
            onBack={() => setScene("chamber")}
          />
        )}
      </AnimatePresence>

      {/* ── Step 7: Identity Enrollment ── */}
      <AnimatePresence>
        {scene === "enrollment" && (
          <EnrollmentFlow
            craftType={type}
            onComplete={handleEnrolled}
            onSkip={handleSkipEnrollment}
          />
        )}
      </AnimatePresence>

      {/* ── Step 6: Mentor Reveal (system-assigned, not selectable) ── */}
      <AnimatePresence>
        {scene === "mentor" && mentor && (
          <MentorReveal
            mentor={mentor}
            guestName={guestProfile?.firstName ?? ""}
            isReturning={isReturning}
            onBegin={handleMentorBegin}
            memoryLine={memoryLine}
          />
        )}
      </AnimatePresence>
    </>
  );
}
