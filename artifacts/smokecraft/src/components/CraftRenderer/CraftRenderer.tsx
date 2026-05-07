/**
 * CraftRenderer — Layered drink rendering engine for PourCraft & BrewCraft.
 * Renders stacked SVG layers: glass outline → liquid fill → ice → foam → bubbles → garnish → shine.
 * viewBox: 0 0 140 220 (all glass shapes share this space).
 */
import { useMemo, useId } from "react";
import { motion } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

type GlassShape = "rocks" | "highball" | "coupe" | "snifter" | "pint" | "mug" | "tulip" | "pilsner";
type GarnishType = "none" | "orange" | "cherry" | "lemon" | "herb";
type FoamLevel = "none" | "thin" | "thick";

export interface CraftRendererProps {
  craft:      "pour" | "brew";
  styleId?:   string;
  moodId?:    string;
  accentColor: string;
  /** 0–100 fill percentage; defaults to 62 */
  fillLevel?: number;
  /** Pixel width of the rendered SVG */
  width?: number;
}

// ── Drink spec ─────────────────────────────────────────────────────────────────

interface DrinkSpec {
  glass:          GlassShape;
  liquidColor:    string;
  liquidOpacity:  number;
  garnish:        GarnishType;
  foam:           FoamLevel;
  hasBubbles:     boolean;
  hasIce:         boolean;
  /** Override fill level if undefined by caller */
  defaultFill:    number;
}

function getDrinkSpec(craft: "pour" | "brew", styleId: string): DrinkSpec {
  if (craft === "pour") {
    switch (styleId) {
      case "smooth": return { glass: "rocks",    liquidColor: "#C89540", liquidOpacity: 0.84, garnish: "orange", foam: "none",  hasBubbles: false, hasIce: true,  defaultFill: 60 };
      case "spicy":  return { glass: "highball", liquidColor: "#A84A20", liquidOpacity: 0.80, garnish: "cherry", foam: "none",  hasBubbles: false, hasIce: true,  defaultFill: 68 };
      case "smoky":  return { glass: "snifter",  liquidColor: "#6A3418", liquidOpacity: 0.88, garnish: "herb",   foam: "none",  hasBubbles: false, hasIce: false, defaultFill: 45 };
      case "rich":   return { glass: "coupe",    liquidColor: "#822A1A", liquidOpacity: 0.82, garnish: "lemon",  foam: "none",  hasBubbles: false, hasIce: false, defaultFill: 64 };
      default:       return { glass: "rocks",    liquidColor: "#C89540", liquidOpacity: 0.78, garnish: "orange", foam: "none",  hasBubbles: false, hasIce: true,  defaultFill: 60 };
    }
  } else {
    switch (styleId) {
      case "light": return { glass: "pilsner", liquidColor: "#F0D860", liquidOpacity: 0.88, garnish: "lemon",  foam: "thin",  hasBubbles: true,  hasIce: false, defaultFill: 72 };
      case "amber": return { glass: "pint",    liquidColor: "#C87028", liquidOpacity: 0.86, garnish: "none",   foam: "thin",  hasBubbles: true,  hasIce: false, defaultFill: 70 };
      case "ipa":   return { glass: "tulip",   liquidColor: "#E09038", liquidOpacity: 0.84, garnish: "lemon",  foam: "thick", hasBubbles: true,  hasIce: false, defaultFill: 68 };
      case "dark":  return { glass: "mug",     liquidColor: "#1C0E06", liquidOpacity: 0.94, garnish: "none",   foam: "thick", hasBubbles: true,  hasIce: false, defaultFill: 72 };
      default:      return { glass: "pint",    liquidColor: "#C87028", liquidOpacity: 0.82, garnish: "none",   foam: "thin",  hasBubbles: true,  hasIce: false, defaultFill: 70 };
    }
  }
}

// ── Glass geometry ─────────────────────────────────────────────────────────────

