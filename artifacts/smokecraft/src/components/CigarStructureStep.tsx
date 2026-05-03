/**
 * Cigar Structure step — single-screen vitola + session-length picker.
 *
 * Why this exists:
 * Without a physical-shape signal, the engine recommends purely on flavor /
 * strength / mood — the resulting cigar may be a perfect taste match in the
 * wrong size for the guest's session. This step closes that gap by capturing
 * the guest's vitola preference and the time they want to spend smoking,
 * both of which feed the server scorer.
 *
 * Design decisions:
 * - SVG silhouettes, NOT photos. Vitolas are defined by length × ring-gauge
 *   ratios; silhouettes show this geometry far better than stock photos and
 *   are 100% giraffe-proof (re: the Unsplash ID rotation incident).
 * - 6 vitolas, not 11. The 5 advanced figurados (Pyramid, Perfecto, Lancero,
 *   Gordo, Box-Pressed) defer to a later "more shapes" expansion.
 * - Single screen. Brief's Section 3 (ring gauge) and Section 4 (draw style,
 *   user-marked OPTIONAL) are derived from shape per the brief's own logic
 *   mapping: robusto→thick, lancero→thin, etc.
 * - Cigar flow only. Spirits guests never see this step (Home.tsx skips
 *   formStep 1 when category === "alcohol").
 */

import { useState } from "react";
import { motion } from "framer-motion";
import type { CigarShape, CigarSession } from "../services/storage";
import { haptic } from "../utils/haptics";

/* Locked vitola product photography. Bundled by Vite via @assets so the
 * picker always shows real cigar imagery — Cloudinary venue overrides were
 * tried previously but the cloud is empty and a network-dependent default
 * regressed the kiosk to "loading boxes" (see replit.md "Cigar Structure
 * Step Imagery"). These hand-vetted PNGs each show the right vitola: parejo
 * for robusto/corona/toro/churchill, sharp tapered head for torpedo, and a
 * shorter softer-tipped belicoso. To replace any image, regenerate the
 * file at the same path — no code edit needed. */
import robustoImg   from "@assets/locked_cards/vitola_robusto.png";
import coronaImg    from "@assets/locked_cards/vitola_corona.png";
import toroImg      from "@assets/locked_cards/vitola_toro.png";
import churchillImg from "@assets/locked_cards/vitola_churchill.png";
import torpedoImg   from "@assets/locked_cards/vitola_torpedo.png";
import belicosoImg  from "@assets/locked_cards/vitola_belicoso.png";

const VITOLA_PHOTOS: Record<CigarShape, string> = {
  robusto:   robustoImg,
  corona:    coronaImg,
  toro:      toroImg,
  churchill: churchillImg,
  torpedo:   torpedoImg,
  belicoso:  belicosoImg,
};

interface CigarStructureStepProps {
  /** Pre-selected shape (from returning guest's saved cigarProfile). */
  initialShape?:   CigarShape;
  /** Pre-selected session length (from returning guest's saved cigarProfile). */
  initialSession?: CigarSession;
  /** Fired when both shape + session are chosen and the guest taps Continue. */
  onComplete:      (shape: CigarShape, session: CigarSession) => void;
  /** Fired when the guest taps Back. */
  onBack:          () => void;
  /** Sets the dynamic background scene key when a shape is focused. */
  onShapeFocus?:   (shape: CigarShape) => void;
}

const VITOLA_GEOMETRY: Record<CigarShape, {
  label:    string;
  blurb:    string;
  length:   number;
  ring:     number;
  tapered?: "head";
}> = {
  robusto:   { label: "Robusto",   blurb: "Short, thick · ~30–45 min",  length: 90,  ring: 28 },
  corona:    { label: "Corona",    blurb: "Balanced classic · ~45 min", length: 110, ring: 24 },
  toro:      { label: "Toro",      blurb: "Longer, smoother · ~75 min", length: 120, ring: 28 },
  churchill: { label: "Churchill", blurb: "Slow burn · ~90 min",        length: 140, ring: 26 },
  torpedo:   { label: "Torpedo",   blurb: "Tapered head · focused",     length: 120, ring: 30, tapered: "head" },
  belicoso:  { label: "Belicoso",  blurb: "Short tapered · intense",    length: 100, ring: 28, tapered: "head" },
};

