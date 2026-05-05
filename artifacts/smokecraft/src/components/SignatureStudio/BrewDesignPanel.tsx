/**
 * BrewDesignPanel — BrewCraft beer label editor + bottle preview.
 * Supports touch-drag label fine-positioning via pointer events on the SVG.
 */
import { useId, useRef } from "react";
import { motion }        from "framer-motion";

export interface BrewDesignState {
  brandName:   string;
  tagline:     string;
  labelShape:  "rectangle" | "oval" | "diamond";
  bgColor:     string;
  textColor:   string;
  accentColor: string;
  labelOffset: { x: number; y: number };
}

export const DEFAULT_BREW_STATE: BrewDesignState = {
  brandName:   "",
  tagline:     "",
  labelShape:  "rectangle",
  bgColor:     "#1A2A1A",
  textColor:   "#F5E4A0",
  accentColor: "#6AB87A",
  labelOffset: { x: 0, y: 0 },
};

const MUTED    = "rgba(180,155,100,0.45)";
const GOLD_DIM = "rgba(212,175,55,0.55)";

const PALETTE_OPTIONS = [
  { bg: "#1A2A1A", text: "#F5E4A0", accent: "#6AB87A", label: "Forest Gold" },
  { bg: "#1A1830", text: "#C4D8F0", accent: "#4A8AC4", label: "Midnight Blue" },
  { bg: "#2A1F08", text: "#F5E4A0", accent: "#D4AF37", label: "Amber Wheat" },
  { bg: "#141010", text: "#D4C4A0", accent: "#8B7355", label: "Dark Roast" },
  { bg: "#2A0808", text: "#F0C4C4", accent: "#C46060", label: "Crimson Ale" },
  { bg: "#1A181A", text: "#E8E0D4", accent: "#C0A0D0", label: "Violet Stout" },
];

interface Props {
  state:    BrewDesignState;
  onChange: (s: BrewDesignState) => void;
  tab:      "preview" | "design";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.24em] mb-2.5" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function getSVGPoint(e: React.PointerEvent, svgEl: SVGSVGElement): { x: number; y: number } {
  const pt  = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const inv = svgEl.getScreenCTM()?.inverse();
  if (!inv) return { x: 0, y: 0 };
  const t = pt.matrixTransform(inv);
  return { x: t.x, y: t.y };
}

export function BrewPreview({
  state,
  onDrag,
}: {
  state:    BrewDesignState;
  onDrag?:  (offset: { x: number; y: number }) => void;
}) {
  const off        = state.labelOffset ?? { x: 0, y: 0 };
  const svgRef     = useRef<SVGSVGElement>(null);
  const dragStart  = useRef<{ svgX: number; svgY: number; ox: number; oy: number } | null>(null);

  const labelX = 55;
  const labelY = 95;
  const labelW = 90;
  const labelH = state.labelShape === "diamond" ? 72 : state.labelShape === "oval" ? 68 : 80;

  const labelPath =
    state.labelShape === "oval"
      ? `M${labelX + labelW / 2},${labelY} a${labelW / 2},${labelH / 2} 0 1,1 0.01,0 Z`
      : state.labelShape === "diamond"
      ? `M${labelX + labelW / 2},${labelY} L${labelX + labelW},${labelY + labelH / 2} L${labelX + labelW / 2},${labelY + labelH} L${labelX},${labelY + labelH / 2} Z`
      : `M${labelX + 5},${labelY} h${labelW - 10} a5,5 0 0 1 5,5 v${labelH - 10} a5,5 0 0 1 -5,5 h-${labelW - 10} a5,5 0 0 1 -5,-5 v-${labelH - 10} a5,5 0 0 1 5,-5 Z`;

  const brandDisplay   = (state.brandName || "MY BREW").toUpperCase().slice(0, 14);
  const taglineDisplay = (state.tagline || "Craft Reserve").slice(0, 20);

  const textX = labelX + labelW / 2 + off.x;
  const textY = labelY + labelH / 2 + off.y;

  return (
    <motion.svg
      ref={svgRef}
      width={200} height={320}
      viewBox="0 0 200 320"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <defs>
        <linearGradient id="bottle-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(40,40,30,0.9)" />
          <stop offset="40%"  stopColor="rgba(80,80,60,0.95)" />
          <stop offset="60%"  stopColor="rgba(100,100,80,0.95)" />
          <stop offset="100%" stopColor="rgba(30,30,22,0.9)" />
        </linearGradient>
        <linearGradient id="bottle-neck" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(40,40,30,0.9)" />
          <stop offset="50%"  stopColor="rgba(75,75,55,0.9)" />
          <stop offset="100%" stopColor="rgba(30,30,22,0.9)" />
        </linearGradient>
        <linearGradient id="brew-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="35%"  stopColor="rgba(255,255,255,0.14)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Bottle body */}
      <path
        d="M65,80 Q62,100 60,120 L60,270 Q60,285 70,290 L130,290 Q140,285 140,270 L140,120 Q138,100 135,80 Z"
        fill="url(#bottle-body)"
      />
      {/* Bottle neck */}
      <path d="M82,20 L82,80 L118,80 L118,20 Z" fill="url(#bottle-neck)" />
      {/* Bottle cap */}
      <rect x="78" y="14" width="44" height="12" rx="3" fill={state.accentColor} opacity="0.9" />
      {/* Sheen */}
      <path
        d="M65,80 Q62,100 60,120 L60,270 Q60,285 70,290 L130,290 Q140,285 140,270 L140,120 Q138,100 135,80 Z"
        fill="url(#brew-sheen)"
      />

      {/* Label */}
      <path d={labelPath} fill={state.bgColor} stroke={state.accentColor} strokeWidth="1.5" opacity="0.97" />
      <line x1={labelX + 8} y1={labelY + 14} x2={labelX + labelW - 8} y2={labelY + 14}
        stroke={state.accentColor} strokeWidth="0.8" opacity="0.7" />
      <line x1={labelX + 8} y1={labelY + labelH - 14} x2={labelX + labelW - 8} y2={labelY + labelH - 14}
        stroke={state.accentColor} strokeWidth="0.8" opacity="0.7" />

      {/* Draggable label text group */}
      <g
        style={{ cursor: onDrag ? "grab" : "default", touchAction: "none" }}
        onPointerDown={onDrag ? (e) => {
          if (!svgRef.current) return;
          (e.target as Element).setPointerCapture(e.pointerId);
          const p = getSVGPoint(e, svgRef.current);
          dragStart.current = { svgX: p.x, svgY: p.y, ox: off.x, oy: off.y };
        } : undefined}
        onPointerMove={onDrag ? (e) => {
          if (!dragStart.current || !svgRef.current) return;
          const p = getSVGPoint(e, svgRef.current);
          onDrag({
            x: dragStart.current.ox + p.x - dragStart.current.svgX,
            y: dragStart.current.oy + p.y - dragStart.current.svgY,
          });
        } : undefined}
        onPointerUp={() => { dragStart.current = null; }}
      >
        <text
          x={textX} y={textY - 4}
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="11" fontWeight="600"
          fill={state.textColor}
          letterSpacing="2"
        >
          {brandDisplay}
        </text>
        <text
          x={textX} y={textY + 14}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="6.5" fontStyle="italic"
          fill={state.accentColor}
          opacity="0.9" letterSpacing="0.6"
        >
          {taglineDisplay}
        </text>
        {onDrag && (
          <rect
            x={textX - 45} y={textY - 14}
            width="90" height="34"
            fill="transparent"
          />
        )}
      </g>
    </motion.svg>
  );
}

