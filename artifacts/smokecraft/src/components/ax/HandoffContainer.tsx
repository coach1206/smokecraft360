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
  ChevronLeft, Clock, Star, Megaphone,
} from "lucide-react";
import { useAxiom360 }   from "@/store/axiom360Store";
import type { CraftType } from "@/store/axiom360Store";
import { useAxiomStore }          from "@/store/axiomStore";
import { calculateDynamicPrice }  from "@/lib/pricing";
import type { PriceInfo }         from "@/lib/pricing";
import { FoundersDashboard }      from "./FoundersDashboard";
import { SubPageRenderer }        from "./SubPageRenderer";
import {
  xpProgress, xpToNextRank,
  RANK_CONFIG,
} from "@/store/prestigeStore";
import {
  playClick, playClink, playSwitch,
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
    color:   "#D48B00",
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
  bold:    { label: "BOLD",    color: "#D48B00" },
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
  { label: "Ad Manager", icon: Megaphone,  route: ""                        },
] as const;

// Tiles whose label opens an inline QuickView instead of navigating away
const QUICK_VIEW_LABELS = new Set(["Revenue", "Analytics", "Campaigns", "Operations", "Ad Manager"]);

// ── Constants ─────────────────────────────────────────────────────────────────

const HOLD_MS  = 3000;
const FLASH_MS = 680;
const BTN_SHADOW =
  "inset 0 3px 8px rgba(26,26,27,0.45), inset 0 1px 0 rgba(26,26,27,0.06), 0 1px 0 rgba(26,26,27,0.05)";

// ── System Override flash ─────────────────────────────────────────────────────

function OverrideFlash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: FLASH_MS / 1000, times: [0, 0.14, 0.74, 1] }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(135deg, #E8E4D9, #F5F2ED)" }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-64 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #D48B00, transparent)" }}
      />
      <div className="text-[9px] tracking-[0.38em] uppercase" style={{ color: "rgba(212,139,0,0.55)" }}>
        System Override
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="font-serif text-5xl font-bold tracking-wider"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#D48B00" }}
      >
        Staff Access
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="w-64 h-px mt-2"
        style={{ background: "linear-gradient(90deg, transparent, #D48B00, transparent)" }}
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
        border: `1px solid ${hovered ? `${craft.color}55` : "rgba(26,26,27,0.11)"}`,
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

        {/* Price badge removed from patron view — Revenue Brain active in background only */}

        {/* Labels — readable above vignette */}
        <div>
          <div
            className="font-bold leading-tight mb-1"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(17px, 2.4vw, 24px)",
              color: "#1A1A1B",
              textShadow: "0 1px 8px rgba(26,26,27,0.50)",
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
        background:  isES ? "rgba(74,222,128,0.08)"   : "rgba(26,26,27,0.06)",
        border:      isES ? "1px solid rgba(74,222,128,0.28)" : "1px solid rgba(26,26,27,0.12)",
        color:       isES ? "#4ade80" : "rgba(26,26,27,0.38)",
        padding: "3px 10px", borderRadius: 99,
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      {isES ? "🇩🇴\u00A0ES" : "🇺🇸\u00A0EN"}
    </button>
  );
}

// ── Price Ticker ──────────────────────────────────────────────────────────────

const TICKER_META = [
  { id: "smoke", label: "SMOKE", glyph: "◈", color: "#D48B00" },
  { id: "pour",  label: "POUR",  glyph: "◇", color: "#9B7FD4" },
  { id: "brew",  label: "BREW",  glyph: "◎", color: "#3BBFA3" },
  { id: "vape",  label: "VAPE",  glyph: "◉", color: "#5BC4F5" },
];

