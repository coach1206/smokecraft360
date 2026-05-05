/**
 * CraftHub — Hybrid Craft Hub Command System.
 * Route: /craft-hub
 *
 * Cream base (#F5F2EB) with cinematic 4-card grid, rotating AI images,
 * per-card AI insight text, and dynamic badges (Trending / High Revenue / Most Used).
 */

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PreferenceProvider }    from "@/contexts/PreferenceContext";
import { UserProfileProvider }   from "@/contexts/UserProfileContext";
import MoodControls              from "@/components/DynamicCard/MoodControls";
import DynamicCard               from "@/components/DynamicCard/DynamicCard";
import LiveEngineController      from "@/components/DynamicCard/LiveEngineController";
import { CRAFT_MODULES } from "@/data/craftScenes";

const C = {
  bg:          "#F5F2EB",
  header:      "rgba(245,242,235,0.96)",
  border:      "rgba(0,0,0,0.08)",
  text:        "#1A1410",
  muted:       "rgba(26,20,16,0.45)",
  dim:         "rgba(26,20,16,0.28)",
  gold:        "#9A7820",
  goldDim:     "rgba(154,120,32,0.7)",
  back:        "#FFFFFF",
  backBorder:  "rgba(0,0,0,0.1)",
};

function CraftHubInner() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight:     "100dvh",
      background:    C.bg,
      color:         C.text,
      fontFamily:    "var(--app-font-sans, system-ui, sans-serif)",
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
    }}>
      {/* ── Header ── */}
      <header style={{
        display:      "flex",
        alignItems:   "center",
        gap:          16,
        padding:      "16px 24px",
        flexShrink:   0,
        borderBottom: `1px solid ${C.border}`,
        background:   C.header,
        backdropFilter: "blur(12px)",
      }}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/dashboard")}
          style={{
            background:     C.back,
            border:         `1px solid ${C.backBorder}`,
            borderRadius:   12,
            width:          40, height: 40,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            color:          C.muted,
            flexShrink:     0,
            boxShadow:      "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>

        <div>
          <h1 style={{
            fontFamily:    "var(--app-font-serif, Georgia, serif)",
            fontSize:      22, fontWeight: 700, color: C.text,
            margin:        0, letterSpacing: "0.02em",
          }}>
            Craft Hub
          </h1>
          <p style={{
            fontSize:      10, color: C.dim, margin: 0,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>
            Axiom OS · Experience Engine
          </p>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={15} color={C.goldDim} />
          <span style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em" }}>
            {CRAFT_MODULES.length} craft modules active
          </span>
        </div>
      </header>

      {/* ── Tagline + mood controls ── */}
      <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              style={{
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontSize:   "clamp(20px, 3vw, 32px)",
                fontWeight: 700, color: C.text,
                margin: 0, lineHeight: 1.15,
              }}
            >
              Every experience,{" "}
              <span style={{ color: C.gold }}>crafted for you.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: 12, color: C.muted, marginTop: 8 }}
            >
              Choose a mood — all four cards filter to matching scenes instantly.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <MoodControls />
          </motion.div>
        </div>
      </div>

      {/* ── 2×2 Card Grid ── */}
      <div style={{
        flex:    1,
        padding: "16px 24px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows:    "repeat(2, 1fr)",
        gap:     16,
        overflow: "hidden",
      }}>
        {CRAFT_MODULES.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.09, duration: 0.45 }}
            style={{ minHeight: 0, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.08)" }}
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
        padding:      "10px 24px",
        borderTop:    `1px solid ${C.border}`,
        display:      "flex",
        alignItems:   "center",
        gap:          18,
        flexShrink:   0,
        background:   C.header,
      }}>
        {CRAFT_MODULES.map(mod => (
          <div key={mod.id} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: C.dim, letterSpacing: "0.1em",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: mod.color }} />
            {mod.id.toUpperCase()}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: C.dim }}>
          {CRAFT_MODULES.reduce((s, m) => s + m.scenes.length, 0)} curated scenes
        </div>
      </div>
    </div>
  );
}

export default function CraftHub() {
  return (
    <UserProfileProvider>
      <PreferenceProvider>
        <LiveEngineController />
        <CraftHubInner />
      </PreferenceProvider>
    </UserProfileProvider>
  );
}