interface GlassGeo {
  /** Clip path for the liquid (SVG points string for polygon, or "d=…" for path) */
  clip:         { type: "polygon"; points: string } | { type: "path"; d: string };
  /** Outer glass outline (drawn on TOP of liquid) */
  outline:      { type: "polygon"; points: string } | { type: "path"; d: string };
  /** Optional stem path */
  stem?:        string;
  /** Optional base path */
  base?:        string;
  /** Optional handle path (mug) */
  handle?:      string;
  /** Top rim y-coord */
  rimY:         number;
  /** Bottom of fillable area y-coord */
  fillBottomY:  number;
  /** Left x bound of the liquid rect */
  fillX:        number;
  /** Width of the liquid rect */
  fillW:        number;
  /** Shine line (x1,y1 → x2,y2) */
  shineLine:    [number, number, number, number];
  /** Garnish position */
  garnishX:     number;
  garnishY:     number;
}

const GLASS_GEO: Record<GlassShape, GlassGeo> = {
  rocks: {
    clip:        { type: "polygon", points: "26,92 114,92 108,180 32,180" },
    outline:     { type: "polygon", points: "23,89 117,89 111,183 29,183" },
    rimY:        92,
    fillBottomY: 180,
    fillX:       26,
    fillW:       88,
    shineLine:   [32, 96, 38, 175],
    garnishX:    108,
    garnishY:    89,
  },
  highball: {
    clip:        { type: "polygon", points: "46,30 94,30 100,186 40,186" },
    outline:     { type: "polygon", points: "43,27 97,27 103,189 37,189" },
    rimY:        30,
    fillBottomY: 186,
    fillX:       46,
    fillW:       48,
    shineLine:   [47, 34, 50, 182],
    garnishX:    91,
    garnishY:    27,
  },
  coupe: {
    clip: {
      type: "path",
      d: "M 16,62 L 124,62 Q 112,124 70,130 Q 28,124 16,62 Z",
    },
    outline: {
      type: "path",
      d: "M 13,59 L 127,59 Q 115,126 70,133 Q 25,126 13,59 Z",
    },
    stem:        "M 66,133 L 74,133 L 72,188 L 68,188 Z",
    base:        "M 38,188 L 102,188 L 102,195 L 38,195 Z",
    rimY:        62,
    fillBottomY: 130,
    fillX:       16,
    fillW:       108,
    shineLine:   [20, 66, 26, 125],
    garnishX:    120,
    garnishY:    59,
  },
  snifter: {
    clip: {
      type: "path",
      d: "M 52,54 L 88,54 Q 122,88 120,138 Q 118,170 84,175 L 56,175 Q 22,170 20,138 Q 18,88 52,54 Z",
    },
    outline: {
      type: "path",
      d: "M 50,51 L 90,51 Q 124,85 122,138 Q 120,172 84,178 L 56,178 Q 20,172 18,138 Q 16,85 50,51 Z",
    },
    stem:        "M 65,178 L 75,178 L 73,196 L 67,196 Z",
    base:        "M 40,196 L 100,196 L 100,203 L 40,203 Z",
    rimY:        54,
    fillBottomY: 175,
    fillX:       18,
    fillW:       104,
    shineLine:   [24, 92, 30, 168],
    garnishX:    88,
    garnishY:    51,
  },
  pint: {
    clip:        { type: "polygon", points: "30,32 110,32 96,186 44,186" },
    outline:     { type: "polygon", points: "27,29 113,29 99,189 41,189" },
    rimY:        32,
    fillBottomY: 186,
    fillX:       30,
    fillW:       80,
    shineLine:   [33, 36, 38, 182],
    garnishX:    107,
    garnishY:    29,
  },
  mug: {
    clip:        { type: "polygon", points: "33,50 97,50 97,186 33,186" },
    outline:     { type: "polygon", points: "30,47 100,47 100,189 30,189" },
    handle:      "M 100,78 Q 132,78 132,118 Q 132,158 100,158 L 97,148 Q 120,148 120,118 Q 120,88 97,88 Z",
    base:        "M 28,189 L 102,189 L 102,196 L 28,196 Z",
    rimY:        50,
    fillBottomY: 186,
    fillX:       33,
    fillW:       64,
    shineLine:   [36, 54, 40, 182],
    garnishX:    97,
    garnishY:    47,
  },
  tulip: {
    clip: {
      type: "path",
      d: "M 30,46 L 110,46 Q 102,74 106,130 Q 102,162 78,168 L 62,168 Q 38,162 34,130 Q 38,74 30,46 Z",
    },
    outline: {
      type: "path",
      d: "M 27,43 L 113,43 Q 105,71 109,130 Q 105,165 78,171 L 62,171 Q 35,165 31,130 Q 35,71 27,43 Z",
    },
    stem:        "M 65,171 L 75,171 L 73,192 L 67,192 Z",
    base:        "M 40,192 L 100,192 L 100,199 L 40,199 Z",
    rimY:        46,
    fillBottomY: 168,
    fillX:       27,
    fillW:       86,
    shineLine:   [33, 50, 37, 162],
    garnishX:    109,
    garnishY:    43,
  },
  pilsner: {
    clip:        { type: "polygon", points: "40,28 100,28 87,186 53,186" },
    outline:     { type: "polygon", points: "37,25 103,25 90,189 50,189" },
    rimY:        28,
    fillBottomY: 186,
    fillX:       40,
    fillW:       60,
    shineLine:   [42, 32, 46, 182],
    garnishX:    98,
    garnishY:    25,
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClipShape({ id, geo }: { id: string; geo: GlassGeo }) {
  return (
    <clipPath id={id}>
      {geo.clip.type === "polygon"
        ? <polygon points={geo.clip.points} />
        : <path d={geo.clip.d} />}
    </clipPath>
  );
}

function OutlinePath({ geo, glassStroke }: { geo: GlassGeo; glassStroke: string }) {
  const sharedProps = {
    fill: "rgba(26,26,27,0.06)",
    stroke: glassStroke,
    strokeWidth: 1.5,
    strokeLinejoin: "round" as const,
  };
  return (
    <>
      {geo.outline.type === "polygon"
        ? <polygon points={geo.outline.points} {...sharedProps} />
        : <path d={geo.outline.d} {...sharedProps} />}
      {geo.stem && (
        <path d={geo.stem} fill="rgba(26,26,27,0.06)" stroke={glassStroke} strokeWidth={1.2} />
      )}
      {geo.base && (
        <path d={geo.base} fill="rgba(26,26,27,0.07)" stroke={glassStroke} strokeWidth={1.2} />
      )}
      {geo.handle && (
        <path d={geo.handle} fill="rgba(26,26,27,0.06)" stroke={glassStroke} strokeWidth={1.4} />
      )}
    </>
  );
}

function LiquidFill({
  clipId, geo, liquidColor, liquidOpacity, fillFrac,
}: {
  clipId: string;
  geo: GlassGeo;
  liquidColor: string;
  liquidOpacity: number;
  fillFrac: number;
}) {
  const totalH  = geo.fillBottomY - geo.rimY;
  const fillH   = totalH * fillFrac;
  const fillY   = geo.fillBottomY - fillH;
  const bigRect = { x: geo.fillX - 2, width: geo.fillW + 4 };

  return (
    <g clipPath={`url(#${clipId})`}>
      {/* Liquid body */}
      <motion.rect
        x={bigRect.x}
        width={bigRect.width}
        initial={{ y: geo.fillBottomY, height: 0 }}
        animate={{ y: fillY, height: fillH }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        fill={liquidColor}
        opacity={liquidOpacity}
      />
      {/* Liquid surface shimmer */}
      <motion.rect
        x={bigRect.x}
        width={bigRect.width}
        height={3}
        initial={{ y: geo.fillBottomY }}
        animate={{ y: fillY }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        fill="rgba(255,255,255,0.22)"
        rx={1}
      />
      {/* Inner liquid gradient overlay (darker at bottom) */}
      <motion.rect
        x={bigRect.x}
        width={bigRect.width}
        initial={{ y: geo.fillBottomY, height: 0 }}
        animate={{ y: fillY, height: fillH }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        fill="url(#liquidGrad)"
        opacity={0.35}
      />
    </g>
  );
}

function IceCubes({ geo }: { geo: GlassGeo }) {
  const cx = (geo.fillX + geo.fillX + geo.fillW) / 2;
  const by = geo.fillBottomY - 8;
  return (
    <g opacity={0.78}>
      {/* Left cube */}
      <rect x={cx - 26} y={by - 28} width={22} height={20} rx={3}
        fill="rgba(200,230,255,0.38)" stroke="rgba(255,255,255,0.50)" strokeWidth={1} />
      {/* Right cube */}
      <rect x={cx + 4} y={by - 22} width={20} height={18} rx={3}
        fill="rgba(200,230,255,0.32)" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
      {/* Small cube */}
      <rect x={cx - 6} y={by - 36} width={14} height={12} rx={2}
        fill="rgba(210,235,255,0.26)" stroke="rgba(255,255,255,0.38)" strokeWidth={0.8} />
    </g>
  );
}

function FoamLayer({
  geo, level, totalH, fillFrac,
}: {
  geo: GlassGeo;
  level: FoamLevel;
  totalH: number;
  fillFrac: number;
}) {
  if (level === "none") return null;
  const foamH   = level === "thick" ? 18 : 10;
  const fillH   = totalH * fillFrac;
  const surfaceY = geo.fillBottomY - fillH;

  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.9 }}
    >
      {/* Foam base ellipse */}
      <ellipse
        cx={(geo.fillX * 2 + geo.fillW) / 2}
        cy={surfaceY + foamH / 2}
        rx={geo.fillW / 2 - 2}
        ry={foamH / 2}
        fill="rgba(248,240,218,0.92)"
      />
      {/* Foam bubble dots */}
      {Array.from({ length: level === "thick" ? 7 : 4 }, (_, i) => {
        const bx = geo.fillX + 8 + (i * (geo.fillW - 16) / (level === "thick" ? 6 : 3));
        const br = level === "thick" ? 3.5 + (i % 3) * 1.5 : 2.5 + (i % 2);
        return (
          <circle key={i} cx={bx} cy={surfaceY} r={br} fill="rgba(255,252,240,0.95)" />
        );
      })}
    </motion.g>
  );
}

function Bubbles({ geo, totalH, fillFrac }: { geo: GlassGeo; totalH: number; fillFrac: number }) {
  const surfaceY = geo.fillBottomY - totalH * fillFrac;
  const cx = (geo.fillX * 2 + geo.fillW) / 2;

  return (
    <g>
      {[
        { x: cx - 14, delay: "0s",    dur: "2.2s",  r: 1.5 },
        { x: cx + 6,  delay: "0.6s",  dur: "1.8s",  r: 1.2 },
        { x: cx - 4,  delay: "1.1s",  dur: "2.6s",  r: 1.8 },
        { x: cx + 18, delay: "0.3s",  dur: "2.0s",  r: 1.0 },
        { x: cx - 22, delay: "1.5s",  dur: "2.4s",  r: 1.3 },
      ].map((b, i) => (
        <circle key={i} cx={b.x} cy={geo.fillBottomY - 4} r={b.r} fill="rgba(255,255,255,0.55)">
          <animate
            attributeName="cy"
            from={String(geo.fillBottomY - 4)}
            to={String(surfaceY + 4)}
            dur={b.dur}
            begin={b.delay}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0"
            values="0;0.7;0.7;0"
            keyTimes="0;0.1;0.85;1"
            dur={b.dur}
            begin={b.delay}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  );
}

function OrangeGarnish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 10},${y - 10})`}>
      <ellipse cx={10} cy={10} rx={9} ry={9} fill="#E8890E" opacity={0.92} />
      <ellipse cx={10} cy={10} rx={6} ry={6} fill="#F0A830" opacity={0.7} />
      <ellipse cx={10} cy={10} rx={3} ry={3} fill="#FAC860" opacity={0.8} />
      {/* Zest lines */}
      {[30, 90, 150, 210, 270, 330].map(a => {
        const rad = a * Math.PI / 180;
        return (
          <line key={a}
            x1={10 + Math.cos(rad) * 3} y1={10 + Math.sin(rad) * 3}
            x2={10 + Math.cos(rad) * 7} y2={10 + Math.sin(rad) * 7}
            stroke="#C86800" strokeWidth={0.7} opacity={0.5}
          />
        );
      })}
    </g>
  );
}

function CherryGarnish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 8},${y - 16})`}>
      {/* Stem */}
      <path d="M 8,16 Q 10,8 12,4" stroke="#5A3010" strokeWidth={1.2} fill="none" />
      {/* Cherry */}
      <circle cx={8} cy={16} r={7} fill="#C02030" opacity={0.92} />
      <circle cx={6} cy={14} r={2} fill="#E03040" opacity={0.6} />
    </g>
  );
}

