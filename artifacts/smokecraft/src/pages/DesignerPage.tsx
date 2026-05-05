/**
 * /designer — Signature Product Designer
 *
 * A premium customizer where customers (or staff) can configure a cigar's
 * band color and box style, then preview the result in real time.
 * Entirely self-contained — no external images required; SVG-rendered preview.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Palette, Box, Eye } from "lucide-react";

// ── Band colour palette ──────────────────────────────────────────────────────

const BAND_COLORS = [
  { id: "gold",    name: "Sovereign Gold",  hex: "#d4af37", dark: "#8a6f1a" },
  { id: "crimson", name: "Crimson Vault",   hex: "#be123c", dark: "#7f0d29" },
  { id: "navy",    name: "Midnight Cedar",  hex: "#1e3a8a", dark: "#112166" },
  { id: "jade",    name: "Jade Reserve",    hex: "#065f46", dark: "#03382a" },
  { id: "onyx",    name: "Obsidian Club",   hex: "#44403c", dark: "#1c1917" },
] as const;

// ── Box style options ────────────────────────────────────────────────────────

const BOX_STYLES = [
  {
    id:    "cedar",
    name:  "Cedar Wood",
    desc:  "Classic horizontal cedar presentation box",
    icon:  "🪵",
    color: "#8b5e3c",
  },
  {
    id:    "tin",
    name:  "Brushed Tin",
    desc:  "Sleek metallic travel tin with embossed lid",
    icon:  "🥫",
    color: "#9ca3af",
  },
  {
    id:    "leather",
    name:  "Leather Wrap",
    desc:  "Hand-stitched leather travel pouch",
    icon:  "👜",
    color: "#78350f",
  },
] as const;

type Step = "band" | "box" | "preview";

// ── SVG cigar preview ────────────────────────────────────────────────────────

function CigarPreview({
  bandColor,
  boxColor,
}: {
  bandColor: typeof BAND_COLORS[number];
  boxColor:  typeof BOX_STYLES[number];
}) {
  return (
    <svg viewBox="0 0 360 140" width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#c9a97a" />
          <stop offset="45%"  stopColor="#8b6240" />
          <stop offset="100%" stopColor="#5c3d1e" />
        </linearGradient>
        <linearGradient id="band-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={bandColor.hex}  />
          <stop offset="50%"  stopColor={bandColor.dark} />
          <stop offset="100%" stopColor={bandColor.hex}  />
        </linearGradient>
        <linearGradient id="cap-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#e8d4ae" />
          <stop offset="100%" stopColor="#9a7050" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-20%" width="120%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Main cigar body */}
      <rect x="28" y="50" width="290" height="40" rx="20" ry="20"
        fill="url(#body-grad)" filter="url(#shadow)" />

      {/* Highlight stripe */}
      <rect x="28" y="52" width="290" height="6" rx="3"
        fill="rgba(255,255,255,0.12)" />

      {/* Band */}
      <rect x="120" y="50" width="80" height="40"
        fill="url(#band-grad)" />
      {/* Band border lines */}
      <rect x="120" y="50" width="80" height="3"  fill="rgba(255,255,255,0.3)" />
      <rect x="120" y="87" width="80" height="3"  fill="rgba(255,255,255,0.3)" />
      {/* Band ornament */}
      <text x="160" y="74" textAnchor="middle" fontSize="9"
        fill="rgba(255,255,255,0.9)" fontWeight="bold" letterSpacing="2">
        AXIOM
      </text>
      <text x="160" y="84" textAnchor="middle" fontSize="6"
        fill="rgba(255,255,255,0.6)" letterSpacing="3">
        RESERVE
      </text>

      {/* Foot cap */}
      <ellipse cx="318" cy="70" rx="12" ry="20" fill="url(#cap-grad)" />

      {/* Head cap (pointed) */}
      <path d="M28 50 Q18 70 28 90 Z" fill="#e8d4ae" />

      {/* Box preview below */}
      <rect x="100" y="108" width="160" height="24" rx="4"
        fill={boxColor.color} opacity="0.85" />
      <text x="180" y="124" textAnchor="middle" fontSize="9"
        fill="rgba(255,255,255,0.9)" fontWeight="600" letterSpacing="1.5">
        {boxColor.name.toUpperCase()}
      </text>
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DesignerPage() {
  const [, navigate] = useLocation();

  const [step,          setStep         ] = useState<Step>("band");
  const [selectedBand,  setSelectedBand ] = useState<typeof BAND_COLORS[number]>(BAND_COLORS[0]);
  const [selectedBox,   setSelectedBox  ] = useState<typeof BOX_STYLES[number]>(BOX_STYLES[0]);
  const [saved,         setSaved        ] = useState(false);

  const STEPS: Step[] = ["band", "box", "preview"];
  const stepIndex = STEPS.indexOf(step);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const accent = selectedBand.hex;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #0d0906 0%, #1a1008 50%, #0a0806 100%)",
      fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "20px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative", zIndex: 10,
      }}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/dashboard")}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(232,224,200,0.8)", flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>

        <div>
          <h1 style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: 22, fontWeight: 700, color: "#fff", margin: 0,
            letterSpacing: "-0.01em",
          }}>Signature Designer</h1>
          <p style={{ fontSize: 11, color: "rgba(232,224,200,0.45)", margin: 0, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Craft Your Identity
          </p>
        </div>

        {/* Step progress */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <motion.div
                animate={{
                  background: i <= stepIndex ? accent : "rgba(255,255,255,0.08)",
                  borderColor: i <= stepIndex ? accent : "rgba(255,255,255,0.12)",
                }}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: "1.5px solid",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: i <= stepIndex ? "#0a0806" : "rgba(232,224,200,0.4)",
                  cursor: i < stepIndex ? "pointer" : "default",
                }}
                onClick={() => { if (i < stepIndex) setStep(STEPS[i]); }}
              >
                {i < stepIndex ? <Check size={12} /> : i + 1}
              </motion.div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 20, height: 1,
                  background: i < stepIndex ? `${accent}80` : "rgba(255,255,255,0.1)",
                }} />
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 28px", gap: 32, position: "relative", zIndex: 10 }}>
        <AnimatePresence mode="wait">

          {/* ── Step 1: Band Color ─────────────────────────────────────────── */}
          {step === "band" && (
            <motion.div
              key="band"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              style={{ display: "flex", flexDirection: "column", gap: 28 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Palette size={20} color={accent} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Choose Your Band</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(232,224,200,0.5)" }}>Select the band color for your signature cigar</p>
                </div>
              </div>

              {/* Live preview */}
              <div style={{
                padding: "24px 32px", borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${accent}30`,
                maxWidth: 440, alignSelf: "center", width: "100%",
              }}>
                <CigarPreview bandColor={selectedBand} boxColor={selectedBox} />
              </div>

              {/* Color grid */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                {BAND_COLORS.map(c => (
                  <motion.button
                    key={c.id}
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedBand(c)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      padding: "16px 20px", borderRadius: 16,
                      background: selectedBand.id === c.id ? `${c.hex}18` : "rgba(255,255,255,0.03)",
                      border: selectedBand.id === c.id ? `1.5px solid ${c.hex}` : "1.5px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      minWidth: 100,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${c.hex}, ${c.dark})`,
                      boxShadow: selectedBand.id === c.id ? `0 0 14px ${c.hex}60` : "none",
                    }} />
                    <span style={{ fontSize: 11, color: "rgba(232,224,200,0.8)", fontWeight: 600, textAlign: "center" }}>{c.name}</span>
                    {selectedBand.id === c.id && (
                      <Check size={12} color={c.hex} />
                    )}
                  </motion.button>
                ))}
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("box")}
                style={{
                  alignSelf: "center",
                  background: `linear-gradient(135deg, ${accent}, ${selectedBand.dark})`,
                  color: "#0a0806", border: "none",
                  padding: "14px 48px", borderRadius: 999,
                  fontSize: 12, fontWeight: 800,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: `0 4px 24px ${accent}40`,
                }}
              >
                Next: Choose Box →
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: Box Style ──────────────────────────────────────────── */}
          {step === "box" && (
            <motion.div
              key="box"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              style={{ display: "flex", flexDirection: "column", gap: 28 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Box size={20} color={accent} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Select Your Box</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(232,224,200,0.5)" }}>How should your signature blend be presented?</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, alignSelf: "center", width: "100%" }}>
                {BOX_STYLES.map(b => (
                  <motion.button
                    key={b.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedBox(b)}
                    style={{
                      display: "flex", alignItems: "center", gap: 18,
                      padding: "18px 24px", borderRadius: 16,
                      background: selectedBox.id === b.id ? `${accent}12` : "rgba(255,255,255,0.03)",
                      border: selectedBox.id === b.id ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.08)",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: b.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {b.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(232,224,200,0.52)", lineHeight: 1.5 }}>{b.desc}</div>
                    </div>
                    {selectedBox.id === b.id && (
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: accent, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Check size={13} color="#0a0806" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("band")}
                  style={{
                    background: "transparent", color: "rgba(232,224,200,0.55)",
                    border: "1px solid rgba(232,224,200,0.18)",
                    padding: "13px 32px", borderRadius: 999,
                    fontSize: 12, fontWeight: 600, letterSpacing: "0.16em",
                    textTransform: "uppercase", cursor: "pointer",
                  }}
                >← Back</motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("preview")}
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${selectedBand.dark})`,
                    color: "#0a0806", border: "none",
                    padding: "14px 48px", borderRadius: 999,
                    fontSize: 12, fontWeight: 800,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: `0 4px 24px ${accent}40`,
                  }}
                >
                  Preview Signature →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Preview ────────────────────────────────────────────── */}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Eye size={20} color={accent} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Your Signature</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(232,224,200,0.5)" }}>Your custom blend, ready to be crafted</p>
                </div>
              </div>

              {/* Main preview card */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0,  opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                style={{
                  padding: "36px 40px", borderRadius: 24,
                  background: `linear-gradient(145deg, ${accent}0d, rgba(10,8,6,0.95))`,
                  border: `1px solid ${accent}35`,
                  boxShadow: `0 40px 100px ${accent}18`,
                  maxWidth: 480, width: "100%",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 28 }}>
                  <CigarPreview bandColor={selectedBand} boxColor={selectedBox} />
                </div>

                <h3 style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: 24, fontWeight: 700, color: "#fff",
                  margin: "0 0 6px",
                }}>Axiom Reserve</h3>
                <p style={{ fontSize: 12, color: accent, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 700 }}>
                  Signature Edition
                </p>

                {/* Config summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
                  {[
                    { label: "Band", value: selectedBand.name },
                    { label: "Presentation", value: selectedBox.name },
                  ].map(row => (
                    <div key={row.label} style={{
                      padding: "12px 16px", borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <div style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,224,200,0.38)", marginBottom: 4 }}>{row.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {saved ? (
                    <motion.div
                      key="saved"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "14px 28px", borderRadius: 999,
                        background: "rgba(52,211,153,0.12)",
                        border: "1px solid rgba(52,211,153,0.4)",
                        color: "#34d399", fontSize: 13, fontWeight: 700,
                      }}
                    >
                      <Check size={16} /> Signature Saved to Profile
                    </motion.div>
                  ) : (
                    <motion.button
                      key="save-btn"
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSave}
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${selectedBand.dark})`,
                        color: "#0a0806", border: "none",
                        padding: "15px 48px", borderRadius: 999,
                        fontSize: 12, fontWeight: 800,
                        letterSpacing: "0.2em", textTransform: "uppercase",
                        cursor: "pointer", width: "100%",
                        boxShadow: `0 6px 28px ${accent}45`,
                      }}
                    >
                      Save Signature
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("box")}
                style={{
                  background: "transparent", color: "rgba(232,224,200,0.45)",
                  border: "1px solid rgba(232,224,200,0.12)",
                  padding: "11px 28px", borderRadius: 999,
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
                  textTransform: "uppercase", cursor: "pointer",
                }}
              >
                ← Redesign
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
