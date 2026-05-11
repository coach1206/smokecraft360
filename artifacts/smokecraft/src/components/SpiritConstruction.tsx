/**
 * SpiritConstruction — PourCraft Steps 10–12.
 *
 * Guest dials in Proof (0–100) and Barrel Finish.
 * The room background shifts in real-time from
 * Pale Gold (#F5D77E, Low Proof) → Deep Mahogany (#1C0500, High Proof).
 * On confirm: saves Palate_DNA → fires ReserveVaultExplosion.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FINISHES = [
  { id: "american-oak",  label: "American Oak",   note: "Vanilla · Caramel · Toasted grain"  },
  { id: "french-oak",    label: "French Oak",      note: "Dried fruit · Subtle spice · Silk"  },
  { id: "ex-bourbon",    label: "Ex-Bourbon",      note: "Rich caramel · Char · Deep vanilla" },
  { id: "ex-sherry",     label: "Ex-Sherry",       note: "Dark fruit · Walnut · Molasses"     },
  { id: "virgin-oak",    label: "Virgin Oak",       note: "Bold tannin · Cedar · Pepper"       },
];

// Interpolate between two hex colors at ratio t [0,1]
function lerpColor(a: string, b: string, t: number): string {
  const h = (s: string) => parseInt(s.slice(1), 16);
  const ar = (h(a) >> 16) & 0xff, ag = (h(a) >> 8) & 0xff, ab = h(a) & 0xff;
  const br = (h(b) >> 16) & 0xff, bg = (h(b) >> 8) & 0xff, bb = h(b) & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2,"0")}${rg.toString(16).padStart(2,"0")}${rb.toString(16).padStart(2,"0")}`;
}

const ROOM_LOW  = "#F5D77E"; // pale gold   — proof = 0
const ROOM_HIGH = "#1C0500"; // deep mahogany — proof = 100

interface Props {
  craftType:  string;
  accent:     string;
  guestName?: string;
  addedTags?: string[];
  onConfirm:  (palate: PalateDNA) => void;
  onSkip:     () => void;
}

export interface PalateDNA {
  proof:        number;
  barrelFinish: string;
  tags:         string[];
  craftType:    string;
  timestamp:    string;
}

export default function SpiritConstruction({ accent, guestName, addedTags = [], onConfirm, onSkip }: Props) {
  const [proof,   setProof]   = useState(40);
  const [finish,  setFinish]  = useState<string | null>(null);
  const [busy,    setBusy]    = useState(false);

  const roomColor = lerpColor(ROOM_LOW, ROOM_HIGH, proof / 100);
  const textLight = proof > 50;

  const handleConfirm = useCallback(async () => {
    if (!finish || busy) return;
    setBusy(true);
    const palate: PalateDNA = {
      proof,
      barrelFinish: finish,
      tags:         addedTags,
      craftType:    "pour",
      timestamp:    new Date().toISOString(),
    };
    // Best-effort save — failure is silent (vault saves non-critically)
    try {
      await fetch("/api/vault/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ palate_dna: palate }),
      });
    } catch { /* silent */ }
    onConfirm(palate);
  }, [finish, proof, addedTags, busy, onConfirm]);

  const accentOnDark = "#FFBF00";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={{
        position:   "fixed",
        inset:      0,
        zIndex:     500,
        background: roomColor,
        transition: "background 0.4s ease",
        display:    "flex",
        flexDirection: "column",
        alignItems:    "center",
        overflowY:     "auto",
        padding:    "48px 24px 80px",
      }}
    >
      {/* Ambient vignette */}
      <div style={{
        position:      "fixed",
        inset:         0,
        background:    "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.52) 100%)",
        pointerEvents: "none",
        zIndex:        0,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: "center", marginBottom: 36 }}
        >
          <p style={{
            fontSize: 10, letterSpacing: "0.30em",
            color: textLight ? "rgba(0,0,0,0.45)" : accentOnDark,
            textTransform: "uppercase", fontWeight: 700, marginBottom: 10,
          }}>
            Spirit Construction · Step 10
          </p>
          <h2 style={{
            fontSize: "clamp(24px,5vw,36px)", fontWeight: 800,
            color: textLight ? "#1C0500" : "#F5D77E",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.04em", marginBottom: 6,
          }}>
            Construct Your Build
          </h2>
          {guestName && (
            <p style={{ fontSize: 12, color: textLight ? "rgba(0,0,0,0.45)" : "rgba(245,215,126,0.55)" }}>
              {guestName}, dial in your final spirit profile.
            </p>
          )}
        </motion.div>

        {/* ── Proof Dial ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: textLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)",
            border:     `1px solid ${textLight ? "rgba(0,0,0,0.12)" : "rgba(255,191,0,0.22)"}`,
            borderRadius: 16, padding: "24px 22px", marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{
              fontSize: 11, letterSpacing: "0.22em", fontWeight: 700,
              color: textLight ? "rgba(0,0,0,0.55)" : "rgba(245,215,126,0.7)",
              textTransform: "uppercase",
            }}>
              Proof
            </span>
            <span style={{
              fontSize: 28, fontWeight: 900,
              color: textLight ? "#1C0500" : accentOnDark,
              fontFamily: "monospace", lineHeight: 1,
            }}>
              {proof}°
            </span>
          </div>

          {/* Slider track */}
          <div style={{ position: "relative", height: 44, display: "flex", alignItems: "center" }}>
            {/* Fill */}
            <div style={{
              position:     "absolute",
              left:         0,
              width:        `${proof}%`,
              height:       6,
              borderRadius: 3,
              background:   `linear-gradient(90deg, ${ROOM_LOW}, ${accentOnDark})`,
              transition:   "width 0.1s",
              pointerEvents:"none",
            }} />
            {/* Track */}
            <div style={{
              position:     "absolute",
              left:  0, right: 0,
              height:       6,
              borderRadius: 3,
              background:   textLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.10)",
              zIndex:       -1,
            }} />
            <input
              type="range"
              min={0}
              max={100}
              value={proof}
              onChange={e => setProof(Number(e.target.value))}
              style={{
                width:      "100%",
                appearance: "none",
                background: "transparent",
                cursor:     "pointer",
                height:     44,
                zIndex:     2,
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {["Low", "Medium", "Cask"].map((l, i) => (
              <span key={l} style={{
                fontSize: 9, letterSpacing: "0.14em",
                color: textLight ? "rgba(0,0,0,0.35)" : "rgba(245,215,126,0.38)",
                textTransform: "uppercase",
                opacity: Math.abs(proof / 50 - i * 0.5) < 0.4 ? 1 : 0.5,
              }}>
                {l}
              </span>
            ))}
          </div>

          {/* Proof descriptor */}
          <AnimatePresence mode="wait">
            <motion.p
              key={proof > 65 ? "bold" : proof > 35 ? "medium" : "light"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 11, fontStyle: "italic", marginTop: 14,
                color: textLight ? "rgba(0,0,0,0.50)" : "rgba(255,191,0,0.60)",
                textAlign: "center",
              }}
            >
              {proof > 65
                ? "Cask strength intensity. Full character. Unapologetic."
                : proof > 35
                ? "Balanced expression. Complexity with accessibility."
                : "Approachable and delicate. Floral, light, inviting."}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* ── Barrel Finish ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{
            fontSize: 10, letterSpacing: "0.22em", fontWeight: 700,
            color: textLight ? "rgba(0,0,0,0.55)" : "rgba(245,215,126,0.7)",
            textTransform: "uppercase", marginBottom: 14,
          }}>
            Barrel Finish
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FINISHES.map((f, i) => {
              const sel = finish === f.id;
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFinish(f.id)}
                  style={{
                    padding:      "16px 18px",
                    borderRadius: 12,
                    background:   sel
                      ? textLight ? "rgba(0,0,0,0.12)" : `${accentOnDark}20`
                      : textLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${sel
                      ? textLight ? "rgba(0,0,0,0.25)" : accentOnDark
                      : textLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.18s, background 0.18s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: sel
                        ? textLight ? "#1C0500" : accentOnDark
                        : textLight ? "rgba(0,0,0,0.70)" : "#F5D77E",
                      fontFamily: "'Playfair Display', serif",
                    }}>
                      {f.label}
                    </span>
                    {sel && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ color: textLight ? "#1C0500" : accentOnDark, fontSize: 18 }}
                      >
                        ◆
                      </motion.span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: textLight ? "rgba(0,0,0,0.42)" : "rgba(245,215,126,0.48)",
                    marginTop: 4, letterSpacing: "0.04em",
                  }}>
                    {f.note}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Confirm CTA ── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          whileTap={{ scale: 0.97 }}
          disabled={!finish || busy}
          onClick={handleConfirm}
          style={{
            width:         "100%",
            padding:       "18px",
            borderRadius:  14,
            background:    finish
              ? `linear-gradient(135deg, ${accentOnDark}, #CC7700)`
              : textLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)",
            border:        finish ? "none" : `1px solid ${textLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
            color:         finish ? "#1C0500" : textLight ? "rgba(0,0,0,0.30)" : "rgba(245,215,126,0.28)",
            fontSize:      14, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            cursor:        finish ? "pointer" : "default",
            boxShadow:     finish ? `0 0 40px ${accentOnDark}55, 0 8px 28px rgba(0,0,0,0.45)` : "none",
            transition:    "all 0.25s ease",
          }}
        >
          {busy ? "Sealing the Vault…" : "Enter the Reserve Vault →"}
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          onClick={onSkip}
          style={{
            width: "100%", marginTop: 12, padding: "12px",
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, letterSpacing: "0.14em",
            color: textLight ? "rgba(0,0,0,0.30)" : "rgba(245,215,126,0.30)",
          }}
        >
          Skip to results
        </motion.button>
      </div>
    </motion.div>
  );
}
