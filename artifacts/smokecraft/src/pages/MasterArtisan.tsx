/**
 * MasterArtisan — Novee OS Sensory Ritual Initiation Screen.
 *
 * Route: /master-artisan
 *
 * Features:
 *  • Cinematic smoke video background (lounge-night.mp4)
 *  • Four sensory flavor archetype cards — each shifts the bg smoke tint
 *  • BEGIN CREATION always visible; disabled/greyed until card selected, then pulses gold
 *  • 3-second "Syncing Atmospheric Intelligence" cinematic overlay before navigating
 *  • Socket emit → GUEST_SENSORY_UPDATE for EEIS Harmony Score (real-time staff feed)
 *  • Haptic pulse on card select (50ms via navigator.vibrate)
 *  • Scale-down whileTap on every interactive element
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { socket } from "@/lib/socket";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { emotionalStateStore } from "@/lib/emotionalStateStore";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:           "#0A0804",
  gold:         "#D4AF37",
  goldGlow:     "rgba(212,175,55,0.35)",
  goldBorder:   "rgba(212,175,55,0.70)",
  goldDisabled: "rgba(212,175,55,0.22)",
  text:         "#F0E8D4",
  muted:        "rgba(240,232,212,0.50)",
  card:         "rgba(14,11,8,0.72)",
  border:       "rgba(212,175,55,0.14)",
  obsidian:     "#0A0908",
};

// ── Flavor archetype cards ─────────────────────────────────────────────────────
interface FlavorCard {
  id:          string;
  label:       string;
  description: string;
  icon:        string;
  accent:      string;
  smokeColor:  string;   // Dynamic background tint when this card is active
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
    smokeColor:  "rgba(160, 100, 20, 0.22)",   // Deep Amber
    meta: { strength: 55, body: "Medium", notes: ["Loam", "Moss", "Damp Wood"] },
  },
  {
    id:          "spiced",
    label:       "Spiced",
    description: "Black pepper, cinnamon bark, distant smoke — complex and assertive.",
    icon:        "🌶",
    accent:      "#8B2C12",
    smokeColor:  "rgba(130, 30, 10, 0.22)",    // Deep Spice Red
    meta: { strength: 78, body: "Full", notes: ["Pepper", "Cinnamon", "Clove"] },
  },
  {
    id:          "cedar",
    label:       "Cedar",
    description: "Aromatic wood, fresh sawdust, a whisper of dried citrus peel.",
    icon:        "🪵",
    accent:      "#9B6A3A",
    smokeColor:  "rgba(150, 100, 50, 0.22)",   // Warm Wood
    meta: { strength: 45, body: "Light-Medium", notes: ["Pencil Shaving", "Citrus", "Resin"] },
  },
  {
    id:          "leather",
    label:       "Leather",
    description: "Cured hide, dark tobacco, espresso finish — power with refinement.",
    icon:        "🪶",
    accent:      "#4A2C18",
    smokeColor:  "rgba(60, 28, 10, 0.28)",     // Dark Tobacco Brown
    meta: { strength: 88, body: "Full", notes: ["Leather", "Espresso", "Dark Cocoa"] },
  },
];

// ── Haptic pulse (tablet/phone) ────────────────────────────────────────────────
function vibrateDevice(ms: number): void {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  } catch { /* silently ignored on unsupported devices */ }
}

// ── Helper: hex color → RGB string for rgba() ──────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ── Ambient particle ───────────────────────────────────────────────────────────
function SmokeParticle({ delay, x, syncing }: { delay: number; x: number; syncing: boolean }) {
  return (
    <motion.div
      animate={syncing
        ? { opacity: [0, 0.38, 0.22, 0], y: -280, x, scale: [0.8, 2.2, 3.0] }
        : { opacity: [0, 0.18, 0.10, 0], y: -180, x, scale: [0.6, 1.4, 1.8] }
      }
      transition={{
        duration:  syncing ? 4 + Math.random() * 3 : 8 + Math.random() * 6,
        delay,
        repeat:    Infinity,
        ease:      "easeOut",
      }}
      style={{
        position:      "absolute",
        bottom:        40,
        left:          `${20 + Math.random() * 60}%`,
        width:         80 + Math.random() * 80,
        height:        80 + Math.random() * 80,
        borderRadius:  "50%",
        background:    syncing
          ? "radial-gradient(ellipse, rgba(212,175,55,0.22) 0%, transparent 70%)"
          : "radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%)",
        pointerEvents: "none",
        filter:        "blur(14px)",
      }}
    />
  );
}

