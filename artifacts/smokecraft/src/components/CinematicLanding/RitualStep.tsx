/**
 * RitualStep — shared cinematic session panel for Sessions 02–07
 * NOVEE OS · E.A.T. Framework · Profound Innovations
 *
 * Mirrors TerroirArchitecture's material language:
 * — True Obsidian (#010101) field
 * — 24k Warm Honey Amber (#D4AF37) accents
 * — Cormorant Garamond serif display
 * — 14-segment step counter, amber top-rail rule
 * — Sliding detail panel (320px) with signature quote + CTA
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RitualStepConfig, RitualOption } from "./RitualConfig";

interface RitualStepProps {
  config:     RitualStepConfig;
  onComplete: (selection: RitualOption) => void;
  onBack?:    () => void;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

const TOTAL_STEPS = 14;

export function RitualStep({ config, onComplete, onBack }: RitualStepProps) {
  const [selected,  setSelected]  = useState<RitualOption | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleSelect(opt: RitualOption) {
    if (confirmed) return;
    setSelected(opt);
  }

  function handleConfirm() {
    if (!selected || confirmed) return;
    setConfirmed(true);
    setTimeout(() => onComplete(selected), 900);
  }

  const dots = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <motion.div
      key={`ritual-step-${config.step}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 170,
        background: "#010101",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* ── Top rail ─────────────────────────────────────────────── */}
      <div style={{
        padding: "22px 28px 18px",
        borderBottom: "1px solid rgba(212,175,55,0.09)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 16,
      }}>
        {/* Session label + title */}
        <div>
          <p style={{
            fontSize: 9, letterSpacing: "0.40em", textTransform: "uppercase",
            color: "rgba(212,175,55,0.52)", marginBottom: 4,
            fontFamily: "monospace",
          }}>
            {config.session} · {config.sessionTitle}
          </p>
          <h2 style={{
            fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
            fontSize: "clamp(1.1rem, 2.4vw, 1.45rem)",
            fontWeight: 300, letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(245,235,215,0.95)", margin: 0,
          }}>
            {config.displayTitle}
          </h2>
        </div>

        {/* 14-segment step counter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {dots.map((d) => (
            <div key={d} style={{
              height: 3, borderRadius: 999,
              width:      d === config.step ? 22 : 8,
              background: d <  config.step
                ? "rgba(212,175,55,0.65)"
                : d === config.step
                  ? "#D4AF37"
                  : "rgba(255,255,255,0.09)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      </div>

      {/* ── Subtitle ─────────────────────────────────────────────── */}
      <p style={{
        textAlign: "center", padding: "16px 24px 0",
        fontSize: 11, letterSpacing: "0.18em",
        color: "rgba(200,185,155,0.48)", textTransform: "uppercase",
        flexShrink: 0,
      }}>
        {config.subtitle}
      </p>

      {/* ── Main body ────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex",
        padding: "22px 28px 28px", gap: 20,
        minHeight: 0,
      }}>

        {/* Option grid */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14, alignContent: "start",
          overflowY: "auto",
        }}>
          {config.options.map((opt) => {
            const isSel = selected?.id === opt.id;
            const rgb   = hexToRgb(opt.accentHex);
            return (
              <motion.button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                whileHover={{ scale: confirmed ? 1 : 1.025 }}
                whileTap={{   scale: confirmed ? 1 : 0.975 }}
                style={{
                  position: "relative", overflow: "hidden",
                  background: isSel
                    ? `rgba(${rgb}, 0.14)`
                    : "rgba(255,255,255,0.025)",
                  border: isSel
                    ? "1px solid rgba(212,175,55,0.52)"
                    : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "24px 20px",
                  cursor: confirmed ? "default" : "pointer",
                  textAlign: "left", transition: "all 0.28s ease",
                  boxShadow: isSel
                    ? `0 0 48px rgba(212,175,55,0.10), inset 0 1px 0 rgba(212,175,55,0.15)`
                    : "none",
                }}
              >
                {/* Amber top-rule — visible on selection */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: isSel
                    ? `linear-gradient(90deg, transparent, ${opt.accentHex}, transparent)`
                    : "transparent",
                  transition: "all 0.3s ease",
                }} />

                {/* Badge */}
                <span style={{
                  display: "inline-block", marginBottom: 12,
                  fontSize: 8, letterSpacing: "0.32em", textTransform: "uppercase",
                  fontFamily: "monospace",
                  color: isSel ? "rgba(212,175,55,0.88)" : "rgba(200,185,155,0.38)",
                  border: "1px solid",
                  borderColor: isSel ? "rgba(212,175,55,0.32)" : "rgba(255,255,255,0.09)",
                  padding: "3px 8px", borderRadius: 3,
                  transition: "all 0.28s ease",
                }}>
                  {opt.badge}
                </span>

                {/* Name */}
                <h3 style={{
                  fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: "clamp(1rem, 2vw, 1.3rem)",
                  fontWeight: 300, letterSpacing: "0.07em",
                  color: isSel ? "rgba(245,235,215,0.96)" : "rgba(210,195,170,0.72)",
                  marginBottom: 16, lineHeight: 1.25,
                  transition: "color 0.28s ease",
                }}>
                  {opt.name}
                </h3>

                {/* Specs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {opt.specs.map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{
                        fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
                        color: "rgba(200,185,155,0.38)",
                      }}>
                        {s.label}
                      </span>
                      <span style={{
                        fontSize: 10, color: "rgba(225,210,180,0.72)",
                        textAlign: "right", letterSpacing: "0.05em",
                      }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {opt.keywords.map((kw) => (
                    <span key={kw} style={{
                      fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase",
                      color: "rgba(180,165,135,0.38)", fontFamily: "monospace",
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Detail panel — slides in on selection ────────────── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 36, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 300, flexShrink: 0,
                background: "rgba(16,12,6,0.80)",
                backdropFilter: "blur(24px) saturate(0.6)",
                WebkitBackdropFilter: "blur(24px) saturate(0.6)",
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: 14,
                padding: "28px 24px 24px",
                display: "flex", flexDirection: "column",
                overflowY: "auto",
                alignSelf: "flex-start",
                position: "sticky", top: 0,
              }}
            >
              {/* Profile label */}
              <p style={{
                fontSize: 9, letterSpacing: "0.36em", textTransform: "uppercase",
                color: "rgba(212,175,55,0.52)", marginBottom: 6, fontFamily: "monospace",
              }}>
                Profile
              </p>

              {/* Name */}
              <h3 style={{
                fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "1.5rem", fontWeight: 300,
                color: "rgba(245,235,215,0.95)", letterSpacing: "0.06em",
                marginBottom: 22,
              }}>
                {selected.name}
              </h3>

              {/* Specs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {selected.specs.map((s) => (
                  <div key={s.label}>
                    <p style={{
                      fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
                      color: "rgba(200,185,155,0.38)", marginBottom: 3,
                    }}>
                      {s.label}
                    </p>
                    <p style={{
                      fontSize: 13, color: "rgba(230,215,185,0.84)", letterSpacing: "0.04em",
                    }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Signature quote */}
              <div style={{
                borderTop: "1px solid rgba(212,175,55,0.1)",
                paddingTop: 20, marginBottom: 26,
              }}>
                <p style={{
                  fontSize: 11, lineHeight: 1.75, letterSpacing: "0.04em",
                  color: "rgba(200,185,155,0.56)", fontStyle: "italic",
                  fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                }}>
                  "{selected.signature}"
                </p>
              </div>

              {/* CTA */}
              <motion.button
                onClick={handleConfirm}
                disabled={confirmed}
                whileHover={!confirmed ? {
                  scale: 1.02,
                  boxShadow: "0 0 0 1px rgba(212,175,55,0.65), 0 16px 44px rgba(0,0,0,0.22), 0 0 60px rgba(212,175,55,0.2)",
                } : undefined}
                whileTap={!confirmed ? { scale: 0.97 } : undefined}
                style={{
                  width: "100%", minHeight: 52, borderRadius: 6, border: "none",
                  cursor: confirmed ? "not-allowed" : "pointer",
                  background: confirmed
                    ? "rgba(90,170,110,0.72)"
                    : "linear-gradient(135deg, hsl(43 75% 34%), hsl(45 85% 46%), hsl(43 75% 36%))",
                  color: confirmed ? "rgba(255,255,255,0.92)" : "#1A1410",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                  boxShadow: confirmed
                    ? "none"
                    : "0 0 0 1px rgba(212,175,55,0.32), 0 8px 30px rgba(0,0,0,0.22)",
                  transition: "all 0.32s ease",
                }}
              >
                {confirmed
                  ? `${selected.name} Locked · Proceeding…`
                  : `${config.lockVerb} · ${config.proceedLabel.replace("PROCEED TO ", "")}`}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Back navigation ──────────────────────────────────────── */}
      {onBack && !confirmed && (
        <button
          onClick={onBack}
          style={{
            position: "absolute", bottom: 28, left: 28,
            background: "transparent", border: "none",
            color: "rgba(200,185,155,0.32)", cursor: "pointer",
            fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
            padding: "8px 0",
            transition: "color 0.2s ease",
          }}
        >
          <svg width={9} height={9} viewBox="0 0 9 9" fill="none" style={{ marginRight: 5, verticalAlign: "middle", display: "inline-block" }}>
            <path d="M6 1L2 4.5l4 3.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Previous Session
        </button>
      )}
    </motion.div>
  );
}
