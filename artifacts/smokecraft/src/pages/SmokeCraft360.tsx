/**
 * SmokeCraft360 — Combustion & Construction
 * Stage 1: Cinematic intro
 * Stage 2: Flavor profile (Earthy / Spiced / Cedar / Leather)
 * Stage 3: Link to CigarArtisan360 for the full 3D bespoke box creation suite
 */

import { useLocation }     from "wouter";
import { motion }          from "framer-motion";
import { Craft360Shell, type Craft360Config } from "@/components/experience/Craft360Shell";

const CONFIG: Craft360Config = {
  craftId:   "smoke",
  title:     "SmokeCraft",
  subtitle:  "Combustion & Construction",
  quote:     "Every draw is a conversation between fire, leaf, and memory. The wrapper is a story. The filler, its truth.",
  accent:    "#C8A96E",
  dimAccent: "rgba(58,32,16,0.55)",
  mentor: {
    name:       "Master Artisan",
    title:      "Philosophical · Wrapper Integrity · Draw Resistance",
    philosophy: "A great cigar is not rolled — it is reasoned into being, one leaf at a time.",
  },
  flavors: [
    { id: "earthy",  label: "Earthy",  icon: "🌿", desc: "Rich loam, dark cocoa, forest floor" },
    { id: "spiced",  label: "Spiced",  icon: "🌶", desc: "Black pepper, cinnamon, warm leather" },
    { id: "cedar",   label: "Cedar",   icon: "🪵", desc: "Fresh-cut wood, dry grass, cool finish" },
    { id: "leather", label: "Leather", icon: "🍂", desc: "Aged tobacco, suede, roasted coffee" },
  ],
  particles: ["rgba(200,169,110,0.35)", "rgba(180,120,60,0.25)", "rgba(240,200,120,0.20)"],
};

function SmokeCraftCreation({ flavors }: { flavors: string[] }) {
  const [, navigate] = useLocation();
  const accent = CONFIG.accent;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 28px", gap: 20, fontFamily: "'Space Mono', monospace",
    }}>
      {/* Profile summary */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: `${accent}70`, letterSpacing: "0.24em", marginBottom: 8 }}>
          YOUR PALATE PROFILE
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {(flavors.length > 0 ? flavors : ["earthy"]).map(f => (
            <div key={f} style={{
              background: `${accent}18`, border: `1px solid ${accent}50`,
              color: accent, fontSize: 8, letterSpacing: "0.18em",
              padding: "5px 14px", borderRadius: 999, textTransform: "uppercase",
            }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Cigar illustration */}
      <motion.div
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 260, height: 44, borderRadius: "22px 4px 4px 22px",
          background: "linear-gradient(90deg, #C8A96E 0%, #8B5E2A 30%, #6B3C14 60%, #4A2008 100%)",
          boxShadow: `0 8px 32px rgba(200,169,110,0.28), 0 0 60px rgba(200,169,110,0.10)`,
          display: "flex", alignItems: "center", position: "relative", overflow: "hidden",
        }}
      >
        {/* Band */}
        <div style={{
          position: "absolute", left: 56, top: 0, bottom: 0, width: 36,
          background: "linear-gradient(90deg, #1A1A1A 0%, #2A2A2A 50%, #1A1A1A 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 5, color: "#D4AF37", letterSpacing: "0.12em", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
            ◈ AXIOM
          </div>
        </div>
        {/* Ember glow */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", right: 2, width: 18, height: 18,
            borderRadius: "50%", background: "radial-gradient(circle, #FF8C00 0%, #FF4500 50%, transparent 80%)",
          }}
        />
      </motion.div>

      {/* Description */}
      <div style={{
        textAlign: "center", maxWidth: 400,
        color: "rgba(245,242,237,0.42)", fontSize: 12, lineHeight: 1.7,
        fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic",
      }}>
        The Master Artisan has captured your palate signature.
        Now build your bespoke cigar box in the 3D Design Suite.
      </div>

      {/* CTA to CigarArtisan360 */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/artisan-360")}
        style={{
          padding: "16px 48px", borderRadius: 999, cursor: "pointer",
          background: `linear-gradient(135deg, ${accent}28, ${accent}10)`,
          border: `1px solid ${accent}`,
          color: accent, fontSize: 9, fontWeight: 700, letterSpacing: "0.24em",
          touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
          boxShadow: `0 0 32px ${accent}25`,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>◈</span> OPEN 3D DESIGN SUITE
      </motion.button>

      <div style={{ fontSize: 7, color: "rgba(245,242,237,0.18)", letterSpacing: "0.18em", textAlign: "center" }}>
        MASTER ARTISAN 360 · BESPOKE BOX & BAND DESIGNER
      </div>
    </div>
  );
}

export default function SmokeCraft360() {
  return (
    <Craft360Shell config={CONFIG}>
      {(flavors) => <SmokeCraftCreation flavors={flavors} />}
    </Craft360Shell>
  );
}
