/**
 * /designer — Craft Visual Engine
 *
 * Real-time luxury product configurator for Axiom OS.
 * Renders a CSS 3D layered cigar box (+ drink / beer / vape alternatives)
 * that updates instantly as the user configures wood, trim, interior, and brand.
 *
 * On "Reveal": lid animates open with spring physics + sound.
 * Save → POST /api/craft/visual-build → designDrafts table.
 * Export → html2canvas PNG download (print-quality 2× scale).
 */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Save, Sparkles, Check } from "lucide-react";
import { playSound } from "@/utils/sounds";

// ── Configuration palettes ────────────────────────────────────────────────────

const WOODS = {
  cedar: {
    id: "cedar", name: "Cedar",
    base:  "linear-gradient(160deg, #c8864a 0%, #a46030 50%, #8a4820 100%)",
    grain: "repeating-linear-gradient(85deg, transparent 0px, transparent 9px, rgba(0,0,0,0.07) 9px, rgba(0,0,0,0.07) 10px)",
    highlight: "#d8966a",
  },
  mahogany: {
    id: "mahogany", name: "Mahogany",
    base:  "linear-gradient(160deg, #9a3828 0%, #7a2818 50%, #601808 100%)",
    grain: "repeating-linear-gradient(83deg, transparent 0px, transparent 7px, rgba(26,26,27,0.03) 7px, rgba(26,26,27,0.03) 8px)",
    highlight: "#c05840",
  },
  walnut: {
    id: "walnut", name: "Walnut",
    base:  "linear-gradient(160deg, #7a5028 0%, #5a3818 50%, #401e08 100%)",
    grain: "repeating-linear-gradient(87deg, transparent 0px, transparent 11px, rgba(0,0,0,0.09) 11px, rgba(0,0,0,0.09) 12px)",
    highlight: "#9a7040",
  },
  ebony: {
    id: "ebony", name: "Ebony",
    base:  "linear-gradient(160deg, #2c1e14 0%, #1e1410 50%, #120e0a 100%)",
    grain: "repeating-linear-gradient(88deg, transparent 0px, transparent 14px, rgba(26,26,27,0.06) 14px, rgba(26,26,27,0.06) 15px)",
    highlight: "#4a3828",
  },
} as const;

const TRIMS = {
  gold: {
    id: "gold", name: "Gold",
    color: "#D48B00", light: "#f0d060", shadow: "#8a6f1a",
    glow:  "rgba(212,139,0,0.45)",
  },
  platinum: {
    id: "platinum", name: "Platinum",
    color: "#c0c0c0", light: "#e8e8e8", shadow: "#808080",
    glow:  "rgba(192,192,192,0.45)",
  },
} as const;

const INTERIORS = {
  satin: {
    id: "satin", name: "Cream Satin",
    bg: "linear-gradient(180deg, #f5f0e8 0%, #e8ddd0 100%)",
    cigarShadow: "rgba(100,60,20,0.4)",
  },
  velvet: {
    id: "velvet", name: "Deep Velvet",
    bg: "linear-gradient(180deg, #2a0a3a 0%, #1a0528 100%)",
    cigarShadow: "rgba(26,26,27,0.26)",
  },
  linen: {
    id: "linen", name: "Natural Linen",
    bg: "linear-gradient(180deg, #d4cbbf 0%, #c2b9aa 100%)",
    cigarShadow: "rgba(80,50,20,0.35)",
  },
} as const;

type WoodKey     = keyof typeof WOODS;
type TrimKey     = keyof typeof TRIMS;
type InteriorKey = keyof typeof INTERIORS;
type CraftKey    = "smoke" | "pour" | "brew" | "vape";

const CRAFT_TYPES: { id: CraftKey; label: string; icon: string }[] = [
  { id: "smoke", label: "SmokeCraft", icon: "🚬" },
  { id: "pour",  label: "PourCraft",  icon: "🥃" },
  { id: "brew",  label: "BrewCraft",  icon: "🍺" },
  { id: "vape",  label: "VapeCraft",  icon: "💨" },
];

// ── Decorative trim corner brackets ──────────────────────────────────────────

function TrimCorners({ color, light }: { color: string; light: string }) {
  const size = 22;
  const corners = [
    { style: { top: 8, left: 8 },                  rotate: "0deg"    },
    { style: { top: 8, right: 8 },                 rotate: "90deg"   },
    { style: { bottom: 8, right: 8 },              rotate: "180deg"  },
    { style: { bottom: 8, left: 8 },               rotate: "270deg"  },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div key={i} style={{ position: "absolute", ...c.style, zIndex: 2, pointerEvents: "none" }}>
          <svg width={size} height={size} viewBox="0 0 22 22" style={{ transform: `rotate(${c.rotate})`, display: "block" }}>
            <path d="M2 20 L2 2 L20 2" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M2 20 L2 2 L20 2" stroke={light} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      ))}
    </>
  );
}