function PriceTicker({ craftPrices }: { craftPrices: Record<string, PriceInfo> }) {
  const prevTiers = useRef<Record<string, string>>({});
  useEffect(() => {
    let fired = false;
    for (const m of TICKER_META) {
      const tier = craftPrices[m.id]?.label ?? "";
      if (!fired && prevTiers.current[m.id] !== undefined && prevTiers.current[m.id] !== tier) {
        playClick();
        fired = true;
      }
      prevTiers.current[m.id] = tier;
    }
  }, [craftPrices]);

  const items = [...TICKER_META, ...TICKER_META, ...TICKER_META];

  return (
    <div
      className="relative z-10 flex-shrink-0 overflow-hidden"
      style={{
        height: 30,
        background: "rgba(4,3,2,0.97)",
        borderTop:    "1px solid rgba(212,139,0,0.22)",
        borderBottom: "1px solid rgba(212,139,0,0.08)",
      }}
    >
      {/* Edge fade masks */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, zIndex: 2, background: "linear-gradient(90deg, rgba(4,3,2,1) 0%, transparent 100%)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 2, background: "linear-gradient(270deg, rgba(4,3,2,1) 0%, transparent 100%)" }} />

      {/* "MARKET RATE" label */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 3,
        display: "flex", alignItems: "center", paddingLeft: 10,
        background: "rgba(4,3,2,0.97)",
      }}>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700,
          letterSpacing: "0.22em", color: "rgba(212,139,0,0.45)", textTransform: "uppercase",
        }}>
          RATE
        </span>
        <div style={{ width: 1, height: 14, background: "rgba(212,139,0,0.20)", marginLeft: 8 }} />
      </div>

      <motion.div
        className="flex items-center h-full"
        style={{ paddingLeft: 56, width: "max-content" }}
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 54, repeat: Infinity, ease: "linear" }}
      >
        {items.map((m, i) => {
          const info  = craftPrices[m.id];
          const price = info?.price ?? CRAFT_BASE_PRICE[m.id] ?? 0;
          const tier  = info?.label ?? "STANDARD";
          const isSurge    = tier === "SURGE";
          const isMemberLk = tier === "MEMBER";
          const priceColor = isSurge ? "#f87171" : isMemberLk ? "#4ade80" : "#D48B00";
          const glowColor  = isSurge ? "rgba(248,113,113,0.65)" : isMemberLk ? "rgba(74,222,128,0.55)" : "rgba(212,139,0,0.55)";

          return (
            <div key={i} className="flex items-center flex-shrink-0" style={{ paddingRight: 28 }}>
              <span style={{
                fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700,
                letterSpacing: "0.14em", color: m.color,
                textShadow: `0 0 7px ${m.color}70`,
              }}>
                {m.glyph}&nbsp;{m.label}
              </span>
              <span style={{
                fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 700,
                color: priceColor, textShadow: `0 0 9px ${glowColor}`,
                letterSpacing: "0.04em", marginLeft: 7,
              }}>
                ${price.toFixed(0)}
              </span>
              {(isSurge || isMemberLk) && (
                <span style={{
                  fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700,
                  color: priceColor, letterSpacing: "0.16em",
                  marginLeft: 4, opacity: 0.9,
                }}>
                  {isSurge ? "↑SURGE" : "↓LOCK"}
                </span>
              )}
              <span style={{ color: "rgba(212,139,0,0.18)", fontSize: 12, marginLeft: 24 }}>·</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ── Travel Concierge Modal (DayOne360) ────────────────────────────────────────

function TravelConciergeModal({ onClose }: { onClose: () => void }) {
  const TRIPS = [
    { icon: "✈", label: "Havana Cigar Trail",       detail: "5 nights from $1,299",       color: "#D48B00" },
    { icon: "🥃", label: "Scotch Highlands Weekend", detail: "Edinburgh from $899",         color: "#9B7FD4" },
    { icon: "🌴", label: "Miami Members Retreat",    detail: "Seasonal early-bird rates",   color: "#3BBFA3" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0, zIndex: 300,
        background: "rgba(8,6,4,0.82)", backdropFilter: "blur(18px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "linear-gradient(180deg, rgba(14,10,28,0.99) 0%, rgba(8,6,4,0.99) 100%)",
          border: "1px solid rgba(167,139,250,0.22)",
          borderBottom: "none", borderRadius: "24px 24px 0 0",
          padding: "0 0 32px", overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 36, height: 3, borderRadius: 99, background: "rgba(167,139,250,0.28)" }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "16px 24px 18px",
          borderBottom: "1px solid rgba(167,139,250,0.10)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.12em" }}>
              DayOne360
            </div>
            <div style={{ fontSize: 9, color: "rgba(167,139,250,0.48)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 3 }}>
              Elite Travel · Curated for Axiom Members
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)",
              borderRadius: 10, padding: "6px 14px", color: "rgba(167,139,250,0.65)",
              fontSize: 11, cursor: "pointer", outline: "none",
            }}
          >✕ Close</button>
        </div>

        {/* Trip cards */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {TRIPS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.07 }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 14,
                background: `${t.color}0A`, border: `1px solid ${t.color}20`,
              }}
            >
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F0E8D4" }}>{t.label}</div>
                <div style={{ fontSize: 10, color: t.color, marginTop: 2, letterSpacing: "0.04em" }}>{t.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: "0 24px" }}>
          <a
            href="/mobile-hub"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "15px", borderRadius: 14, textDecoration: "none",
              background: "linear-gradient(135deg, rgba(167,139,250,0.16), rgba(167,139,250,0.07))",
              border: "1px solid rgba(167,139,250,0.32)",
              fontSize: 13, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.06em",
            }}
          >
            Open Full Concierge Portal →
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── DayOne360 Sponsor Card ────────────────────────────────────────────────────

