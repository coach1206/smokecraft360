/**
 * MasterArtisan — Novee OS Sensory Ritual Initiation Screen.
 *
 * Route: /master-artisan
 *
 * Features:
 *  • Cinematic smoke video background (lounge-night.mp4 at 0.4 opacity)
 *  • Four sensory flavor archetype cards: Earthy, Spiced, Cedar, Leather
 *  • Touch-first: scale + Liquid Gold border glow on selection
 *  • Socket emit → GUEST_SENSORY_UPDATE for EEIS staff layer
 *  • "BEGIN CREATION" → navigates to /artisan-360 (3D CigarBoxDesigner)
 *  • Haptic pulse on card select (50ms via navigator.vibrate)
 */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import { useGuestProfile } from "@/contexts/GuestProfileContext";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:         "#0A0804",
  gold:       "#D4AF37",
  goldGlow:   "rgba(212,175,55,0.35)",
  goldBorder: "rgba(212,175,55,0.70)",
  text:       "#F0E8D4",
  muted:      "rgba(240,232,212,0.50)",
  card:       "rgba(14,11,8,0.72)",
  border:     "rgba(212,175,55,0.14)",
  obsidian:   "#0A0908",
};

// ── Flavor archetype cards ─────────────────────────────────────────────────────
interface FlavorCard {
  id:          string;
  label:       string;
  description: string;
  icon:        string;
  accent:      string;
  meta: {
    strength:   number;
    body:       string;
    notes:      string[];
  };
}

const FLAVORS: FlavorCard[] = [
  {
    id:          "earthy",
    label:       "Earthy",
    description: "Loam, forest floor, aged cedar — rooted in the earth's oldest rituals.",
    icon:        "🌿",
    accent:      "#7A6A3A",
    meta: { strength: 55, body: "Medium", notes: ["Loam", "Moss", "Damp Wood"] },
  },
  {
    id:          "spiced",
    label:       "Spiced",
    description: "Black pepper, cinnamon bark, distant smoke — complex and assertive.",
    icon:        "🌶",
    accent:      "#8B2C12",
    meta: { strength: 78, body: "Full", notes: ["Pepper", "Cinnamon", "Clove"] },
  },
  {
    id:          "cedar",
    label:       "Cedar",
    description: "Aromatic wood, fresh sawdust, a whisper of dried citrus peel.",
    icon:        "🪵",
    accent:      "#9B6A3A",
    meta: { strength: 45, body: "Light-Medium", notes: ["Pencil Shaving", "Citrus", "Resin"] },
  },
  {
    id:          "leather",
    label:       "Leather",
    description: "Cured hide, dark tobacco, espresso finish — power with refinement.",
    icon:        "🪶",
    accent:      "#4A2C18",
    meta: { strength: 88, body: "Full", notes: ["Leather", "Espresso", "Dark Cocoa"] },
  },
];

// ── Haptic pulse (tablet/phone) ────────────────────────────────────────────────
function vibrateDevice(ms: number): void {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch { /* silently ignored on unsupported devices */ }
}

