/**
 * VapeCraft — placeholder craft page with proper vape-environment visuals.
 *
 * Why this exists: until this turn, /vapecraft fell through to the dynamic
 * /:theme route → Home.tsx, which renders the CIGAR wizard. That gave
 * VapeCraft no distinct identity — same UI, same energy, same flow as
 * smokecraft. This page replaces that with a vape-themed scene
 * (locked_cards/experience_vapecraft.png) and an honest "experience
 * launching soon" framing.
 *
 * The full VapeCraft FLOW (analog to BrewCraft / PourCraft style cards
 * driven by the recommendation engine) is a separate slice — vape doesn't
 * have an inventory category in the engine yet, and the style/strength
 * preset model needs design input. See `.local/plans/` for follow-up.
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import vapeBg from "@assets/locked_cards/experience_vapecraft.png";

export default function VapeCraft() {
  const [, setLocation] = useLocation();

  return (
    <div
      data-testid="vapecraft-page"
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage:    `url(${vapeBg})`,
        backgroundSize:     "cover",
        backgroundPosition: "center",
        overflow: "hidden",
      }}
    >
      {/* Atmospheric overlay — neon-vapor tint per theme_profiles.vapecraft */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(118,80,180,0.32) 0%, rgba(8,6,14,0.55) 45%, rgba(4,2,8,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 48px",
        }}
      >
        <div
          style={{
            font: "500 11px/1 'Inter', system-ui, sans-serif",
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: "rgba(180,150,230,0.78)",
            marginBottom: 22,
          }}
        >
          VapeCraft 360
        </div>

        <h1
          style={{
            font: "300 64px/1.05 'Cormorant Garamond', 'Playfair Display', serif",
            color: "rgba(240,225,255,0.96)",
            margin: 0,
            maxWidth: 820,
            letterSpacing: "0.01em",
          }}
        >
          The vapor experience is being calibrated.
        </h1>

        <p
          style={{
            marginTop: 28,
            maxWidth: 560,
            font: "400 16px/1.65 'Inter', system-ui, sans-serif",
            color: "rgba(210,200,235,0.72)",
          }}
        >
          A guided flavor and intensity flow built around your venue's vapor
          inventory is launching shortly. Until then, the smoke and pour
          experiences remain available.
        </p>

        <div style={{ marginTop: 56, display: "flex", gap: 16 }}>
          <button
            type="button"
            data-testid="vapecraft-back-to-intro"
            onClick={() => setLocation("/intro")}
            style={{
              background: "rgba(118,80,180,0.18)",
              border: "1px solid rgba(180,150,230,0.42)",
              color: "rgba(240,225,255,0.92)",
              padding: "14px 28px",
              borderRadius: 999,
              font: "500 12px/1 'Inter', system-ui, sans-serif",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            Back to entry
          </button>
        </div>
      </motion.div>
    </div>
  );
}