function DayOneCard({ onTap }: { onTap: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.40, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onTapStart={() => setPressed(true)}
      onTap={() => { setPressed(false); playClick(); onTap(); }}
      onTapCancel={() => setPressed(false)}
      style={{ gridColumn: "1 / -1", outline: "none" }}
      className="cursor-pointer text-left"
    >
      <motion.div
        animate={{ scale: pressed ? 0.985 : 1 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "relative", height: 72, overflow: "hidden",
          background: "linear-gradient(135deg, rgba(14,10,28,0.96) 0%, rgba(20,14,38,0.98) 50%, rgba(8,6,16,0.96) 100%)",
          border: "1px solid rgba(167,139,250,0.26)",
          borderRadius: 16,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
          boxShadow: "0 0 24px rgba(167,139,250,0.07), inset 0 1px 0 rgba(167,139,250,0.10)",
        }}
      >
        {/* Radial ambient */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 85% at 12% 50%, rgba(167,139,250,0.11), transparent)",
        }} />
        {/* Particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} style={{
            position: "absolute", width: 2, height: 2, borderRadius: "50%", background: "#a78bfa",
            left: `${8 + i * 17}%`, top: `${18 + (i % 3) * 28}%`, opacity: 0.22 + i * 0.07,
          }}
            animate={{ opacity: [0.22, 0.55, 0.22], scale: [1, 1.6, 1] }}
            transition={{ duration: 1.8 + i * 0.5, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
        {/* Logo mark */}
        <div style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: 11,
          background: "rgba(167,139,250,0.11)", border: "1px solid rgba(167,139,250,0.26)",
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1,
        }}>
          <span style={{ fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: "#a78bfa" }}>D1</span>
        </div>
        {/* Copy */}
        <div style={{ flex: 1, position: "relative", zIndex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F0E8D4", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.07em", lineHeight: 1.2 }}>
            DayOne360 Travel
          </div>
          <div style={{ fontSize: 9, color: "rgba(167,139,250,0.58)", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 3 }}>
            Elite Dominican Concierge · Tap to explore
          </div>
        </div>
        {/* Sponsor badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, position: "relative", zIndex: 1, flexShrink: 0 }}>
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(167,139,250,0.50)",
            padding: "2px 7px", borderRadius: 99,
            border: "1px solid rgba(167,139,250,0.18)", background: "rgba(167,139,250,0.06)",
          }}>SPONSOR</span>
          <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>View Offers ›</span>
        </div>
      </motion.div>
    </motion.button>
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
        color: on ? "rgba(212,139,0,0.65)" : "rgba(26,26,27,0.20)",
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

// ── Pulse Ticker messages ────────────────────────────────────────────────────
const PULSE_MSGS = [
  { text: "AI ENGINE: ACTIVE" },
  { text: "REVENUE BRAIN: OPTIMIZING" },
  { text: "LIVE MARKET RATES" },
];

// ── Staff Inventory snapshot (real: GET /api/inventory) ────────────────────
const STAFF_INVENTORY = [
  { cat: "Cigars", items: [
    { name: "Rocky Patel Vintage 1992", qty: 14, max: 20 },
    { name: "Oliva Serie V Melanio",     qty:  6, max: 20 },
    { name: "Montecristo No. 2",         qty:  3, max: 15 },
    { name: "Arturo Fuente OpusX",       qty:  0, max: 10 },
    { name: "Cohiba Behike BHK 52",      qty:  9, max: 12 },
  ]},
  { cat: "Spirits", items: [
    { name: "Macallan 18 Sherry Oak",    qty:  3, max: 8  },
    { name: "Pappy Van Winkle 15yr",     qty:  1, max: 4  },
    { name: "Goose Island Bourbon Co.",  qty:  8, max: 12 },
    { name: "Blantons Gold",             qty:  5, max: 8  },
    { name: "Clase Azul Reposado",       qty:  2, max: 6  },
  ]},
];

const LIFT_HOURS = [28, 34, 41, 29, 55, 63, 48, 72];

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

  const [founderVisible, setFounderVisible] = useState(false);
  const [activeSlug, setActiveSlug]         = useState<string | null>(null);
  const founderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startFounderPress() {
    founderTimerRef.current = setTimeout(() => setFounderVisible(true), 2000);
  }
  function clearFounderPress() {
    if (founderTimerRef.current) { clearTimeout(founderTimerRef.current); founderTimerRef.current = null; }
  }

  const {
    occupancy, isDynamicActive, isMember,
    totalLift, updateOccupancy, toggleDynamic, resetSession,
  } = useAxiomStore();

  const occupancyColor = occupancy > 80 ? "#b91c1c" : occupancy < 25 ? "#D48B00" : "#166534";
  const surgeActive    = occupancy > 80 && isDynamicActive;
  const maxLift        = Math.max(...LIFT_HOURS);

  return (
    <motion.div
      initial={{ x: "100%", filter: "blur(12px)" }}
      animate={{ x: 0,      filter: "blur(0px)"  }}
      exit={{    x: "100%", filter: "blur(12px)"  }}
      transition={{ type: "spring", stiffness: 290, damping: 30 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{ background: "#F5F2ED", color: "#1A1A1B", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Lens-flash sheen sweep on entry */}
      <motion.div
        initial={{ x: "-120%", opacity: 1 }}
        animate={{ x: "220%",  opacity: 0 }}
        transition={{ duration: 0.60, ease: "easeOut", delay: 0.15 }}
        className="absolute inset-y-0 w-1/2 pointer-events-none z-10"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)" }}
      />

      {/* ── POS Header bar ──────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, height: 56, display: "flex", alignItems: "center",
        padding: "0 24px", gap: 14, background: "#1A1A1B",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFB347" }}
            animate={{ boxShadow: ["0 0 4px #FFB347", "0 0 14px #FFB347", "0 0 4px #FFB347"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.30em", color: "#FFB347",
            textShadow: "0 0 8px #FFB347, 0 0 20px rgba(255,179,71,0.35)",
          }}>AXIOM OS · STAFF POS</span>
        </div>
        {craft && (
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, letterSpacing: "0.14em", color: "rgba(240,232,212,0.35)" }}>
            LAST: {craft.label.toUpperCase()}
          </span>
        )}
        {lastHandoffAt && (
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: "rgba(240,232,212,0.22)", letterSpacing: "0.1em" }}>
            {new Date(lastHandoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onPointerDown={startFounderPress} onPointerUp={clearFounderPress} onPointerLeave={clearFounderPress}
          style={{
            minHeight: 38, padding: "0 16px", borderRadius: 9,
            background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.30)",
            fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: "#D48B00", cursor: "default",
          }}
        >FOUNDER ···</button>
        <button
          onClick={onExit}
          style={{
            minHeight: 38, padding: "0 20px", borderRadius: 9,
            background: "rgba(240,232,212,0.08)", border: "1px solid rgba(240,232,212,0.14)",
            fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(240,232,212,0.55)", cursor: "pointer",
          }}
        >← EXIT POS</button>
      </div>

      {/* ── 3-Column POS Grid ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: "hidden",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 3, padding: 3, background: "#E8E4D9",
      }}>

        {/* ══ COL A · INVENTORY ══════════════════════════════════════════════ */}
        <div style={{ background: "#F5F2ED", borderRadius: 14, padding: "20px 18px", overflowY: "auto" }}>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", color: "#D48B00", marginBottom: 18 }}>◈ INVENTORY</div>

          {STAFF_INVENTORY.map(cat => (
            <div key={cat.cat} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(26,26,27,0.36)", textTransform: "uppercase", marginBottom: 10 }}>{cat.cat}</div>
              {cat.items.map(item => {
                const pct = item.max === 0 ? 0 : item.qty / item.max;
                const depleted = item.qty === 0;
                const low = pct < 0.35 && !depleted;
                const barColor = depleted ? "#b91c1c" : low ? "#D48B00" : "#166534";
                return (
                  <div key={item.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: depleted ? "#b91c1c" : "#1A1A1B" }}>{item.name}</span>
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, color: barColor }}>
                        {depleted ? "OUT" : item.qty}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "rgba(26,26,27,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct * 100}%`, background: barColor, borderRadius: 99, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {[
              { label: "Full Inventory →", route: "/inventory" },
              { label: "Reorder Alerts →", route: "/inventory" },
            ].map(btn => (
              <button key={btn.label}
                onClick={() => { navigate(btn.route); onExit(); }}
                style={{
                  minHeight: 52, borderRadius: 10, cursor: "pointer",
                  background: "#EFEBE0", border: "1px solid rgba(26,26,27,0.09)",
                  fontSize: 12, fontWeight: 600, color: "#1A1A1B", letterSpacing: "0.02em",
                }}
              >{btn.label}</button>
            ))}
          </div>
        </div>

        {/* ══ COL B · REVENUE CONTROL ════════════════════════════════════════ */}
        <div style={{ background: "#F5F2ED", borderRadius: 14, padding: "20px 18px", overflowY: "auto" }}>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", color: "#D48B00", marginBottom: 18 }}>◇ REVENUE CONTROL</div>

          {/* Occupancy readout */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 72, fontWeight: 700,
              lineHeight: 1, color: occupancyColor,
              textShadow: `0 0 28px ${occupancyColor}55`,
              transition: "color 0.4s ease, text-shadow 0.4s ease",
            }}>
              {occupancy}<span style={{ fontSize: 30 }}>%</span>
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, letterSpacing: "0.24em", color: "rgba(26,26,27,0.36)", marginTop: 4 }}>OCCUPANCY</div>
            <div style={{
              marginTop: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
              color: surgeActive ? "#b91c1c" : occupancy < 25 ? "#D48B00" : "#166534",
            }}>
              {surgeActive ? "▲ SURGE — +12% on all rates" : occupancy < 25 ? "▼ SLOW — Volume incentives on" : "● Steady — Standard rates"}
            </div>
          </div>

          {/* Fat-finger slider */}
          <div style={{ marginBottom: 24, padding: "16px", background: "#EFEBE0", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(26,26,27,0.45)", textTransform: "uppercase" }}>Occupancy</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: occupancyColor, fontWeight: 700 }}>{occupancy}%</span>
            </div>
            <input type="range" min={0} max={100} value={occupancy}
              onChange={(e) => updateOccupancy(Number(e.target.value))}
              style={{ width: "100%", height: 12, accentColor: occupancyColor, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 8, color: "rgba(26,26,27,0.28)" }}>0 — Empty</span>
              <span style={{ fontSize: 8, color: "rgba(26,26,27,0.28)" }}>100 — Full</span>
            </div>
          </div>

          {/* Revenue Brain master toggle — fat-finger */}
          <button onClick={toggleDynamic} style={{
            width: "100%", minHeight: 64, borderRadius: 14, cursor: "pointer",
            background: isDynamicActive ? "#1A1A1B" : "#EFEBE0",
            border: `2px solid ${isDynamicActive ? "#D48B00" : "rgba(26,26,27,0.14)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            marginBottom: 16, transition: "all 0.22s ease",
            boxShadow: isDynamicActive ? "0 0 24px rgba(212,139,0,0.18)" : "none",
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: isDynamicActive ? "#4ade80" : "rgba(26,26,27,0.25)",
              boxShadow: isDynamicActive ? "0 0 10px #4ade80" : "none",
              transition: "all 0.22s",
            }} />
            <span style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: isDynamicActive ? "#D48B00" : "rgba(26,26,27,0.40)",
            }}>Revenue Brain — {isDynamicActive ? "ON" : "OFF"}</span>
          </button>

          {/* Live patron rate preview */}
          <div style={{ background: "#EFEBE0", borderRadius: 12, padding: "14px 12px", marginBottom: 14 }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, letterSpacing: "0.20em", color: "rgba(26,26,27,0.33)", marginBottom: 10, textTransform: "uppercase" }}>Live Patron Rates</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CRAFTS.map(c => {
                const base = CRAFT_BASE_PRICE[c.id] ?? 18;
                const liveInfo = calculateDynamicPrice(base, occupancy, !!isMember, isDynamicActive);
                const livePrice = liveInfo.price;
                const diff = livePrice - base;
                return (
                  <div key={c.id} style={{ padding: "10px", borderRadius: 9, background: "#F5F2ED", border: "1px solid rgba(26,26,27,0.07)" }}>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, color: c.color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>{c.id}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "#1A1A1B", lineHeight: 1 }}>${livePrice.toFixed(0)}</div>
                    {diff !== 0 && (
                      <div style={{ fontSize: 8, color: diff > 0 ? "#b91c1c" : "#166534", marginTop: 3, fontWeight: 700 }}>
                        {diff > 0 ? `+$${diff.toFixed(0)} surge` : `-$${Math.abs(diff).toFixed(0)} disc`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick nav — fat-finger */}
          {[
            { label: "📊 Analytics Dashboard", route: "/analytics" },
            { label: "💳 Open Tab Manager",    route: "/tabs" },
          ].map(btn => (
            <button key={btn.label}
              onClick={() => { navigate(btn.route); onExit(); }}
              style={{
                width: "100%", minHeight: 56, borderRadius: 12, marginBottom: 8,
                cursor: "pointer", background: "#EFEBE0", border: "1px solid rgba(26,26,27,0.09)",
                fontSize: 12, fontWeight: 600, color: "#1A1A1B", letterSpacing: "0.02em",
              }}
            >{btn.label}</button>
          ))}
        </div>

        {/* ══ COL C · ANALYTICS ══════════════════════════════════════════════ */}
        <div style={{ background: "#F5F2ED", borderRadius: 14, padding: "20px 18px", overflowY: "auto" }}>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", color: "#D48B00", marginBottom: 18 }}>◎ REVENUE LIFT</div>

          {/* Total lift hero */}
          <div style={{ marginBottom: 22, padding: "20px", borderRadius: 14, background: "#1A1A1B", textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 700, lineHeight: 1, color: "#D48B00" }}>
              ${typeof totalLift === "number" ? totalLift.toFixed(0) : "0"}
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, letterSpacing: "0.24em", color: "rgba(212,139,0,0.45)", marginTop: 6 }}>TOTAL LIFT TODAY</div>
            <div style={{ fontSize: 10, color: "rgba(240,232,212,0.38)", marginTop: 8, lineHeight: 1.5 }}>Extra revenue above base from AI optimization</div>
          </div>

          {/* Hourly bar chart */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, letterSpacing: "0.16em", color: "rgba(26,26,27,0.33)", marginBottom: 10, textTransform: "uppercase" }}>Revenue Lift — Last 8 hrs ($)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
              {LIFT_HOURS.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(v / maxLift) * 100}%` }}
                      transition={{ duration: 1.0, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        width: "100%", borderRadius: "4px 4px 0 0",
                        background: i === LIFT_HOURS.length - 1 ? "#D48B00" : "rgba(212,139,0,0.28)",
                        boxShadow: i === LIFT_HOURS.length - 1 ? "0 0 10px rgba(212,139,0,0.5)" : "none",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 6, color: "rgba(26,26,27,0.28)", marginTop: 3, fontFamily: "'Courier New', monospace" }}>
                    {String(new Date().getHours() - (7 - i)).padStart(2, "0")}h
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI chips */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Recs Shown",   value: "47",    color: "#9B7FD4" },
              { label: "Add-to-Order", value: "18",    color: "#3BBFA3" },
              { label: "Conversion",   value: "38%",   color: "#D48B00" },
              { label: "Avg Margin+",  value: "+$6.40",color: "#4ade80" },
            ].map(s => (
              <div key={s.label} style={{ padding: "12px 8px", borderRadius: 10, background: "#EFEBE0", textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, color: "rgba(26,26,27,0.36)", marginTop: 4, letterSpacing: "0.10em" }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Guest sentiment */}
          {[
            { emoji: "😊", label: "Satisfied",    pct: 68, color: "#4ade80" },
            { emoji: "😐", label: "Neutral",      pct: 22, color: "#D48B00" },
            { emoji: "😞", label: "Disappointed", pct: 10, color: "#f87171" },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#1A1A1B" }}>{s.emoji} {s.label}</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: s.color, fontWeight: 700 }}>{s.pct}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(26,26,27,0.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}

          {/* Reset session — fat-finger danger button */}
          <button
            onClick={() => {
              if (confirm("Reset session? Clears cart, loyalty buffer, and temp reservations.")) {
                resetSession();
                onExit();
              }
            }}
            style={{
              width: "100%", minHeight: 56, borderRadius: 12, marginTop: 14, cursor: "pointer",
              background: "rgba(185,28,28,0.05)", border: "1px solid rgba(185,28,28,0.18)",
              fontSize: 12, fontWeight: 600, color: "#b91c1c", letterSpacing: "0.04em",
            }}
          >⚠ Reset Session</button>
        </div>
      </div>

      {/* Founder overlay */}
      <AnimatePresence>
        {founderVisible && (
          <motion.div
            key="founder-staff"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200]"
          >
            <FoundersDashboard />
            <div style={{ position: "absolute", bottom: 32, right: 32 }}>
              <button
                onClick={() => setFounderVisible(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                  cursor: "pointer", outline: "none",
                  background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.12)",
                  color: "rgba(26,26,27,0.44)", padding: "5px 14px", borderRadius: 99,
                }}
              ><ChevronLeft size={10} /> Back</button>
            </div>
            <div style={{
              position: "absolute", bottom: 40, left: 32,
              fontSize: 7.5, color: "rgba(212,139,0,0.3)", letterSpacing: "0.2em", textTransform: "uppercase",
            }}>Founder Access Only</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-page overlay */}
      <AnimatePresence>
        {activeSlug && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[150] overflow-auto"
            style={{ background: "#F5F2ED" }}
          >
            <button
              onClick={() => setActiveSlug(null)}
              style={{
                position: "absolute", top: 18, left: 18, zIndex: 10,
                display: "flex", alignItems: "center", gap: 5,
                minHeight: 40, padding: "0 16px", borderRadius: 10,
                background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.12)",
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(26,26,27,0.50)", cursor: "pointer",
              }}
            ><ChevronLeft size={11} /> Back</button>
            <SubPageRenderer slug={activeSlug} />
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
  const [founderPatronOpen, setFounderPatronOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [tickerIdx,  setTickerIdx]  = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickerIdx(i => (i + 1) % PULSE_MSGS.length), 3800);
    return () => clearInterval(id);
  }, []);
  const logoHoldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { activeMode } = useAxiom360();
  const isDark = activeMode !== "staff";

  const {
    occupancy,
    isDynamicActive,
    isMember,
    toggleMember,
    processSale,
    xp, rank, addXP,
  } = useAxiomStore();
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
      : "#D48B00";

  // Per-craft prices — recomputes whenever occupancy / pricing / member state changes
  const craftPrices = useMemo(
    () => Object.fromEntries(
      CRAFTS.map((c) => [
        c.id,
        calculateDynamicPrice(CRAFT_BASE_PRICE[c.id] ?? 20, occupancy, isDynamicActive, isMember),
      ]),
    ),
    [occupancy, isDynamicActive, isMember],
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
    const _base = CRAFT_BASE_PRICE[craft.id] ?? 20;
    const _info = calculateDynamicPrice(_base, occupancy, isDynamicActive, isMember);
    if (_info.price !== _base) processSale(_base, _info.price);
    setTimeout(() => setPortal({ route: craft.route, color: craft.color }), 320);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden grainy-texture"
      style={{
        background: isDark ? "#080604" : "#F5F2ED",
        color:      isDark ? "#F0E8D4" : "#1A1A1B",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
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

      {/* ══ THE PULSE — Top Ticker ══ */}
      <div style={{
        position: "relative", zIndex: 20, flexShrink: 0,
        height: 45, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(8,6,4,0.86)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,179,71,0.15)",
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tickerIdx}
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -9 }}
            transition={{ duration: 0.42, ease: "easeInOut" }}
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.38em",
              textTransform: "uppercase", color: "#FFB347",
              textShadow: "0 0 8px #FFB347, 0 0 24px rgba(255,179,71,0.45), 0 0 48px rgba(255,179,71,0.18)",
            }}
          >
            ● {PULSE_MSGS[tickerIdx].text}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-4 px-5 py-3 flex-shrink-0"
        style={{
          borderBottom: `1px solid ${isDark ? "rgba(240,232,212,0.09)" : "rgba(26,26,27,0.09)"}`,
          background: "rgba(13,11,9,0.88)",
          backdropFilter: "blur(18px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col"
          style={{ cursor: "default", userSelect: "none" }}
          onPointerDown={() => {
            logoHoldTimer.current = setTimeout(() => setFounderPatronOpen(true), 5000);
          }}
          onPointerUp={() => clearTimeout(logoHoldTimer.current)}
          onPointerLeave={() => clearTimeout(logoHoldTimer.current)}
          onPointerCancel={() => clearTimeout(logoHoldTimer.current)}
        >
          <span
            className="font-bold uppercase leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(18px, 2.4vw, 22px)",
              color: isDark ? "#F0E8D4" : "#1A1A1B",
              letterSpacing: "0.18em",
            }}
          >
            Axiom 360
          </span>
          <span
            className="uppercase"
            style={{ fontSize: 8, color: "rgba(212,139,0,0.5)", letterSpacing: "0.3em", marginTop: 2 }}
          >
            Experience OS
          </span>
        </motion.div>

        {/* Status dots */}
        <div className="flex items-center gap-5 flex-1 overflow-x-auto scrollbar-none ml-2">
          {[
            { label: "AI Engine",    state: "ACTIVE",  color: "#4ade80" },
            { label: "Taste Engine", state: "READY",   color: "#D48B00" },
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
              <span style={{ fontSize: 8, color: isDark ? "rgba(240,232,212,0.40)" : "rgba(26,26,27,0.30)", letterSpacing: "0.14em" }}>
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
          style={{ fontSize: 10, color: isDark ? "rgba(240,232,212,0.35)" : "rgba(26,26,27,0.25)", letterSpacing: "0.12em" }}
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
            color: isDark ? "#F0E8D4" : "#1A1A1B",
          }}
        >
          Select your{" "}
          <span style={{ color: pulseColor, fontWeight: 600, transition: "color 0.6s ease" }}>
            experience.
          </span>
        </motion.div>
        <p style={{ fontSize: 10, color: isDark ? "rgba(240,232,212,0.45)" : "rgba(26,26,27,0.38)", marginTop: 5 }}>
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
                  border: `1px solid ${active ? cfg.color : isDark ? "rgba(240,232,212,0.16)" : "rgba(26,26,27,0.16)"}`,
                  background: active ? `${cfg.color}22` : "rgba(13,11,9,0.6)",
                  color: active ? cfg.color : isDark ? "rgba(240,232,212,0.50)" : "rgba(26,26,27,0.38)",
                  cursor: "pointer",
                  outline: "none",
                  transition: "all 0.28s ease",
                  boxShadow: active
                    ? `0 0 10px ${cfg.color}44, inset 0 1px 0 ${isDark ? "rgba(240,232,212,0.08)" : "rgba(26,26,27,0.08)"}`
                    : `inset 0 1px 0 ${isDark ? "rgba(240,232,212,0.06)" : "rgba(26,26,27,0.06)"}`,
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
                color: isDark ? "rgba(240,232,212,0.35)" : "rgba(26,26,27,0.28)",
                letterSpacing: "0.1em",
                marginLeft: 2,
              }}
            >
              · mood active
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* 4 Craft Cards + DayOne360 Sponsor Card */}
      <div
        className="relative z-10 flex-1 min-h-0 px-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows:    "1fr 1fr auto",
          gap: 12,
          paddingBottom: 12,
        }}
      >
        {CRAFTS.map((craft, i) => (
          <CraftCard
            key={craft.id}
            craft={craft}
            idx={i}
            onTap={() => handleCraftTap(craft)}
            priceInfo={craftPrices[craft.id] ?? calculateDynamicPrice(CRAFT_BASE_PRICE[craft.id] ?? 20, occupancy, isDynamicActive, isMember)}
          />
        ))}
        <DayOneCard onTap={() => setTravelOpen(true)} />
      </div>

      {/* Price Ticker — live LED strip */}
      <PriceTicker craftPrices={craftPrices} />

      {/* Footer */}
      <footer
        className="relative z-10 flex items-center gap-4 px-5 py-2.5 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(26,26,27,0.08)",
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
              style={{ fontSize: 8, color: "rgba(26,26,27,0.22)", letterSpacing: "0.2em" }}
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
                background: "rgba(26,26,27,0.10)",
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
          onClick={() => { toggleMember(); setBurstKey((k) => k + 1); }}
          style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", cursor: "pointer", outline: "none",
            background: isMember ? "rgba(74,222,128,0.12)" : "rgba(26,26,27,0.07)",
            border: `1px solid ${isMember ? "rgba(74,222,128,0.45)" : "rgba(26,26,27,0.14)"}`,
            color: isMember ? "#4ade80" : "rgba(240,232,212,0.32)",
            padding: "3px 10px", borderRadius: 99,
            transition: "all 0.28s ease",
            boxShadow: isMember ? "0 0 8px rgba(74,222,128,0.2)" : "none",
          }}
        >
          {isMember ? (
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
              background: "linear-gradient(135deg, rgba(245,242,237,0.97), rgba(24,18,12,0.95))",
              border: `1px solid ${RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#D48B00"}55`,
              borderRadius: 12, padding: "10px 20px",
              backdropFilter: "blur(20px)",
              boxShadow: `0 6px 28px rgba(26,26,27,0.26), 0 0 16px ${RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#D48B00"}22`,
              display: "flex", alignItems: "center", gap: 10,
              whiteSpace: "nowrap",
            }}
          >
            <motion.span
              animate={{ rotate: [0, 18, -14, 8, 0], scale: [1, 1.35, 1] }}
              transition={{ duration: 0.7 }}
              style={{
                fontSize: 18,
                color: RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#D48B00",
              }}
            >
              {RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.glyph ?? "✦"}
            </motion.span>
            <div>
              <div style={{
                fontSize: 7.5, fontWeight: 700, letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: RANK_CONFIG[rankUpLabel as keyof typeof RANK_CONFIG]?.color ?? "#D48B00",
                marginBottom: 1,
              }}>
                Rank Achieved
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#1A1A1B",
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
              background: "linear-gradient(135deg, rgba(245,242,237,0.96), rgba(22,17,12,0.94))",
              border: "1px solid rgba(212,139,0,0.28)",
              borderRadius: 14,
              padding: "12px 16px",
              backdropFilter: "blur(18px)",
              boxShadow: "0 8px 32px rgba(26,26,27,0.22), 0 0 20px rgba(212,139,0,0.08)",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(212,139,0,0.15)",
              border: "1px solid rgba(212,139,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>
              ✦
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "#D48B00", marginBottom: 2,
              }}>
                Enhance Your Session
              </div>
              <div style={{ fontSize: 10, color: "rgba(26,26,27,0.62)", lineHeight: 1.4 }}>
                Our AI recommends a palate-cleansing pairing — a smoky Islay single-malt
                or house charcuterie to reset and elevate your experience.
              </div>
            </div>
            <button
              onClick={() => setStimulation(false)}
              style={{
                fontSize: 14, color: isDark ? "rgba(240,232,212,0.38)" : "rgba(26,26,27,0.28)",
                background: "none", border: "none", cursor: "pointer",
                lineHeight: 1, padding: "2px 4px", flexShrink: 0,
              }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Travel Concierge Modal (DayOne360) ── */}
      <AnimatePresence>
        {travelOpen && <TravelConciergeModal onClose={() => setTravelOpen(false)} />}
      </AnimatePresence>

      {/* ── Founder Dashboard — secret 5-second logo long-press ── */}
      <AnimatePresence>
        {founderPatronOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute", inset: 0,
              zIndex: 200,
              background: "rgba(245,242,237,0.96)",
              backdropFilter: "blur(16px)",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setFounderPatronOpen(false)}
              style={{
                position: "absolute", top: 16, right: 20,
                background: "rgba(26,26,27,0.08)",
                border: "1px solid rgba(26,26,27,0.14)",
                borderRadius: 8, padding: "6px 14px",
                color: "rgba(26,26,27,0.58)", fontSize: 11,
                cursor: "pointer", zIndex: 10,
              }}
            >✕ Close</button>
            <FoundersDashboard />
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
            style={{ background: isDark ? "#080604" : "#F5F2ED" }}
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
      playSwitch();
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
