import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Verified luxury asset database (matched to CraftImageRotator verified set) ─
const CRAFT_ASSETS = {
  smokecraft: [
    // source.unsplash.com search URLs — reliably return matching premium imagery
    { url: "https://source.unsplash.com/800x600/?cigar,luxury,lounge&sig=10", desc: "Luxury cigar lounge" },
    { url: "https://source.unsplash.com/800x600/?cigar,smoke,premium&sig=20", desc: "Premium cigar smoke" },
    { url: "https://source.unsplash.com/800x600/?cigar,humidor,tobacco&sig=30", desc: "Fine cigar humidor" },
    { url: "https://source.unsplash.com/800x600/?whiskey,cigar,lounge&sig=40", desc: "Cigar & whiskey pairing" },
  ],
  pourcraft: [
    // Replaced cocktail image with confirmed scotch/cognac imagery
    { url: "https://images.unsplash.com/photo-1569529465841-dfedd87500f1?q=80&w=1200", desc: "Single malt scotch in crystal glass" },
    { url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=1200", desc: "Premium cognac neat — crystal snifter" },
    { url: "https://images.unsplash.com/photo-1569529465841-dfedd87500f1?q=80&w=1200", desc: "Aged bourbon pairing ritual" },
  ],
  beercraft: [
    // Reordered: stout confirmed loading; stein URL was broken
    { url: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=1200", desc: "Rich dark stout with dense head" },
    { url: "https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=1200", desc: "Craft pilsner in artisanal glassware" },
  ],
  winecraft: [
    // Both confirmed loading correctly
    { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200", desc: "Sommelier-guided crystal decanter aeration" },
    { url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=1200", desc: "Fine vintage red wine tasting presentation" },
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
  { id: "pourcraft"  as CraftKey, title: "PourCraft 360",  sub: "Whiskey · Bourbon · Cognac Pairing", route: "/pourcraft",  metallic: "titanium", offset: 2000, active: false },
  { id: "beercraft"  as CraftKey, title: "BeerCraft 360",  sub: "Craft Beer Discovery",               route: "/beercraft",  metallic: "titanium", offset: 4000, active: false },
  { id: "winecraft"  as CraftKey, title: "WineCraft 360",  sub: "Sommelier-Guided Wine Presentation", route: "/winecraft",  metallic: "titanium", offset: 6000, active: false },
];

// Fixed smoke positions — no Math.random() so no hydration mismatch
const SMOKE_WISPS = [
  { left: "7%",  bottom: "-10%", dur: 20, delay: 0,  dx:  40 },
  { left: "22%", bottom: "-10%", dur: 25, delay: 4,  dx: -48 },
  { left: "41%", bottom: "-10%", dur: 18, delay: 8,  dx:  32 },
  { left: "58%", bottom: "-10%", dur: 23, delay: 2,  dx: -36 },
  { left: "74%", bottom: "-10%", dur: 26, delay: 6,  dx:  52 },
  { left: "91%", bottom: "-10%", dur: 21, delay: 10, dx: -44 },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function CraftPortalHome() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(ellipse at center, #161719 0%, #050607 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#e3e4e6",
      position: "relative",
      overflow: "hidden",
      padding: "40px 32px",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ── Google Fonts ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300;400&family=Inter:wght@300;400;500&display=swap');
      `}</style>

      {/* ── Cinematic ambient lounge smoke ───────────────────────────────── */}
      {SMOKE_WISPS.map((s, i) => (
        <motion.div
          key={i}
          animate={{
            y: ["0vh", "-125vh"],
            x: [`0px`, `${s.dx}px`],
            scale: [1, 1.6],
            opacity: [0, 0.85, 0],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: "linear",
          }}
          style={{
            position: "fixed",
            bottom: s.bottom,
            left: s.left,
            width: 560,
            height: 560,
            background: "radial-gradient(circle, rgba(220,220,220,0.022) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      ))}

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
          const isGold = portal.metallic === "gold";
          const borderGrad = isGold
            ? "linear-gradient(135deg, #dfba73 0%, #fbf5b7 35%, #9e7831 70%, #dfba73 100%)"
            : "linear-gradient(135deg, #7a7d80 0%, #e1e4e6 40%, #595b5e 100%)";
          const cardBg = "linear-gradient(135deg, rgba(8,9,10,0.55) 0%, rgba(5,6,7,0.60) 100%)";
          const hoverShadow = isGold
            ? "inset 0 1px 1px rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.92), 0 0 28px rgba(223,186,115,0.18)"
            : "inset 0 1px 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.92), 0 0 20px rgba(255,255,255,0.06)";

          return (
            <motion.div
              key={portal.id}
              onClick={() => navigate(portal.route)}
              whileHover={{ scale: 1.018, boxShadow: hoverShadow }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                height: 460,
                borderRadius: 4,
                overflow: "hidden",
                // Two-gradient metallic border technique
                backgroundImage: `${cardBg}, ${borderGrad}`,
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
                border: "1px solid transparent",
                backdropFilter: "blur(30px) saturate(120%)",
                WebkitBackdropFilter: "blur(30px) saturate(120%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.90)",
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
                    color: "#fffcf5",
                    lineHeight: 1.1,
                  }}>
                    {portal.title}
                  </h2>
                  <p style={{
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#a3a6a8",
                    lineHeight: 1.7,
                    margin: 0,
                  }}>
                    {portal.sub}
                  </p>
                </div>

                {/* Smoked chrome CTA button */}
                <button
                  onClick={e => { e.stopPropagation(); navigate(portal.route); }}
                  style={{
                    background: "linear-gradient(180deg, #242629 0%, #111214 100%)",
                    border: "1px solid rgba(138,141,144,0.30)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.50)",
                    color: "#e3e4e6",
                    padding: "14px 28px",
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.30em",
                    textTransform: "uppercase",
                    borderRadius: 3,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "'Inter', sans-serif",
                    transition: "background 0.3s ease, border-color 0.3s ease",
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = "linear-gradient(180deg, #2d3035 0%, #16181b 100%)";
                    b.style.borderColor = "rgba(225,228,230,0.45)";
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = "linear-gradient(180deg, #242629 0%, #111214 100%)";
                    b.style.borderColor = "rgba(138,141,144,0.30)";
                  }}
                >
                  {portal.active ? "Begin Experience" : "Select Masterclass"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

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
