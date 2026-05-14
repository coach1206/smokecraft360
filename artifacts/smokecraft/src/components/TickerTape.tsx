/**
 * TickerTape — Guest-facing sponsored brand ticker with tap-to-reveal.
 *
 * A 36px ambient strip at the bottom (or top) of guest screens.
 * Tapping any item opens SpecialRevealModal — showing Mentor commentary,
 * prestige XP badge, and an "Add to Draft" CTA.
 *
 * Design:
 *   - Obsidian (#1A1A1B) background, Warm Honey Amber (#D48B00) brand text
 *   - Prestige Glow: sponsored items with pointBonus > 0 pulse amber in the strip
 *   - Smooth infinite CSS scroll at 60fps (will-change: transform, GPU composited)
 *   - Left/right fade masks so content appears to emerge from nothing
 *   - Logo → branded initials avatar when no URL provided
 *   - Auto-logs scroll-past impression on mount for each item displayed
 *   - Falls back to default NOVEE OS brand messages when no live sponsors
 *
 * Usage:
 *   <TickerTape craftType="smoke" venueId={venueId} region="US-GA" />
 */

import { useState, useEffect, useRef }                from "react";
import SpecialRevealModal, { type RevealItem }        from "./SpecialRevealModal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TickerItem extends RevealItem {
  priority:    number;
  craftTypes?: string | null;
  targetRegion?: string | null;
  isSponsored: boolean;
}

interface TickerTapeProps {
  craftType?:  string;
  venueId?:    string;
  region?:     string;   // ISO 3166-2, e.g. "US-GA"
  position?:   "top" | "bottom";
  className?:  string;
}

// ── Default messages — shown when no live sponsors ────────────────────────────

const DEFAULT_ITEMS: TickerItem[] = [
  { id: "d1", brandName: "NOVEE OS", promoText: "Welcome to the Experience Engine — powered by NOVEE Intelligence",   pointBonus: 0, isSponsored: false, priority: 0 },
  { id: "d2", brandName: "NOVEE OS", promoText: "Every draft you complete deepens your Mastery Score",                pointBonus: 0, isSponsored: false, priority: 0 },
  { id: "d3", brandName: "NOVEE OS", promoText: "Reach Sommelier tier for exclusive venue privileges",                pointBonus: 0, isSponsored: false, priority: 0 },
  { id: "d4", brandName: "NOVEE OS", promoText: "Your Mentor remembers every choice you make",                        pointBonus: 0, isSponsored: false, priority: 0 },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Impression logger ─────────────────────────────────────────────────────────

function logImpression(tickerId: string, craftType?: string, venueId?: string, region?: string) {
  if (tickerId.startsWith("d")) return; // skip default items
  fetch(`${BASE}/api/ads/impression`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tickerId, eventType: "impression", craftType, venueId, region }),
  }).catch(() => {});
}

// ── Initials avatar ───────────────────────────────────────────────────────────

function BrandAvatar({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  const initials = brandName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        style={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain", flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
      background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.30)",
      fontSize: "0.48rem", fontWeight: 800, color: "#D48B00", letterSpacing: "0.02em",
    }}>
      {initials}
    </span>
  );
}

// ── Single ticker item ────────────────────────────────────────────────────────