function LemonGarnish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 9},${y - 9})`}>
      <ellipse cx={9} cy={9} rx={8} ry={8} fill="#E8D020" opacity={0.90} />
      <ellipse cx={9} cy={9} rx={5} ry={5} fill="#F0E050" opacity={0.65} />
      <ellipse cx={9} cy={9} rx={2.5} ry={2.5} fill="#FAEA80" opacity={0.75} />
    </g>
  );
}

function HerbGarnish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 6},${y - 18})`}>
      <path d="M 6,18 Q 2,10 4,4" stroke="#3A7A30" strokeWidth={1.3} fill="none" />
      <ellipse cx={4} cy={4}  rx={4} ry={2.5} fill="#5AA040" opacity={0.85} transform="rotate(-20 4 4)" />
      <path d="M 6,14 Q 10,8 9,2"  stroke="#3A7A30" strokeWidth={1.2} fill="none" />
      <ellipse cx={9} cy={2}  rx={3.5} ry={2} fill="#4A9030" opacity={0.80} transform="rotate(15 9 2)" />
    </g>
  );
}

function Garnish({ type, x, y }: { type: GarnishType; x: number; y: number }) {
  if (type === "orange") return <OrangeGarnish x={x} y={y} />;
  if (type === "cherry") return <CherryGarnish x={x} y={y} />;
  if (type === "lemon")  return <LemonGarnish  x={x} y={y} />;
  if (type === "herb")   return <HerbGarnish   x={x} y={y} />;
  return null;
}

