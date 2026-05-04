import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Shield, Package, Play, Presentation } from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const TILES = [
  {
    id: "venue",
    title: "Venue Access",
    desc: "For owners and staff",
    icon: Building2,
    color: "#d4af37",
    glow: "rgba(212,175,55,0.25)",
    route: "/pin-login",
    image: "/images/lounge-bg.jpg",
  },
  {
    id: "admin",
    title: "Admin Control",
    desc: "For system administrators",
    icon: Shield,
    color: "#5b8def",
    glow: "rgba(91,141,239,0.25)",
    route: "/touch/admin",
    image: "/images/cigar3.png",
  },
  {
    id: "vendor",
    title: "Vendor Access",
    desc: "For suppliers and partners",
    icon: Package,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.25)",
    route: "/touch/vendor",
    image: "/images/cigar2.png",
  },
  {
    id: "demo",
    title: "Demo Mode",
    desc: "Explore the system experience",
    icon: Play,
    color: "#34d399",
    glow: "rgba(52,211,153,0.25)",
    route: "/demo",
    image: "/images/scenes/bold.jpg",
  },
  {
    id: "investor-demo",
    title: "Investor Demo",
    desc: "Auto-walk product showcase",
    icon: Presentation,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    route: "/demo-mode",
    image: "/images/scenes/social.jpg",
  },
] as const;

export default function Entry() {
  const [, navigate] = useLocation();
  const [expandingId, setExpandingId] = useState<string | null>(null);

  function handleTap(tile: typeof TILES[number]) {
    setExpandingId(tile.id);
    setTimeout(() => navigate(tile.route), 400);
  }

  return (
    <BackgroundLayer image="/images/lounge-bg.png" blur={3} style={{
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
          color: "rgba(212,175,55,0.5)", marginBottom: 4,
        }}>Profound Innovations</div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#d4af37", margin: "0 0 2px",
          fontFamily: "'Playfair Display', serif", letterSpacing: "0.03em",
        }}>Craft Central</h1>
        <h2 style={{
          fontSize: 14, fontWeight: 400, color: "rgba(232,224,200,0.6)",
          margin: "0 0 4px", letterSpacing: "0.08em",
        }}>Craft Command Center</h2>
        <p style={{
          fontSize: 12, color: "rgba(232,224,200,0.35)", margin: 0,
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
            const Icon = tile.icon;
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
                  backgroundSize: "cover", backgroundPosition: "center",
                  opacity: 0.3,
                  pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(180deg, rgba(10,8,6,0.8) 0%, ${tile.color}15 100%)`,
                  pointerEvents: "none",
                }} />
                <div style={{
                  width: 72, height: 72, borderRadius: 18,
                  background: `${tile.color}20`,
                  border: `1.5px solid ${tile.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                  backdropFilter: "blur(4px)",
                }}>
                  <Icon size={32} color={tile.color} strokeWidth={1.5} />
                </div>
                <div style={{ position: "relative", textAlign: "center" }}>
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: "#e8e0c8",
                    letterSpacing: "0.02em", marginBottom: 4,
                  }}>{tile.title}</div>
                  <div style={{
                    fontSize: 13, color: "rgba(232,224,200,0.45)",
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
          letterSpacing: "0.2em", color: "rgba(232,224,200,0.2)",
          position: "relative", zIndex: 1,
        }}
      >Powered by 360 Enterprise Services</motion.div>
    </BackgroundLayer>
  );
}