export function BrewDesignPanel({ state, onChange, tab }: Props) {
  const uid = useId();
  const set = <K extends keyof BrewDesignState>(k: K, v: BrewDesignState[K]) =>
    onChange({ ...state, [k]: v });

  if (tab === "preview") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="p-8 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 320 }}>
          <BrewPreview
            state={state}
            onDrag={(off) => set("labelOffset", off)}
          />
        </div>
        <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
          Bottle Label Preview · <span style={{ color: "rgba(212,175,55,0.4)" }}>Drag label to reposition</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <Label>Brand Name</Label>
        <input
          id={`${uid}-brand`}
          value={state.brandName}
          onChange={e => set("brandName", e.target.value)}
          maxLength={14}
          placeholder="Your brew name…"
          className="w-full bg-transparent outline-none font-serif text-xl py-2 border-b"
          style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(230,210,175,0.9)" }}
        />
      </div>

      <div>
        <Label>Tagline</Label>
        <input
          id={`${uid}-tag`}
          value={state.tagline}
          onChange={e => set("tagline", e.target.value)}
          maxLength={20}
          placeholder="Craft Reserve…"
          className="w-full bg-transparent outline-none text-sm py-2 border-b"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(210,190,155,0.85)" }}
        />
      </div>

      <div>
        <Label>Label Shape</Label>
        <div className="flex gap-2">
          {(["rectangle", "oval", "diamond"] as const).map(s => (
            <button key={s} onClick={() => set("labelShape", s)}
              className="px-4 py-2 rounded-lg text-xs capitalize transition-all"
              style={state.labelShape === s
                ? { background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.45)", color: GOLD_DIM }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: MUTED }
              }>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Color Palette</Label>
        <div className="grid grid-cols-2 gap-2">
          {PALETTE_OPTIONS.map(p => {
            const active = state.bgColor === p.bg && state.textColor === p.text;
            return (
              <button key={p.label}
                onClick={() => onChange({ ...state, bgColor: p.bg, textColor: p.text, accentColor: p.accent })}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all"
                style={{
                  background: active ? `${p.bg}dd` : "rgba(255,255,255,0.03)",
                  border: active ? `1px solid ${p.accent}` : "1px solid rgba(255,255,255,0.07)",
                  color: active ? p.text : MUTED,
                }}>
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20" style={{ background: p.accent }} />
                <span className="text-[10px]">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Label Position</Label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set("labelOffset", { x: 0, y: 0 })}
            className="px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.15em]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: MUTED }}>
            Reset Position
          </button>
          <span className="text-[9px]" style={{ color: "rgba(180,155,100,0.3)" }}>
            or drag label in Preview tab
          </span>
        </div>
      </div>
    </div>
  );
}
