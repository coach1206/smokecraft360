/**
 * TickerTape — Luxury ambient intelligence ribbon.
 *
 * Cinematic crawl at the bottom of guest screens. Speed reduced 65%,
 * adaptive pacing, hover/touch pause, category badges, reading safe zones.
 *
 * Usage:
 *   <TickerTape craftType="smoke" venueId={venueId} region="US-GA" />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SpecialRevealModal, { type RevealItem } from "./SpecialRevealModal";
import { useGoldenBoxStore } from "@/store/useGoldenBoxStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type TickerCategory = "cigar" | "drinks" | "kitchen" | "rewards" | "system";

interface TickerItem extends RevealItem {
  priority:      number;
  craftTypes?:   string | null;
  targetRegion?: string | null;
  isSponsored:   boolean;
  category?:     TickerCategory;
}

interface TickerTapeProps {
  craftType?: string;
  venueId?:   string;
  region?:    string;
  position?:  "top" | "bottom";
  className?: string;
}

// ── Category detection ────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<TickerCategory, string[]> = {
  cigar:   ["cigar", "leaf", "humidor", "smoke", "blend", "vitola", "tobacco", "lounge", "pairing", "wrapper", "aged"],
  drinks:  ["spirit", "pour", "cocktail", "whiskey", "rum", "drink", "beverage", "scotch", "bourbon", "cognac", "wine", "bar"],
  kitchen: ["kitchen", "food", "dish", "chef", "menu", "bisque", "truffle", "dining", "tasting", "plate", "serving"],
  rewards: ["reward", "xp", "points", "bonus", "member", "unlock", "prestige", "tier", "mastery", "connoisseur", "privilege", "exclusive"],
  system:  [],
};

const CATEGORY_STYLES: Record<TickerCategory, { label: string; color: string; bg: string; glow: string }> = {
  cigar:   { label: "CIGAR",   color: "#D4AF37",            bg: "rgba(212,175,55,0.14)",   glow: "rgba(212,175,55,0.30)"  },
  drinks:  { label: "DRINKS",  color: "#D48B00",            bg: "rgba(212,139,0,0.14)",    glow: "rgba(212,139,0,0.28)"   },
  kitchen: { label: "KITCHEN", color: "#C07840",            bg: "rgba(192,120,64,0.14)",   glow: "rgba(192,120,64,0.26)"  },
  rewards: { label: "REWARDS", color: "#9B6DC5",            bg: "rgba(155,109,197,0.14)",  glow: "rgba(155,109,197,0.30)" },
  system:  { label: "SYSTEM",  color: "rgba(26,188,156,0.9)", bg: "rgba(26,188,156,0.10)", glow: "rgba(26,188,156,0.22)"  },
};

function detectCategory(text: string, isSponsored: boolean): TickerCategory {
  if (isSponsored) return "system";
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [TickerCategory, string[]][]) {
    if (cat === "system") continue;
    if (kws.some(k => lower.includes(k))) return cat;
  }
  return "system";
}

// ── Priority ordering ─────────────────────────────────────────────────────────
// 1 = highest priority (system alerts), 5 = lowest (ambient)
const CATEGORY_PRIORITY: Record<TickerCategory, number> = {
  system:  1,
  rewards: 2,
  cigar:   3,
  drinks:  3,
  kitchen: 4,
};

// ── Default messages ──────────────────────────────────────────────────────────

const DEFAULT_ITEMS: TickerItem[] = [
  { id: "d1", brandName: "NOVEE OS",   promoText: "Welcome to the Experience Engine — powered by NOVEE Intelligence",  pointBonus: 0, isSponsored: false, priority: 5, category: "system"  },
  { id: "d2", brandName: "SMOKECRAFT", promoText: "Aged leaf profiles now loading — your Mentor awaits your first selection", pointBonus: 0, isSponsored: false, priority: 5, category: "cigar"   },
  { id: "d3", brandName: "SMOKECRAFT", promoText: "Connoisseur members unlock private pairing events tonight",          pointBonus: 0, isSponsored: false, priority: 4, category: "rewards" },
  { id: "d4", brandName: "NOVEE OS",   promoText: "Reach Sommelier tier for exclusive venue privileges",                pointBonus: 0, isSponsored: false, priority: 4, category: "rewards" },
  { id: "d5", brandName: "SMOKECRAFT", promoText: "Your Mentor remembers every choice you make — each draft deepens Mastery", pointBonus: 0, isSponsored: false, priority: 5, category: "cigar" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Impression logger ─────────────────────────────────────────────────────────

function logImpression(tickerId: string, craftType?: string, venueId?: string, region?: string) {
  if (tickerId.startsWith("d")) return;
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
        style={{ width: 28, height: 28, borderRadius: 5, objectFit: "contain", flexShrink: 0 }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 5, flexShrink: 0,
      background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)",
      fontSize: "0.62rem", fontWeight: 800, color: "#D48B00", letterSpacing: "0.02em",
    }}>
      {initials}
    </span>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: TickerCategory }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 4, flexShrink: 0,
      background: s.bg, border: `1px solid ${s.color}44`,
      fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em",
      color: s.color, textTransform: "uppercase" as const,
    }}>
      {s.label}
    </span>
  );
}

// ── Single ticker item ────────────────────────────────────────────────────────

function TickerItemEl({ item, onReveal }: { item: TickerItem; onReveal: (item: TickerItem) => void }) {
  const cat = item.category ?? detectCategory(item.promoText, item.isSponsored);
  const style = CATEGORY_STYLES[cat];
  const isPrestige = item.isSponsored && item.pointBonus > 0;

  return (
    <span
      onClick={() => item.isSponsored && onReveal(item)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        paddingLeft: 24, paddingRight: 140,
        cursor: item.isSponsored ? "pointer" : "default",
        position: "relative",
      }}
    >
      {isPrestige && (
        <span style={{
          position: "absolute", inset: "2px 80px 2px 12px",
          borderRadius: 6,
          background: `radial-gradient(ellipse at center, ${style.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}

      <CategoryBadge category={cat} />
      <BrandAvatar brandName={item.brandName} logoUrl={item.logoUrl} />

      <span style={{
        fontSize: "0.94rem", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: isPrestige ? style.color : "rgba(212,175,55,0.85)",
        textShadow: isPrestige ? `0 0 14px ${style.glow}` : "none",
        flexShrink: 0,
      }}>
        {item.brandName}
      </span>

      <span style={{
        fontSize: "0.93rem", color: "rgba(240,232,212,0.86)",
        whiteSpace: "nowrap" as const,
      }}>
        {item.promoText}
      </span>

      {isPrestige && (
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "2px 9px", borderRadius: 4,
          background: "rgba(212,139,0,0.16)", border: "1px solid rgba(212,139,0,0.38)",
          fontSize: "0.74rem", fontWeight: 800, letterSpacing: "0.10em",
          color: "#D48B00", textTransform: "uppercase" as const, flexShrink: 0,
        }}>
          +{Math.round(item.pointBonus * (item.prestigeMultiplier ?? 1))} XP
        </span>
      )}

      <span style={{ color: "rgba(212,175,55,0.22)", fontSize: "0.80rem", flexShrink: 0, paddingLeft: 20 }}>
        {"\u00A0◆\u00A0"}
      </span>
    </span>
  );
}

// ── Adaptive duration calculator ──────────────────────────────────────────────

function calcDuration(items: TickerItem[], speedMultiplier: number): number {
  const loopCount = items.length * 2;
  const avgLen = items.reduce((acc, i) => acc + i.promoText.length, 0) / Math.max(items.length, 1);
  const hasRewards = items.some(i => (i.category ?? detectCategory(i.promoText, i.isSponsored)) === "rewards");
  const lengthFactor = Math.min(1.6, Math.max(1.0, avgLen / 45));
  const rewardFactor = hasRewards ? 1.15 : 1.0;
  const base = Math.max(90, loopCount * 22);
  return Math.round((base * lengthFactor * rewardFactor) / speedMultiplier);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TickerTape({ craftType, venueId, region, position = "bottom", className }: TickerTapeProps) {
  const [items,      setItems]      = useState<TickerItem[]>(DEFAULT_ITEMS);
  const [ready,      setReady]      = useState(false);
  const [revealItem, setRevealItem] = useState<TickerItem | null>(null);
  const [isPaused,   setIsPaused]   = useState(false);
  const loggedRef  = useRef(new Set<string>());
  const trackRef   = useRef<HTMLDivElement>(null);

  const { tickerSpeed, tickerPaused, tickerTestMessage, tickerTestCategory } = useGoldenBoxStore();

  const effectivePaused = isPaused || tickerPaused;

  // ── Fetch live ticker items ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (craftType) params.set("craftType", craftType);
    if (venueId)   params.set("venueId",   venueId);
    if (region)    params.set("region",    region);

    fetch(`${BASE}/api/ads/ticker?${params}`)
      .then(r => r.ok ? r.json() as Promise<{ items: TickerItem[] }> : Promise.resolve({ items: [] }))
      .then(d => {
        if (d.items.length > 0) {
          const tagged = d.items.map(it => ({
            ...it,
            category: it.category ?? detectCategory(it.promoText, it.isSponsored),
          }));
          const sorted = [...tagged].sort(
            (a, b) => CATEGORY_PRIORITY[a.category ?? "system"] - CATEGORY_PRIORITY[b.category ?? "system"],
          );
          setItems(sorted);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [craftType, venueId, region]);

  // ── Inject dev test message ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tickerTestMessage) return;
    const cat = (tickerTestCategory ?? "system") as TickerCategory;
    const testItem: TickerItem = {
      id: "dev-test", brandName: "DEV TEST", promoText: tickerTestMessage,
      pointBonus: 0, isSponsored: false, priority: 1, category: cat,
    };
    setItems(prev => [testItem, ...prev.filter(i => i.id !== "dev-test")]);
  }, [tickerTestMessage, tickerTestCategory]);

  // ── Impression logging ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    for (const item of items) {
      if (item.isSponsored && !loggedRef.current.has(item.id)) {
        loggedRef.current.add(item.id);
        logImpression(item.id, craftType, venueId, region);
      }
    }
  }, [ready, items, craftType, venueId, region]);

  // ── Reading safe zones — micro-pause every 9 seconds ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!effectivePaused && trackRef.current) {
        trackRef.current.style.animationPlayState = "paused";
        setTimeout(() => {
          if (trackRef.current) trackRef.current.style.animationPlayState = "running";
        }, 550);
      }
    }, 9200);
    return () => clearInterval(id);
  }, [effectivePaused]);

  // ── Touch toggle handler ────────────────────────────────────────────────────
  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsPaused(p => !p);
  }, []);

  if (!ready) return null;

  const looped = [...items, ...items];
  const duration = calcDuration(items, tickerSpeed);
  const animPlayState = effectivePaused ? "paused" : "running";

  return (
    <>
      <div
        className={className}
        style={{
          position: "fixed", [position]: 0, left: 0, right: 0,
          height: 54,
          background: "#0E0C09",
          borderTop:    position === "bottom" ? "1px solid rgba(212,175,55,0.14)" : "none",
          borderBottom: position === "top"    ? "1px solid rgba(212,175,55,0.14)" : "none",
          overflow: "hidden", zIndex: 40,
          display: "flex", alignItems: "center",
          userSelect: "none",
        }}
        onTouchStart={handleTouch}
      >
        {/* Left fade */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 72, zIndex: 2,
          pointerEvents: "none",
          background: "linear-gradient(to right, #0E0C09 0%, transparent 100%)",
        }} />
        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 72, zIndex: 2,
          pointerEvents: "none",
          background: "linear-gradient(to left, #0E0C09 0%, transparent 100%)",
        }} />

        {/* PAUSED indicator */}
        {effectivePaused && (
          <div style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, display: "flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 6,
            background: "rgba(14,12,9,0.92)", border: "1px solid rgba(212,139,0,0.35)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D48B00" }} />
            <span style={{
              fontFamily: "'JetBrains Mono','Courier New',monospace",
              fontSize: "0.68rem", letterSpacing: "0.28em", color: "#D48B00", fontWeight: 700,
            }}>
              PAUSED
            </span>
          </div>
        )}

        <style>{`
          @keyframes ax-ticker-scroll {
            0%   { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .ax-ticker-track {
            display: flex;
            align-items: center;
            white-space: nowrap;
            animation: ax-ticker-scroll ${duration}s linear infinite;
            animation-play-state: ${animPlayState};
            will-change: transform;
            backface-visibility: hidden;
          }
          .ax-ticker-track:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="ax-ticker-track" ref={trackRef}>
          {looped.map((item, idx) => (
            <TickerItemEl
              key={`${item.id}-${idx}`}
              item={item}
              onReveal={setRevealItem}
            />
          ))}
        </div>
      </div>

      {revealItem && revealItem.isSponsored && (
        <SpecialRevealModal
          item={{ ...revealItem, craftType, venueId }}
          onClose={() => setRevealItem(null)}
          onAddToDraft={item => {
            window.dispatchEvent(new CustomEvent("axiom:add-to-draft", { detail: item }));
          }}
        />
      )}
    </>
  );
}