// ── Syncing Overlay ────────────────────────────────────────────────────────────
function SyncingOverlay({ flavor }: { flavor: FlavorCard | undefined }) {
  return (
    <motion.div
      key="syncing-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        9000,
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        justifyContent:"center",
        background:    "rgba(5,4,2,0.92)",
        backdropFilter:"blur(6px)",
        gap:           24,
      }}
    >
      {/* Rotating sigil */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        style={{ fontSize: 48, lineHeight: 1, userSelect: "none" }}
      >
        ◈
      </motion.div>

      {/* Scan line */}
      <div style={{ position: "relative", width: 240, height: 2, background: "rgba(212,175,55,0.12)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
          style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }}
        />
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center", fontFamily: "'Space Mono', monospace" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.28em", color: C.gold, textTransform: "uppercase", marginBottom: 8 }}>
          Syncing Atmospheric Intelligence
        </div>
        {flavor && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 9, letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase" }}
          >
            {flavor.label} Archetype · {flavor.meta.body} Body · {flavor.meta.strength}% Strength
          </motion.div>
        )}
      </div>

      {/* Dot progress */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, delay: i * 0.28, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
// ── CSS smoke keyframes injected once ─────────────────────────────────────────
const SMOKE_STYLE = `
@keyframes smokeRise0{0%{transform:translate(0,0) scale(1);opacity:0}30%{opacity:.18}80%{opacity:.08}100%{transform:translate(-40px,-320px) scale(3.2);opacity:0}}
@keyframes smokeRise1{0%{transform:translate(0,0) scale(1);opacity:0}25%{opacity:.14}75%{opacity:.06}100%{transform:translate(55px,-300px) scale(2.8);opacity:0}}
@keyframes smokeRise2{0%{transform:translate(0,0) scale(1);opacity:0}35%{opacity:.22}80%{opacity:.10}100%{transform:translate(-20px,-360px) scale(3.6);opacity:0}}
@keyframes smokeRise3{0%{transform:translate(0,0) scale(1);opacity:0}20%{opacity:.12}70%{opacity:.05}100%{transform:translate(30px,-280px) scale(2.4);opacity:0}}
@keyframes smokeDrift{0%,100%{filter:blur(28px) brightness(.7)}50%{filter:blur(36px) brightness(.9)}}
`;

function injectSmokeStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("ma-smoke-kf")) return;
  const s = document.createElement("style");
  s.id = "ma-smoke-kf";
  s.textContent = SMOKE_STYLE;
  document.head.appendChild(s);
}

// ── Static CSS smoke blobs — always visible, video-independent ────────────────
const CSS_SMOKE_BLOBS = [
  { w: 340, h: 220, l: "8%",  b: 0,   anim: "smokeRise0", dur: "18s", delay: "0s",    color: "rgba(120,80,20,0.28)" },
  { w: 280, h: 180, l: "35%", b: 0,   anim: "smokeRise1", dur: "22s", delay: "-7s",   color: "rgba(90,60,15,0.22)"  },
  { w: 400, h: 260, l: "58%", b: 0,   anim: "smokeRise2", dur: "26s", delay: "-14s",  color: "rgba(140,90,25,0.24)" },
  { w: 220, h: 160, l: "20%", b: 0,   anim: "smokeRise3", dur: "20s", delay: "-3s",   color: "rgba(80,55,10,0.18)"  },
  { w: 460, h: 300, l: "72%", b: 0,   anim: "smokeRise0", dur: "30s", delay: "-10s",  color: "rgba(110,72,18,0.20)" },
  { w: 300, h: 200, l: "48%", b: 20,  anim: "smokeRise1", dur: "24s", delay: "-18s",  color: "rgba(95,65,16,0.16)"  },
];