function TickerItemEl({
  item, onReveal,
}: { item: TickerItem; onReveal: (item: TickerItem) => void }) {
  const isPrestige = item.isSponsored && item.pointBonus > 0;

  return (
    <span
      onClick={() => onReveal(item)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "0 18px",
        cursor: item.isSponsored ? "pointer" : "default",
        position: "relative",
      }}
    >
      {/* Prestige glow behind the brand name — only on sponsored items */}
      {isPrestige && (
        <span style={{
          position: "absolute", inset: "2px 10px",
          borderRadius: 6,
          background: "radial-gradient(ellipse at center, rgba(212,139,0,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      <BrandAvatar brandName={item.brandName} logoUrl={item.logoUrl} />

      {/* Brand name */}
      <span style={{
        fontSize: "0.61rem", fontWeight: 700, letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: isPrestige ? "#E8A020" : "#D48B00",
        textShadow: isPrestige ? "0 0 12px rgba(212,139,0,0.55)" : "none",
        flexShrink: 0,
      }}>
        {item.brandName}
      </span>

      {/* Promo text */}
      <span style={{
        fontSize: "0.61rem", color: "rgba(240,232,212,0.72)",
        whiteSpace: "nowrap",
      }}>
        {item.promoText}
      </span>

      {/* Prestige +XP badge */}
      {isPrestige && (
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "1px 7px", borderRadius: 4,
          background: "rgba(212,139,0,0.16)",
          border: "1px solid rgba(212,139,0,0.38)",
          fontSize: "0.49rem", fontWeight: 800,
          letterSpacing: "0.10em", color: "#D48B00",
          textTransform: "uppercase", flexShrink: 0,
        }}>
          +{Math.round(item.pointBonus * (item.prestigeMultiplier ?? 1))} XP
        </span>
      )}

      {/* Separator */}
      <span style={{ color: "rgba(212,139,0,0.28)", fontSize: "0.55rem", flexShrink: 0 }}>
        {"\u00A0◆\u00A0"}
      </span>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TickerTape({ craftType, venueId, region, position = "bottom", className }: TickerTapeProps) {
  const [items,      setItems]      = useState<TickerItem[]>(DEFAULT_ITEMS);
  const [ready,      setReady]      = useState(false);
  const [revealItem, setRevealItem] = useState<TickerItem | null>(null);
  const loggedRef = useRef(new Set<string>());

  // Fetch live ticker items
  useEffect(() => {
    const params = new URLSearchParams();
    if (craftType) params.set("craftType", craftType);
    if (venueId)   params.set("venueId",   venueId);
    if (region)    params.set("region",    region);

    fetch(`${BASE}/api/ads/ticker?${params}`)
      .then(r => r.ok ? r.json() as Promise<{ items: TickerItem[] }> : Promise.resolve({ items: [] }))
      .then(d => {
        if (d.items.length > 0) setItems(d.items);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [craftType, venueId, region]);

  // Log one impression per unique ticker item, once
  useEffect(() => {
    if (!ready) return;
    for (const item of items) {
      if (item.isSponsored && !loggedRef.current.has(item.id)) {
        loggedRef.current.add(item.id);
        logImpression(item.id, craftType, venueId, region);
      }
    }
  }, [ready, items, craftType, venueId, region]);

  if (!ready) return null;

  // Duplicate for seamless infinite loop
  const looped = [...items, ...items];
  const scrollDuration = Math.max(28, looped.length * 6);

  return (
    <>
      <div
        className={className}
        style={{
          position: "fixed", [position]: 0, left: 0, right: 0,
          height: 36,
          background: "#1A1A1B",
          borderTop:    position === "bottom" ? "1px solid rgba(212,139,0,0.16)" : "none",
          borderBottom: position === "top"    ? "1px solid rgba(212,139,0,0.16)" : "none",
          overflow: "hidden", zIndex: 40,
          display: "flex", alignItems: "center",
        }}
      >
        {/* Fade masks */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 56, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to right, #1A1A1B, transparent)" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 56, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to left, #1A1A1B, transparent)" }} />

        <style>{`
          @keyframes ax-ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ax-ticker-track {
            display: flex; align-items: center;
            white-space: nowrap;
            animation: ax-ticker-scroll ${scrollDuration}s linear infinite;
            will-change: transform;
          }
          .ax-ticker-track:hover { animation-play-state: paused; cursor: default; }
        `}</style>

        <div className="ax-ticker-track">
          {looped.map((item, idx) => (
            <TickerItemEl
              key={`${item.id}-${idx}`}
              item={item}
              onReveal={setRevealItem}
            />
          ))}
        </div>
      </div>

      {/* Special Reveal modal — mounts in a portal-like fashion above everything */}
      {revealItem && revealItem.isSponsored && (
        <SpecialRevealModal
          item={{ ...revealItem, craftType, venueId }}
          onClose={() => setRevealItem(null)}
          onAddToDraft={item => {
            // Bubble to parent via window event for loose coupling
            window.dispatchEvent(new CustomEvent("axiom:add-to-draft", { detail: item }));
          }}
        />
      )}
    </>
  );
}
