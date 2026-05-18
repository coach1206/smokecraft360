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
      minHeight: "100dvh",
      background: "#050505",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#E5E5E5",
      position: "relative",
      overflow: "hidden",
      padding: "40px 32px",
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

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header style={{ textAlign: "center", marginBottom: 56, position: "relative", zIndex: 10 }}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.1 }}
          style={{
            fontSize: 8, letterSpacing: "0.52em",
            textTransform: "uppercase",
            color: "rgba(212,175,55,0.45)",
            marginBottom: 10,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Profound Innovations
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(28px, 4.5vw, 52px)",
            fontWeight: 300,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: "0 0 14px",
            lineHeight: 1.05,
            background: "linear-gradient(180deg, #fffcf5 0%, #dfba73 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          The Craft Collection
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          style={{
            fontSize: 9, letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.18)",
            fontWeight: 300,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Four Masterclasses · One Sovereign Collection
        </motion.p>
      </header>

      {/* ── Portal grid ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 28,
          width: "100%",
          maxWidth: 1380,
          position: "relative",
          zIndex: 10,
        }}
      >
        {PORTALS.map(portal => {
          return (
            <motion.div
              key={portal.id}
              onClick={() => handlePortalClick(portal)}
              whileHover={{ scale: 1.016, boxShadow: "0 24px 72px rgba(0,0,0,0.95), 0 0 32px rgba(212,175,55,0.12)" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                height: 460,
                borderRadius: 6,
                overflow: "hidden",
                background: "rgba(15,15,15,0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(212,175,55,0.15)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.88)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 40,
                cursor: "pointer",
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
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 32,
                    fontWeight: 300,
                    letterSpacing: "0.06em",
                    margin: "0 0 10px",
                    color: "#D4AF37",
                    lineHeight: 1.1,
                  }}>
                    {portal.title}
                  </h2>
                  <p style={{
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#E5E5E5",
                    lineHeight: 1.6,
                    margin: 0,
                    opacity: 0.7,
                  }}>
                    {portal.sub}
                  </p>
                </div>

                {/* Smoked chrome CTA button */}
                <button
                  onClick={e => handlePortalClick(portal, e as unknown as React.MouseEvent)}
                  style={{
                    background: "rgba(12,12,12,0.80)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.55)",
                    color: "#E5E5E5",
                    padding: "14px 28px",
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.30em",
                    textTransform: "uppercase",
                    borderRadius: 4,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "'Inter', sans-serif",
                    transition: "border-color 0.3s ease, background 0.3s ease",
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(212,175,55,0.55)";
                    b.style.background = "rgba(212,175,55,0.08)";
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(212,175,55,0.25)";
                    b.style.background = "rgba(12,12,12,0.80)";
                  }}
                >
                  {portal.active ? "Begin Experience" : "Coming Soon"}
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.8 }}
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: 44,
          fontSize: 7,
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.10)",
          fontFamily: "'Inter', sans-serif",
          textAlign: "center",
        }}
      >
        NOVEE OS 1.0 · Profound Innovations LLC · 360 Enterprise Services
      </motion.p>
    </div>
  );
}