export default function MasterArtisan() {
  const [, navigate]          = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef              = useRef<HTMLVideoElement>(null);
  const buttonControls        = useAnimation();

  const { guestProfile }      = useGuestProfile();

  // Inject CSS smoke keyframes once on mount
  useEffect(() => { injectSmokeStyles(); }, []);

  const guestName = guestProfile?.firstName
    ? `${guestProfile.firstName} ${guestProfile.lastInitial ?? ""}`.trim()
    : "Guest";

  const selectedFlavor = FLAVORS.find(f => f.id === selected);

  // Gold pulse animation on the button when a card is first selected
  useEffect(() => {
    if (selected && !syncing) {
      buttonControls.start({
        boxShadow: [
          `0 0 0px rgba(212,175,55,0)`,
          `0 0 36px rgba(212,175,55,0.55)`,
          `0 0 18px rgba(212,175,55,0.30)`,
        ],
        transition: { duration: 0.9, ease: "easeOut" },
      });
    }
  }, [selected, syncing, buttonControls]);

  const handleFlavorSelect = useCallback((flavor: FlavorCard) => {
    vibrateDevice(50);
    setSelected(flavor.id);

    // Advance emotional continuity engine — persists cross-route
    emotionalStateStore.recordFlavorSelection(flavor.id);

    // Staff EEIS real-time signal — full behavioral payload for Harmony Score
    if (socket.connected) {
      const es = emotionalStateStore.getState();
      socket.emit("GUEST_SENSORY_UPDATE", {
        guest:                    guestName,
        selection:                flavor.id,
        meta:                     flavor.meta,
        emotionalState: {
          escalationLevel:          es.escalationLevel,
          ritualState:              es.ritualState,
          confidence:               es.confidence,
          hesitationScore:          es.hesitationScore,
          immersionDepth:           es.immersionDepth,
          premiumIntentProbability: es.premiumIntentProbability,
          pairingLikelihood:        es.pairingLikelihood,
          interruptionWindow:       es.interruptionWindow,
        },
        ts: new Date().toISOString(),
      });
    }
  }, [guestName]);

  const handleBeginCreation = useCallback(() => {
    if (!selected || syncing) return;
    vibrateDevice(80);
    setSyncing(true);
    // Advance emotional state — artisan engine phase deepens immersion
    emotionalStateStore.advancePhase("artisan_engine");
    setTimeout(() => navigate("/artisan-360"), 3000);
  }, [selected, syncing, navigate]);

  return (
    <div style={{
      position:   "relative",
      minHeight:  "100vh",
      background: C.bg,
      overflow:   "hidden",
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
    }}>

      {/* ── Cinematic smoke background ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>

        {/* CSS animated smoke blobs — always visible regardless of video state */}
        {CSS_SMOKE_BLOBS.map((b, i) => (
          <div
            key={i}
            style={{
              position:         "absolute",
              bottom:           b.b,
              left:             b.l,
              width:            b.w,
              height:           b.h,
              borderRadius:     "50%",
              background:       `radial-gradient(ellipse, ${b.color} 0%, transparent 70%)`,
              filter:           "blur(30px)",
              animation:        `${b.anim} ${b.dur} ${b.delay} infinite ease-out, smokeDrift ${b.dur} ${b.delay} infinite ease-in-out`,
              pointerEvents:    "none",
              willChange:       "transform, opacity",
            }}
          />
        ))}

        {/* Permanent ambient warm haze — always visible at t=0, video-independent */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: [
            "radial-gradient(ellipse at 50% 115%, rgba(140,85,10,0.42) 0%, transparent 55%)",
            "radial-gradient(ellipse at 15% 90%,  rgba(100,60,8,0.28)  0%, transparent 40%)",
            "radial-gradient(ellipse at 85% 95%,  rgba(120,70,12,0.30) 0%, transparent 45%)",
          ].join(", "),
          pointerEvents: "none",
        }} />

        {/* Mid-tone warm grain — gives the obsidian depth */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse at 50% 40%, rgba(80,50,10,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* MP4 smoke loop — layered on top of CSS fallback; silent no-op if blocked */}
        <motion.video
          ref={videoRef}
          src={`${import.meta.env.BASE_URL}videos/lounge-night.mp4`}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
          animate={{
            opacity: videoReady ? (syncing ? 0.62 : 0.38) : 0,
            filter:  syncing ? "saturate(0.5) brightness(0.4)" : "saturate(0.35) brightness(0.55)",
          }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } as React.CSSProperties}
        />
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,8,4,0.55) 0%, rgba(10,8,4,0.20) 40%, rgba(10,8,4,0.80) 100%)",
        }} />
        {/* Dynamic smoke tint — shifts per selected flavor */}
        <AnimatePresence>
          {selectedFlavor && (
            <motion.div
              key={selectedFlavor.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              style={{
                position:   "absolute",
                inset:      0,
                background: `radial-gradient(ellipse at 50% 80%, ${selectedFlavor.smokeColor} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Ambient smoke particles (denser during sync) ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        {[...Array(syncing ? 10 : 5)].map((_, i) => (
          <SmokeParticle key={i} delay={i * (syncing ? 0.5 : 1.6)} x={(i % 2 === 0 ? 1 : -1) * (20 + i * 8)} syncing={syncing} />
        ))}
      </div>

      {/* ── Top ambient glow ── */}
      <div style={{
        position:      "absolute",
        top:           -60,
        left:          "50%",
        transform:     "translateX(-50%)",
        width:         700,
        height:        260,
        background:    `radial-gradient(ellipse, ${C.goldGlow} 0%, transparent 70%)`,
        pointerEvents: "none",
        zIndex:        1,
      }} />

      {/* ── Content ── */}
      <div style={{
        position:       "relative",
        zIndex:         2,
        maxWidth:       680,
        margin:         "0 auto",
        padding:        "0 20px",
        minHeight:      "100vh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            0,
      }}>

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/")}
          style={{
            position:   "absolute",
            top:        16,
            left:       0,
            background: "rgba(10,9,8,0.60)",
            border:     `1px solid ${C.border}`,
            borderRadius: 999,
            padding:    "8px 16px",
            color:      C.muted,
            fontSize:   11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'Space Mono', monospace",
            cursor:     "pointer",
            backdropFilter: "blur(12px)",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          } as React.CSSProperties}
        >
          ← Back
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: C.gold, fontFamily: "'Space Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>
            NOVEE OS · MASTER ARTISAN RITUAL
          </div>
          <h1 style={{ fontSize: "clamp(26px, 6vw, 46px)", fontWeight: 600, color: C.text, lineHeight: 1.15, margin: 0, letterSpacing: "0.02em" }}>
            Choose Your<br />
            <span style={{ color: C.gold }}>Sensory Foundation</span>
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 1.7, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
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
                transition={{ duration: 0.55, delay: 0.12 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFlavorSelect(flavor)}
                onTouchStart={() => handleFlavorSelect(flavor)}
                style={{
                  background:              isSelected ? `rgba(${hexToRgb(flavor.accent)}, 0.22)` : C.card,
                  border:                  isSelected ? `1.5px solid ${C.goldBorder}` : `1px solid ${C.border}`,
                  borderRadius:            16,
                  padding:                 "20px 18px",
                  cursor:                  "pointer",
                  textAlign:               "left",
                  backdropFilter:          "blur(18px)",
                  WebkitBackdropFilter:    "blur(18px)",
                  boxShadow:               isSelected
                    ? `0 0 28px ${C.goldGlow}, 0 0 6px rgba(212,175,55,0.18) inset`
                    : "0 2px 16px rgba(0,0,0,0.45)",
                  transition:              "border-color 0.22s, box-shadow 0.22s, background 0.22s",
                  WebkitTapHighlightColor: "transparent",
                  touchAction:             "manipulation",
                  minHeight:               148,
                  display:                 "flex",
                  flexDirection:           "column",
                  gap:                     10,
                  outline:                 "none",
                } as React.CSSProperties}
              >
                {/* Icon + label row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24, lineHeight: 1 }}>{flavor.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? C.gold : C.text, letterSpacing: "0.04em", transition: "color 0.2s" }}>
                      {flavor.label}
                    </div>
                    <div style={{ fontSize: 10, color: isSelected ? C.gold : C.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", transition: "color 0.2s" }}>
                      {flavor.meta.body} · {flavor.meta.strength}% strength
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      style={{ width: 20, height: 20, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
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
                      fontSize:      9,
                      padding:       "3px 8px",
                      borderRadius:  20,
                      background:    isSelected ? `rgba(212,175,55,0.15)` : "rgba(255,255,255,0.05)",
                      border:        `1px solid ${isSelected ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.08)"}`,
                      color:         isSelected ? C.gold : C.muted,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
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

        {/* BEGIN CREATION — always visible, disabled until card selected */}
        <div style={{ marginTop: 24, width: "100%", maxWidth: 600 }}>
          <motion.button
            animate={buttonControls}
            whileTap={selected ? { scale: 0.97 } : {}}
            onClick={handleBeginCreation}
            disabled={!selected || syncing}
            style={{
              width:                   "100%",
              padding:                 "18px 0",
              background:              !selected
                ? "rgba(255,255,255,0.04)"
                : `linear-gradient(135deg, ${C.gold} 0%, #b8860b 100%)`,
              border:                  `1.5px solid ${selected ? C.gold : C.goldDisabled}`,
              borderRadius:            14,
              cursor:                  selected ? "pointer" : "not-allowed",
              color:                   selected ? C.obsidian : C.goldDisabled,
              fontSize:                14,
              fontWeight:              700,
              letterSpacing:           "0.18em",
              textTransform:           "uppercase",
              fontFamily:              "'Space Mono', monospace",
              boxShadow:               selected ? `0 0 32px rgba(212,175,55,0.22), 0 4px 16px rgba(0,0,0,0.4)` : "none",
              transition:              "background 0.30s, border-color 0.30s, color 0.30s, box-shadow 0.30s",
              WebkitTapHighlightColor: "transparent",
              touchAction:             "manipulation",
              display:                 "flex",
              alignItems:              "center",
              justifyContent:          "center",
              gap:                     10,
              opacity:                 1,
            } as React.CSSProperties}
          >
            {!selected
              ? "◈  SELECT A SENSORY FOUNDATION"
              : "◈  BEGIN CREATION"
            }
          </motion.button>

          {/* Selected archetype sub-label */}
          <AnimatePresence>
            {selectedFlavor && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.25 }}
                style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 10, letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace" }}
              >
                {selectedFlavor.label.toUpperCase()} ARCHETYPE · {selectedFlavor.meta.body.toUpperCase()} BODY
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Skip link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/artisan-360")}
          style={{
            marginTop:   14,
            background:  "none",
            border:      "none",
            cursor:      "pointer",
            color:       C.muted,
            fontSize:    11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily:  "'Space Mono', monospace",
            padding:     "8px 16px",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          } as React.CSSProperties}
        >
          Skip ritual → enter 3D Studio
        </motion.button>
      </div>

      {/* ── Cinematic syncing overlay (3-second atmospheric bind) ── */}
      <AnimatePresence>
        {syncing && <SyncingOverlay flavor={selectedFlavor} />}
      </AnimatePresence>
    </div>
  );
}
