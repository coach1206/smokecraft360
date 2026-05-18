import { useState, useEffect } from "react";
import type React from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Verified luxury asset database (matched to CraftImageRotator verified set) ─
// Local images served from public/images/ — guaranteed correct content, no CDN dependency
// Images sourced from SmokeCraft's own verified production image references
const CRAFT_ASSETS = {
  smokecraft: [
    { url: "/novee/images/smokecraft-card.jpg",  desc: "Diverse connoisseurs — luxury cigar lounge" },
    { url: "/novee/images/smoke-verified-3.jpg", desc: "Premium cigar selection" },
    { url: "/novee/images/smoke-home-1.jpg",     desc: "Cigar humidor ritual" },
  ],
  pourcraft: [
    { url: "/novee/images/pourcraft-card.png",  desc: "Premium whiskey and bourbon selection" },
    { url: "/novee/images/pour-verified-1.jpg", desc: "Macallan 18 — single malt scotch" },
    { url: "/novee/images/pour-1.jpg",          desc: "Whiskey bottle wall" },
  ],
  beercraft: [
    { url: "/novee/images/brewcraft-card.png",  desc: "Artisanal craft beer — perfect pour" },
    { url: "/novee/images/beer-verified-1.jpg", desc: "Guinness Draught — dark stout" },
    { url: "/novee/images/beer-verified-2.jpg", desc: "Artisanal craft pour" },
  ],
  winecraft: [
    { url: "/novee/images/wine-1.jpg", desc: "Sommelier decanter aeration" },
  ],
} as const;

type CraftKey = keyof typeof CRAFT_ASSETS;

// ── Staggered background image rotator ───────────────────────────────────────
function CardBackground({ craft, offset }: { craft: CraftKey; offset: number }) {
  const images = CRAFT_ASSETS[craft];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setIdx(prev => (prev + 1) % images.length);
      }, 9000);
    }, offset);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [images.length, offset]);

  return (
    <AnimatePresence>
      <motion.img
        key={idx}
        src={images[idx].url}
        alt={images[idx].desc}
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 0.75, scale: 1   }}
        exit={{    opacity: 0, scale: 0.97   }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    </AnimatePresence>
  );
}

