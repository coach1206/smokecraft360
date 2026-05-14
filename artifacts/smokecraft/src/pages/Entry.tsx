import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";

const TILES = [
  {
    id: "venue",
    title: "Venue Access",
    desc: "For owners and staff",
    color: "#D48B00",
    glow: "rgba(212,139,0,0.25)",
    route: "/pin-login",
    image: "/images/lounge-bg.jpg",
  },
  {
    id: "admin",
    title: "Admin Control",
    desc: "For system administrators",
    color: "#5b8def",
    glow: "rgba(91,141,239,0.25)",
    route: "/touch/admin",
    image: "/images/cigar3.png",
  },
  {
    id: "vendor",
    title: "Vendor Access",
    desc: "For suppliers and partners",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.25)",
    route: "/touch/vendor",
    image: "/images/cigar2.png",
  },
  {
    id: "demo",
    title: "Demo Mode",
    desc: "Explore the system experience",
    color: "#34d399",
    glow: "rgba(52,211,153,0.25)",
    route: "/demo",
    image: "/images/scenes/bold.jpg",
  },
  {
    id: "investor-demo",
    title: "Investor Demo",
    desc: "Auto-walk product showcase",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    route: "/demo-mode",
    image: "/images/scenes/social.jpg",
  },
  {
    id: "craft-hub",
    title: "Craft Hub",
    desc: "Guided cigar, spirit, beer & vape journeys",
    color: "#e879f9",
    glow: "rgba(232,121,249,0.25)",
    route: "/experiences",
    image: "/images/scenes/craft-hub.png",
    fit: "contain" as const,
  },
] as const;

export default function Entry() {
  const [, navigate] = useLocation();
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const { getBackground } = useVenueContext();

  function handleTap(tile: typeof TILES[number]) {
    setExpandingId(tile.id);
    setTimeout(() => navigate(tile.route), 400);
  }

  return (
    <BackgroundLayer image={getBackground("entry")} blur={3} style={{
      height: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
      overflow: "auto",
      boxSizing: "border-box",
    }}>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ textAlign: "center", marginBottom: 8, position: "relative", zIndex: 1 }}
      >
        <div style={{
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.25em",
          color: "rgba(212,139,0,0.5)", marginBottom: 4,
        }}>Profound Innovations</div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#D48B00", margin: "0 0 2px",
          fontFamily: "'Playfair Display', serif", letterSpacing: "0.03em",
        }}>NOVEE OS</h1>
        <h2 style={{
          fontSize: 14, fontWeight: 400, color: "rgba(26,26,27,0.58)",
          margin: "0 0 4px", letterSpacing: "0.08em",
        }}>Command Hub</h2>
        <p style={{
          fontSize: 12, color: "rgba(26,26,27,0.35)", margin: 0,
          fontStyle: "italic",
        }}>If you've got vision, we've got direction.</p>
      </motion.div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 14, maxWidth: 580, width: "100%",
        position: "relative", zIndex: 1,
        marginTop: 12,
      }}>
        <AnimatePresence>
          {TILES.map((tile, i) => {
            const isExpanding = expandingId === tile.id;
            return (
              <motion.button
                key={tile.id}
                initial={{ opacity: 0.3, scale: 0.95, y: 10 }}
                animate={isExpanding
                  ? { opacity: 0, scale: 1.08 }
                  : { opacity: 1, scale: 1, y: 0 }
                }
                transition={isExpanding
                  ? { duration: 0.25, ease: "easeIn" }
                  : { duration: 0.3, delay: i * 0.05, ease: "easeOut" }
                }
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTap(tile)}
                disabled={!!expandingId}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "24px 16px",
                  background: "transparent",
                  border: `1px solid ${tile.color}40`,
                  borderRadius: 18,
                  cursor: "pointer",
                  position: "relative", overflow: "hidden",
                  minHeight: 150,
                }}
              >
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${tile.image})`,
                  backgroundSize: "fit" in tile && tile.fit === "contain" ? "contain" : "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundColor: "fit" in tile && tile.fit === "contain" ? "#F5F2ED" : "transparent",
                  pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(180deg, rgba(245,242,237,0.15) 0%, rgba(245,242,237,0.45) 70%, rgba(245,242,237,0.75) 100%)`,
                  pointerEvents: "none",
                }} />
                <div style={{ position: "relative", textAlign: "center", marginTop: "auto" }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: "#1A1A1B",
                    letterSpacing: "0.02em", marginBottom: 4,
                    textShadow: "0 1px 4px rgba(26,26,27,0.32)",
                  }}>{tile.title}</div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)",
                    textShadow: "0 1px 3px rgba(26,26,27,0.26)",
                  }}>{tile.desc}</div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          marginTop: 24, fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.2em", color: "rgba(26,26,27,0.20)",
          position: "relative", zIndex: 1,
        }}
      >Powered by NOVEE OS</motion.div>
    </BackgroundLayer>
  );
}
