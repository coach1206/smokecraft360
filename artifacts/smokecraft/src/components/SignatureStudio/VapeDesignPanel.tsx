/**
 * VapeDesignPanel — VapeCraft flavor line branding editor + device preview.
 * Supports touch-drag label fine-positioning via SVG pointer events.
 */
import { useId, useRef } from "react";
import { motion }        from "framer-motion";

export interface VapeDesignState {
  flavorName:   string;
  gradientFrom: string;
  gradientTo:   string;
  logoSymbol:   "cloud" | "star" | "flame" | "wave" | "bolt" | "leaf";
  labelOffset:  { x: number; y: number };
}

export const DEFAULT_VAPE_STATE: VapeDesignState = {
  flavorName:   "",
  gradientFrom: "#1A1B4B",
  gradientTo:   "#6B21A8",
  logoSymbol:   "cloud",
  labelOffset:  { x: 0, y: 0 },
};

const MUTED    = "rgba(180,155,100,0.45)";
const GOLD_DIM = "rgba(212,139,0,0.55)";

const GRADIENT_PALETTE = [
  { from: "#1A1B4B", to: "#6B21A8", label: "Neon Violet" },
  { from: "#0C4A6E", to: "#06B6D4", label: "Ice Blue"    },
  { from: "#14532D", to: "#4ADE80", label: "Mint Green"  },
  { from: "#7F1D1D", to: "#F97316", label: "Fire Mango"  },
  { from: "#1E1B4B", to: "#EC4899", label: "Deep Rose"   },
  { from: "#1C1917", to: "#A8A29E", label: "Ghost Grey"  },
];

const LOGO_SYMBOLS: Array<{ id: VapeDesignState["logoSymbol"]; label: string; path: string }> = [
  { id: "cloud", label: "Cloud", path: "M8,12 Q7,7 11,7 Q12,4 16,5 Q20,4 21,7 Q25,7 24,12 Z" },
  { id: "star",  label: "Star",  path: "M16,4 L17.5,10 L24,10 L18.5,14 L20.5,20 L16,16.5 L11.5,20 L13.5,14 L8,10 L14.5,10 Z" },
  { id: "flame", label: "Flame", path: "M16,4 C16,4 22,10 20,15 C22,13 22,18 18,20 C20,18 19,17 17,18 C19,15 14,14 15,9 C14,12 11,13 12,17 C10,15 10,12 12,10 C10,12 9,10 11,7 C14,8 16,4 16,4 Z" },
  { id: "wave",  label: "Wave",  path: "M4,14 Q7,10 10,14 Q13,18 16,14 Q19,10 22,14 Q25,18 28,14" },
  { id: "bolt",  label: "Bolt",  path: "M18,4 L12,14 L17,14 L14,24 L22,12 L17,12 Z" },
  { id: "leaf",  label: "Leaf",  path: "M16,4 C16,4 26,8 24,18 C22,24 16,24 16,24 C16,24 10,24 8,18 C6,8 16,4 16,4 Z M16,10 L16,24" },
];

