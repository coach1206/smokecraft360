/**
 * CigarBoxPreview
 *
 * SVG-based live preview of a custom cigar box design. Renders two
 * companion views side by side:
 *   • top-down (lid graphic + label text + finish sheen)
 *   • angled  (3/4 perspective showing wood tone + lid)
 *
 * Used inside the signature-cigar designer modal alongside CigarBandPreview.
 */

import { motion } from "framer-motion";

export type WoodTone =
  | "mahogany" | "walnut" | "cedar" | "ebony" | "maple";

export type FinishStyle = "matte" | "gloss" | "embossed";

export type LogoPlacement = "top-center" | "top-left" | "side-panel";

export interface BoxDesignPreview {
  boxColor:           string;            // hex / named color (used as label panel)
  woodTone:           WoodTone;          // exterior box body
  logoUrl?:           string | null;     // optional uploaded logo
  logoPlacement:      LogoPlacement;
  labelText:          string;
  limitedEditionName: string;
  finishStyle:        FinishStyle;
}

const WOOD_GRADIENTS: Record<WoodTone, [string, string, string]> = {
  mahogany: ["#5A2A1A", "#7B3A24", "#3E1B0E"],
  walnut:   ["#4B2E1F", "#6B452F", "#2E1A10"],
  cedar:    ["#A56B3E", "#C68953", "#7A4828"],
  ebony:    ["#1B1410", "#2E2520", "#0B0806"],
  maple:    ["#C99A6E", "#E0B98B", "#9C7048"],
};

const FINISH_OVERLAY: Record<FinishStyle, string> = {
  matte:     "rgba(0,0,0,0)",
  gloss:     "linear-gradient(120deg, rgba(26,26,27,0.20) 0%, transparent 40%, rgba(255,255,255,0.1) 80%)",
  embossed:  "linear-gradient(120deg, rgba(26,26,27,0.04) 0%, transparent 50%, rgba(26,26,27,0.10) 100%)",
};

interface Props {
  design: BoxDesignPreview;
  size?: "sm" | "md" | "lg";
}

export function CigarBoxPreview({ design, size = "md" }: Props) {
  const dims = size === "sm" ? 140 : size === "lg" ? 260 : 200;
  const [light, mid, dark] = WOOD_GRADIENTS[design.woodTone];

  return (
    <div className="flex items-end gap-5">
      {/* ── Top-down view ───────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <motion.svg
          width={dims}
          height={dims * 0.62}
          viewBox="0 0 200 124"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <defs>
            <linearGradient id={`wood-${design.woodTone}-top`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor={light} />
              <stop offset="55%" stopColor={mid} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>
            <linearGradient id="grain-top" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="rgba(0,0,0,0.0)" />
              <stop offset="50%"  stopColor="rgba(26,26,27,0.04)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.0)" />
            </linearGradient>
          </defs>

          {/* Box body */}
          <rect x="6" y="6" width="188" height="112" rx="6" fill={`url(#wood-${design.woodTone}-top)`} />
          {/* Faint grain lines */}
          {[20, 40, 60, 80, 100].map((y) => (
            <rect key={y} x="6" y={y} width="188" height="1.5" fill="url(#grain-top)" opacity="0.5" />
          ))}

          {/* Label panel — colored inset on lid */}
          <rect
            x={design.logoPlacement === "top-left" ? 14 : 50}
            y="34"
            width={design.logoPlacement === "side-panel" ? 60 : 100}
            height="56"
            rx="3"
            fill={design.boxColor}
            opacity="0.92"
            stroke="rgba(26,26,27,0.05)"
            strokeWidth="0.6"
          />

          {/* Logo (if provided) — render as <image> */}
          {design.logoUrl && (
            <image
              href={design.logoUrl}
              x={design.logoPlacement === "top-left" ? 18 : 60}
              y="38"
              width="40"
              height="40"
              preserveAspectRatio="xMidYMid meet"
            />
          )}

          {/* Label text */}
          <text
            x={design.logoPlacement === "top-left" ? 64 : 100}
            y="64"
            textAnchor={design.logoPlacement === "top-left" ? "start" : "middle"}
            fontFamily="'Cormorant Garamond', serif"
            fontSize="9"
            fill="rgba(255,255,255,0.92)"
            letterSpacing="1.6"
          >
            {(design.labelText || "BRAND").toUpperCase().slice(0, 18)}
          </text>
          <text
            x={design.logoPlacement === "top-left" ? 64 : 100}
            y="78"
            textAnchor={design.logoPlacement === "top-left" ? "start" : "middle"}
            fontFamily="'Cormorant Garamond', serif"
            fontSize="6.5"
            fill="rgba(255,255,255,0.75)"
            fontStyle="italic"
            letterSpacing="0.8"
          >
            {design.limitedEditionName || "Reserve No. 1"}
          </text>

          {/* Finish overlay (gloss/embossed sheen) */}
          {design.finishStyle !== "matte" && (
            <rect
              x="6" y="6" width="188" height="112" rx="6"
              fill="url(#sheen)"
              opacity={design.finishStyle === "gloss" ? 0.35 : 0.22}
            />
          )}
          <defs>
            <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="rgba(255,255,255,0.4)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
        </motion.svg>
        <p className="mt-2 text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(107,94,78,0.40)" }}>
          Top
        </p>
      </div>

      {/* ── Angled 3/4 view ─────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <motion.svg
          width={dims * 0.85}
          height={dims * 0.7}
          viewBox="0 0 170 140"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <defs>
            <linearGradient id={`wood-${design.woodTone}-side`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={mid} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>
            <linearGradient id={`wood-${design.woodTone}-front`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={dark} />
              <stop offset="100%" stopColor="#1A1A1B" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Front panel */}
          <polygon points="20,55 130,55 130,125 20,125" fill={`url(#wood-${design.woodTone}-front)`} />
          {/* Side panel (right) */}
          <polygon points="130,55 158,40 158,110 130,125" fill={`url(#wood-${design.woodTone}-side)`} opacity="0.92" />
          {/* Top (lid) */}
          <polygon points="20,55 130,55 158,40 48,40" fill={`url(#wood-${design.woodTone}-top)`} />

          {/* Label inset on top of angled lid */}
          <polygon
            points="60,46 118,46 134,38 76,38"
            fill={design.boxColor}
            opacity="0.92"
          />

          {/* Side label (when side-panel placement) */}
          {design.logoPlacement === "side-panel" && (
            <rect x="135" y="65" width="20" height="40" fill={design.boxColor} opacity="0.85" />
          )}

          {/* Front label text */}
          <text
            x="75"
            y="92"
            fontFamily="'Cormorant Garamond', serif"
            fontSize="11"
            fill="rgba(230,210,175,0.9)"
            letterSpacing="2.2"
            textAnchor="middle"
          >
            {(design.labelText || "BRAND").toUpperCase().slice(0, 14)}
          </text>
          <text
            x="75" y="108"
            fontFamily="'Cormorant Garamond', serif"
            fontSize="6"
            fill="rgba(212,139,0,0.8)"
            fontStyle="italic"
            textAnchor="middle"
            letterSpacing="0.6"
          >
            {design.limitedEditionName || "Reserve No. 1"}
          </text>
        </motion.svg>
        <p className="mt-2 text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(107,94,78,0.40)" }}>
          Angled
        </p>
      </div>

      {/* Inline CSS for finish sheen overlay (applied via parent wrapper) */}
      <style>{`
        .box-finish-${design.finishStyle} {
          background: ${FINISH_OVERLAY[design.finishStyle]};
        }
      `}</style>
    </div>
  );
}