// ── Cigar Box Visual (primary SmokeCraft product) ─────────────────────────────

function CigarBoxVisual({
  woodKey, trimKey, interiorKey, brand, isOpen,
}: {
  woodKey: WoodKey; trimKey: TrimKey; interiorKey: InteriorKey;
  brand: string; isOpen: boolean;
}) {
  const wood     = WOODS[woodKey];
  const trim     = TRIMS[trimKey];
  const interior = INTERIORS[interiorKey];

  return (
    <div style={{ width: "100%", perspective: "720px", perspectiveOrigin: "50% 35%" }}>
      <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", height: 240 }}>

        {/* ── Box body (always visible, shows interior when lid opens) ── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 190,
          background: wood.base, backgroundImage: `${wood.grain}, ${wood.base}`,
          border: `2.5px solid ${trim.color}`,
          borderTop: "none",
          borderRadius: "0 0 14px 14px",
          overflow: "hidden",
          boxShadow: `0 12px 40px rgba(26,26,27,0.22), inset 0 1px 0 ${wood.highlight}40`,
        }}>
          {/* Interior padding + cigar rows */}
          <div style={{
            position: "absolute", inset: "6px 6px 0",
            background: interior.bg,
            borderRadius: "0 0 10px 10px",
            padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 8, justifyContent: "center",
          }}>
            {[0, 1, 2].map(row => (
              <div key={row} style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                {Array.from({ length: 8 }).map((_, col) => (
                  <motion.div
                    key={col}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 6 }}
                    transition={{ delay: isOpen ? 0.6 + row * 0.07 + col * 0.02 : 0, duration: 0.3 }}
                    style={{
                      width: 42, height: 13, borderRadius: 6.5,
                      background: "linear-gradient(180deg, #c8946a 0%, #9a6040 50%, #6a3e20 100%)",
                      boxShadow: `0 2px 5px ${interior.cigarShadow}, inset 0 1px 0 rgba(26,26,27,0.20)`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Wood bottom strip (exterior bottom visible beneath interior) */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 14,
            backgroundImage: `${wood.grain}, ${wood.base}`,
          }} />
        </div>

        {/* ── Lid (rotates open on reveal) ── */}
        <motion.div
          animate={{ rotateX: isOpen ? -118 : 0 }}
          transition={{
            type: "spring",
            stiffness: isOpen ? 90 : 160,
            damping: 16,
            delay: isOpen ? 0.28 : 0,
          }}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: 210,
            transformOrigin: "top center",
            backgroundImage: `${wood.grain}, ${wood.base}`,
            border: `2.5px solid ${trim.color}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: `0 8px 32px rgba(26,26,27,0.18), inset 0 1px 0 ${wood.highlight}60`,
            zIndex: isOpen ? 0 : 12,
          }}
        >
          {/* Inner frame / recess */}
          <div style={{
            position: "absolute", inset: 14,
            border: `1px solid ${trim.color}55`,
            borderRadius: 6,
            pointerEvents: "none",
          }} />

          {/* Brand engraving — centered on lid */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <div style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: 20, fontWeight: 800,
              letterSpacing: "0.32em", textTransform: "uppercase",
              color: trim.light,
              textShadow: `0 -1px 0 rgba(26,26,27,0.26), 0 1px 3px ${trim.light}50, 0 0 12px ${trim.glow}`,
              maxWidth: "75%", textAlign: "center", wordBreak: "break-word",
            }}>
              {brand || "MY BRAND"}
            </div>
            <div style={{
              width: 72, height: 1,
              background: `linear-gradient(90deg, transparent, ${trim.light}90, transparent)`,
            }} />
            <div style={{
              fontSize: 8, letterSpacing: "0.44em", textTransform: "uppercase",
              color: `${trim.light}70`, fontWeight: 700,
            }}>
              SIGNATURE EDITION
            </div>
          </div>

          {/* Corner brackets */}
          <TrimCorners color={trim.color} light={trim.light} />

          {/* Hinge indicators at top */}
          {[30, 50, 70].map(pct => (
            <div key={pct} style={{
              position: "absolute", top: 0, left: `${pct}%`, transform: "translateX(-50%)",
              width: 18, height: 8,
              background: trim.color,
              borderRadius: "0 0 4px 4px",
              boxShadow: `0 2px 4px rgba(26,26,27,0.10)`,
            }} />
          ))}
        </motion.div>

        {/* ── Floor shadow ── */}
        <div style={{
          position: "absolute", bottom: -18, left: "8%", right: "8%", height: 28,
          background: "rgba(26,26,27,0.10)",
          borderRadius: "50%",
          filter: "blur(14px)",
          zIndex: -1,
        }} />

        {/* ── Reveal glow ── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: -30, zIndex: -1,
                background: `radial-gradient(ellipse at 50% 60%, ${trim.glow}, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Simplified alternate-craft visuals ────────────────────────────────────────

function PourCraftVisual({ trimKey, brand, isOpen }: { trimKey: TrimKey; brand: string; isOpen: boolean }) {
  const trim = TRIMS[trimKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
      <svg viewBox="0 0 200 280" width={200} height={280}>
        <defs>
          <linearGradient id="glass-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(26,26,27,0.10)" />
            <stop offset="40%"  stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(26,26,27,0.08)" />
          </linearGradient>
          <linearGradient id="whisky-g" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c06020" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8a3808" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {/* Rocks glass */}
        <path d="M40 60 L30 240 L170 240 L160 60 Z" fill="url(#glass-g)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        {/* Whisky liquid */}
        <motion.path
          d="M43 130 L35 240 L165 240 L157 130 Z"
          fill="url(#whisky-g)"
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        {/* Ice cube */}
        <motion.rect x="75" y="180" width="50" height="40" rx="4" fill="rgba(200,240,255,0.65)"
          initial={{ opacity: 0 }} animate={{ opacity: isOpen ? 1 : 0 }} transition={{ delay: 0.5 }} />
        {/* Brand */}
        <text x="100" y="42" textAnchor="middle" fontSize="11" fill={trim.light}
          fontWeight="bold" letterSpacing="4" style={{ fontFamily: "Georgia, serif" }}>
          {(brand || "MY BRAND").slice(0, 12).toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

function BrewCraftVisual({ trimKey, brand, isOpen }: { trimKey: TrimKey; brand: string; isOpen: boolean }) {
  const trim = TRIMS[trimKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
      <svg viewBox="0 0 200 300" width={200} height={300}>
        <defs>
          <linearGradient id="beer-g" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8a020" />
            <stop offset="100%" stopColor="#b86010" />
          </linearGradient>
        </defs>
        {/* Glass body */}
        <path d="M55 50 L45 260 L155 260 L145 50 Z" fill="rgba(26,26,27,0.10)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        {/* Beer */}
        <motion.path d="M58 120 L48 260 L152 260 L142 120 Z" fill="url(#beer-g)" opacity="0.9"
          initial={{ opacity: 0 }} animate={{ opacity: isOpen ? 0.9 : 0 }} transition={{ duration: 0.7, delay: 0.25 }} />
        {/* Foam */}
        <motion.ellipse cx="100" cy="118" rx="42" ry="14" fill="rgba(255,252,240,0.95)"
          initial={{ opacity: 0 }} animate={{ opacity: isOpen ? 1 : 0 }} transition={{ delay: 0.55 }} />
        <text x="100" y="35" textAnchor="middle" fontSize="11" fill={trim.light}
          fontWeight="bold" letterSpacing="4" style={{ fontFamily: "Georgia, serif" }}>
          {(brand || "MY BRAND").slice(0, 12).toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

// ── Option picker button ──────────────────────────────────────────────────────

function PickerButton({
  active, onClick, color, children,
}: {
  active: boolean; onClick: () => void; color?: string; children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
        border: active ? `1.5px solid ${color ?? "#D48B00"}` : "1.5px solid rgba(255,255,255,0.1)",
        background: active ? `${color ?? "#D48B00"}14` : "rgba(26,26,27,0.05)",
        color: "#1A1A1B", fontSize: 12, fontWeight: active ? 700 : 500,
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {active && <Check size={11} color={color ?? "#D48B00"} />}
      {children}
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DesignerPage() {
  const [, navigate]    = useLocation();
  const [craft,    setCraft   ] = useState<CraftKey>("smoke");
  const [wood,     setWood    ] = useState<WoodKey>("cedar");
  const [trim,     setTrim    ] = useState<TrimKey>("gold");
  const [interior, setInterior] = useState<InteriorKey>("satin");
  const [brand,    setBrand   ] = useState("MY BRAND");
  const [isOpen,   setIsOpen  ] = useState(false);
  const [saved,    setSaved   ] = useState(false);
  const [saving,   setSaving  ] = useState(false);
  const [exporting,setExporting] = useState(false);
  const visualRef = useRef<HTMLDivElement>(null);
  const accent    = TRIMS[trim].color;

  const handleReveal = useCallback(() => {
    setIsOpen(true);
    playSound("success");
  }, []);

  const handleReset = useCallback(() => {
    setIsOpen(false);
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/craft/visual-build", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ craft, wood, trim, interior, brand }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setSaving(false);
    }
  }, [craft, wood, trim, interior, brand]);

  const handleExport = useCallback(async () => {
    if (!visualRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(visualRef.current, {
        backgroundColor: "#0d0906",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link      = document.createElement("a");
      link.download   = `${(brand || "signature").replace(/\s+/g, "-").toLowerCase()}-craft.png`;
      link.href       = canvas.toDataURL("image/png");
      link.click();
      playSound("swoosh");
    } finally {
      setExporting(false);
    }
  }, [brand]);

  // Reset build when core config changes (so re-reveal works)
  // <T,> trailing comma prevents TSX from parsing <T> as a JSX element
  const configChange = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setIsOpen(false);
    setSaved(false);
  }, []);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(ellipse at 30% 20%, #EFEBE0 0%, #F5F2ED 60%, #050402 100%)",
      color: "#1A1A1B",
      fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "18px 24px",
        borderBottom: "1px solid rgba(26,26,27,0.08)",
        flexShrink: 0,
      }}>
        <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/dashboard")}
          style={{
            background: "rgba(26,26,27,0.08)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(26,26,27,0.78)", flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>

        <div>
          <h1 style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: 20, fontWeight: 700, color: "#1A1A1B", margin: 0,
          }}>
            Craft Visual Engine
          </h1>
          <p style={{ fontSize: 10, color: "rgba(26,26,27,0.40)", margin: 0, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Signature Product Designer
          </p>
        </div>

        {/* Craft type selector */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {CRAFT_TYPES.map(c => (
            <motion.button key={c.id} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setCraft(c.id); setIsOpen(false); }}
              style={{
                padding: "7px 12px", borderRadius: 10, cursor: "pointer",
                border: craft === c.id ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.1)",
                background: craft === c.id ? `${accent}14` : "rgba(26,26,27,0.05)",
                fontSize: 11, fontWeight: 600, color: "rgba(26,26,27,0.82)",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>{c.icon}</span>
              <span style={{ display: "none" }}>{c.label}</span>
            </motion.button>
          ))}
        </div>
      </header>

      {/* ── Main content: two-column ── */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: 0,
        overflow: "hidden",
      }}>
        {/* ── Left panel: controls ── */}
        <div style={{
          padding: "28px 24px",
          borderRight: "1px solid rgba(26,26,27,0.08)",
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 28,
        }}>

          {/* Brand name */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(26,26,27,0.44)", fontWeight: 700, display: "block", marginBottom: 10 }}>
              Brand Engraving
            </label>
            <input
              value={brand}
              maxLength={20}
              onChange={e => { setBrand(e.target.value.toUpperCase()); setIsOpen(false); }}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(26,26,27,0.07)",
                border: `1.5px solid ${accent}50`,
                borderRadius: 10, padding: "11px 14px",
                color: accent, fontSize: 15, fontWeight: 800,
                letterSpacing: "0.28em", textTransform: "uppercase",
                outline: "none", fontFamily: "var(--app-font-serif, Georgia, serif)",
              }}
            />
            <p style={{ fontSize: 10, color: "rgba(26,26,27,0.30)", marginTop: 6 }}>
              {20 - brand.length} chars remaining
            </p>
          </div>

          {/* Wood type */}
          {craft === "smoke" && (
            <div>
              <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(26,26,27,0.44)", fontWeight: 700, display: "block", marginBottom: 10 }}>
                Wood
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.values(WOODS).map(w => (
                  <motion.button key={w.id} type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => configChange<WoodKey>(setWood)(w.id as WoodKey)}
                    style={{
                      padding: "10px 10px", borderRadius: 10, cursor: "pointer",
                      border: wood === w.id ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.1)",
                      background: wood === w.id ? `${accent}14` : "rgba(26,26,27,0.05)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      backgroundImage: `${w.grain}, ${w.base}`,
                      border: "1px solid rgba(26,26,27,0.06)",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: wood === w.id ? 700 : 500, color: "#1A1A1B" }}>{w.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Trim */}
          <div>
            <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(26,26,27,0.44)", fontWeight: 700, display: "block", marginBottom: 10 }}>
              Trim
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.values(TRIMS).map(t => (
                <PickerButton key={t.id} active={trim === t.id} color={t.color}
                  onClick={() => configChange<TrimKey>(setTrim)(t.id as TrimKey)}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                  {t.name}
                </PickerButton>
              ))}
            </div>
          </div>

          {/* Interior (smoke only) */}
          {craft === "smoke" && (
            <div>
              <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(26,26,27,0.44)", fontWeight: 700, display: "block", marginBottom: 10 }}>
                Interior
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {Object.values(INTERIORS).map(int => (
                  <PickerButton key={int.id} active={interior === int.id} color={accent}
                    onClick={() => configChange<InteriorKey>(setInterior)(int.id as InteriorKey)}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      background: int.bg, border: "1px solid rgba(255,255,255,0.2)",
                    }} />
                    {int.name}
                  </PickerButton>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {!isOpen ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReveal}
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${TRIMS[trim].shadow})`,
                  color: "#F5F2ED", border: "none",
                  padding: "15px 20px", borderRadius: 12,
                  fontSize: 12, fontWeight: 800,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: `0 6px 28px ${TRIMS[trim].glow}`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Sparkles size={15} /> Reveal My Brand
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                style={{
                  background: "rgba(26,26,27,0.09)",
                  color: "rgba(26,26,27,0.68)",
                  border: "1px solid rgba(26,26,27,0.16)",
                  padding: "13px 20px", borderRadius: 12,
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                ↺ Redesign
              </motion.button>
            )}

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  key="post-reveal"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", gap: 8 }}
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1,
                      background: saved ? "rgba(52,211,153,0.12)" : `${accent}18`,
                      color: saved ? "#34d399" : accent,
                      border: `1.5px solid ${saved ? "rgba(52,211,153,0.4)" : `${accent}50`}`,
                      padding: "12px 8px", borderRadius: 10,
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      cursor: saving ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExport}
                    disabled={exporting}
                    style={{
                      flex: 1,
                      background: "rgba(26,26,27,0.07)",
                      color: "rgba(26,26,27,0.68)",
                      border: "1.5px solid rgba(26,26,27,0.14)",
                      padding: "12px 8px", borderRadius: 10,
                      fontSize: 11, fontWeight: 600,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      cursor: exporting ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Download size={13} />
                    {exporting ? "..." : "Export"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right panel: visual ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ambient background glow */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 50%, ${TRIMS[trim].glow}20, transparent 65%)`,
          }} />

          {/* Visual capture target */}
          <div ref={visualRef} style={{
            width: "100%", maxWidth: 520,
            padding: "48px 32px",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 20,
            background: "rgba(245,242,237,0.6)",
            borderRadius: 24,
            position: "relative",
          }}>
            {/* Craft product visual */}
            {craft === "smoke" && (
              <CigarBoxVisual
                woodKey={wood} trimKey={trim} interiorKey={interior}
                brand={brand} isOpen={isOpen}
              />
            )}
            {craft === "pour" && (
              <PourCraftVisual trimKey={trim} brand={brand} isOpen={isOpen} />
            )}
            {craft === "brew" && (
              <BrewCraftVisual trimKey={trim} brand={brand} isOpen={isOpen} />
            )}
            {craft === "vape" && (
              <div style={{
                width: 180, height: 260,
                background: "linear-gradient(180deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)",
                border: `2px solid ${accent}50`, borderRadius: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: accent, fontSize: 48,
              }}>
                💨
              </div>
            )}

            {/* Config label strip */}
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8,
            }}>
              {craft === "smoke" && [
                `${WOODS[wood].name} Wood`,
                `${TRIMS[trim].name} Trim`,
                `${INTERIORS[interior].name}`,
              ].map(label => (
                <div key={label} style={{
                  fontSize: 10, padding: "4px 10px", borderRadius: 999,
                  background: `${accent}12`, border: `1px solid ${accent}30`,
                  color: "rgba(26,26,27,0.62)", letterSpacing: "0.1em",
                }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Reveal instruction (only in closed state) */}
          <AnimatePresence>
            {!isOpen && (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontSize: 11, color: "rgba(26,26,27,0.30)",
                  marginTop: 20, letterSpacing: "0.14em", textAlign: "center",
                }}
              >
                Configure your signature, then hit Reveal
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
