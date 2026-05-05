/**
 * CraftHub — Dynamic Visual Card Engine landing page.
 *
 * Renders all four Craft 360 modules (SmokeCraft, PourCraft, BrewCraft,
 * VapeCraft) as rotating lifestyle imagery cards in a responsive 2×2 grid.
 *
 * Route: /craft-hub
 */

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import DynamicCard from "@/components/DynamicCard/DynamicCard";
import { CRAFT_MODULES } from "@/data/craftScenes";

export default function CraftHub() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight:   "100dvh",
      background:  "radial-gradient(ellipse at 25% 15%, #18100a 0%, #0a0806 55%, #050402 100%)",
      color:       "#e8e0c8",
      fontFamily:  "var(--app-font-sans, system-ui, sans-serif)",
      display:     "flex",
      flexDirection: "column",
      overflow:    "hidden",
    }}>
      {/* ── Header ── */}
      <header style={{
        display:       "flex",
        alignItems:    "center",
        gap:           16,
        padding:       "20px 28px",
        flexShrink:    0,
        borderBottom:  "1px solid rgba(255,255,255,0.05)",
      }}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/dashboard")}
          style={{
            background:    "rgba(255,255,255,0.06)",
            border:        "1px solid rgba(255,255,255,0.1)",
            borderRadius:  12,
            width:         40, height: 40,
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            cursor:        "pointer",
            color:         "rgba(232,224,200,0.8)",
            flexShrink:    0,
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>

        <div>
          <h1 style={{
            fontFamily:  "var(--app-font-serif, Georgia, serif)",
            fontSize:    22,
            fontWeight:  700,
            color:       "#fff",
            margin:      0,
            letterSpacing: "0.02em",
          }}>
            Craft Hub
          </h1>
          <p style={{
            fontSize:      10,
            color:         "rgba(232,224,200,0.38)",
            margin:        0,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}>
            Axiom OS · Experience Engine
          </p>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={15} color="rgba(212,175,55,0.6)" />
          <span style={{
            fontSize:   11,
            color:      "rgba(232,224,200,0.4)",
            letterSpacing: "0.12em",
          }}>
            {CRAFT_MODULES.length} craft modules active
          </span>
        </div>
      </header>

      {/* ── Tagline ── */}
      <div style={{
        padding:     "28px 28px 0",
        flexShrink:  0,
      }}>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{
            fontFamily:    "var(--app-font-serif, Georgia, serif)",
            fontSize:      "clamp(22px, 3.5vw, 38px)",
            fontWeight:    700,
            color:         "#fff",
            margin:        0,
            lineHeight:    1.15,
            maxWidth:      560,
          }}
        >
          Every experience,{" "}
          <span style={{ color: "#d4af37" }}>crafted for you.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize:  13,
            color:     "rgba(232,224,200,0.45)",
            marginTop: 10,
            maxWidth:  440,
          }}
        >
          Select a module to enter the full guided experience. Each card rotates
          through live curated scenes every few seconds.
        </motion.p>
      </div>

      {/* ── 2×2 Card Grid ── */}
      <div style={{
        flex:    1,
        padding: "24px 28px 28px",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows:    "repeat(2, 1fr)",
        gap:     20,
        overflow: "hidden",
      }}>
        {CRAFT_MODULES.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{ minHeight: 0 }}
          >
            <DynamicCard
              module={mod}
              onClick={() => navigate(mod.route)}
            />
          </motion.div>
        ))}
      </div>

      {/* ── Footer strip ── */}
      <div style={{
        padding:       "12px 28px",
        borderTop:     "1px solid rgba(255,255,255,0.04)",
        display:       "flex",
        alignItems:    "center",
        gap:           20,
        flexShrink:    0,
      }}>
        {CRAFT_MODULES.map(mod => (
          <div key={mod.id} style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            fontSize:   10,
            color:      "rgba(232,224,200,0.35)",
            letterSpacing: "0.1em",
          }}>
            <div style={{
              width:        6, height: 6, borderRadius: "50%",
              background:   mod.color,
            }} />
            {mod.id.toUpperCase()}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(232,224,200,0.2)" }}>
          Rotating {CRAFT_MODULES.reduce((s, m) => s + m.scenes.length, 0)} curated scenes
        </div>
      </div>
    </div>
  );
}
