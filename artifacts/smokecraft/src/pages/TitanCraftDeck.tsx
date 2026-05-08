/**
 * TitanCraftDeck — Axiom OS cinematic craft portal.
 * Route: / and /titan-hub
 *
 * Emotional target: entering a private members lounge, not navigating software.
 * Structure: wordmark header → cinematic craft scene carousel → minimal footer.
 * No tabs, no status badges, no telemetry labels, no dashboard chrome.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation }                 from "wouter";
import { motion, AnimatePresence }     from "framer-motion";
import { CRAFT_MODULES }               from "@/data/craftScenes";

// ── Craft scene data ──────────────────────────────────────────────────────────

const CRAFT_IMAGES: Record<string, string> = {
  smoke: "/images/scenes/smokecraft-card.jpg",
  pour:  "/images/scenes/pourcraft-card.jpg",
  brew:  "/images/scenes/brewcraft-card.jpg",
  vape:  "/images/scenes/vapecraft-card.jpg",
};

const CRAFT_SUBS: Record<string, string> = {
  smoke: "Molecular Leaf Lab · Ritual Prep",
  pour:  "Vessel Geometry · Spirit Sync",
  brew:  "Fermentation Lab · Craft Intelligence",
  vape:  "Cloud Architecture · Vapor Sync",
};

// ── Craft card — cinematic scene tile ─────────────────────────────────────────

interface CardProps {
  id:     string;
  title:  string;
  color:  string;
  route:  string;
  active: boolean;
}

function CraftCard({ id, title, color, route, active }: CardProps) {
  const [, navigate] = useLocation();
  const img  = CRAFT_IMAGES[id]  ?? CRAFT_IMAGES["smoke"]!;
  const sub  = CRAFT_SUBS[id]    ?? "";
  const isSmoke = id === "smoke";

  return (
    <motion.div
      className="cursor-pointer h-full"
      style={{
        position:       "relative",
        overflow:       "hidden",
        borderRadius:   40,
        borderTop:      "1px solid rgba(255,255,255,0.18)",
        borderLeft:     "1px solid rgba(255,255,255,0.06)",
        background:     "#0a0806",
      }}
      animate={{
        scale:      active ? 1.025 : 0.975,
        opacity:    active ? 1 : 0.55,
        boxShadow:  active
          ? `0 60px 120px rgba(0,0,0,0.95), 0 0 0 1px ${color}60, 0 0 48px ${color}25`
          : "0 40px 80px rgba(0,0,0,0.8)",
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
    >
      {/* Full-bleed hero image */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <motion.img
          src={img}
          alt={title}
          animate={{ scale: active ? 1.04 : 1 }}
          transition={{ duration: 6, ease: "easeInOut" }}
          style={{
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center",
            display:        "block",
          }}
        />
      </div>

      {/* Deep gradient — bottom text zone only */}
      <div style={{
        position:   "absolute",
        inset:      0,
        zIndex:     10,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.10) 45%, transparent 100%)",
      }} />

      {/* Top atmosphere */}
      <div style={{
        position:   "absolute",
        top:        0,
        left:       0,
        right:      0,
        height:     "35%",
        zIndex:     10,
        background: `linear-gradient(to bottom, ${color}15 0%, transparent 100%)`,
      }} />

      {/* Animated top accent line — breathing */}
      <motion.div
        style={{ background: color, position: "absolute", top: 0, left: 0, right: 0, height: "1.5px", zIndex: 20 }}
        animate={{ opacity: active ? [0.6, 1, 0.6] : [0.08, 0.20, 0.08] }}
        transition={{ duration: active ? 3 : 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom text zone */}
      <div style={{
        position:       "absolute",
        bottom:         0,
        left:           0,
        width:          "100%",
        padding:        "32px 36px",
        zIndex:         20,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}>
        <h2 style={{
          fontSize:        "clamp(1rem, 1.6vw, 1.75rem)",
          fontStyle:       "italic",
          letterSpacing:   "0.55em",
          marginBottom:    10,
          lineHeight:      1,
          textTransform:   "uppercase",
          fontWeight:      900,
          whiteSpace:      "nowrap",
          ...(isSmoke
            ? {
                background:           "linear-gradient(90deg, #8a6d3b 0%, #fff9e6 25%, #d4af37 50%, #fff9e6 75%, #8a6d3b 100%)",
                backgroundSize:       "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                filter:               "drop-shadow(0 0 12px rgba(212,175,55,.5))",
                animation:            "gold-shimmer 5s linear infinite",
              }
            : {
                background:           "linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(200,200,200,0.55) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }),
        }}>
          {title}
        </h2>
        <p style={{
          color:          "#E8DCC8",
          opacity:        0.38,
          fontSize:       "9px",
          letterSpacing:  ".38em",
          textTransform:  "uppercase",
          marginBottom:   0,
        }}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TitanCraftDeck() {
  const [, navigate]          = useLocation();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [time, setTime]       = useState("");
  const carouselRef           = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Live clock — environmental presence indicator
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, []);

  // Auto-rotation every 7s — slow, deliberate, like a hotel lobby display
  useEffect(() => {
    const iv = setInterval(
      () => setActiveIndex(i => (i + 1) % CRAFT_MODULES.length),
      7_000,
    );
    return () => clearInterval(iv);
  }, []);

  // Scroll carousel to active card
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.children[activeIndex] as HTMLElement | undefined;
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          id="axiom-terminal"
          className="axiom-theme axiom-terminal h-screen w-full flex flex-col"
          style={{ fontFamily: "var(--app-font-sans, system-ui, sans-serif)", overflow: "hidden" }}
        >
          {/* Ambient amber radial — top-center whiskey warmth */}
          <div
            aria-hidden
            style={{
              position:   "absolute",
              inset:      0,
              pointerEvents: "none",
              background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(200,135,51,0.11) 0%, transparent 70%)",
              zIndex:     0,
            }}
          />

          {/* Floor depth — walnut shadow rising from bottom */}
          <div
            aria-hidden
            style={{
              position:      "absolute",
              inset:         0,
              pointerEvents: "none",
              background:    "radial-gradient(ellipse 90% 50% at 50% 105%, rgba(18,10,4,0.75) 0%, transparent 70%)",
              zIndex:        0,
            }}
          />

          {/* ── Header — wordmark + live clock only ── */}
          <header
            className="relative z-10 flex justify-between items-end flex-shrink-0"
            style={{ padding: "36px 48px 20px" }}
          >
            {/* Wordmark */}
            <div>
              <div style={{
                background:           "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                filter:               "drop-shadow(0 0 18px rgba(212,175,55,.45))",
                fontSize:             "clamp(22px, 2.4vw, 30px)",
                letterSpacing:        ".5em",
                fontWeight:           900,
                textTransform:        "uppercase",
              }}>
                Axiom 360
              </div>
              <div style={{
                fontSize:      "8px",
                letterSpacing: "0.55em",
                opacity:       0.28,
                marginTop:     7,
                textTransform: "uppercase",
                color:         "#E8DCC8",
              }}>
                Sovereign Experience OS
              </div>
            </div>

            {/* Live clock — ambient time presence */}
            <div style={{
              fontSize:      "13px",
              letterSpacing: "0.25em",
              opacity:       0.35,
              color:         "#E8DCC8",
              fontWeight:    300,
            }}>
              {time}
            </div>
          </header>

          {/* ── Scene label ── */}
          <div
            className="relative z-10 flex justify-center"
            style={{ marginBottom: 14 }}
          >
            <div style={{
              fontSize:      "7.5px",
              letterSpacing: "0.65em",
              textTransform: "uppercase",
              opacity:       0.20,
              color:         "#E8DCC8",
            }}>
              Select your craft
            </div>
          </div>

          {/* ── Craft carousel ── */}
          <main
            ref={carouselRef}
            className="hide-scrollbar flex-grow flex items-stretch"
            style={{
              display:         "flex",
              overflowX:       "scroll",
              scrollSnapType:  "x mandatory",
              gap:             20,
              padding:         "0 72px 0",
              alignItems:      "stretch",
            }}
          >
            {CRAFT_MODULES.map((mod, i) => (
              <div
                key={mod.id}
                onClick={() => setActiveIndex(i)}
                style={{
                  flexShrink:      0,
                  width:           "clamp(270px, 34vw, 490px)",
                  height:          "100%",
                  scrollSnapAlign: "center",
                  cursor:          "pointer",
                }}
              >
                <CraftCard
                  id={mod.id}
                  title={mod.title}
                  color={mod.color}
                  route={mod.route}
                  active={activeIndex === i}
                />
              </div>
            ))}
          </main>

          {/* ── Dot navigation indicators ── */}
          <div
            className="relative z-10 flex justify-center gap-2"
            style={{ padding: "14px 0" }}
          >
            {CRAFT_MODULES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveIndex(i)}
                animate={{
                  width:           activeIndex === i ? 22 : 5,
                  opacity:         activeIndex === i ? 0.85 : 0.22,
                  backgroundColor: activeIndex === i ? "#C88733" : "rgba(232,220,200,0.5)",
                }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{
                  height:       5,
                  borderRadius: 3,
                  border:       "none",
                  cursor:       "pointer",
                  padding:      0,
                  flexShrink:   0,
                }}
                aria-label={`Craft ${i + 1}`}
              />
            ))}
          </div>

          {/* ── Footer — ultra minimal ── */}
          <footer
            className="relative z-10 flex justify-between items-center flex-shrink-0"
            style={{ padding: "8px 48px 28px" }}
          >
            {/* New guest entry — whispered, not shouted */}
            <button
              onClick={() => navigate("/enrollment")}
              style={{
                background:    "none",
                border:        "none",
                color:         "rgba(232,220,200,0.18)",
                fontSize:      "7.5px",
                letterSpacing: "0.5em",
                textTransform: "uppercase",
                cursor:        "pointer",
                padding:       0,
                fontFamily:    "inherit",
              }}
            >
              New Guest
            </button>

            {/* Brand mark — centered */}
            <div style={{
              fontSize:      "8px",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color:         "#C88733",
              opacity:       0.22,
            }}>
              Axiom Sovereign OS
            </div>

            {/* Returning guest */}
            <button
              onClick={() => navigate("/craft-hub")}
              style={{
                background:    "none",
                border:        "none",
                color:         "rgba(232,220,200,0.18)",
                fontSize:      "7.5px",
                letterSpacing: "0.5em",
                textTransform: "uppercase",
                cursor:        "pointer",
                padding:       0,
                fontFamily:    "inherit",
              }}
            >
              Returning?
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
