/**
 * HandoffContainer — AXIOM 360 dual-mode OS shell.
 *
 * Manages the full Patron ↔ Staff mode state machine and renders
 * both UI layers with the cinematic Handoff transition.
 *
 * PATRON MODE
 *   Four large craft cards (SmokeCraft, PourCraft, BrewCraft, VapeCraft)
 *   on a Hardware-First canvas: brushed-graphite texture, card-recessed
 *   shadows, axiomAmber highlights, Lounge Pulse ambient cloud.
 *
 *   Each card is a "Digital Portal": a rotating scene image fills the card
 *   (object-cover) beneath a dark vignette overlay that keeps the labels
 *   sharp. Scene order is determined by the weighted engine — time-of-day,
 *   pairing signals, and venue type push the best images to the front.
 *   Each card rotates independently with a staggered offset so they never
 *   all change at the same moment.
 *
 * THE SECRET HANDOFF
 *   A 3-second invisible long-press on the top-center of the screen
 *   triggers The Handoff. A SystemOverride flash plays, then the Staff
 *   Dashboard slides in with a "sliding metal" Framer Motion animation —
 *   a chrome-sheen sweeps the panel surface as it enters from the right.
 *   The Patron UI simultaneously blurs and recedes behind it.
 *
 * STAFF MODE
 *   Chrome-gradient Staff Dashboard with a 9-button recessed nav grid,
 *   last-craft memory badge, and a "Return to Patron" control.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation }                                        from "wouter";
import { motion, AnimatePresence }                            from "framer-motion";
import {
  Settings, CreditCard, BookOpen, BarChart3,
  DollarSign, Package, Zap, Activity, Shield,
  ChevronLeft, Clock,
} from "lucide-react";
import { useAxiom360 }   from "@/store/axiom360Store";
import type { CraftType } from "@/store/axiom360Store";
import {
  usePrestige,
  xpProgress, xpToNextRank,
  RANK_CONFIG,
} from "@/store/prestigeStore";
import {
  playClick, playClink,
  setAudioEnabled, getAudioEnabled,
} from "@/lib/audioEngine";
import { vibrate, HAPTIC }  from "@/lib/haptics";
import { useTranslation }   from "react-i18next";
import { Pulse }            from "./Pulse";
import {
  SMOKE_SCENES, POUR_SCENES, BREW_SCENES, VAPE_SCENES,
} from "@/data/craftScenes";
import type { CraftScene } from "@/data/craftScenes";
import { getWeightedScenes } from "@/lib/weightedEngine";
import type { UserProfile }  from "@/contexts/UserProfileContext";

// ── Time-of-day profile ───────────────────────────────────────────────────────
// Kiosk landing has no authenticated user; we derive a sensible scene-ranking
// profile purely from the current hour so the imagery adapts throughout the day.

function buildTimeProfile(): UserProfile {
  const h = new Date().getHours();
  const base = { lastOrderType: null as null, venueType: "lounge" as string, sceneBoosts: {} as Record<string,number>, history: [] as string[] };
  // Morning 06-11 → light, social, day
  if (h >= 6  && h < 12) return { ...base, mood: "social", intensity: "light",   setting: "day"   };
  // Afternoon 12-17 → premium solo
  if (h >= 12 && h < 18) return { ...base, mood: "solo",   intensity: "premium", setting: "day"   };
  // Evening 18-22 → premium, night, strong
  if (h >= 18 && h < 23) return { ...base, mood: "social", intensity: "premium", setting: "night" };
  // Late night 23-05 → urban, night, solo
  return                         { ...base, mood: "solo",   intensity: "strong",  setting: "night" };
}

// ── Scene sets per craft ──────────────────────────────────────────────────────

const CRAFT_SCENES: Record<string, CraftScene[]> = {
  smoke: SMOKE_SCENES,
  pour:  POUR_SCENES,
  brew:  BREW_SCENES,
  vape:  VAPE_SCENES,
};

// ── Pricing engine ────────────────────────────────────────────────────────────
// Curated starting prices per craft category. Dynamic pricing applies a
// modifier on top; members always see their locked base rate regardless.

const CRAFT_BASE_PRICE: Record<string, number> = {
  smoke: 28,
  pour:  22,
  brew:  14,
  vape:  18,
};

type PriceModifier = "base" | "surge" | "discount" | "locked";

interface PriceInfo {
  price:    number;
  modifier: PriceModifier;
  label:    string;
}

function computePrice(
  craftId:   string,
  occupancy: number,
  isActive:  boolean,
  isMember:  boolean,
): PriceInfo {
  const base = CRAFT_BASE_PRICE[craftId] ?? 20;
  if (isMember)
    return { price: base, modifier: "locked",   label: "Price Locked"     };
  if (!isActive)
    return { price: base, modifier: "base",     label: "Base Rate"        };
  if (occupancy > 80)
    return { price: +(base * 1.12).toFixed(2),  modifier: "surge",    label: "Premium Demand"   };
  if (occupancy < 25)
    return { price: +(base * 0.85).toFixed(2),  modifier: "discount", label: "Volume Incentive" };
  return   { price: base, modifier: "base",     label: "Base Rate"        };
}

const PRICE_MODIFIER_COLOR: Record<PriceModifier, string> = {
  locked:   "#4ade80",
  surge:    "#f87171",
  discount: "#C9A84C",
  base:     "rgba(240,232,212,0.32)",
};

// ── Scene rotation hook ───────────────────────────────────────────────────────
// Returns the currently-displayed image URL for a craft card.
// Rotates through the weighted-ranked scenes every `intervalMs` ms.
// `offsetMs` staggers each card so they never all flip simultaneously.

const ROTATE_INTERVAL_MS = 9000;

function useSceneRotation(
  craftId:    string,
  offsetMs:   number,
): string | null {
  const scenes = useMemo(() => {
    const raw = CRAFT_SCENES[craftId] ?? [];
    return getWeightedScenes(raw, buildTimeProfile());
  }, [craftId]);

  const [idx, setIdx] = useState(0);

  // Re-pick top scene if hour boundary crosses (every 10 min is fine)
  const profileRef = useRef(buildTimeProfile());
  useEffect(() => {
    const id = setInterval(() => {
      profileRef.current = buildTimeProfile();
    }, 600_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scenes.length === 0) return;
    const id = setTimeout(() => {
      const timer = setInterval(() => {
        setIdx(i => (i + 1) % scenes.length);
      }, ROTATE_INTERVAL_MS);
      return () => clearInterval(timer);
    }, offsetMs);
    return () => clearTimeout(id);
  }, [scenes.length, offsetMs]);

  return scenes[idx]?.image ?? null;
}

// ── Craft definitions ─────────────────────────────────────────────────────────

const CRAFTS = [
  {
    id:      "smoke",
    label:   "SmokeCraft",
    tagline: "Premium Tobacco",
    sub:     "Curated reserve experience",
    color:   "#C9A84C",
    route:   "/experience/smoke",
    glyph:   "◈",
  },
  {
    id:      "pour",
    label:   "PourCraft",
    tagline: "Curated Spirits",
    sub:     "Single-malt discovery engine",
    color:   "#9B7FD4",
    route:   "/experience/pour",
    glyph:   "◇",
  },
  {
    id:      "brew",
    label:   "BrewCraft",
    tagline: "Artisan Beer",
    sub:     "Small-batch craft selections",
    color:   "#3BBFA3",
    route:   "/experience/brew",
    glyph:   "◎",
  },
  {
    id:      "vape",
    label:   "VapeCraft",
    tagline: "Next-Gen Vapor",
    sub:     "Precision vapor experiences",
    color:   "#5BC4F5",
    route:   "/experience/vape",
    glyph:   "◉",
  },
] as const;

// ── Mood system ───────────────────────────────────────────────────────────────
// Three named moods drive the Pulse color. Card taps auto-select a mood;
// patrons can also tap a chip directly to shift the ambient cloud.

const MOOD_CONFIG = {
  bold:    { label: "BOLD",    color: "#C9A84C" },
  relaxed: { label: "RELAXED", color: "#2E5A88" },
  social:  { label: "SOCIAL",  color: "#8E44AD" },
} as const;

type MoodKey = keyof typeof MOOD_CONFIG;

// Map each craft to its nearest mood so a card tap shifts the Pulse
const CRAFT_MOOD: Record<string, MoodKey> = {
  smoke: "bold",
  pour:  "relaxed",
  brew:  "social",
  vape:  "bold",
};

// ── Staff nav grid ────────────────────────────────────────────────────────────

const STAFF_NAV = [
  { label: "Operations", icon: Settings,   route: "/operations"             },
  { label: "POS Mode",   icon: CreditCard, route: "/pos"                    },
  { label: "Training",   icon: BookOpen,   route: "/training"               },
  { label: "Analytics",  icon: BarChart3,  route: "/analytics"              },
  { label: "Finance",    icon: DollarSign, route: "/finance-reconciliation" },
  { label: "Inventory",  icon: Package,    route: "/inventory"              },
  { label: "Revenue",    icon: Zap,        route: "/revenue"                },
  { label: "Devices",    icon: Activity,   route: "/devices"                },
  { label: "Audit",      icon: Shield,     route: "/operations"             },
] as const;

// ── Constants ─────────────────────────────────────────────────────────────────

const HOLD_MS  = 3000;
const FLASH_MS = 680;
const BTN_SHADOW =
  "inset 0 3px 8px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.03)";

// ── System Override flash ─────────────────────────────────────────────────────

function OverrideFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: FLASH_MS / 1000, times: [0, 0.14, 0.74, 1] }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(135deg, #1c1814, #0a0806)" }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-64 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
      />
      <div className="text-[9px] tracking-[0.38em] uppercase" style={{ color: "rgba(201,168,76,0.55)" }}>
        System Override
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="font-serif text-5xl font-bold tracking-wider"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#C9A84C" }}
      >
        Staff Access
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="w-64 h-px mt-2"
        style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
      />
    </motion.div>
  );
}

// ── Individual craft card (Digital Portal) ────────────────────────────────────

function CraftCard({
  craft,
  idx,
  onTap,
  priceInfo,
}: {
  craft:     typeof CRAFTS[number];
  idx:       number;
  onTap:     () => void;
  priceInfo: PriceInfo;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Haptic feedback on price tier change (surge ↑ / discount ↓ flip)
  const prevPriceRef = useRef(priceInfo.price);
  useEffect(() => {
    if (priceInfo.price === prevPriceRef.current) return;
    prevPriceRef.current = priceInfo.price;
    vibrate(HAPTIC.tap);
  }, [priceInfo.price]);

  // Stagger each card's rotation offset so they never all flip together
  const rotationOffset = idx * 2800;
  const currentImage   = useSceneRotation(craft.id, rotationOffset);

  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 + idx * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onTapStart={() => setPressed(true)}
      onTap={() => { setPressed(false); onTap(); }}
      onTapCancel={() => setPressed(false)}
      className="relative overflow-hidden rounded-2xl cursor-pointer text-left outline-none
                 bg-axiom-graphite card-recessed"
      style={{
        border: `1px solid ${hovered ? `${craft.color}55` : "rgba(255,255,255,0.09)"}`,
        transition: "border-color 0.22s",
      }}
    >
      {/* ── Layer 1: Rotating scene image (Digital Portal) ── */}
      {/* opacity: 0.7 — shows the portal image at spec-defined intensity */}
      <AnimatePresence initial={false}>
        {currentImage && (
          <motion.img
            key={currentImage}
            src={currentImage}
            alt=""
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 2 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </AnimatePresence>

      {/* ── Layer 2: Vignette mask — clear at top, dark at bottom ── */}
      {/* Image is clearest at the top; the bottom fades to near-black so      */}
      {/* "ENTER ›" and the craft labels remain perfectly legible at all times. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          zIndex: 3,
          background:
            "linear-gradient(to top, rgba(13,11,9,0.97) 0%, rgba(13,11,9,0.72) 30%, rgba(13,11,9,0.20) 58%, transparent 100%)",
        }}
      />

      {/* ── Layer 3: Brushed graphite texture (subtle, over vignette) ── */}
      <div
        aria-hidden
        className="absolute inset-0 brushed-graphite pointer-events-none"
        style={{ zIndex: 4, opacity: 0.25 }}
      />

      {/* ── Layer 4: Per-craft ambient bottom glow ── */}
      <motion.div
        animate={{ opacity: hovered ? 0.30 : 0.12 }}
        transition={{ duration: 0.35 }}
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          zIndex: 5,
          bottom: -12, left: "10%", right: "10%", height: 40,
          borderRadius: "50%",
          background: craft.color,
          filter: "blur(22px)",
        }}
      />

      {/* ── Layer 5: Breathing glow ring ── */}
      <motion.div
        animate={{ opacity: [0.07, 0.28, 0.07] }}
        transition={{ duration: 3.2 + idx * 0.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ zIndex: 6, border: `1px solid ${craft.color}` }}
      />

      {/* ── Layer 6: Tap flash ── */}
      <AnimatePresence>
        {pressed && (
          <motion.div
            initial={{ opacity: 0.32 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
            aria-hidden
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ zIndex: 7, background: craft.color }}
          />
        )}
      </AnimatePresence>

      {/* ── Layer 7: Content (always on top) ── */}
      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6" style={{ zIndex: 10 }}>
        {/* Animated glyph */}
        <motion.div
          animate={{ opacity: [0.22, 0.55, 0.22] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 }}
          className="text-4xl sm:text-5xl mb-2 leading-none"
          style={{ color: craft.color, textShadow: `0 0 18px ${craft.color}88` }}
        >
          {craft.glyph}
        </motion.div>

        {/* ── Value Display (top-right) — ticker-tape price flip ── */}
        <div
          style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(8,6,4,0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "4px 8px",
            backdropFilter: "blur(10px)",
            textAlign: "right",
          }}
        >
          <div style={{
            fontSize: 6.5, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: PRICE_MODIFIER_COLOR[priceInfo.modifier],
            marginBottom: 1,
          }}>
            {priceInfo.label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 1 }}>
            <span style={{ fontSize: 8, color: "rgba(240,232,212,0.4)", fontWeight: 400 }}>$</span>
            <div style={{ overflow: "hidden", height: 16 }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={priceInfo.price}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0,  opacity: 1 }}
                  exit={{    y: -10, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  style={{
                    display: "block", fontSize: 14, fontWeight: 700,
                    color: "#F0E8D4", letterSpacing: "-0.02em", lineHeight: "16px",
                  }}
                >
                  {priceInfo.price.toFixed(0)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Labels — readable above vignette */}
        <div>
          <div
            className="font-bold leading-tight mb-1"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(17px, 2.4vw, 24px)",
              color: "#F0E8D4",
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}
          >
            {craft.label}
          </div>
          <div
            className="uppercase font-bold tracking-widest mb-1"
            style={{
              fontSize: 9, color: craft.color, letterSpacing: "0.22em",
              textShadow: `0 0 10px ${craft.color}66`,
            }}
          >
            {craft.tagline}
          </div>
          <div
            className="leading-snug"
            style={{ fontSize: 9, color: "rgba(240,232,212,0.42)", letterSpacing: "0.04em" }}
          >
            {craft.sub}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.45 }}
          transition={{ duration: 0.18 }}
          className="mt-3 font-bold uppercase tracking-widest"
          style={{ fontSize: 10, color: craft.color, textShadow: `0 0 8px ${craft.color}66` }}
        >
          Enter ›
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Language toggle (DR / EN) ─────────────────────────────────────────────────
// One-tap switch between English and Dominican Spanish.
// Reads and writes through i18next so all translatable strings update live.
// Positioned in the Staff Panel header so it is immediately accessible when
// staff enters the dashboard — critical for DR resort deployments.

