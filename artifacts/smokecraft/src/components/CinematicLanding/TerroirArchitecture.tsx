/**
 * TerroirArchitecture — SESSION 01 · THE AGRONOMIST · STEP 1 / 14
 *
 * The guest's first act in the 14-step Sovereign ritual. Before choosing
 * a cigar shape or tasting notes, they must select the terroir — the
 * growing region, soil composition, and mineral profile that will define
 * the base character of their sovereign blend.
 *
 * Design: v2026.0514 FINAL_POLISH_PROTOCOL
 * — Obsidian glass, 24k Gold leaf accents, machined glass cards.
 * — Cormorant Garamond serif display + letter-spacing 0.2em headings.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;

interface Props {
  onComplete: (region: TerroirRegion) => void;
}

interface TerroirRegion {
  id:          string;
  name:        string;
  country:     string;
  region:      string;
  soil:        string;
  soilColor:   string;
  minerals:    string[];
  keywords:    string[];
  elevation:   string;
  latitude:    string;
  rainfall:    string;
  signature:   string;
}

const REGIONS: TerroirRegion[] = [
  {
    id:        "jalapa",
    name:      "JALAPA VALLEY",
    country:   "Nicaragua",
    region:    "Nueva Segovia",
    soil:      "Volcanic Loam",
    soilColor: "#4A2810",
    minerals:  ["Iron", "Magnesium", "Phosphate"],
    keywords:  ["Bold", "Earthy", "Complex"],
    elevation: "2,200 ft",
    latitude:  "13.92° N",
    rainfall:  "62 in / yr",
    signature: "A dark, volcanic soil yielding leaf of uncommon density. Iron-rich sediment imparts depth and body — the backbone of the Maduro wrapper.",
  },
  {
    id:        "esteli",
    name:      "ESTELÍ",
    country:   "Nicaragua",
    region:    "Las Segovias",
    soil:      "Mineral Clay",
    soilColor: "#7A3A1A",
    minerals:  ["Silica", "Calcium", "Potassium"],
    keywords:  ["Spicy", "Structured", "Long Finish"],
    elevation: "2,800 ft",
    latitude:  "13.08° N",
    rainfall:  "55 in / yr",
    signature: "High-mineral clay at altitude disciplines every leaf. Potassium silicate drives the characteristic Estelí pepper hit — bold, enduring, uncompromising.",
  },
  {
    id:        "vuelto-abajo",
    name:      "VUELTA ABAJO",
    country:   "Cuba",
    region:    "Pinar del Río",
    soil:      "Sandy Limestone",
    soilColor: "#BFA882",
    minerals:  ["Calcium", "Carbonates", "Silica"],
    keywords:  ["Creamy", "Silky", "Balanced"],
    elevation: "180 ft",
    latitude:  "22.58° N",
    rainfall:  "52 in / yr",
    signature: "The world's most legendary tobacco terroir. Calcium carbonate in free-draining limestone sand produces the silkiest combustion and the most harmonious smoke column ever recorded.",
  },
  {
    id:        "san-andres",
    name:      "SAN ANDRÉS",
    country:   "Mexico",
    region:    "Veracruz",
    soil:      "Dark Maduro Humus",
    soilColor: "#140800",
    minerals:  ["Humic Acid", "Iron", "Zinc"],
    keywords:  ["Sweet", "Full-Bodied", "Dark"],
    elevation: "1,600 ft",
    latitude:  "18.45° N",
    rainfall:  "70 in / yr",
    signature: "The ancestral Maduro homeland. Deep, fermented humus saturated with organic acids transforms over 90-day processing into the darkest, sweetest wrapper in the premium segment.",
  },
];

export default function TerroirArchitecture({ onComplete }: Props) {
  const [selected,  setSelected]  = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const selectedRegion = REGIONS.find(r => r.id === selected);

  const handleProceed = () => {
    if (!selectedRegion || confirmed) return;
    setConfirmed(true);
    setTimeout(() => onComplete(selectedRegion), 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: silk } }}
      transition={{ duration: 0.5, ease: silk }}
      style={{
        position: "fixed", inset: 0, zIndex: 170,
        background: "#010101",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Ambient gold top glow ──────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: "25%",
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,139,0,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Header bar ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: silk, delay: 0.1 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 32px 16px",
          borderBottom: "1px solid rgba(191,149,63,0.14)",
          background: "rgba(5,3,1,0.90)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{
            fontSize: 9, letterSpacing: "0.45em", textTransform: "uppercase",
            color: "rgba(212,139,0,0.60)", fontFamily: "'Cormorant Garamond', serif",
            marginBottom: 3,
          }}>
            SESSION 01 · THE AGRONOMIST
          </p>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            fontWeight: 300, letterSpacing: "0.22em",
            color: "rgba(232,222,208,0.95)", margin: 0,
          }}>
            TERROIR ARCHITECTURE
          </h2>
        </div>

        {/* Step counter */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} style={{
                width: i === 0 ? 20 : 6, height: 3, borderRadius: 2,
                background: i === 0
                  ? "rgba(212,139,0,0.90)"
                  : "rgba(255,255,255,0.10)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>
          <p style={{
            fontSize: 9, color: "rgba(191,149,63,0.50)", letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}>
            STEP 01 / 14 — SOVEREIGN ASCENSION
          </p>
        </div>
      </motion.div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: silk, delay: 0.22 }}
          style={{ textAlign: "center", padding: "32px 24px 24px" }}
        >
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(0.65rem, 1.5vw, 0.75rem)",
            letterSpacing: "0.5em", textTransform: "uppercase",
            color: "rgba(212,139,0,0.50)", marginBottom: 10,
          }}>
            SELECT YOUR GROWING ORIGIN
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 300, letterSpacing: "0.15em",
            color: "rgba(232,222,208,0.92)", margin: 0,
            lineHeight: 1.15,
          }}>
            Where is your tobacco born?
          </h1>
          <p style={{
            fontSize: 13, color: "rgba(180,165,140,0.45)",
            marginTop: 10, letterSpacing: "0.06em",
            maxWidth: 460, margin: "10px auto 0",
          }}>
            The terroir determines everything — soil chemistry, elevation, and mineral composition shape the fundamental character of your sovereign blend before a single leaf is harvested.
          </p>
        </motion.div>

        {/* ── Region grid + detail panel ──────────────────────────── */}
        <div style={{
          flex: 1, overflow: "auto",
          display: "grid",
          gridTemplateColumns: selected ? "1fr 320px" : "1fr",
          gridTemplateRows: "1fr",
          gap: 0,
          padding: "0 24px 24px",
          transition: "grid-template-columns 0.4s ease",
        }}>

          {/* Cards grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            alignContent: "start",
            overflowY: "auto",
          }}>
            {REGIONS.map((r, i) => {
              const isSelected = selected === r.id;
              return (
                <motion.button key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 + i * 0.07, duration: 0.45, ease: silk }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(r.id)}
                  style={{
                    position: "relative",
                    display: "flex", flexDirection: "column",
                    padding: 0,
                    background: isSelected ? "rgba(212,139,0,0.06)" : "rgba(14,10,6,0.70)",
                    border: `1px solid ${isSelected ? "rgba(212,139,0,0.60)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 4,
                    cursor: "pointer", textAlign: "left",
                    overflow: "hidden",
                    boxShadow: isSelected
                      ? "0 0 40px rgba(212,139,0,0.15), 0 8px 32px rgba(0,0,0,0.55)"
                      : "0 4px 20px rgba(0,0,0,0.45)",
                    minHeight: 200,
                    transition: "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
                  }}
                >
                  {/* Soil color strip */}
                  <div style={{
                    height: 6,
                    background: `linear-gradient(90deg, ${r.soilColor}, transparent)`,
                    width: "100%",
                  }} />

                  {/* Content */}
                  <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    {/* Country badge */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{
                        fontSize: 8, letterSpacing: "0.35em", textTransform: "uppercase",
                        color: "rgba(212,139,0,0.65)",
                        border: "1px solid rgba(212,139,0,0.25)",
                        borderRadius: 2, padding: "2px 8px",
                        fontFamily: "'Cormorant Garamond', serif",
                      }}>
                        {r.country.toUpperCase()} · {r.region.toUpperCase()}
                      </span>
                    </div>

                    {/* Region name */}
                    <h3 style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
                      fontWeight: 300, letterSpacing: "0.15em",
                      color: isSelected ? "rgba(232,222,208,1)" : "rgba(220,210,195,0.85)",
                      margin: "0 0 6px",
                      lineHeight: 1.1,
                    }}>
                      {r.name}
                    </h3>

                    {/* Soil type */}
                    <p style={{
                      fontSize: 11, color: "rgba(180,160,130,0.55)",
                      letterSpacing: "0.1em", marginBottom: 14,
                    }}>
                      {r.soil}
                    </p>

                    {/* Flavor keywords */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                      {r.keywords.map(kw => (
                        <span key={kw} style={{
                          fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
                          color: isSelected ? "rgba(212,139,0,0.90)" : "rgba(180,160,130,0.55)",
                          border: `1px solid ${isSelected ? "rgba(212,139,0,0.35)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 2, padding: "3px 8px",
                          transition: "all 0.25s ease",
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* Mineral pills */}
                    <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                      {r.minerals.map(m => (
                        <span key={m} style={{
                          fontSize: 8, color: "rgba(160,145,120,0.45)",
                          letterSpacing: "0.15em", textTransform: "uppercase",
                        }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Selected indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key="sel"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          position: "absolute", top: 14, right: 14,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(212,139,0,0.90)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#010101", fontWeight: 700 }}>✓</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* ── Detail panel ──────────────────────────────────────── */}
          <AnimatePresence>
            {selectedRegion && (
              <motion.div key={selectedRegion.id}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.38, ease: silk }}
                style={{
                  marginLeft: 14,
                  background: "rgba(14,10,6,0.82)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(191,149,63,0.18)",
                  borderRadius: 4,
                  padding: "28px 24px",
                  display: "flex", flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.60)",
                  position: "relative",
                }}
              >
                {/* Top rule */}
                <div style={{
                  position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.50), transparent)",
                }} />

                {/* Soil swatch */}
                <div style={{
                  width: "100%", height: 5, borderRadius: 2,
                  background: `linear-gradient(90deg, ${selectedRegion.soilColor}, rgba(212,139,0,0.30), transparent)`,
                  marginBottom: 20,
                }} />

                <p style={{
                  fontSize: 8, letterSpacing: "0.45em", color: "rgba(212,139,0,0.55)",
                  textTransform: "uppercase", marginBottom: 6,
                }}>
                  TERROIR PROFILE
                </p>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.5rem", fontWeight: 300, letterSpacing: "0.12em",
                  color: "rgba(232,222,208,0.95)", marginBottom: 4,
                }}>
                  {selectedRegion.name}
                </h3>
                <p style={{
                  fontSize: 11, color: "rgba(180,160,130,0.50)",
                  letterSpacing: "0.1em", marginBottom: 22,
                }}>
                  {selectedRegion.country} · {selectedRegion.region}
                </p>

                {/* Spec grid */}
                {[
                  { label: "ELEVATION",     value: selectedRegion.elevation  },
                  { label: "LATITUDE",      value: selectedRegion.latitude   },
                  { label: "RAINFALL",      value: selectedRegion.rainfall   },
                  { label: "SOIL TYPE",     value: selectedRegion.soil       },
                ].map(s => (
                  <div key={s.label} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <span style={{ fontSize: 9, letterSpacing: "0.25em", color: "rgba(180,160,130,0.40)", textTransform: "uppercase" }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(220,210,195,0.80)", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.08em" }}>
                      {s.value}
                    </span>
                  </div>
                ))}

                {/* Minerals */}
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(212,139,0,0.45)", textTransform: "uppercase", marginBottom: 10 }}>
                    MINERAL COMPOSITION
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedRegion.minerals.map(m => (
                      <span key={m} style={{
                        fontSize: 10, letterSpacing: "0.12em",
                        color: "rgba(212,139,0,0.75)",
                        border: "1px solid rgba(212,139,0,0.25)",
                        borderRadius: 2, padding: "4px 10px",
                      }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Terroir signature */}
                <p style={{
                  fontSize: 12, lineHeight: 1.65,
                  color: "rgba(190,175,150,0.65)",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic", letterSpacing: "0.04em",
                  marginBottom: 24, flex: 1,
                }}>
                  "{selectedRegion.signature}"
                </p>

                {/* Proceed CTA */}
                <motion.button
                  whileHover={!confirmed ? {
                    boxShadow: "0 0 0 1px rgba(212,139,0,0.70), 0 12px 40px rgba(212,139,0,0.18)",
                    backgroundColor: "rgba(212,139,0,0.14)",
                  } : {}}
                  whileTap={!confirmed ? { scale: 0.97 } : {}}
                  onClick={handleProceed}
                  disabled={confirmed}
                  style={{
                    width: "100%", height: 52,
                    border: "1px solid rgba(212,139,0,0.50)",
                    borderRadius: 3,
                    background: confirmed ? "rgba(212,139,0,0.12)" : "rgba(212,139,0,0.08)",
                    color: confirmed ? "rgba(100,220,120,0.85)" : "rgba(212,139,0,0.92)",
                    fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase",
                    fontFamily: "'Cormorant Garamond', serif",
                    cursor: confirmed ? "default" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {confirmed
                    ? "TERROIR LOCKED · PROCEEDING…"
                    : "LOCK TERROIR → PROCEED TO CURING"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom watermark ──────────────────────────────────────── */}
      <p style={{
        textAlign: "center", padding: "10px 0 16px",
        fontSize: 9, letterSpacing: "0.4em", color: "rgba(191,149,63,0.18)",
        textTransform: "uppercase", flexShrink: 0,
      }}>
        NOVEE OS · SESSION 01 · TERROIR ARCHITECTURE · STEP 01 OF 14
      </p>
    </motion.div>
  );
}
