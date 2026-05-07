/**
 * SpecialRevealModal — Tap-to-Reveal overlay for sponsored ticker items.
 *
 * Appears when a guest taps a ticker item. Shows:
 *   - Brand logo (large) with prestige amber glow ring
 *   - Mentor avatar + exclusive high-tier insight quote
 *   - Product/promo headline
 *   - "+N XP" Prestige Multiplier badge
 *   - "Add to Draft" primary CTA → logs add_to_draft impression, fires callback
 *   - "Dismiss" ghost button
 *
 * Design: Frosted-obsidian modal (20px backdrop blur), Cormorant Garamond
 * display type, ambient amber particle ring (CSS only — zero runtime cost).
 */

import { useEffect, useRef }    from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RevealItem {
  id:                 string;
  brandName:          string;
  logoUrl?:           string | null;
  promoText:          string;
  promoLink?:         string | null;
  pointBonus:         number;
  prestigeMultiplier?: number;
  craftType?:         string;
  venueId?:           string;
  /** Parsed reveal content from DB, or generated from promoText */
  revealHeadline?:    string;
  revealBody?:        string;
  revealCtaText?:     string;
}

interface SpecialRevealModalProps {
  item:         RevealItem;
  onClose:      () => void;
  onAddToDraft?: (item: RevealItem) => void;
}

// ── Mentor insight generator ──────────────────────────────────────────────────

const CRAFT_INSIGHTS: Record<string, string[]> = {
  smoke: [
    "A true Sage recognises this leaf — pressed under the same hands that built legendary puro traditions. Your palate has earned it.",
    "This is what the tobacco lineage calls a 'milestone smoke.' Your draft has been pointing toward this complexity since the first draw.",
    "Rare provenance. The Sage would not surface this unless your flavor history showed the readiness to appreciate it.",
  ],
  pour: [
    "Your mentor marks this expression as a watershed moment — distilled in the precise style your grain-and-char history has been building toward.",
    "This spirit carries the signature of masters. Your palate profile aligns with its finish in a way few guests ever reach.",
    "Few are guided here. The Sage surfaces this only when a guest's draft shows the depth to hold it.",
  ],
  brew: [
    "A craft you have been circling for three sessions. Your malt and hop affinity finally converges here.",
    "This brew was born from the same yeast family your last session gravitated toward. The Sage recognises the progression.",
    "Limited production. Your draft frequency and flavor evolution made this the only logical next chapter.",
  ],
  vape: [
    "Your extraction preferences have steadily refined toward this profile. The Sage sees the thread clearly.",
    "This is a master blender's vapor expression — engineered for guests who have already moved past the obvious.",
    "Few arrive at this recommendation. Your session data suggests you will understand it immediately.",
  ],
  default: [
    "The Sage surfaces this for guests with a refined draft history. Your selections have earned this reveal.",
    "This is a prestige-tier recommendation. Your Mentor confirms your palate is ready.",
  ],
};

function getMentorInsight(craftType?: string): string {
  const pool = CRAFT_INSIGHTS[craftType ?? "default"] ?? CRAFT_INSIGHTS["default"];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

// ── Initials avatar ───────────────────────────────────────────────────────────

function LogoOrInitials({ brandName, logoUrl, size = 80 }: { brandName: string; logoUrl?: string | null; size?: number }) {
  const initials = brandName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: 12 }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: "rgba(212,139,0,0.12)",
      border: "2px solid rgba(212,139,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 900, color: "#D48B00",
      letterSpacing: "0.04em",
    }}>
      {initials}
    </div>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Component ─────────────────────────────────────────────────────────────────