function LangToggle() {
  const { i18n } = useTranslation();
  const isES = i18n.language?.startsWith("es");

  return (
    <button
      onClick={() => i18n.changeLanguage(isES ? "en" : "es")}
      title={isES ? "Switch to English" : "Cambiar a Español (DR)"}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", cursor: "pointer", outline: "none",
        background:  isES ? "rgba(74,222,128,0.08)"   : "rgba(255,255,255,0.04)",
        border:      isES ? "1px solid rgba(74,222,128,0.28)" : "1px solid rgba(255,255,255,0.10)",
        color:       isES ? "#4ade80" : "rgba(240,232,212,0.38)",
        padding: "3px 10px", borderRadius: 99,
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      {isES ? "🇩🇴\u00A0ES" : "🇺🇸\u00A0EN"}
    </button>
  );
}

// ── Audio toggle ──────────────────────────────────────────────────────────────
// Self-contained component so it can mount independently in the staff footer.
// Updates the module-level audioEngine flag; no prop drilling required.

function AudioToggle() {
  const [on, setOn] = useState(() => getAudioEnabled());
  return (
    <button
      onClick={() => {
        const next = !on;
        setOn(next);
        setAudioEnabled(next);
      }}
      title={on ? "Sound on — tap to mute" : "Sound muted — tap to enable"}
      style={{
        fontSize: 13,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: on ? "rgba(201,168,76,0.65)" : "rgba(255,255,255,0.18)",
        padding: "2px 4px",
        lineHeight: 1,
        transition: "color 0.18s",
        outline: "none",
      }}
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}

// ── Staff dashboard panel ─────────────────────────────────────────────────────

function StaffPanel({
  currentCraft,
  lastHandoffAt,
  onExit,
}: {
  currentCraft:  CraftType;
  lastHandoffAt: number | null;
  onExit:        () => void;
}) {
  const [, navigate] = useLocation();
  const craft = CRAFTS.find((c) => c.id === currentCraft);

  const {
    venueOccupancy,
    isDynamicPricingActive,
    isMemberLoggedIn,
    revenueLift,
    setOccupancy,
    toggleDynamicPricing,
  } = useAxiom360();

  const occupancyColor =
    venueOccupancy > 80 ? "#f87171" : venueOccupancy < 25 ? "#C9A84C" : "#4ade80";

  // Occupancy arc dial parameters
  const R = 30; const CIRC = 2 * Math.PI * R;
  const arcFilled = CIRC * (venueOccupancy / 100) * (240 / 360);

  // ── Founder's Command View ──────────────────────────────────────────────────
  const [founderVisible, setFounderVisible] = useState(false);
  const founderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startFounderPress() {
    founderTimerRef.current = setTimeout(() => {
      setFounderVisible(true);
    }, 2000);
  }

  function clearFounderPress() {
    if (founderTimerRef.current) {
      clearTimeout(founderTimerRef.current);
      founderTimerRef.current = null;
    }
  }

  // Member conversion potential scales with occupancy
  const memberConversionPotential = Math.round(
    (venueOccupancy / 100) * (isDynamicPricingActive ? 64 : 38)
  );

  const SENTIMENT = [
    { emoji: "😊", label: "Satisfied",    pct: 68, color: "#4ade80" },
    { emoji: "😐", label: "Neutral",      pct: 22, color: "#C9A84C" },
    { emoji: "😞", label: "Disappointed", pct: 10, color: "#f87171" },
  ];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 290, damping: 30 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #211d18 0%, #0e0c0a 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        color: "#F0E8D4",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Chrome sheen sweep on entry — simulates sliding metal */}
      <motion.div
        initial={{ x: "-120%" }}
        animate={{ x: "220%" }}
        transition={{ duration: 0.72, ease: "easeOut", delay: 0.28 }}
        className="absolute inset-y-0 w-1/2 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
        }}
      />

      {/* Brushed graphite texture */}
      <div
        className="absolute inset-0 pointer-events-none brushed-graphite"
        style={{ opacity: 0.6, zIndex: 0 }}
      />

      {/* Header */}
      <div
        className="relative z-10 flex-shrink-0 px-7 pt-7 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.22)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-2 uppercase tracking-[0.35em]"
            style={{ fontSize: 8, color: "rgba(240,232,212,0.38)" }}
          >
            <Shield size={9} color="rgba(201,168,76,0.5)" />
            Staff Override Active
          </div>
          <LangToggle />
        </div>
        <div
          className="font-bold leading-tight"
          onPointerDown={startFounderPress}
          onPointerUp={clearFounderPress}
          onPointerLeave={clearFounderPress}
          onPointerCancel={clearFounderPress}
          title="Hold 2 s for Founder access"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(24px, 3.5vw, 34px)",
            color: "#C9A84C",
            letterSpacing: "0.05em",
            cursor: "default",
            filter: "drop-shadow(0 0 6px rgba(201,168,76,0.28)) drop-shadow(0 0 2px rgba(201,168,76,0.14))",
          }}
        >
          Staff Dashboard
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {craft && (
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
              style={{
                background: `${craft.color}18`,
                border: `1px solid ${craft.color}40`,
                color: craft.color,
              }}
            >
              {craft.label} — Patron Was Here
            </span>
          )}
          {lastHandoffAt && (
            <span
              className="px-3 py-1 rounded-full text-[10px] flex items-center gap-1"
              style={{
                background: "rgba(201,168,76,0.10)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "rgba(201,168,76,0.55)",
              }}
            >
              <Clock size={9} />
              {new Date(lastHandoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* ── Revenue Intelligence Panel ── */}
      <div
        className="relative z-10 flex-shrink-0 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.14)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 7.5, color: "rgba(240,232,212,0.35)", letterSpacing: "0.32em", textTransform: "uppercase" }}>
            Revenue Intelligence
          </span>
          {/* Master toggle */}
          <button
            onClick={toggleDynamicPricing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em",
              textTransform: "uppercase", cursor: "pointer", outline: "none",
              background: isDynamicPricingActive ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isDynamicPricingActive ? "rgba(201,168,76,0.45)" : "rgba(255,255,255,0.10)"}`,
              color: isDynamicPricingActive ? "#C9A84C" : "rgba(240,232,212,0.3)",
              padding: "3px 10px", borderRadius: 99, transition: "all 0.22s",
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: isDynamicPricingActive ? "#4ade80" : "rgba(255,255,255,0.18)",
              boxShadow: isDynamicPricingActive ? "0 0 6px #4ade8088" : "none",
              transition: "all 0.22s",
            }} />
            {isDynamicPricingActive ? "Engine ON" : "Engine OFF"}
          </button>
        </div>

        <div className="flex items-start gap-5">
          {/* Occupancy Dial */}
          <div className="flex flex-col items-center" style={{ minWidth: 72 }}>
            <svg width="72" height="60" viewBox="0 0 72 60">
              <circle cx="36" cy="46" r={R}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"
                strokeDasharray={`${CIRC * (240 / 360)} ${CIRC}`}
                strokeLinecap="round"
                transform="rotate(150 36 46)"
              />
              <circle cx="36" cy="46" r={R}
                fill="none" stroke={occupancyColor} strokeWidth="5"
                strokeDasharray={`${arcFilled} ${CIRC}`}
                strokeLinecap="round"
                transform="rotate(150 36 46)"
                style={{
                  filter: `drop-shadow(0 0 5px ${occupancyColor}66)`,
                  transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease",
                }}
              />
              <text x="36" y="50" textAnchor="middle"
                fill="#F0E8D4" fontSize="13" fontWeight="700"
                style={{ fontFamily: "'Inter', system-ui" }}
              >
                {venueOccupancy}%
              </text>
            </svg>
            <span style={{ fontSize: 7, color: "rgba(240,232,212,0.28)", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: -4 }}>
              Occupancy
            </span>
            {/* Occupancy slider */}
            <input
              type="range" min={0} max={100} value={venueOccupancy}
              onChange={(e) => setOccupancy(Number(e.target.value))}
              style={{ width: 68, marginTop: 4, accentColor: occupancyColor, cursor: "pointer" }}
            />
          </div>

          {/* Metrics column */}
          <div className="flex flex-col gap-3 flex-1">
            {/* Dynamic Lift */}
            <div>
              <div style={{ fontSize: 7, color: "rgba(240,232,212,0.32)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>
                Dynamic Lift Today
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 7, color: "#4ade8088", fontWeight: 400 }}>$</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#4ade80", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {revenueLift.toFixed(0)}
                </span>
                <span style={{ fontSize: 7.5, color: "rgba(74,222,128,0.5)", marginLeft: 2 }}>
                  vs static
                </span>
              </div>
            </div>

            {/* Member Conversion Potential */}
            <div>
              <div style={{ fontSize: 7, color: "rgba(240,232,212,0.32)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>
                Member Conversion
              </div>
              {isMemberLoggedIn ? (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", letterSpacing: "0.06em" }}>
                  ✓ Member Active
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", letterSpacing: "-0.01em" }}>
                    ${(venueOccupancy > 80 ? 28 * 0.12 : 0).toFixed(0)} avg savings/session
                  </div>
                  <div style={{ fontSize: 7.5, color: "rgba(167,139,250,0.45)", marginTop: 1 }}>
                    Non-member sessions paying surge
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* State label */}
        <div style={{ marginTop: 8, fontSize: 7.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
          color: venueOccupancy > 80 ? "#f87171" : venueOccupancy < 25 ? "#C9A84C" : "rgba(240,232,212,0.25)" }}>
          {venueOccupancy > 80 ? "▲ JUMPING — 12% Surge Active" : venueOccupancy < 25 ? "▼ SLOW — 15% Volume Incentive Active" : "● Normal Demand"}
        </div>
      </div>

      {/* Nav grid */}
      <div
        className="relative z-10 flex-1 overflow-y-auto p-6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          alignContent: "start",
        }}
      >
        {STAFF_NAV.map(({ label, icon: Icon, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className="rounded-2xl flex flex-col items-center gap-2 py-4 px-2 cursor-pointer btn-recessed"
            style={{
              background: "linear-gradient(160deg, #1e1a15, #141210)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(240,232,212,0.45)",
              outline: "none",
              transition: "border-color 0.18s, color 0.18s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)";
              e.currentTarget.style.color = "#F0E8D4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "rgba(240,232,212,0.45)";
            }}
          >
            <Icon size={16} color="rgba(201,168,76,0.55)" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div
        className="relative z-10 flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.18)" }}
      >
        <button
          onClick={onExit}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold
                     uppercase tracking-wider cursor-pointer btn-recessed"
          style={{
            background: "linear-gradient(135deg, #1e1a14, #141210)",
            border: "1px solid rgba(201,168,76,0.35)",
            color: "#C9A84C",
            outline: "none",
          }}
        >
          <ChevronLeft size={13} />
          Return to Patron
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Audio toggle */}
          <AudioToggle />
          <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: "rgba(240,232,212,0.22)" }}>
            Axiom 360 OS
          </div>
        </div>
      </div>

      {/* ── Founder's Command View ── */}
      <AnimatePresence>
        {founderVisible && (
          <motion.div
            key="founder-view"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, zIndex: 30,
              background: "linear-gradient(160deg, #1a1208 0%, #0a0806 100%)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {/* Brushed graphite texture */}
            <div className="absolute inset-0 brushed-graphite pointer-events-none" style={{ opacity: 0.5, zIndex: 0 }} />
            {/* Gold border inset */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
              border: "1px solid rgba(201,168,76,0.18)",
            }} />

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6">

              {/* Header */}
              <div style={{ marginBottom: 22 }}>
                <div style={{
                  fontSize: 7.5, color: "rgba(201,168,76,0.5)",
                  letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 5,
                }}>
                  ✦ &nbsp;Founder's Command View
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(20px, 2.8vw, 28px)",
                  fontWeight: 700, color: "#F0E8D4", letterSpacing: "0.04em",
                }}>
                  Owner ROI Dashboard
                </div>
              </div>

              {/* ── Metric cards ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>

                {/* Revenue Lift */}
                <div style={{
                  background: "rgba(74,222,128,0.05)",
                  border: "1px solid rgba(74,222,128,0.18)",
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <div style={{
                    fontSize: 7, color: "rgba(74,222,128,0.55)",
                    letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8,
                  }}>
                    Revenue Lift Today
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 10, color: "rgba(74,222,128,0.7)", fontWeight: 700 }}>$</span>
                    <motion.span
                      key={revenueLift}
                      initial={{ y: -6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      style={{ fontSize: 34, fontWeight: 800, color: "#4ade80", letterSpacing: "-0.03em", lineHeight: 1 }}
                    >
                      {revenueLift.toFixed(0)}
                    </motion.span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(240,232,212,0.25)", marginTop: 5 }}>
                    vs flat static pricing
                  </div>
                </div>

                {/* Member Conversion Potential */}
                <div style={{
                  background: "rgba(167,139,250,0.05)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <div style={{
                    fontSize: 7, color: "rgba(167,139,250,0.55)",
                    letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8,
                  }}>
                    Member Potential
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 10, color: "rgba(167,139,250,0.7)", fontWeight: 700 }}>$</span>
                    <motion.span
                      key={memberConversionPotential}
                      initial={{ y: -6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      style={{ fontSize: 34, fontWeight: 800, color: "#a78bfa", letterSpacing: "-0.03em", lineHeight: 1 }}
                    >
                      {memberConversionPotential}
                    </motion.span>
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(240,232,212,0.25)", marginTop: 5 }}>
                    {isDynamicPricingActive ? "surge-mode uplift / hr" : "standard uplift / hr"}
                  </div>
                </div>
              </div>

              {/* ── Patron Sentiment Map ── */}
              <div style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "16px 18px",
              }}>
                <div style={{
                  fontSize: 7, color: "rgba(240,232,212,0.32)",
                  letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 14,
                }}>
                  Patron Sentiment Map
                </div>
                {SENTIMENT.map(({ emoji, label, pct, color }, i) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 2 ? 10 : 0 }}>
                    <span style={{ fontSize: 15, width: 22, flexShrink: 0 }}>{emoji}</span>
                    <div style={{
                      width: 82, fontSize: 8, color: "rgba(240,232,212,0.4)",
                      letterSpacing: "0.08em", flexShrink: 0,
                    }}>
                      {label}
                    </div>
                    <div style={{
                      flex: 1, height: 7, background: "rgba(255,255,255,0.06)",
                      borderRadius: 99, overflow: "hidden",
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.75, delay: i * 0.1, ease: "easeOut" }}
                        style={{
                          height: "100%", borderRadius: 99,
                          background: color,
                          boxShadow: `0 0 6px ${color}55`,
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color,
                      width: 30, textAlign: "right", flexShrink: 0,
                    }}>
                      {pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              padding: "12px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.2)", flexShrink: 0, position: "relative", zIndex: 10,
            }}>
              <button
                onClick={() => setFounderVisible(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                  textTransform: "uppercase", cursor: "pointer", outline: "none",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(240,232,212,0.45)",
                  padding: "5px 14px", borderRadius: 99,
                }}
              >
                <ChevronLeft size={10} />
                Back
              </button>
              <div style={{
                fontSize: 7.5, color: "rgba(201,168,76,0.3)",
                letterSpacing: "0.2em", textTransform: "uppercase",
              }}>
                Founder Access Only
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Patron view ───────────────────────────────────────────────────────────────

function PatronView({
  onCraftSelect,
}: {
  onCraftSelect: (craft: typeof CRAFTS[number]) => void;
}) {
  const [, navigate]  = useLocation();
  const [activeCraft, setActiveCraft]        = useState<string | null>(null);
  const [activeMood,  setActiveMood]         = useState<MoodKey | null>(null);
  const [burstKey,    setBurstKey]           = useState(0);
  const [portal,      setPortal]             = useState<{ route: string; color: string } | null>(null);
  const [stimulationVisible, setStimulation] = useState(false);
  const [rankUpVisible, setRankUpVisible]    = useState(false);
  const [rankUpLabel,   setRankUpLabel]      = useState("");

  const {
    venueOccupancy,
    isDynamicPricingActive,
    isMemberLoggedIn,
    loginMember,
    logoutMember,
    addRevenueLift,
  } = useAxiom360();

  const { xp, rank, addXP } = usePrestige();
  const prevRankRef = useRef(rank);

  // Detect rank-up and trigger the toast
  useEffect(() => {
    if (rank === prevRankRef.current) return;
    prevRankRef.current = rank;
    setRankUpLabel(rank);
    setRankUpVisible(true);
    playClink();
    vibrate(HAPTIC.rankUp);
    const id = setTimeout(() => setRankUpVisible(false), 3800);
    return () => clearTimeout(id);
  }, [rank]);

  // Pulse color: explicit mood chip > craft-derived mood > default amber
  const pulseColor = activeMood
    ? MOOD_CONFIG[activeMood].color
    : activeCraft
      ? MOOD_CONFIG[CRAFT_MOOD[activeCraft] ?? "bold"].color
      : "#C9A84C";

  // Per-craft prices — recomputes whenever occupancy / pricing / member state changes
  const craftPrices = useMemo(
    () => Object.fromEntries(
      CRAFTS.map((c) => [
        c.id,
        computePrice(c.id, venueOccupancy, isDynamicPricingActive, isMemberLoggedIn),
      ]),
    ),
    [venueOccupancy, isDynamicPricingActive, isMemberLoggedIn],
  ) as Record<string, PriceInfo>;

  // Session stimulation — fires after 40 minutes of uninterrupted patron time
  const sessionStartRef = useRef(Date.now());
  useEffect(() => {
    const FORTY_MIN = 40 * 60 * 1000;
    const elapsed = Date.now() - sessionStartRef.current;
    const id = setTimeout(
      () => setStimulation(true),
      Math.max(0, FORTY_MIN - elapsed),
    );
    return () => clearTimeout(id);
  }, []);

  // Live clock
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
      10_000,
    );
    return () => clearInterval(id);
  }, []);

  function handleCraftTap(craft: typeof CRAFTS[number]) {
    setActiveCraft(craft.id);
    setActiveMood(CRAFT_MOOD[craft.id] ?? "bold");
    setBurstKey((k) => k + 1);
    onCraftSelect(craft);
    // Award XP for each craft selection (rank-up detection runs in useEffect)
    playClick();
    addXP(50);
    // Accumulate surge lift whenever a patron enters the experience during peak
    if (isDynamicPricingActive && !isMemberLoggedIn && venueOccupancy > 80) {
      const base = CRAFT_BASE_PRICE[craft.id] ?? 20;
      addRevenueLift(+(base * 0.12).toFixed(2));
    }
    setTimeout(() => setPortal({ route: craft.route, color: craft.color }), 320);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden grainy-texture"
      style={{ background: "#0d0b09", color: "#F0E8D4", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Lounge Pulse ambient cloud — color syncs to active mood */}
      <Pulse
        id="patron"
        color={pulseColor}
        size={560}
        blur={36}
        minOpacity={0.05}
        maxOpacity={0.18}
        burst={burstKey > 0}
        style={{ top: "40%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-4 px-5 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(13,11,9,0.88)",
          backdropFilter: "blur(18px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col"
        >
          <span
            className="font-bold uppercase leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(18px, 2.4vw, 22px)",
              color: "#F0E8D4",
              letterSpacing: "0.18em",
            }}
          >
            Axiom 360
          </span>
          <span
            className="uppercase"
            style={{ fontSize: 8, color: "rgba(201,168,76,0.5)", letterSpacing: "0.3em", marginTop: 2 }}
          >
            Experience OS
          </span>
        </motion.div>

        {/* Status dots */}
        <div className="flex items-center gap-5 flex-1 overflow-x-auto scrollbar-none ml-2">
          {[
            { label: "AI Engine",    state: "ACTIVE",  color: "#4ade80" },
            { label: "Taste Engine", state: "READY",   color: "#C9A84C" },
            { label: "Revenue",      state: "ONLINE",  color: "#a78bfa" },
            { label: "Inventory",    state: "SYNC",    color: "#60a5fa" },
          ].map((n) => (
            <div key={n.label} className="flex items-center gap-1.5 flex-shrink-0">
              <motion.div
                className="rounded-full"
                style={{ width: 4, height: 4, background: n.color }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span style={{ fontSize: 8, color: "rgba(240,232,212,0.3)", letterSpacing: "0.14em" }}>
                {n.label}
              </span>
              <span style={{ fontSize: 8, color: n.color, fontWeight: 700, letterSpacing: "0.1em" }}>
                {n.state}
              </span>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div
          className="flex-shrink-0 flex items-center gap-2"
          style={{ fontSize: 10, color: "rgba(240,232,212,0.25)", letterSpacing: "0.12em" }}
        >
          <motion.div
            className="rounded-full"
            style={{ width: 5, height: 5, background: "#34d399" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          {time}
        </div>
      </header>

      {/* Hero label + mood chips */}
      <div className="relative z-10 px-5 pt-4 pb-2 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(15px, 2.2vw, 21px)",
            fontWeight: 300,
            color: "#F0E8D4",
          }}
        >
          Select your{" "}
          <span style={{ color: pulseColor, fontWeight: 600, transition: "color 0.6s ease" }}>
            experience.
          </span>
        </motion.div>
        <p style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", marginTop: 5 }}>
          The AI engine curates in real time — tap to begin.
        </p>

        {/* ── Mood chips ── */}
        {/* Tapping shifts the Pulse ambient cloud color. Card taps auto-select. */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45 }}
          className="flex items-center gap-2 mt-3"
        >
          {(Object.entries(MOOD_CONFIG) as [MoodKey, typeof MOOD_CONFIG[MoodKey]][]).map(([key, cfg]) => {
            const active = activeMood === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveMood(active ? null : key);
                  setBurstKey((k) => k + 1);
                }}
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${active ? cfg.color : "rgba(255,255,255,0.14)"}`,
                  background: active ? `${cfg.color}22` : "rgba(13,11,9,0.6)",
                  color: active ? cfg.color : "rgba(240,232,212,0.38)",
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.28s ease",
                  boxShadow: active
                    ? `0 0 10px ${cfg.color}44, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
          {activeMood && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 8,
                color: "rgba(240,232,212,0.28)",
                letterSpacing: "0.1em",
                marginLeft: 2,
              }}
            >
              · mood active
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* 4 Craft Cards — Digital Portals */}
      <div
        className="relative z-10 flex-1 min-h-0 px-4 pb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows:    "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {CRAFTS.map((craft, i) => (
          <CraftCard
            key={craft.id}
            craft={craft}
            idx={i}
            onTap={() => handleCraftTap(craft)}
            priceInfo={craftPrices[craft.id] ?? computePrice(craft.id, venueOccupancy, isDynamicPricingActive, isMemberLoggedIn)}
          />
        ))}
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 flex items-center gap-4 px-5 py-2.5 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(13,11,9,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        {CRAFTS.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <motion.div
              className="rounded-full"
              style={{ width: 4, height: 4, background: c.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
            />
            <span
              className="uppercase"
              style={{ fontSize: 8, color: "rgba(240,232,212,0.22)", letterSpacing: "0.2em" }}
            >
              {c.id}
            </span>
          </div>
        ))}

        {/* ── Prestige rank badge ── */}
        {(() => {
          const cfg  = RANK_CONFIG[rank];
          const prog = xpProgress(xp);
          const next = xpToNextRank(xp);
          return (
            <div
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, marginLeft: "auto",
              }}
              title={next ? `${next} XP to next rank` : "Maximum rank achieved"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 8, color: cfg.color }}>{cfg.glyph}</span>
                <span style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: cfg.color,
                }}>
                  {rank}
                </span>
              </div>
              {/* XP progress bar */}
              <div style={{
                width: 52, height: 2, borderRadius: 99,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}>
                <motion.div
                  animate={{ width: `${prog * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    height: "100%", borderRadius: 99,
                    background: cfg.color,
                    boxShadow: `0 0 4px ${cfg.color}88`,
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Member Access toggle */}
        <button
          onClick={() => { isMemberLoggedIn ? logoutMember() : loginMember(); setBurstKey((k) => k + 1); }}
          style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", cursor: "pointer", outline: "none",
            background: isMemberLoggedIn ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isMemberLoggedIn ? "rgba(74,222,128,0.45)" : "rgba(255,255,255,0.12)"}`,
            color: isMemberLoggedIn ? "#4ade80" : "rgba(240,232,212,0.32)",
            padding: "3px 10px", borderRadius: 99,
            transition: "all 0.28s ease",
            boxShadow: isMemberLoggedIn ? "0 0 8px rgba(74,222,128,0.2)" : "none",
          }}
        >
          {isMemberLoggedIn ? (
            <>
              <span style={{ fontSize: 8 }}>⬤</span>
              Price Locked
            </>
          ) : (
            <>
              <span style={{ fontSize: 8, opacity: 0.5 }}>◯</span>
              Member Access
            </>
          )}
        </button>

        <div
          className="text-[8px] uppercase tracking-widest"
          style={{ color: "rgba(240,232,212,0.16)" }}
        >
          Hold top-center 3s · Staff
        </div>
      </footer>

      {/* ── Rank-up toast ── */}
      <AnimatePresence>
        {rankUpVisible && (
          <motion.div
            initial={{ y: -48, opacity: 0, scale: 0.92 }}
            animate={{ y: 0,   opacity: 1, scale: 1 }}
            exit={{    y: -48, opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{
              position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)",
              zIndex: 60,
              background: "linear-gradient(135deg, rgba(18,14,10,0.97), rgba(24,18,12,0.95))",
              border: `1px solid ${RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#C9A84C"}55`,
              borderRadius: 12, padding: "10px 20px",
              backdropFilter: "blur(20px)",
              boxShadow: `0 6px 28px rgba(0,0,0,0.6), 0 0 16px ${RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#C9A84C"}22`,
              display: "flex", alignItems: "center", gap: 10,
              whiteSpace: "nowrap",
            }}
          >
            <motion.span
              animate={{ rotate: [0, 18, -14, 8, 0], scale: [1, 1.35, 1] }}
              transition={{ duration: 0.7 }}
              style={{
                fontSize: 18,
                color: RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#C9A84C",
              }}
            >
              {RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.glyph ?? "✦"}
            </motion.span>
            <div>
              <div style={{
                fontSize: 7.5, fontWeight: 700, letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#C9A84C",
                marginBottom: 1,
              }}>
                Rank Achieved
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#F0E8D4",
                letterSpacing: "0.06em",
              }}>
                {rankUpLabel}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Session Stimulation notification (fires at 40 min) ── */}
      <AnimatePresence>
        {stimulationVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            style={{
              position: "absolute", bottom: 52, left: 12, right: 12, zIndex: 50,
              background: "linear-gradient(135deg, rgba(18,14,10,0.96), rgba(22,17,12,0.94))",
              border: "1px solid rgba(201,168,76,0.28)",
              borderRadius: 14,
              padding: "12px 16px",
              backdropFilter: "blur(18px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(201,168,76,0.08)",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(201,168,76,0.15)",
              border: "1px solid rgba(201,168,76,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>
              ✦
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "#C9A84C", marginBottom: 2,
              }}>
                Enhance Your Session
              </div>
              <div style={{ fontSize: 10, color: "rgba(240,232,212,0.65)", lineHeight: 1.4 }}>
                Our AI recommends a palate-cleansing pairing — a smoky Islay single-malt
                or house charcuterie to reset and elevate your experience.
              </div>
            </div>
            <button
              onClick={() => setStimulation(false)}
              style={{
                fontSize: 14, color: "rgba(240,232,212,0.28)",
                background: "none", border: "none", cursor: "pointer",
                lineHeight: 1, padding: "2px 4px", flexShrink: 0,
              }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal curtain */}
      <AnimatePresence>
        {portal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.48 }}
            onAnimationComplete={() => navigate(portal.route)}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "#0a0806" }}
          >
            <motion.div
              initial={{ scale: 0.05, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.48, ease: "easeOut" }}
              style={{
                width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(circle, ${portal.color}55 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HandoffContainer — root orchestrator ──────────────────────────────────────

export function HandoffContainer() {
  const { activeMode, currentCraft, lastHandoffAt, setMode, setCraft } = useAxiom360();
  const [flashing, setFlashing] = useState(false);

  // Hidden 3-second long-press trigger
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (holdTimerRef.current) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (activeMode === "staff") { setMode("patron"); return; }
      vibrate(HAPTIC.handoff);
      setFlashing(true);
      setTimeout(() => { setFlashing(false); setMode("staff"); }, FLASH_MS);
    }, HOLD_MS);
  }, [activeMode, setMode]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-axiom-graphite">

      {/* ╔═══════════════════════════════════════════════════════════╗
          ║  HIDDEN TRIGGER — 3-second invisible long-press           ║
          ║  Position: top-center · Size: 128×44px · opacity: 0      ║
          ╚═══════════════════════════════════════════════════════════╝ */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 touch-none select-none"
        style={{ width: 128, height: 44, opacity: 0, cursor: "default" }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
      />

      {/* Patron layer — blurs and recedes when staff mode activates */}
      <motion.div
        className="absolute inset-0"
        animate={
          activeMode === "staff"
            ? { scale: 0.93, filter: "blur(7px)", opacity: 0.38 }
            : { scale: 1,    filter: "blur(0px)", opacity: 1    }
        }
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <PatronView
          onCraftSelect={(craft) => setCraft(craft.id as CraftType)}
        />
      </motion.div>

      {/* Staff Dashboard — sliding metal animation */}
      <AnimatePresence>
        {activeMode === "staff" && !flashing && (
          <StaffPanel
            currentCraft={currentCraft}
            lastHandoffAt={lastHandoffAt}
            onExit={() => setMode("patron")}
          />
        )}
      </AnimatePresence>

      {/* System Override flash */}
      <AnimatePresence>
        {flashing && <OverrideFlash />}
      </AnimatePresence>
    </div>
  );
}
