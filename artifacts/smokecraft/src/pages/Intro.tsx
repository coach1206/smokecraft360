/**
 * Intro — full-screen brand selector for the 360 Experience Platform.
 *
 * Three premium cards (SmokeCraft / PourCraft / VapeCraft). On tap:
 *   1. card scales + glows
 *   2. soft synthesized click (no asset bundling — WebAudio)
 *   3. card "expands" while siblings fade
 *   4. wouter navigates to /:theme
 *
 * The dynamic `/:theme` route in App.tsx already handles each destination,
 * so this page only needs to navigate by slug.
 */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

type ThemeKey = "smokecraft" | "pourcraft" | "vapecraft";

interface Experience {
  key:        ThemeKey;
  title:      string;
  descriptor: string;
  image:      string;
  accent:     string;   // hex used for glow + accent text
  gradient:   string;   // overlay gradient on the card
}

const EXPERIENCES: Experience[] = [
  {
    key:        "smokecraft",
    title:      "SmokeCraft 360",
    descriptor: "Cigars · Spirits · Lounge",
    image:      "https://www.themanual.com/tachyon/sites/9/2025/07/enrique-bancalari-L_1jns4QHf0-unsplash.jpg?resize=1200,800",
    accent:     "#D4AF37",
    gradient:   "linear-gradient(180deg, rgba(20,12,4,0.15) 0%, rgba(20,12,4,0.85) 100%)",
  },
  {
    key:        "pourcraft",
    title:      "PourCraft 360",
    descriptor: "Wine · Cocktails · Bar",
    image:      "https://images.pexels.com/photos/31094805/pexels-photo-31094805/free-photo-of-pouring-red-wine-into-a-glass-indoors.jpeg?auto=compress&cs=tinysrgb&w=1200",
    accent:     "#B91C3C",
    gradient:   "linear-gradient(180deg, rgba(40,8,12,0.15) 0%, rgba(40,8,12,0.85) 100%)",
  },
  {
    key:        "vapecraft",
    title:      "VapeCraft 360",
    descriptor: "Vapor · Flavor · Modern",
    image:      "https://herb-platform-images.imgix.net/wp-content/uploads/2025/05/02171936/giorgio-trovato-3ncMShQ9LSA-unsplash-scaled.jpg?auto=format&fit=crop&w=1200",
    accent:     "#7DD3FC",
    gradient:   "linear-gradient(180deg, rgba(8,18,32,0.15) 0%, rgba(8,18,32,0.85) 100%)",
  },
];

/** Synthesized soft click — no asset, no network, instant on first user gesture. */
function useClickSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) return;
      if (!ctxRef.current) ctxRef.current = new Ctor();
      const ctx = ctxRef.current;
      const t   = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gn).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      /* sound is non-essential */
    }
  }, []);
}

export default function Intro() {
  const [, navigate]       = useLocation();
  const [selected, setSel] = useState<ThemeKey | null>(null);
  const playClick          = useClickSound();

  const onPick = (key: ThemeKey) => {
    if (selected) return;
    playClick();
    setSel(key);
    // Persist choice so loadTheme() picks it up on the next page.
    try { localStorage.setItem("smokecraft_theme", key); } catch { /* ignore */ }
    setTimeout(() => navigate("/" + key), 520);
  };

  return (
    <div
      data-testid="intro-page"
      style={{
        position: "fixed", inset: 0, overflow: "hidden",
        background: "#0a0604",
        backgroundImage:
          "radial-gradient(ellipse at top left, rgba(60,30,10,0.55), transparent 60%)," +
          "radial-gradient(ellipse at bottom right, rgba(20,8,30,0.45), transparent 60%)," +
          "linear-gradient(135deg, rgba(8,4,2,0.95), rgba(2,2,6,0.98))",
        color: "#F5EBDD",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "5vh 4vw",
      }}
    >
      {/* Headline */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: selected ? 0 : 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginBottom: "4vh", maxWidth: 900 }}
      >
        <h1
          style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: "clamp(36px, 5.5vw, 64px)",
            fontWeight: 300,
            letterSpacing: "0.04em",
            margin: 0,
            background: "linear-gradient(180deg, #F5EBDD 0%, #D4AF37 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip: "text",
          }}
        >
          Choose Your Experience
        </h1>
        <p
          style={{
            marginTop: 12, fontSize: "clamp(14px, 1.6vw, 18px)",
            letterSpacing: "0.32em", textTransform: "uppercase",
            color: "rgba(245,235,221,0.55)",
          }}
        >
          Tap to begin your journey
        </p>
      </motion.header>

      {/* Cards */}
      <div
        style={{
          flex: 1, width: "100%", maxWidth: 1400,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        {EXPERIENCES.map((exp) => {
          const isSel   = selected === exp.key;
          const isOther = selected !== null && !isSel;
          return (
            <motion.button
              key={exp.key}
              data-testid={`intro-card-${exp.key}`}
              type="button"
              onClick={() => onPick(exp.key)}
              disabled={selected !== null}
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: isOther ? 0 : 1,
                y:       0,
                scale:   isSel ? 1.04 : 1,
              }}
              whileHover={selected ? undefined : { scale: 1.02 }}
              whileTap={selected ? undefined : { scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative", overflow: "hidden",
                minHeight: 460, borderRadius: 22,
                border: `1px solid ${exp.accent}33`,
                cursor: selected ? "default" : "pointer",
                padding: 0, color: "inherit",
                background: "#0a0604",
                boxShadow: isSel
                  ? `0 0 0 2px ${exp.accent}, 0 30px 80px ${exp.accent}55`
                  : `0 18px 50px rgba(0,0,0,0.55)`,
                transition: "box-shadow 0.4s ease",
              }}
            >
              {/* Background image */}
              <motion.div
                animate={{ scale: isSel ? 1.18 : 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${exp.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Gradient overlay */}
              <div
                style={{
                  position: "absolute", inset: 0,
                  background: exp.gradient,
                }}
              />
              {/* Glow halo on select/hover */}
              <motion.div
                animate={{ opacity: isSel ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: `radial-gradient(circle at 50% 60%, ${exp.accent}40, transparent 65%)`,
                }}
              />
              {/* Card content */}
              <div
                style={{
                  position: "relative", height: "100%",
                  display: "flex", flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "32px 28px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36, height: 2, marginBottom: 18,
                    background: `linear-gradient(90deg, ${exp.accent}, transparent)`,
                  }}
                />
                <h2
                  style={{
                    fontFamily: "var(--app-font-serif, Georgia, serif)",
                    fontSize: "clamp(24px, 2.4vw, 32px)",
                    fontWeight: 600, margin: 0,
                    color: "#F5EBDD",
                    letterSpacing: "0.02em",
                  }}
                >
                  {exp.title}
                </h2>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 13, letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: exp.accent,
                  }}
                >
                  {exp.descriptor}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selection lock overlay — fades the whole screen as we navigate. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            style={{
              position: "fixed", inset: 0,
              background: "#0a0604",
              pointerEvents: "none",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
