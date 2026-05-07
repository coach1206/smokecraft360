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
 *   type     — craft type slug ("smoke" | "pour" | "brew" | "vape")
 *   theme    — CraftTheme from craftThemes.ts (accent, bgImage, etc.)
 *   onBegin  — callback when user starts the discovery experience
 *   onBack   — callback to return to CraftHub
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Compass } from "lucide-react";
import type { CraftTheme } from "@/lib/craftThemes";
import { useGuestProfile }      from "@/contexts/GuestProfileContext";
import EnrollmentFlow            from "@/components/EnrollmentFlow";
import MentorReveal              from "@/components/MentorReveal";
import { generateReturnGreeting } from "@/lib/mentorIntelligence";

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
      "/images/smoke/smoke_lounge.png",
      "/images/smoke/smoke_group.png",
      "/images/smoke/smoke_solo.png",
      "/images/smoke/smoke_selection.png",
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
  const imgOp   = isVape ? 0.12 : 0.32;

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
            rgba(${darkRgb},0.75)  0%,
            rgba(${darkRgb},0.45) 30%,
            rgba(${darkRgb},0.55) 60%,
            rgba(${darkRgb},0.92) 100%
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
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
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
        color: hov ? accent : primary ? accent : "rgba(240,232,212,0.5)",
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
          color:         hov ? accent : primary ? "rgba(26,26,27,0.90)" : "rgba(26,26,27,0.58)",
          transition:    "color 0.2s ease",
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontSize:      11,
            color:         "rgba(240,232,212,0.32)",
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

  const { guestProfile, mentor, isReturning } = useGuestProfile();

  // Memory-aware return greeting — computed once when profile + mentor are known
  const memoryLine = useMemo(() => {
    if (!isReturning || !guestProfile || !mentor) return undefined;
    return generateReturnGreeting(guestProfile, mentor);
  }, [isReturning, guestProfile, mentor]);

  // "enrollment" → "mentor" → (dismissed via onBegin)
  const [scene, setScene] = useState<"chamber" | "enrollment" | "mentor">("chamber");

  function handleBeginClick() {
    if (guestProfile && mentor) {
      // Returning guest or same-session — go straight to mentor reveal
      setScene("mentor");
    } else {
      // New guest — run enrollment flow
      setScene("enrollment");
    }
  }

  function handleEnrolled() {
    // EnrollmentFlow has called enroll(); context now has profile + mentor
    setScene("mentor");
  }

  function handleSkipEnrollment() {
    // Anonymous mode — bypass directly into the experience
    onBegin();
  }

  function handleMentorBegin() {
    setScene("chamber");
    onBegin();
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
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
            background:     "rgba(26,26,27,0.14)",
            border:         "1px solid rgba(255,255,255,0.1)",
            borderRadius:   10,
            padding:        "8px 14px",
            color:          "rgba(26,26,27,0.52)",
            fontSize:       12,
            cursor:         "pointer",
            backdropFilter: "blur(12px)",
            letterSpacing:  "0.06em",
          }}
        >
          <ArrowLeft size={13} /> Portal
        </motion.button>

        {/* ── Guest identity badge (if enrolled) ── */}
        {guestProfile && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              position:       "absolute",
              top:            18, right: 20,
              zIndex:         10,
              display:        "flex",
              alignItems:     "center",
              gap:            7,
              background:     "rgba(26,26,27,0.14)",
              border:         `1px solid ${accent}30`,
              borderRadius:   10,
              padding:        "8px 14px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{
              width:          20, height: 20,
              borderRadius:   "50%",
              background:     `${accent}20`,
              border:         `1px solid ${accent}50`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       9,
              color:          accent,
              fontWeight:     700,
            }}>
              {guestProfile.firstName[0]}
            </div>
            <span style={{
              fontSize:      10,
              color:         `${accent}80`,
              letterSpacing: "0.08em",
            }}>
              {guestProfile.publicId}
            </span>
          </motion.div>
        )}

        {/* ── Central content ── */}
        <div style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "60px 40px 40px",
          gap:            0,
        }}>
          {/* Glow ring emblem */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 28, position: "relative" }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 0px ${accent}00`,
                  `0 0 48px ${accent}55`,
                  `0 0 0px ${accent}00`,
                ],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width:        72, height: 72,
                borderRadius: "50%",
                background:   `${accent}10`,
                border:       `1px solid ${accent}60`,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={30} color={accent} />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily:    "var(--app-font-serif, Georgia, serif)",
              fontSize:      "clamp(26px, 5vw, 44px)",
              fontWeight:    800,
              color:         "rgba(240,232,212,0.96)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textAlign:     "center",
              lineHeight:    1.05,
              marginBottom:  10,
            }}
          >
            {cfg.title}
          </motion.div>

          {/* Engine label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38 }}
            style={{
              fontSize:      11,
              color:         accent,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              textAlign:     "center",
              marginBottom:  18,
              fontWeight:    600,
            }}
          >
            {cfg.engine}
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.55 }}
            style={{
              width:       120,
              height:      1,
              background:  `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
              marginBottom: 18,
            }}
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize:      14,
              color:         "rgba(26,26,27,0.48)",
              textAlign:     "center",
              maxWidth:      380,
              lineHeight:    1.65,
              letterSpacing: "0.02em",
              marginBottom:  8,
            }}
          >
            {cfg.tagline}
          </motion.p>

          {/* Atmosphere tags */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.58 }}
            style={{
              fontSize:      10,
              color:         `${accent}70`,
              textAlign:     "center",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom:  44,
            }}
          >
            {cfg.atmosphere}
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display:       "flex",
              flexDirection: "column",
              gap:           10,
              width:         "100%",
              maxWidth:      340,
            }}
          >
            <GlassButton
              label={guestProfile ? "Continue Session" : "Begin Experience"}
              sub={guestProfile ? `Welcome back, ${guestProfile.firstName}` : "Guided preference discovery"}
              icon={<Sparkles size={18} />}
              accent={accent}
              onClick={handleBeginClick}
              primary
            />
            <GlassButton
              label="Quick Match"
              sub="Skip to top recommendations"
              icon={<Zap size={16} />}
              accent={accent}
              onClick={onBegin}
            />
            <GlassButton
              label="Explore Lounge"
              sub="Browse the full experience"
              icon={<Compass size={16} />}
              accent={accent}
              onClick={onBegin}
            />
          </motion.div>
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
            borderTop:      "1px solid rgba(26,26,27,0.07)",
            background:     "rgba(6,4,2,0.65)",
            backdropFilter: "blur(12px)",
          }}
        >
          {["Taste Profile", "AI Ranking", "Inventory Sync"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.div
                style={{ width: 4, height: 4, borderRadius: "50%", background: accent }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1] }}
                transition={{ duration: 2.2, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span style={{
                fontSize: 9, color: "rgba(26,26,27,0.28)",
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Enrollment overlay ── */}
      <AnimatePresence>
        {scene === "enrollment" && (
          <EnrollmentFlow
            craftType={type}
            onComplete={handleEnrolled}
            onSkip={handleSkipEnrollment}
          />
        )}
      </AnimatePresence>

      {/* ── Mentor reveal overlay ── */}
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
