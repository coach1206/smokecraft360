import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const OBSIDIAN   = "#0D0D12";
const COPPER     = "#C8762A";
const COPPER_DIM  = "rgba(200,118,42,0.18)";
const COPPER_GLOW = "rgba(200,118,42,0.55)";
const GOLD_TEXT  = "#E8C870";
const TEXT       = "#F0E8D4";

const SPIRIT_ROWS = [
  {
    id:      "foundation",
    label:   "The Foundation Core",
    sub:     "Base Spirit Architecture",
    options: [
      { id: "cognac", label: "Aged Cognac",      note: "XO · 20yr+ Oak",        glyph: "◈" },
      { id: "rye",    label: "Cask Strength Rye", note: "Barrel Proof · Uncut",  glyph: "◉" },
    ],
  },
  {
    id:      "modifier",
    label:   "The Modifier Chord",
    sub:     "Character & Complexity Layer",
    options: [
      { id: "botanical", label: "Botanical",        note: "Juniper · Cardamom",    glyph: "◇" },
      { id: "bitter",    label: "Bitter Infusions", note: "Gentian · Orange Peel", glyph: "◆" },
    ],
  },
  {
    id:      "vapor",
    label:   "The Aromatic Vapor Overlay",
    sub:     "Finish & Nose Expression",
    options: [
      { id: "citrus", label: "Expressed Citrus", note: "Sicilian Lemon · Zest", glyph: "○" },
      { id: "cedar",  label: "Cedar Haze",       note: "Smoke · Aged Wood",     glyph: "●" },
    ],
  },
] as const;

type RowId = (typeof SPIRIT_ROWS)[number]["id"];
type Selections = Partial<Record<RowId, string>>;

export function SpiritConstructionPanel({ onComplete }: { onComplete?: () => void } = {}) {
  const [selections, setSelections] = useState<Selections>({});
  const allSelected = SPIRIT_ROWS.every(r => selections[r.id]);

  function select(rowId: RowId, optionId: string) {
    setSelections(prev => ({ ...prev, [rowId]: optionId }));
  }

  return (
    <div style={{
      width:          "100%",
      maxWidth:       780,
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      padding:        "0 24px",
      fontFamily:     "'Inter', sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{
        position:      "absolute",
        top:           0,
        left:          0,
        right:         0,
        height:        220,
        background:    "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(200,118,42,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 44, zIndex: 2, width: "100%" }}>
        <p style={{
          fontSize:      11,
          letterSpacing: "0.40em",
          textTransform: "uppercase",
          color:         COPPER,
          fontWeight:    700,
          margin:        "0 0 10px",
        }}>
          PourCraft 360 · Spirit Construction
        </p>
        <h1 style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(28px, 4vw, 44px)",
          fontWeight:    300,
          color:         TEXT,
          letterSpacing: "0.06em",
          margin:        0,
          lineHeight:    1.2,
        }}>
          Compose Your Pour
        </h1>
        <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 14, marginTop: 10, letterSpacing: "0.04em" }}>
          Three decisions. One signature spirit.
        </p>
      </div>

      {/* Rows */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           18,
        width:         "100%",
        zIndex:        2,
      }}>
        {SPIRIT_ROWS.map((row, rowIdx) => {
          const active = selections[row.id];
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + rowIdx * 0.10, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background:   OBSIDIAN,
                border:       active ? `1.5px solid ${COPPER_GLOW}` : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding:      "20px 22px",
                boxShadow:    active
                  ? `0 0 40px rgba(200,118,42,0.22), 0 0 12px rgba(200,118,42,0.10)`
                  : "0 4px 24px rgba(0,0,0,0.40)",
                transition: "border-color 0.28s, box-shadow 0.28s",
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize:      10,
                  letterSpacing: "0.30em",
                  textTransform: "uppercase",
                  color:         active ? COPPER : "rgba(255,255,255,0.28)",
                  fontWeight:    700,
                  margin:        "0 0 4px",
                  transition:    "color 0.22s",
                }}>
                  {row.sub}
                </p>
                <h3 style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      22,
                  fontWeight:    400,
                  color:         active ? GOLD_TEXT : "rgba(240,232,212,0.70)",
                  letterSpacing: "0.04em",
                  margin:        0,
                  transition:    "color 0.22s",
                }}>
                  {row.label}
                </h3>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {row.options.map(opt => {
                  const isActive = active === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => select(row.id, opt.id)}
                      style={{
                        flex:        1,
                        background:  isActive ? COPPER_DIM : "rgba(255,255,255,0.03)",
                        border:      isActive ? `1.5px solid ${COPPER}` : "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 12,
                        padding:     "16px 14px",
                        cursor:      "pointer",
                        textAlign:   "left",
                        fontFamily:  "inherit",
                        position:    "relative",
                        overflow:    "hidden",
                        transition:  "background 0.2s, border-color 0.2s",
                        boxShadow:   isActive
                          ? `0 0 20px rgba(200,118,42,0.28), inset 0 0 12px rgba(200,118,42,0.08)`
                          : "none",
                      }}
                    >
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            key="aura"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.18, 0.38, 0.18] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              position:      "absolute",
                              inset:         -1,
                              borderRadius:  12,
                              background:    `radial-gradient(ellipse at 50% 50%, ${COPPER_GLOW} 0%, transparent 70%)`,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </AnimatePresence>
                      <span style={{
                        display:      "block",
                        fontSize:     20,
                        color:        isActive ? COPPER : "rgba(255,255,255,0.22)",
                        marginBottom: 6,
                        transition:   "color 0.22s",
                      }}>
                        {opt.glyph}
                      </span>
                      <span style={{
                        display:       "block",
                        fontSize:      16,
                        fontWeight:    700,
                        color:         isActive ? TEXT : "rgba(240,232,212,0.55)",
                        letterSpacing: "0.03em",
                        marginBottom:  4,
                        transition:    "color 0.22s",
                      }}>
                        {opt.label}
                      </span>
                      <span style={{
                        display:       "block",
                        fontSize:      11,
                        color:         isActive ? "rgba(232,200,112,0.70)" : "rgba(240,232,212,0.28)",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        transition:    "color 0.22s",
                      }}>
                        {opt.note}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <AnimatePresence>
        {allSelected && (
          <motion.button
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            type="button"
            onClick={() => onComplete?.()}
            whileTap={{ scale: 0.96 }}
            style={{
              marginTop:     36,
              padding:       "18px 60px",
              background:    `linear-gradient(135deg, ${COPPER} 0%, #9A4E14 100%)`,
              border:        `1.5px solid rgba(200,118,42,0.80)`,
              borderRadius:  14,
              color:         "#0A0604",
              fontSize:      14,
              fontWeight:    900,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              cursor:        "pointer",
              fontFamily:    "inherit",
              zIndex:        2,
              boxShadow:     `0 0 32px rgba(200,118,42,0.35), 0 4px 20px rgba(0,0,0,0.50)`,
            }}
          >
            Begin Pour
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