export default function SpecialRevealModal({ item, onClose, onAddToDraft }: SpecialRevealModalProps) {
  const mentorInsight = useRef(getMentorInsight(item.craftType)).current;
  const effectiveXP   = Math.round(item.pointBonus * (item.prestigeMultiplier ?? 1));

  // Log click impression
  useEffect(() => {
    fetch(`${BASE}/api/ads/impression`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickerId: item.id, eventType: "click", craftType: item.craftType, venueId: item.venueId }),
    }).catch(() => {});
  }, [item.id, item.craftType, item.venueId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAddToDraft = () => {
    fetch(`${BASE}/api/ads/impression`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickerId: item.id, eventType: "add_to_draft", craftType: item.craftType, venueId: item.venueId }),
    }).catch(() => {});
    onAddToDraft?.(item);
    onClose();
  };

  const headline = item.revealHeadline ?? item.promoText;
  const body     = item.revealBody     ?? `${item.brandName} has been selected by your Mentor as a prestige-tier recommendation. Tap to add it to your current Draft and earn ${effectiveXP} bonus XP.`;
  const ctaText  = item.revealCtaText  ?? "Add to Draft";

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(10,8,6,0.82)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 440,
            background: "rgba(26,26,27,0.96)",
            border: "1px solid rgba(212,139,0,0.25)",
            borderRadius: 20,
            backdropFilter: "blur(20px)",
            padding: "36px 32px 28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
            boxShadow: "0 0 60px rgba(212,139,0,0.12), 0 24px 48px rgba(0,0,0,0.6)",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Ambient glow top */}
          <div style={{
            position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
            width: 280, height: 120,
            background: "radial-gradient(ellipse, rgba(212,139,0,0.20) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* PRESTIGE label */}
          <div style={{
            position: "absolute", top: 16, right: 16,
            padding: "3px 10px", borderRadius: 6,
            background: "rgba(212,139,0,0.14)",
            border: "1px solid rgba(212,139,0,0.35)",
            fontSize: "0.58rem", fontWeight: 800,
            letterSpacing: "0.14em", color: "#D48B00",
            textTransform: "uppercase",
          }}>
            Prestige
          </div>

          {/* Logo with glow ring */}
          <div style={{ position: "relative" }}>
            {/* Glow pulse ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.12, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: -12,
                borderRadius: 24,
                border: "1.5px solid rgba(212,139,0,0.50)",
                pointerEvents: "none",
              }}
            />
            <LogoOrInitials brandName={item.brandName} logoUrl={item.logoUrl} size={84} />
          </div>

          {/* Brand name */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.16em", color: "#D48B00", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              {item.brandName}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", fontWeight: 600, color: "#F0E8D4", lineHeight: 1.3 }}>
              {headline}
            </div>
          </div>

          {/* XP badge */}
          <motion.div
            animate={{ boxShadow: ["0 0 0px rgba(212,139,0,0)", "0 0 20px rgba(212,139,0,0.45)", "0 0 0px rgba(212,139,0,0)"] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{
              padding: "6px 18px", borderRadius: 40,
              background: "linear-gradient(135deg, rgba(212,139,0,0.22), rgba(212,139,0,0.08))",
              border: "1px solid rgba(212,139,0,0.45)",
              fontSize: "0.92rem", fontWeight: 800, color: "#D48B00",
              letterSpacing: "0.04em",
            }}
          >
            +{effectiveXP} XP
            {(item.prestigeMultiplier ?? 1) > 1 && (
              <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: 6 }}>
                ×{item.prestigeMultiplier?.toFixed(1)}
              </span>
            )}
          </motion.div>

          {/* Divider */}
          <div style={{ width: "100%", height: 1, background: "rgba(212,139,0,0.12)" }} />

          {/* Mentor insight */}
          <div style={{
            width: "100%", padding: "16px 18px",
            background: "rgba(212,139,0,0.05)",
            borderLeft: "2px solid rgba(212,139,0,0.35)",
            borderRadius: "0 8px 8px 0",
          }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.14em", color: "#D48B00", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
              Your Mentor Speaks
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.0rem", fontStyle: "italic", color: "rgba(240,232,212,0.85)", lineHeight: 1.6 }}>
              "{mentorInsight}"
            </div>
          </div>

          {/* Body text */}
          <div style={{ fontSize: "0.72rem", color: "rgba(240,232,212,0.55)", textAlign: "center", lineHeight: 1.6 }}>
            {body}
          </div>

          {/* CTAs */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleAddToDraft}
              style={{
                width: "100%", padding: "14px 0",
                background: "linear-gradient(135deg, #D48B00, #B87200)",
                border: "none", borderRadius: 12,
                color: "#1A1A1B", fontSize: "0.82rem", fontWeight: 800,
                letterSpacing: "0.10em", textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(212,139,0,0.35)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseOver={e => { (e.target as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
              onMouseOut={e => { (e.target as HTMLButtonElement).style.transform = ""; }}
            >
              {ctaText}
            </button>
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "12px 0",
                background: "transparent",
                border: "1px solid rgba(212,139,0,0.20)",
                borderRadius: 12,
                color: "rgba(240,232,212,0.45)", fontSize: "0.72rem",
                fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