interface Props {
  state:    VapeDesignState;
  onChange: (s: VapeDesignState) => void;
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

export function VapePreview({
  state,
  onDrag,
}: {
  state:   VapeDesignState;
  onDrag?: (offset: { x: number; y: number }) => void;
}) {
  const off       = state.labelOffset ?? { x: 0, y: 0 };
  const svgRef    = useRef<SVGSVGElement>(null);
  const dragStart = useRef<{ svgX: number; svgY: number; ox: number; oy: number } | null>(null);

  const name    = (state.flavorName || "SIGNATURE").toUpperCase().slice(0, 12);
  const sym     = LOGO_SYMBOLS.find(s => s.id === state.logoSymbol) ?? LOGO_SYMBOLS[0]!;
  const isWave  = state.logoSymbol === "wave";

  const labelTX = 80 + off.x;
  const labelTY = 170 + off.y;
  const subTY   = 185 + off.y;

  return (
    <motion.svg
      ref={svgRef}
      width={160} height={320}
      viewBox="0 0 160 320"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <defs>
        <linearGradient id="vape-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={state.gradientFrom} />
          <stop offset="100%" stopColor={state.gradientTo}   />
        </linearGradient>
        <linearGradient id="vape-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="30%"  stopColor="rgba(26,26,27,0.14)" />
          <stop offset="60%"  stopColor="rgba(26,26,27,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id="device-clip">
          <rect x="32" y="20" width="96" height="280" rx="20" />
        </clipPath>
      </defs>

      {/* Device body */}
      <rect x="32" y="20" width="96" height="280" rx="20" fill="url(#vape-grad)" />
      <rect x="32" y="20" width="96" height="280" rx="20" fill="url(#vape-sheen)" />

      {/* Screen area */}
      <rect x="48" y="50" width="64" height="80" rx="8"
        fill="rgba(26,26,27,0.08)"
        stroke="rgba(26,26,27,0.14)" strokeWidth="1" />

      {/* Logo symbol */}
      <g transform="translate(64, 62) scale(1.15)"
        fill={isWave ? "none" : "rgba(255,255,255,0.9)"}
        stroke={isWave ? "rgba(255,255,255,0.9)" : "none"}
        strokeWidth={isWave ? "2" : "0"}
        strokeLinecap={isWave ? "round" : undefined}
        clipPath="url(#device-clip)">
        <path d={sym.path} />
      </g>

      {/* Draggable label group */}
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
        <text x={labelTX} y={labelTY}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="9" fontWeight="700"
          fill="rgba(255,255,255,0.95)"
          letterSpacing="2.5">
          {name}
        </text>
        <text x={labelTX} y={subTY}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="5.5"
          fill="rgba(255,255,255,0.5)"
          letterSpacing="1.5">
          SIGNATURE BLEND
        </text>
        {onDrag && (
          <rect x={labelTX - 45} y={labelTY - 12} width="90" height="30" fill="transparent" />
        )}
      </g>

      {/* Bottom button */}
      <rect x="62" y="265" width="36" height="10" rx="5" fill="rgba(26,26,27,0.17)" />

      {/* LED glow */}
      <circle cx="80" cy="295" r="5"
        fill={state.gradientTo} opacity="0.7"
        style={{ filter: `drop-shadow(0 0 5px ${state.gradientTo})` }} />

      {/* Mouthpiece */}
      <rect x="52" y="12" width="56" height="12" rx="6"
        fill="rgba(26,26,27,0.10)"
        stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </motion.svg>
  );
}

export function VapeDesignPanel({ state, onChange, tab }: Props) {
  const uid = useId();
  const set = <K extends keyof VapeDesignState>(k: K, v: VapeDesignState[K]) =>
    onChange({ ...state, [k]: v });

  if (tab === "preview") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="p-8 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(26,26,27,0.08)", border: "1px solid rgba(26,26,27,0.07)", minHeight: 300 }}>
          <VapePreview
            state={state}
            onDrag={(off) => set("labelOffset", off)}
          />
        </div>
        <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
          Device Preview · <span style={{ color: "rgba(212,139,0,0.4)" }}>Drag label to reposition</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <Label>Flavor Name</Label>
        <input
          id={`${uid}-name`}
          value={state.flavorName}
          onChange={e => set("flavorName", e.target.value)}
          maxLength={12}
          placeholder="Arctic Mango…"
          className="w-full bg-transparent outline-none font-serif text-xl py-2 border-b"
          style={{ borderColor: "rgba(212,139,0,0.25)", color: "rgba(230,210,175,0.9)" }}
        />
      </div>

      <div>
        <Label>Color Identity</Label>
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PALETTE.map(p => {
            const active = state.gradientFrom === p.from && state.gradientTo === p.to;
            return (
              <button key={p.label}
                onClick={() => onChange({ ...state, gradientFrom: p.from, gradientTo: p.to })}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all"
                style={{
                  background: active ? "rgba(26,26,27,0.10)" : "rgba(26,26,27,0.05)",
                  border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(26,26,27,0.09)",
                  color: active ? "rgba(255,255,255,0.9)" : MUTED,
                }}>
                <span className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
                <span className="text-[10px]">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Logo Symbol</Label>
        <div className="grid grid-cols-3 gap-2">
          {LOGO_SYMBOLS.map(sym => (
            <button key={sym.id}
              onClick={() => set("logoSymbol", sym.id)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-all"
              style={state.logoSymbol === sym.id
                ? { background: "rgba(212,139,0,0.13)", border: "1px solid rgba(212,139,0,0.4)", color: GOLD_DIM }
                : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
              }>
              <svg width="22" height="22" viewBox="0 0 32 32"
                fill={sym.id === "wave" ? "none" : "currentColor"}
                stroke={sym.id === "wave" ? "currentColor" : "none"}
                strokeWidth={sym.id === "wave" ? "2.5" : "0"}
                strokeLinecap="round">
                <path d={sym.path} />
              </svg>
              <span className="text-[9px]">{sym.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Label Position</Label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set("labelOffset", { x: 0, y: 0 })}
            className="px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.15em]"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.11)", color: MUTED }}>
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
