/**
 * TickerTape — Guest-facing sponsored brand ticker.
 *
 * A thin, ambient strip that scrolls sponsor messages and limited-time promos
 * across the bottom (or top) of guest-facing screens.
 *
 * Design:
 *   - Obsidian (#1A1A1B) background with Warm Honey Amber (#D48B00) accents
 *   - Smooth infinite CSS scroll — no JS animation loop needed
 *   - Logo → initials fallback avatar when no logo URL provided
 *   - "PRESTIGE" badge on sponsored items with pointBonus > 0
 *   - Falls back to default Axiom brand messages when no sponsors active
 *
 * Usage:
 *   <TickerTape craftType="smoke" venueId={venueId} position="bottom" />
 */

import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TickerItem {
  id:          string;
  brandName:   string;
  logoUrl?:    string | null;
  promoText:   string;
  promoLink?:  string | null;
  pointBonus:  number;
  isSponsored: boolean;
}

interface TickerTapeProps {
  craftType?:  string;
  venueId?:    string;
  position?:   "top" | "bottom";
  className?:  string;
}

// ── Default messages shown when no live sponsors ──────────────────────────────

const DEFAULT_ITEMS: TickerItem[] = [
  { id: "d1", brandName: "Axiom OS", promoText: "Welcome to the Experience Engine — powered by Axiom OS", pointBonus: 0, isSponsored: false },
  { id: "d2", brandName: "Axiom OS", promoText: "Every draft you complete deepens your Mastery Score", pointBonus: 0, isSponsored: false },
  { id: "d3", brandName: "Axiom OS", promoText: "Reach Sommelier tier for exclusive venue privileges", pointBonus: 0, isSponsored: false },
  { id: "d4", brandName: "Axiom OS", promoText: "Your Mentor remembers every choice you make", pointBonus: 0, isSponsored: false },
];

// ── Separator ─────────────────────────────────────────────────────────────────

const SEPARATOR = "\u00A0\u00A0\u00A0◆\u00A0\u00A0\u00A0";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Component ─────────────────────────────────────────────────────────────────

export default function TickerTape({ craftType, venueId, position = "bottom", className }: TickerTapeProps) {
  const [items, setItems]   = useState<TickerItem[]>(DEFAULT_ITEMS);
  const [ready, setReady]   = useState(false);
  const trackRef            = useRef<HTMLDivElement>(null);

  // Fetch ticker items
  useEffect(() => {
    const params = new URLSearchParams();
    if (craftType) params.set("craftType", craftType);
    if (venueId)   params.set("venueId",   venueId);

    fetch(`${BASE}/api/ads/ticker?${params}`)
      .then(r => r.ok ? r.json() as Promise<{ items: TickerItem[] }> : Promise.resolve({ items: [] }))
      .then(d => {
        if (d.items.length > 0) setItems(d.items);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [craftType, venueId]);

  if (!ready) return null;

  // Duplicate items for seamless loop
  const looped = [...items, ...items];

  const height = 36;

  return (
    <div
      className={className}
      style={{
        position:    "fixed",
        [position]:  0,
        left:        0,
        right:       0,
        height,
        background:  "#1A1A1B",
        borderTop:   position === "bottom" ? "1px solid rgba(212,139,0,0.18)" : "none",
        borderBottom:position === "top"    ? "1px solid rgba(212,139,0,0.18)" : "none",
        overflow:    "hidden",
        zIndex:      40,
        display:     "flex",
        alignItems:  "center",
      }}
    >
      {/* Fade masks */}
      <div style={{
        position:   "absolute", left: 0, top: 0, bottom: 0, width: 60, zIndex: 2,
        background: "linear-gradient(to right, #1A1A1B, transparent)",
        pointerEvents: "none",
      }} />
      <div style={{
        position:   "absolute", right: 0, top: 0, bottom: 0, width: 60, zIndex: 2,
        background: "linear-gradient(to left, #1A1A1B, transparent)",
        pointerEvents: "none",
      }} />

      {/* Scrolling track — infinite CSS animation */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display:         flex;
          align-items:     center;
          white-space:     nowrap;
          animation:       ticker-scroll ${Math.max(30, looped.length * 8)}s linear infinite;
          will-change:     transform;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      <div ref={trackRef} className="ticker-track">
        {looped.map((item, idx) => (
          <TickerItem key={`${item.id}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}

// ── Single item ───────────────────────────────────────────────────────────────

function TickerItem({ item }: { item: TickerItem }) {
  const initials = item.brandName
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");

  const handleClick = () => {
    if (item.promoLink) {
      // Internal navigation — use the app's router if path starts with /
      window.location.href = item.promoLink;
    }
  };

  return (
    <span
      onClick={item.promoLink ? handleClick : undefined}
      style={{
        display:    "inline-flex",
        alignItems: "center",
        gap:        8,
        padding:    "0 20px",
        cursor:     item.promoLink ? "pointer" : "default",
        transition: "opacity 0.15s",
      }}
      title={item.promoLink ? `Visit ${item.brandName}` : undefined}
    >
      {/* Logo or initials avatar */}
      {item.logoUrl ? (
        <img
          src={item.logoUrl}
          alt={item.brandName}
          style={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          20,
          height:         20,
          borderRadius:   4,
          background:     "rgba(212,139,0,0.15)",
          border:         "1px solid rgba(212,139,0,0.30)",
          fontSize:       "0.5rem",
          fontWeight:     800,
          color:          "#D48B00",
          letterSpacing:  "0.02em",
          flexShrink:     0,
        }}>
          {initials}
        </span>
      )}

      {/* Brand name */}
      <span style={{
        fontSize:      "0.62rem",
        fontWeight:    700,
        color:         "#D48B00",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        {item.brandName}
      </span>

      {/* Promo text */}
      <span style={{
        fontSize:  "0.62rem",
        color:     "rgba(240,232,212,0.75)",
        fontStyle: "normal",
      }}>
        {item.promoText}
      </span>

      {/* Prestige badge — shown when sponsor has a point bonus */}
      {item.isSponsored && item.pointBonus > 0 && (
        <span style={{
          display:        "inline-flex",
          alignItems:     "center",
          padding:        "1px 6px",
          background:     "rgba(212,139,0,0.14)",
          border:         "1px solid rgba(212,139,0,0.35)",
          borderRadius:   4,
          fontSize:       "0.5rem",
          fontWeight:     800,
          letterSpacing:  "0.10em",
          color:          "#D48B00",
          textTransform:  "uppercase",
        }}>
          +{item.pointBonus} pts
        </span>
      )}

      {/* Separator */}
      <span style={{ color: "rgba(212,139,0,0.30)", fontSize: "0.6rem" }}>
        {"\u00A0◆\u00A0"}
      </span>
    </span>
  );
}