// ── Ambient particle ──────────────────────────────────────────────────────────
function SmokeParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, x: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.18, 0.10, 0], y: -180, x: x, scale: [0.6, 1.4, 1.8] }}
      transition={{ duration: 8 + Math.random() * 6, delay, repeat: Infinity, ease: "easeOut" }}
      style={{
        position:     "absolute",
        bottom:       40,
        left:         `${30 + Math.random() * 40}%`,
        width:        80 + Math.random() * 60,
        height:       80 + Math.random() * 60,
        borderRadius: "50%",
        background:   "radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%)",
        pointerEvents:"none",
        filter:       "blur(12px)",
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MasterArtisan() {
  const [, navigate]            = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const videoRef                = useRef<HTMLVideoElement>(null);
  const { guestProfile }        = useGuestProfile();

  const guestName = guestProfile?.firstName
    ? `${guestProfile.firstName} ${guestProfile.lastInitial ?? ""}`.trim()
    : "Guest";

  const handleFlavorSelect = useCallback((flavor: FlavorCard) => {
    vibrateDevice(50);
    setSelected(flavor.id);
    setConfirmed(false);

    // Notify EEIS staff layer via socket
    if (socket.connected) {
      socket.emit("GUEST_SENSORY_UPDATE", {
        guest:     guestName,
        selection: flavor.id,
        meta:      flavor.meta,
        ts:        new Date().toISOString(),
      });
    }
  }, [guestName]);

  const handleBeginCreation = useCallback(() => {
    if (!selected) return;
    setConfirmed(true);
    setTimeout(() => navigate("/artisan-360"), 520);
  }, [selected, navigate]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: C.bg, overflow: "hidden", fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}>

      {/* ── Cinematic smoke video background ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={`${import.meta.env.BASE_URL}videos/lounge-night.mp4`}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            opacity:    0.40,
            filter:     "saturate(0.4) brightness(0.6)",
          }}
        />
        {/* Gradient overlay — keeps text readable */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,8,4,0.55) 0%, rgba(10,8,4,0.30) 40%, rgba(10,8,4,0.75) 100%)",
        }} />
      </div>

      {/* ── Ambient smoke particles ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        {[...Array(5)].map((_, i) => (
          <SmokeParticle key={i} delay={i * 1.6} x={(Math.random() - 0.5) * 80} />
        ))}
      </div>

      {/* ── Top ambient glow ── */}
      <div style={{
        position:     "absolute",
        top:          -60,
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        700,
        height:       260,
        background:   `radial-gradient(ellipse, ${C.goldGlow} 0%, transparent 70%)`,
        pointerEvents:"none",
        zIndex:       1,
      }} />

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 680, margin: "0 auto", padding: "0 20px", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: "center", marginBottom: 36 }}
        >
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: C.gold, fontFamily: "'Space Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>
            NOVEE OS · MASTER ARTISAN RITUAL
          </div>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 48px)", fontWeight: 600, color: C.text, lineHeight: 1.15, margin: 0, letterSpacing: "0.02em" }}>
            Choose Your<br />
            <span style={{ color: C.gold }}>Sensory Foundation</span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 14, lineHeight: 1.7, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Your palate archetype guides the AI in building a bespoke blend crafted specifically for you.
          </p>
        </motion.div>

        {/* Flavor cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, width: "100%", maxWidth: 600 }}>
          {FLAVORS.map((flavor, i) => {
            const isSelected = selected === flavor.id;
            return (
              <motion.button
                key={flavor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 + i * 0.10, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleFlavorSelect(flavor)}
                onTouchStart={() => handleFlavorSelect(flavor)}
                style={{
                  background:            isSelected ? `rgba(${hexToRgb(flavor.accent)}, 0.22)` : C.card,
                  border:                isSelected ? `1.5px solid ${C.goldBorder}` : `1px solid ${C.border}`,
                  borderRadius:          16,
                  padding:               "20px 18px",
                  cursor:                "pointer",
                  textAlign:             "left",
                  backdropFilter:        "blur(18px)",
                  WebkitBackdropFilter:  "blur(18px)",
                  boxShadow:             isSelected
                    ? `0 0 28px ${C.goldGlow}, 0 0 6px rgba(212,175,55,0.18) inset`
                    : "0 2px 16px rgba(0,0,0,0.45)",
                  transition:            "border-color 0.22s, box-shadow 0.22s, background 0.22s",
                  WebkitTapHighlightColor: "transparent",
                  touchAction:           "manipulation",
                  minHeight:             140,
                  display:               "flex",
                  flexDirection:         "column",
                  gap:                   10,
                  outline:               "none",
                }}
              >
                {/* Icon + label row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{flavor.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? C.gold : C.text, letterSpacing: "0.04em", transition: "color 0.2s" }}>
                      {flavor.label}
                    </div>
                    <div style={{ fontSize: 10, color: isSelected ? C.gold : C.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", transition: "color 0.2s" }}>
                      {flavor.meta.body} · {flavor.meta.strength}% strength
                    </div>
                  </div>
                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.8 7L9 1" stroke="#0A0804" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  {flavor.description}
                </p>

                {/* Flavor note chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {flavor.meta.notes.map(note => (
                    <span key={note} style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 20,
                      background: isSelected ? `rgba(212,175,55,0.15)` : "rgba(255,255,255,0.05)",
                      border:     `1px solid ${isSelected ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.08)"}`,
                      color:      isSelected ? C.gold : C.muted,
                      letterSpacing: "0.10em", textTransform: "uppercase",
                      fontFamily:    "'Space Mono', monospace",
                      transition:    "all 0.2s",
                    }}>
                      {note}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* BEGIN CREATION button */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: 28, width: "100%", maxWidth: 600 }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBeginCreation}
                style={{
                  width:           "100%",
                  padding:         "18px 0",
                  background:      confirmed
                    ? "rgba(212,175,55,0.12)"
                    : `linear-gradient(135deg, ${C.gold} 0%, #b8860b 100%)`,
                  border:          `1.5px solid ${C.gold}`,
                  borderRadius:    14,
                  cursor:          "pointer",
                  color:           confirmed ? C.gold : C.obsidian,
                  fontSize:        14,
                  fontWeight:      700,
                  letterSpacing:   "0.18em",
                  textTransform:   "uppercase",
                  fontFamily:      "'Space Mono', monospace",
                  boxShadow:       confirmed ? "none" : `0 0 32px rgba(212,175,55,0.28), 0 4px 16px rgba(0,0,0,0.4)`,
                  transition:      "all 0.25s",
                  WebkitTapHighlightColor: "transparent",
                  touchAction:     "manipulation",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  gap:             10,
                }}
              >
                {confirmed ? (
                  <>
                    <motion.span
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      style={{ display: "inline-block", fontSize: 16 }}
                    >
                      ◈
                    </motion.span>
                    ENTERING THE ATELIER…
                  </>
                ) : (
                  <>◈ BEGIN CREATION</>
                )}
              </motion.button>

              <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 12, letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace" }}>
                {FLAVORS.find(f => f.id === selected)?.label.toUpperCase()} ARCHETYPE · {FLAVORS.find(f => f.id === selected)?.meta.body.toUpperCase()} BODY
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={() => navigate("/artisan-360")}
          style={{
            marginTop: 20, background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "'Space Mono', monospace", padding: "8px 16px",
          }}
        >
          Skip ritual → enter 3D Studio
        </motion.button>
      </div>
    </div>
  );
}

// ── Helper: hex color → RGB string for rgba() ──────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