const SESSION_OPTIONS: { value: CigarSession; label: string; sub: string }[] = [
  { value: "quick",     label: "Quick",     sub: "20–30 min" },
  { value: "standard",  label: "Standard",  sub: "45–60 min" },
  { value: "extended",  label: "Extended",  sub: "60–90 min" },
  { value: "long",      label: "Long",      sub: "90+ min"   },
];

/**
 * SVG vitola silhouette. Renders length × ring as a wrapper-colored body
 * with a glowing lit foot, an optional tapered head (figurados), and a gold
 * band near the head. Proportions scaled uniformly so all six fit cleanly.
 */
function VitolaSilhouette({ shape }: { shape: CigarShape }) {
  const g = VITOLA_GEOMETRY[shape];
  const w = 180;
  const h = 60;
  const bodyW = (g.length / 140) * 150;
  const bodyH = (g.ring / 30) * 26;
  const cy = h / 2;
  const xStart = (w - bodyW) / 2;
  const xEnd   = xStart + bodyW;
  const halfH  = bodyH / 2;
  const headRadius = g.tapered ? halfH * 0.35 : halfH;

  const path = g.tapered
    ? `M ${xStart} ${cy - halfH}
       L ${xEnd - bodyW * 0.18} ${cy - halfH}
       Q ${xEnd} ${cy - halfH * 0.6} ${xEnd} ${cy}
       Q ${xEnd} ${cy + halfH * 0.6} ${xEnd - bodyW * 0.18} ${cy + halfH}
       L ${xStart} ${cy + halfH}
       Q ${xStart - halfH} ${cy + halfH * 0.6} ${xStart - halfH} ${cy}
       Q ${xStart - halfH} ${cy - halfH * 0.6} ${xStart} ${cy - halfH} Z`
    : `M ${xStart + halfH * 0.2} ${cy - halfH}
       L ${xEnd - headRadius} ${cy - halfH}
       Q ${xEnd} ${cy - halfH} ${xEnd} ${cy - halfH + headRadius}
       L ${xEnd} ${cy + halfH - headRadius}
       Q ${xEnd} ${cy + halfH} ${xEnd - headRadius} ${cy + halfH}
       L ${xStart + halfH * 0.2} ${cy + halfH}
       Q ${xStart - halfH * 0.4} ${cy + halfH * 0.6} ${xStart - halfH * 0.4} ${cy}
       Q ${xStart - halfH * 0.4} ${cy - halfH * 0.6} ${xStart + halfH * 0.2} ${cy - halfH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="56" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id={`glow-${shape}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <linearGradient id={`wrap-${shape}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0"   stopColor="rgba(120,75,35,0.95)" />
          <stop offset="0.3" stopColor="rgba(160,100,50,0.95)" />
          <stop offset="1"   stopColor="rgba(90,55,28,0.95)" />
        </linearGradient>
      </defs>
      <circle cx={xStart - halfH * 0.2} cy={cy} r={2.5} fill="rgba(255,140,40,0.85)" filter={`url(#glow-${shape})`} />
      <path d={path} fill={`url(#wrap-${shape})`} stroke="rgba(60,35,18,0.7)" strokeWidth="0.6" />
      <rect
        x={xEnd - bodyW * 0.32}
        y={cy - halfH}
        width={bodyW * 0.10}
        height={bodyH}
        fill="rgba(212,175,55,0.85)"
        stroke="rgba(160,120,30,0.8)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function CigarStructureStep({
  initialShape = "toro",
  initialSession = "standard",
  onComplete,
  onBack,
  onShapeFocus,
}: CigarStructureStepProps) {
  const [shape,   setShape]   = useState<CigarShape>(initialShape);
  const [session, setSession] = useState<CigarSession>(initialSession);
  /* Paranoia safety net: bundled images "should never" 404 since Vite
   * fingerprints them at build time, but if anything ever goes sideways
   * (asset deleted, build glitch, decode failure) the card transparently
   * falls back to the SVG silhouette so the kiosk picker stays usable. */
  const [failedPhotos, setFailedPhotos] = useState<Set<CigarShape>>(() => new Set());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Vitola grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          width: "100%",
        }}
        data-testid="vitola-grid"
      >
        {(Object.keys(VITOLA_GEOMETRY) as CigarShape[]).map((s) => {
          const isSel = shape === s;
          const meta  = VITOLA_GEOMETRY[s];
          return (
            <motion.button
              key={s}
              data-testid={`vitola-${s}`}
              onClick={() => {
                haptic.select();
                setShape(s);
                onShapeFocus?.(s);
              }}
              whileHover={{ scale: 1.025 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                borderColor: isSel ? "rgba(212,175,55,0.85)" : "rgba(212,175,55,0.18)",
                boxShadow:   isSel
                  ? "0 0 0 3px rgba(212,175,55,0.18), 0 8px 24px rgba(0,0,0,0.45)"
                  : "0 4px 14px rgba(0,0,0,0.30)",
              }}
              style={{
                padding: "16px 14px 14px",
                borderRadius: 14,
                border: "1.5px solid rgba(212,175,55,0.18)",
                background: isSel
                  ? "linear-gradient(135deg, rgba(60,40,20,0.55), rgba(30,20,10,0.55))"
                  : "rgba(20,15,10,0.45)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 130,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                appearance: "none",
              }}
            >
              {failedPhotos.has(s) ? (
                <VitolaSilhouette shape={s} />
              ) : (
                <img
                  src={VITOLA_PHOTOS[s]}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  onError={() => {
                    setFailedPhotos((prev) => {
                      if (prev.has(s)) return prev;
                      const next = new Set(prev);
                      next.add(s);
                      return next;
                    });
                  }}
                  style={{
                    width: "100%",
                    height: 70,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid rgba(212,175,55,0.18)",
                    background: "rgba(20,15,10,0.6)",
                    display: "block",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  className="font-serif"
                  style={{
                    fontSize: 16,
                    color: isSel ? "rgba(245,215,135,0.95)" : "rgba(245,235,221,0.85)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {meta.label}
                </span>
                <span style={{ fontSize: 11, color: "rgba(210,190,155,0.5)" }}>{meta.blurb}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Session length chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <p
          style={{
            color: "rgba(212,175,55,0.55)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          How long do you want to smoke?
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
          data-testid="session-grid"
        >
          {SESSION_OPTIONS.map((opt) => {
            const isSel = session === opt.value;
            return (
              <motion.button
                key={opt.value}
                data-testid={`session-${opt.value}`}
                onClick={() => {
                  haptic.tap();
                  setSession(opt.value);
                }}
                whileTap={{ scale: 0.96 }}
                animate={{
                  borderColor: isSel ? "rgba(212,175,55,0.78)" : "rgba(212,175,55,0.16)",
                  background:  isSel ? "rgba(212,175,55,0.14)" : "rgba(20,15,10,0.4)",
                }}
                style={{
                  padding: "11px 8px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(212,175,55,0.16)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  appearance: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: isSel ? "rgba(245,215,135,0.95)" : "rgba(245,235,221,0.78)",
                  }}
                >
                  {opt.label}
                </span>
                <span style={{ fontSize: 10, color: "rgba(210,190,155,0.5)" }}>{opt.sub}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(210,190,155,0.45)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "12px 16px",
          }}
        >
          ← Back
        </button>
        <motion.button
          data-testid="vitola-continue"
          onClick={() => {
            haptic.select();
            onComplete(shape, session);
          }}
          whileHover={{ boxShadow: "0 0 32px rgba(212,175,55,0.32)" }}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            padding: "14px 22px",
            borderRadius: 12,
            border: "1px solid rgba(212,175,55,0.6)",
            background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
            color: "hsl(22 18% 6%)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            appearance: "none",
          }}
        >
          Continue · Choose Flavors
        </motion.button>
      </div>
    </div>
  );
}
