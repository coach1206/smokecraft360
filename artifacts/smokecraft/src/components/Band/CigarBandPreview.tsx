import { Crown, Flame, Leaf, Star, Shield, Diamond, Zap, Anchor, Eye } from "lucide-react";
import { BlendDesign } from "../../services/storage";
import { COLOR_OPTIONS, BLEND_STYLES } from "./bandConstants";

interface CigarBandPreviewProps {
  design: BlendDesign;
  blendName: string;
  style: string;
  size?: "sm" | "md" | "lg";
}

const EMBLEM_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; fill?: string }>> = {
  crown:   Crown,
  flame:   Flame,
  leaf:    Leaf,
  star:    Star,
  shield:  Shield,
  diamond: Diamond,
  zap:     Zap,
  anchor:  Anchor,
  eye:     Eye,
};

const SIZE_MAP = {
  sm: { width: 240, height: 68,  iconSize: 18, titleSize: "13px", subSize: "8px",  radius: 6,  border: 1.5, medallion: 44 },
  md: { width: 360, height: 100, iconSize: 26, titleSize: "18px", subSize: "10px", radius: 8,  border: 2,   medallion: 64 },
  lg: { width: 480, height: 130, iconSize: 34, titleSize: "22px", subSize: "11px", radius: 10, border: 2.5, medallion: 82 },
};

export function CigarBandPreview({ design, blendName, style, size = "md" }: CigarBandPreviewProps) {
  const colorOpt = COLOR_OPTIONS.find((c) => c.id === design.primaryColor) ?? COLOR_OPTIONS[0];
  const Icon = EMBLEM_ICONS[design.emblem] ?? Crown;
  const s = SIZE_MAP[size];
  const styleLabel = BLEND_STYLES.find((st) => st.id === style)?.descriptor ?? style;

  const fontFamily =
    design.textStyle === "sans"
      ? "'Inter', sans-serif"
      : design.textStyle === "italic"
        ? "'Cormorant Garamond', serif"
        : "'Cormorant Garamond', serif";
  const fontStyle = design.textStyle === "italic" ? "italic" : "normal";

  const pad = s.width * 0.06;
  const medallionX = pad;
  const medallionY = (s.height - s.medallion) / 2;
  const textX = medallionX + s.medallion + pad * 0.8;
  const textW = s.width - textX - pad;

  return (
    <div
      style={{
        position: "relative",
        width: s.width,
        height: s.height,
        flexShrink: 0,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
      }}
    >
      <svg
        width={s.width}
        height={s.height}
        viewBox={`0 0 ${s.width} ${s.height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: s.radius, overflow: "hidden", display: "block" }}
      >
        {/* Background */}
        <defs>
          <linearGradient id={`bg-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorOpt.primary} />
            <stop offset="50%" stopColor={adjust(colorOpt.primary, 18)} />
            <stop offset="100%" stopColor={colorOpt.primary} />
          </linearGradient>
          <linearGradient id={`accent-line-${size}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="20%" stopColor={colorOpt.accent} stopOpacity="0.7" />
            <stop offset="80%" stopColor={colorOpt.accent} stopOpacity="0.7" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id={`medallion-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colorOpt.accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colorOpt.accent} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Band background */}
        <rect width={s.width} height={s.height} rx={s.radius} fill={`url(#bg-${size})`} />

        {/* Outer border */}
        <rect
          x={s.border} y={s.border}
          width={s.width - s.border * 2} height={s.height - s.border * 2}
          rx={s.radius - 1} fill="none"
          stroke={colorOpt.accent} strokeWidth={s.border * 0.6} strokeOpacity={0.5}
        />

        {/* Inner border */}
        <rect
          x={s.border * 3} y={s.border * 3}
          width={s.width - s.border * 6} height={s.height - s.border * 6}
          rx={s.radius - 2} fill="none"
          stroke={colorOpt.accent} strokeWidth={s.border * 0.35} strokeOpacity={0.25}
        />

        {/* Top accent line */}
        <line
          x1={s.border * 5} y1={s.height * 0.22}
          x2={s.width - s.border * 5} y2={s.height * 0.22}
          stroke={colorOpt.accent} strokeWidth={s.border * 0.4} strokeOpacity={0.35}
        />
        {/* Bottom accent line */}
        <line
          x1={s.border * 5} y1={s.height * 0.78}
          x2={s.width - s.border * 5} y2={s.height * 0.78}
          stroke={colorOpt.accent} strokeWidth={s.border * 0.4} strokeOpacity={0.35}
        />

        {/* Vertical divider after medallion */}
        <line
          x1={medallionX + s.medallion + pad * 0.4} y1={s.height * 0.15}
          x2={medallionX + s.medallion + pad * 0.4} y2={s.height * 0.85}
          stroke={colorOpt.accent} strokeWidth={s.border * 0.3} strokeOpacity={0.2}
        />

        {/* Medallion circle */}
        <circle
          cx={medallionX + s.medallion / 2}
          cy={s.height / 2}
          r={s.medallion / 2}
          fill={`url(#medallion-${size})`}
          stroke={colorOpt.accent}
          strokeWidth={s.border * 0.7}
          strokeOpacity={0.6}
        />

        {/* Corner diamonds */}
        {[
          [pad * 0.55, s.height / 2],
          [s.width - pad * 0.55, s.height / 2],
        ].map(([cx, cy], i) => (
          <polygon
            key={i}
            points={`${cx},${cy - 5} ${cx + 4},${cy} ${cx},${cy + 5} ${cx - 4},${cy}`}
            fill={colorOpt.accent}
            fillOpacity={0.4}
          />
        ))}

        {/* Blend name */}
        <text
          x={textX + textW / 2} y={s.height * 0.46}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={fontFamily} fontStyle={fontStyle}
          fontSize={s.titleSize} fontWeight={600}
          fill={colorOpt.text} letterSpacing="0.08em"
        >
          {(blendName || "MY BLEND").toUpperCase().slice(0, 22)}
        </text>

        {/* Style descriptor */}
        <text
          x={textX + textW / 2} y={s.height * 0.68}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily="'Inter', sans-serif"
          fontSize={s.subSize} fontWeight={400}
          fill={colorOpt.accent} fillOpacity={0.7} letterSpacing="0.18em"
        >
          {styleLabel.toUpperCase()}
        </text>

        {/* SmokeCraft label at top center-right */}
        <text
          x={textX + textW / 2} y={s.height * 0.27}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily="'Inter', sans-serif"
          fontSize={Number(s.subSize.replace("px","")) * 0.82 + "px"}
          fill={colorOpt.accent} fillOpacity={0.4} letterSpacing="0.22em"
        >
          SMOKECRAFT
        </text>
      </svg>

      {/* Emblem icon — overlaid via absolute positioned div for crisp rendering */}
      <div
        style={{
          position: "absolute",
          left: medallionX,
          top: medallionY,
          width: s.medallion,
          height: s.medallion,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Icon size={s.iconSize} color={colorOpt.accent} fill={colorOpt.accent + "28"} />
      </div>
    </div>
  );
}

function adjust(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