// ── Portal definitions ────────────────────────────────────────────────────────
const PORTALS = [
  { id: "smokecraft" as CraftKey, title: "SmokeCraft 360", sub: "Luxury Cigar Masterclass",           route: "/smokecraft", metallic: "gold",     offset: 0,    active: true  },
  { id: "pourcraft"  as CraftKey, title: "PourCraft 360",  sub: "Whiskey · Bourbon · Cognac",         route: "/pourcraft",  metallic: "titanium", offset: 2000, active: false },
  { id: "beercraft"  as CraftKey, title: "BeerCraft 360",  sub: "Craft Beer Discovery",               route: "/beercraft",  metallic: "titanium", offset: 4000, active: false },
  { id: "winecraft"  as CraftKey, title: "WineCraft 360",  sub: "Sommelier Wine Presentation",        route: "/winecraft",  metallic: "titanium", offset: 6000, active: false },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function CraftPortalHome() {
  const [, navigate] = useLocation();
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  // Wipe ALL persisted craft/guest state so every portal entry is a clean slate.
  // Clears current session keys + legacy keys from older builds.
  useEffect(() => {
    try {
      sessionStorage.removeItem("smokecraft_guest");
      sessionStorage.removeItem("axiom_eeis_journey");
      sessionStorage.removeItem("axiom_experience_level");
      sessionStorage.removeItem("axiom_craft_build");
      localStorage.removeItem("NOVEE_SC_RITUAL_v1");
      localStorage.removeItem("titan_ritual_complete");
      localStorage.removeItem("smokeCraftStage");
      localStorage.removeItem("currentStage");
    } catch { /* ignore */ }
  }, []);

  function handlePortalClick(portal: typeof PORTALS[number], e?: React.MouseEvent) {
    e?.stopPropagation();
    if (portal.active) {
      navigate(portal.route);
    } else {
      setComingSoon(portal.title);
    }
  }

  return (
    <div style={{
      height: "100dvh",
      background: "#050505",
      display: "flex",
      flexDirection: "column",
      color: "#E5E5E5",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ── Google Fonts ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300;400&family=Inter:wght@300;400;500&display=swap');
      `}</style>

      {/* ── Ambient lounge accent glow — low-lit private room ───────────── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,176,0,0.04) 0%, transparent 55%)",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, pointerEvents: "none", zIndex: 1,
        height: "40%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(255,176,0,0.025) 0%, transparent 70%)",
      }} />

      {/* ── Discreet sovereign access ────────────────────────────────────── */}
      <button
        onClick={() => navigate("/sovereign")}
        style={{
          position: "fixed", top: 26, right: 36,
          background: "none", border: "none",
          fontSize: 9, letterSpacing: "0.40em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.20)",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "color 0.3s",
          zIndex: 50,
          padding: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.46)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.20)"; }}
      >
        Sovereign Access
      </button>

      {/* ── Slim status bar ──────────────────────────────────────────────── */}
      <header style={{
        position:       "relative",
        zIndex:         20,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "10px 32px",
        borderBottom:   "1px solid rgba(212,175,55,0.10)",
        background:     "rgba(5,5,5,0.90)",
        backdropFilter: "blur(18px)",
        flexShrink:     0,
        gap:            18,
      }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(14px, 1.8vw, 18px)",
            fontWeight:    300,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            background:    "linear-gradient(180deg, #fffcf5 0%, #dfba73 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip:       "text",
          }}
        >
          The Craft Collection
        </motion.span>
        <span style={{
          fontSize:      8,
          letterSpacing: "0.30em",
          color:         "rgba(212,175,55,0.35)",
          textTransform: "uppercase",
          fontFamily:    "'Inter', sans-serif",
        }}>
          NOVEE OS
        </span>
      </header>

      {/* ── Portal grid — full-height kiosk panels ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        style={{
          flex:                1,
          display:             "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows:    "repeat(2, 1fr)",
          gap:                 0,
          position:            "relative",
          zIndex:              10,
          overflow:            "hidden",
        }}
      >
        {PORTALS.map((portal, i) => {
          return (
            <motion.div
              key={portal.id}
              onPointerDown={() => handlePortalClick(portal)}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position:        "relative",
                overflow:        "hidden",
                background:      "rgba(8,8,8,0.92)",
                border:          `1px solid rgba(212,175,55,${i === 0 ? "0.18" : "0.10"})`,
                display:         "flex",
                flexDirection:   "column",
                justifyContent:  "space-between",
                padding:         "32px 36px",
                cursor:          "pointer",
                userSelect:      "none",
              }}
            >
              {/* ── Rotating image background ─────────────────────────── */}
              <CardBackground craft={portal.id} offset={portal.offset} />

              {/* ── Bottom-fade scrim ─────────────────────────────────── */}
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(5,6,7,0.08) 0%, rgba(5,6,7,0.30) 45%, rgba(5,6,7,0.72) 100%)",
                zIndex: 2,
                pointerEvents: "none",
              }} />

              {/* ── Card content ──────────────────────────────────────── */}
              <div style={{
                position: "relative",
                zIndex: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}>
                {/* Title block */}
                <div>
                  <h2 style={{
                    fontFamily:    "'Cormorant Garamond', Georgia, serif",
                    fontSize:      "clamp(28px, 3.8vw, 52px)",
                    fontWeight:    300,
                    letterSpacing: "0.08em",
                    margin:        "0 0 12px",
                    color:         "#D4AF37",
                    lineHeight:    1.05,
                  }}>
                    {portal.title}
                  </h2>
                  <p style={{
                    fontSize:      "clamp(11px, 1.1vw, 14px)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color:         "#E5E5E5",
                    lineHeight:    1.6,
                    margin:        0,
                    opacity:       0.65,
                  }}>
                    {portal.sub}
                  </p>
                </div>

                {/* Touch-first CTA — 64px minimum target */}
                <button
                  onPointerDown={e => { e.stopPropagation(); handlePortalClick(portal); }}
                  style={{
                    background:     "rgba(212,175,55,0.10)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border:         "1.5px solid rgba(212,175,55,0.40)",
                    color:          "#D4AF37",
                    padding:        "20px 28px",
                    minHeight:      64,
                    fontSize:       "clamp(10px, 1.0vw, 13px)",
                    fontWeight:     700,
                    letterSpacing:  "0.26em",
                    textTransform:  "uppercase",
                    borderRadius:   10,
                    cursor:         "pointer",
                    width:          "100%",
                    textAlign:      "center",
                    fontFamily:     "'Inter', sans-serif",
                    boxShadow:      "0 0 20px rgba(212,175,55,0.15)",
                  }}
                >
                  {portal.active ? "◈ ENTER EXPERIENCE" : "COMING SOON"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Coming Soon overlay (inactive masterclass tap) ───────────────── */}
      <AnimatePresence>
        {comingSoon && (
          <motion.div
            key="coming-soon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setComingSoon(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.82)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: "center", pointerEvents: "none" }}
            >
              <p style={{
                fontSize: 8, letterSpacing: "0.50em", textTransform: "uppercase",
                color: "rgba(212,175,55,0.50)", fontFamily: "'Inter',sans-serif",
                marginBottom: 18,
              }}>
                Profound Innovations
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                fontWeight: 300, letterSpacing: "0.12em",
                background: "linear-gradient(180deg, #fffcf5 0%, #dfba73 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", margin: "0 0 16px",
              }}>
                {comingSoon}
              </h2>
              <p style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                fontStyle: "italic", color: "rgba(255,252,245,0.40)",
                letterSpacing: "0.06em", margin: "0 0 40px",
              }}>
                In Private Development · Sovereign Preview Coming Soon
              </p>
              <div style={{
                width: 48, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.40), transparent)",
                margin: "0 auto 32px",
              }} />
              <p style={{
                fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.18)", fontFamily: "'Inter',sans-serif",
              }}>
                Tap anywhere to dismiss
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
