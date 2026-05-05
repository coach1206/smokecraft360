import { useState, useEffect, useRef } from "react";
import { motion, useAnimation, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

export type LiveCraft = "smoke" | "brew" | "pour" | "vape";

export interface LiveMeters { flavor: number; strength: number; balance: number }

interface Props {
  craft:        LiveCraft;
  accentColor:  string;
  /** Derived from selectedStyle.gradient — drives the product silhouette fill color. */
  dynamicColor: string;
  score:        number;
  prevScore:    number;
  meters:       LiveMeters;
  styleLabel:   string;
  moodLabel:    string;
  visible:      boolean;
}

const IDLE_SHADOW = "0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(200,180,120,0.18)";

function buildVariants(accent: string): Variants {
  return {
    idle: {
      x: 0,
      boxShadow: IDLE_SHADOW,
    },
    shake: {
      x: [0, -9, 9, -6, 6, -3, 3, 0],
      boxShadow: `0 8px 40px rgba(0,0,0,0.65), 0 0 0 2px rgba(220,60,60,0.72)`,
      transition: { x: { duration: 0.42, times: [0, 0.14, 0.29, 0.43, 0.57, 0.72, 0.86, 1] } },
    },
    glowPulse: {
      x: 0,
      boxShadow: [
        IDLE_SHADOW,
        `0 8px 60px rgba(0,0,0,0.7), 0 0 0 2px ${accent}CC, 0 0 55px ${accent}50`,
        `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accent}44`,
      ],
      transition: { duration: 0.88 },
    },
    flickerRed: {
      x: 0,
      boxShadow: [
        `0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(220,60,60,0.1)`,
        `0 8px 40px rgba(0,0,0,0.65), 0 0 0 2px rgba(220,60,60,0.82)`,
        `0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(220,60,60,0.1)`,
        `0 8px 40px rgba(0,0,0,0.65), 0 0 0 2px rgba(220,60,60,0.72)`,
        IDLE_SHADOW,
      ],
      transition: { duration: 0.72 },
    },
  };
}

function CigarSilhouette({ a }: { a: string }) {
  return (
    <svg width="210" height="50" viewBox="0 0 210 50" fill="none">
      <defs>
        <linearGradient id="cg-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={a} stopOpacity="0.38"/>
          <stop offset="65%"  stopColor={a} stopOpacity="0.06"/>
          <stop offset="100%" stopColor={a} stopOpacity="0.14"/>
        </linearGradient>
      </defs>
      <rect x="2"   y="15" width="172" height="20" rx="10" fill="url(#cg-body)"  stroke={a + "60"} strokeWidth="1.5"/>
      <rect x="170" y="12" width="36"  height="26" rx="5"  fill={a + "30"}       stroke={a + "60"} strokeWidth="1.5"/>
      <line x1="170" y1="15" x2="170" y2="35" stroke={a + "40"} strokeWidth="1"/>
      <rect x="174" y="20" width="26"  height="10" rx="3"  fill={a + "28"}/>
    </svg>
  );
}

function GlassSilhouette({ a }: { a: string }) {
  return (
    <svg width="110" height="165" viewBox="0 0 110 165" fill="none">
      <path d="M18,18 L92,18 L78,122 L32,122 Z" fill={a + "1A"} stroke={a + "58"} strokeWidth="1.5"/>
      <path d="M32,122 L78,122 L78,136 L32,136 Z" fill={a + "28"} stroke={a + "58"} strokeWidth="1.5"/>
      <rect x="36" y="136" width="38" height="10" rx="4" fill={a + "35"} stroke={a + "58"} strokeWidth="1.5"/>
      <path d="M24,78 L86,78 L78,122 L32,122 Z"   fill={a + "28"}/>
      <line x1="22" y1="78" x2="88" y2="78" stroke={a + "80"} strokeWidth="1.5"/>
    </svg>
  );
}

function BottleSilhouette({ a }: { a: string }) {
  return (
    <svg width="80" height="182" viewBox="0 0 80 182" fill="none">
      <rect x="28" y="8"  width="24" height="32" rx="4"  fill={a + "28"} stroke={a + "58"} strokeWidth="1.5"/>
      <path d="M18,40 Q16,58 13,76 L13,156 Q13,170 40,170 Q67,170 67,156 L67,76 Q64,58 62,40 Z"
        fill={a + "1A"} stroke={a + "58"} strokeWidth="1.5"/>
      <rect x="16" y="94" width="48" height="44" rx="5"  fill={a + "28"} stroke={a + "50"} strokeWidth="1"/>
      <path d="M18,68 Q16,76 13,84 L67,84 Q64,76 62,68 Z" fill={a + "35"}/>
      <rect x="24" y="5"  width="32" height="8"  rx="3"  fill={a + "40"} stroke={a + "60"} strokeWidth="1"/>
    </svg>
  );
}

function VapeSilhouette({ a }: { a: string }) {
  return (
    <svg width="56" height="182" viewBox="0 0 56 182" fill="none">
      <rect x="8"  y="12"  width="40" height="152" rx="10" fill={a + "1A"} stroke={a + "58"} strokeWidth="1.5"/>
      <rect x="14" y="28"  width="28" height="40"  rx="5"  fill={a + "28"} stroke={a + "40"} strokeWidth="1"/>
      <rect x="12" y="88"  width="32" height="14"  rx="7"  fill={a + "35"} stroke={a + "60"} strokeWidth="1.5"/>
      <rect x="14" y="7"   width="28" height="10"  rx="5"  fill={a + "30"} stroke={a + "58"} strokeWidth="1.5"/>
      <circle cx="28" cy="150" r="5" fill={a + "55"} stroke={a + "80"} strokeWidth="1"/>
    </svg>
  );
}

function Silhouette({ craft, a }: { craft: LiveCraft; a: string }) {
  if (craft === "smoke") return <CigarSilhouette a={a} />;
  if (craft === "pour")  return <GlassSilhouette a={a} />;
  if (craft === "brew")  return <BottleSilhouette a={a} />;
  return <VapeSilhouette a={a} />;
}

function Meter({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{
          fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(232,224,200,0.45)", fontWeight: 600,
        }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${accent}80, ${accent})`,
          }}
        />
      </div>
    </div>
  );
}

export default function LivePreviewPanel({
  craft, accentColor, dynamicColor, score, prevScore, meters, styleLabel, moodLabel, visible,
}: Props) {
  const [isOpen, setIsOpen]   = useState(true);
  const controls              = useAnimation();
  const variants              = buildVariants(accentColor);
  const mountedRef            = useRef(false);
  const delta  = score - prevScore;
  const isGood = delta >= 10;
  const isBad  = delta <= -10;

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (isGood) {
      void controls.start("glowPulse").then(() => controls.start("idle"));
    } else if (isBad) {
      void controls.start("shake")
        .then(() => controls.start("flickerRed"))
        .then(() => controls.start("idle"));
    } else {
      void controls.start("idle");
    }
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const W = 278;
  const scoreBarBg = isBad
    ? "linear-gradient(90deg, rgba(150,25,25,0.8), rgba(210,70,70,0.95))"
    : `linear-gradient(90deg, ${accentColor}80, ${accentColor})`;

  return (
    <div
      style={{
        position:   "fixed",
        right:      isOpen ? 0 : -W,
        top:        "50%",
        transform:  "translateY(-50%)",
        zIndex:     90,
        display:    "flex",
        alignItems: "stretch",
        transition: "right 0.32s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {/* Collapse / expand tab */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? "Collapse live preview" : "Expand live preview"}
        style={{
          width:               28,
          flexShrink:          0,
          background:          "rgba(10,8,6,0.84)",
          border:              `1px solid ${accentColor}30`,
          borderRight:         isOpen ? "none" : undefined,
          borderRadius:        isOpen ? "10px 0 0 10px" : "10px",
          cursor:              "pointer",
          color:               accentColor,
          display:             "flex",
          flexDirection:       "column",
          alignItems:          "center",
          justifyContent:      "center",
          gap:                 6,
          backdropFilter:      "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        <span style={{
          fontSize:     7,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          writingMode:  "vertical-rl",
          color:         accentColor,
          fontWeight:   700,
          opacity:      0.65,
        }}>
          Preview
        </span>
      </button>

      {/* Panel body */}
      <motion.div
        animate={controls}
        variants={variants}
        initial="idle"
        style={{
          width:               W,
          maxHeight:           "88vh",
          overflowY:           "auto",
          background:          "rgba(10,8,6,0.86)",
          backdropFilter:      "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          padding:             "18px 16px 22px",
          display:             "flex",
          flexDirection:       "column",
          gap:                 14,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{
              margin: 0, fontSize: 9, letterSpacing: "0.3em",
              textTransform: "uppercase", color: accentColor, fontWeight: 700,
            }}>
              Live Preview
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(232,224,200,0.5)" }}>
              {styleLabel
                ? <><span style={{ color: "rgba(232,224,200,0.8)" }}>{styleLabel}</span>{moodLabel ? ` · ${moodLabel}` : ""}</>
                : "Select a style to begin"}
            </p>
          </div>

          {(isGood || isBad) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           4,
                padding:       "4px 8px",
                borderRadius:  999,
                background:    isGood ? `${accentColor}1E` : "rgba(220,55,55,0.18)",
                border:        `1px solid ${isGood ? accentColor + "55" : "rgba(220,55,55,0.45)"}`,
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: "0.1em",
                color:         isGood ? accentColor : "rgba(220,110,110,0.9)",
                whiteSpace:    "nowrap",
              }}
            >
              {isGood ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {isGood ? "GREAT COMBO" : "WEAK PAIRING"}
            </motion.div>
          )}
        </div>

        {/* Silhouette */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      120,
          padding:        "12px 0",
          background:     "rgba(255,255,255,0.015)",
          border:         `1px solid ${accentColor}18`,
          borderRadius:   14,
        }}>
          <Silhouette craft={craft} a={dynamicColor} />
        </div>

        {/* Score bar */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-end", marginBottom: 7,
          }}>
            <span style={{
              fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
              color: "rgba(232,224,200,0.45)", fontWeight: 600,
            }}>
              Craft Score
            </span>
            <motion.span
              key={score}
              initial={{ y: delta >= 0 ? 6 : -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.38 }}
              style={{
                fontSize: 24, fontWeight: 700, color: accentColor,
                lineHeight: 1, fontVariantNumeric: "tabular-nums",
              }}
            >
              {score}
            </motion.span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: "100%", borderRadius: 3, background: scoreBarBg }}
            />
          </div>
        </div>

        {/* Meter bars */}
        <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
          <Meter label="Flavor"   value={meters.flavor}   accent={accentColor} />
          <Meter label="Strength" value={meters.strength} accent={accentColor} />
          <Meter label="Balance"  value={meters.balance}  accent={accentColor} />
        </div>

        {/* Bad combo warning */}
        {isBad && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding:      "9px 11px",
              borderRadius: 10,
              background:   "rgba(180,28,28,0.16)",
              border:       "1px solid rgba(220,60,60,0.32)",
              fontSize:     11,
              color:        "rgba(220,130,130,0.9)",
              lineHeight:   1.55,
            }}
          >
            This combination pulls the profile off-balance. Try a different style or mood for a stronger score.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