function GlassHighlight({ geo, glassStroke }: { geo: GlassGeo; glassStroke: string }) {
  const [x1, y1, x2, y2] = geo.shineLine;
  return (
    <g opacity={0.45}>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      {/* Second, thinner shine line offset by 4px */}
      <line
        x1={x1 + 4} y1={y1} x2={x2 + 4} y2={y2}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.4}
      />
      {/* Top rim highlight */}
      <line
        x1={geo.fillX + 2} y1={geo.rimY - 3}
        x2={geo.fillX + geo.fillW - 2} y2={geo.rimY - 3}
        stroke={glassStroke}
        strokeWidth={1}
        opacity={0.5}
      />
    </g>
  );
}

// ── Condensation dots ─────────────────────────────────────────────────────────

function Condensation({ geo }: { geo: GlassGeo }) {
  const dots = useMemo(() => {
    const arr: { cx: number; cy: number; r: number }[] = [];
    const leftX  = geo.fillX - 6;
    const rightX = geo.fillX + geo.fillW + 6;
    for (let i = 0; i < 8; i++) {
      arr.push({
        cx: leftX  - Math.random() * 4,
        cy: geo.rimY + 12 + Math.random() * (geo.fillBottomY - geo.rimY - 24),
        r: 0.8 + Math.random() * 1.0,
      });
      arr.push({
        cx: rightX + Math.random() * 4,
        cy: geo.rimY + 12 + Math.random() * (geo.fillBottomY - geo.rimY - 24),
        r: 0.7 + Math.random() * 1.0,
      });
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g opacity={0.38}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="rgba(200,230,255,0.75)" />
      ))}
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CraftRenderer({
  craft,
  styleId   = "",
  accentColor,
  fillLevel,
  width     = 110,
}: CraftRendererProps) {
  const uid  = useId().replace(/:/g, "");
  const spec = useMemo(() => getDrinkSpec(craft, styleId), [craft, styleId]);
  const geo  = GLASS_GEO[spec.glass];

  const fill     = (fillLevel ?? spec.defaultFill) / 100;
  const totalH   = geo.fillBottomY - geo.rimY;

  const glassStroke = `${accentColor}60`;

  const height = Math.round(width * (220 / 140));

  return (
    <svg
      viewBox="0 0 140 220"
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Clip path for liquid */}
        <ClipShape id={`liq-${uid}`} geo={geo} />

        {/* Liquid body gradient overlay (darker bottom, lighter top) */}
        <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(26,26,27,0.17)" />
          <stop offset="100%" stopColor="rgba(26,26,27,0.06)" />
        </linearGradient>
      </defs>

      {/* ── Layer 1: Glass body (semi-transparent, drawn first so liquid shows behind it) */}
      <g opacity={0.18}>
        {geo.outline.type === "polygon"
          ? <polygon points={geo.outline.points} fill="rgba(200,220,255,0.06)" />
          : <path d={geo.outline.d}              fill="rgba(200,220,255,0.06)" />}
      </g>

      {/* ── Layer 2: Liquid fill */}
      <LiquidFill
        clipId={`liq-${uid}`}
        geo={geo}
        liquidColor={spec.liquidColor}
        liquidOpacity={spec.liquidOpacity}
        fillFrac={fill}
      />

      {/* ── Layer 3: Ice cubes (inside liquid, drawn before outline so glass goes on top) */}
      {spec.hasIce && (
        <g clipPath={`url(#liq-${uid})`}>
          <IceCubes geo={geo} />
        </g>
      )}

      {/* ── Layer 4: Foam (above liquid surface) */}
      <FoamLayer geo={geo} level={spec.foam} totalH={totalH} fillFrac={fill} />

      {/* ── Layer 5: Bubbles (inside glass) */}
      {spec.hasBubbles && (
        <g clipPath={`url(#liq-${uid})`}>
          <Bubbles geo={geo} totalH={totalH} fillFrac={fill} />
        </g>
      )}

      {/* ── Layer 6: Glass outline (drawn over liquid so glass appears in front) */}
      <OutlinePath geo={geo} glassStroke={glassStroke} />

      {/* ── Layer 7: Condensation on glass exterior */}
      <Condensation geo={geo} />

      {/* ── Layer 8: Glass shine / highlight */}
      <GlassHighlight geo={geo} glassStroke={glassStroke} />

      {/* ── Layer 9: Garnish (sits on rim) */}
      <motion.g
        initial={{ opacity: 0, scale: 0.6, y: -6 }}
        animate={{ opacity: 1, scale: 1,   y: 0   }}
        transition={{ duration: 0.55, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${geo.garnishX}px ${geo.garnishY}px` }}
      >
        <Garnish type={spec.garnish} x={geo.garnishX} y={geo.garnishY} />
      </motion.g>
    </svg>
  );
}
