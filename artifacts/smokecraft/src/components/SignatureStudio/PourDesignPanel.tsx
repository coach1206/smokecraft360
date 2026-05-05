/**
 * PourDesignPanel — PourCraft cocktail/spirit glass editor + glass preview.
 */
import { useId } from "react";
import { motion } from "framer-motion";

export interface PourDesignState {
  labelName:    string;
  glassType:    "highball" | "coupe" | "rocks" | "martini" | "wine";
  garnish:      "none" | "lemon" | "lime" | "mint" | "cherry" | "olive";
  font:         "serif" | "sans";
  primaryColor: string;
  accentColor:  string;
}

export const DEFAULT_POUR_STATE: PourDesignState = {
  labelName:    "",
  glassType:    "highball",
  garnish:      "none",
  font:         "serif",
  primaryColor: "#0F1B35",
  accentColor:  "#4A8AC4",
};

const MUTED    = "rgba(180,155,100,0.45)";
const GOLD_DIM = "rgba(212,175,55,0.55)";

const GLASS_OPTIONS = [
  { id: "highball" as const, label: "Highball",  glyph: "⊓" },
  { id: "coupe"    as const, label: "Coupe",     glyph: "♡" },
  { id: "rocks"    as const, label: "Rocks",     glyph: "□" },
  { id: "martini"  as const, label: "Martini",   glyph: "△" },
  { id: "wine"     as const, label: "Wine",      glyph: "♦" },
];

const GARNISH_OPTIONS = [
  { id: "none"   as const, label: "None",   color: "rgba(255,255,255,0.2)" },
  { id: "lemon"  as const, label: "Lemon",  color: "#F5C842" },
  { id: "lime"   as const, label: "Lime",   color: "#6AB844" },
  { id: "mint"   as const, label: "Mint",   color: "#5DAB6A" },
  { id: "cherry" as const, label: "Cherry", color: "#C43030" },
  { id: "olive"  as const, label: "Olive",  color: "#4E6A38" },
];

const COLOR_PALETTE = [
  { primary: "#0F1B35", accent: "#4A8AC4", label: "Navy" },
  { primary: "#2A1F08", accent: "#D4AF37", label: "Aged Oak" },
  { primary: "#141010", accent: "#8B7355", label: "Charcoal" },
  { primary: "#0F2018", accent: "#6AB87A", label: "Botanical" },
  { primary: "#3A0F18", accent: "#C4708A", label: "Rose" },
  { primary: "#1A1830", accent: "#8870C0", label: "Dusk" },
];

const GARNISH_GLYPH: Record<PourDesignState["garnish"], string> = {
  none:   "",
  lemon:  "🍋",
  lime:   "🍈",
  mint:   "🌿",
  cherry: "🍒",
  olive:  "🫒",
};

interface Props {
  state:    PourDesignState;
  onChange: (s: PourDesignState) => void;
  tab:      "preview" | "design";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.24em] mb-2.5" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

export function PourPreview({ state }: { state: PourDesignState }) {
  const label = (state.labelName || "Signature").slice(0, 16);
  const garnishColor = GARNISH_OPTIONS.find(g => g.id === state.garnish)?.color ?? "transparent";
  const fontFamily = state.font === "serif" ? "'Cormorant Garamond', Georgia, serif" : "Inter, sans-serif";

  // Different SVG shapes per glass type
  const glassPaths: Record<PourDesignState["glassType"], { body: string; liquid: string; stem?: string }> = {
    highball: {
      body:   "M72,40 L72,250 Q72,262 84,264 L116,264 Q128,262 128,250 L128,40 Z",
      liquid: "M72,140 L128,140 L128,250 Q128,262 116,264 L84,264 Q72,262 72,250 Z",
    },
    coupe: {
      body:   "M60,50 Q60,120 100,140 Q140,120 140,50 Z",
      liquid: "M68,70 Q70,120 100,138 Q130,120 132,70 Z",
      stem:   "M95,140 L95,240 Q95,248 100,250 Q105,248 105,240 L105,140 Z M80,248 L120,248 Q120,255 100,256 Q80,255 80,248 Z",
    },
    rocks: {
      body:   "M64,100 L64,260 Q64,272 76,274 L124,274 Q136,272 136,260 L136,100 Z",
      liquid: "M64,170 L136,170 L136,260 Q136,272 124,274 L76,274 Q64,272 64,260 Z",
    },
    martini: {
      body:   "M52,44 L100,140 L148,44 Z",
      liquid: "M70,80 L100,138 L130,80 Z",
      stem:   "M96,140 L96,235 Q96,244 100,246 Q104,244 104,235 L104,140 Z M82,242 L118,242 Q118,250 100,252 Q82,250 82,242 Z",
    },
    wine: {
      body:   "M76,44 Q60,100 64,160 Q68,190 100,200 Q132,190 136,160 Q140,100 124,44 Z",
      liquid: "M78,130 Q66,160 72,180 Q82,200 100,204 Q118,200 128,180 Q134,160 122,130 Z",
      stem:   "M95,200 L95,258 Q95,266 100,268 Q105,266 105,258 L105,200 Z M82,264 L118,264 Q118,272 100,274 Q82,272 82,264 Z",
    },
  };

  const paths = glassPaths[state.glassType];
  const liquidOpacity = 0.72;

  return (
    <motion.svg
      width={200} height={300}
      viewBox="0 0 200 300"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <defs>
        <linearGradient id="glass-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        <linearGradient id="liquid-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={state.accentColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={state.primaryColor} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Liquid */}
      <path d={paths.liquid} fill="url(#liquid-fill)" opacity={liquidOpacity} />

      {/* Glass body outline */}
      <path d={paths.body} fill="url(#glass-fill)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

      {/* Stem (if present) */}
      {paths.stem && (
        <path d={paths.stem} fill="url(#glass-fill)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      )}

      {/* Label text on glass */}
      <text
        x="100"
        y={state.glassType === "martini" ? "108" : state.glassType === "coupe" ? "100" : "168"}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontSize="9"
        fill="rgba(255,255,255,0.92)"
        letterSpacing="1.8"
      >
        {label.toUpperCase()}
      </text>

      {/* Accent line under label */}
      <line x1="84" x2="116"
        y1={state.glassType === "martini" ? "112" : state.glassType === "coupe" ? "104" : "172"}
        y2={state.glassType === "martini" ? "112" : state.glassType === "coupe" ? "104" : "172"}
        stroke={state.accentColor}
        strokeWidth="0.8"
        opacity="0.7"
      />

      {/* Garnish indicator */}
      {state.garnish !== "none" && (
        <>
          <circle cx="150" cy="55" r="8" fill={garnishColor} opacity="0.85" />
          <text x="150" y="59" textAnchor="middle" fontSize="9">{GARNISH_GLYPH[state.garnish]}</text>
        </>
      )}
    </motion.svg>
  );
}

export function PourDesignPanel({ state, onChange, tab }: Props) {
  const uid = useId();
  const set = <K extends keyof PourDesignState>(k: K, v: PourDesignState[K]) =>
    onChange({ ...state, [k]: v });

  if (tab === "preview") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="p-8 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 300 }}>
          <PourPreview state={state} />
        </div>
        <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
          Signature Drink Preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <Label>Signature Name</Label>
        <input
          id={`${uid}-name`}
          value={state.labelName}
          onChange={e => set("labelName", e.target.value)}
          maxLength={16}
          placeholder="Name your pour…"
          className="w-full bg-transparent outline-none font-serif text-xl py-2 border-b"
          style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(230,210,175,0.9)" }}
        />
      </div>

      <div>
        <Label>Glass Type</Label>
        <div className="flex flex-wrap gap-2">
          {GLASS_OPTIONS.map(g => (
            <button key={g.id} onClick={() => set("glassType", g.id)}
              className="px-3.5 py-2 rounded-xl text-xs transition-all"
              style={state.glassType === g.id
                ? { background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.45)", color: GOLD_DIM }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
              }>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Garnish</Label>
        <div className="flex flex-wrap gap-2">
          {GARNISH_OPTIONS.map(g => (
            <button key={g.id} onClick={() => set("garnish", g.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={state.garnish === g.id
                ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)", color: GOLD_DIM }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
              }>
              {g.id !== "none" && <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />}
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Color Scheme</Label>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PALETTE.map(p => {
            const active = state.primaryColor === p.primary && state.accentColor === p.accent;
            return (
              <button key={p.label}
                onClick={() => onChange({ ...state, primaryColor: p.primary, accentColor: p.accent })}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all"
                style={{
                  background: active ? `${p.primary}cc` : "rgba(255,255,255,0.03)",
                  border: active ? `1px solid ${p.accent}` : "1px solid rgba(255,255,255,0.07)",
                  color: active ? "rgba(230,210,175,0.9)" : MUTED,
                }}>
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: p.accent }} />
                <span className="text-[10px]">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Label Font</Label>
        <div className="flex gap-2">
          {(["serif", "sans"] as const).map(f => (
            <button key={f} onClick={() => set("font", f)}
              className="px-4 py-2 rounded text-sm transition-all"
              style={{
                background: state.font === f ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.04)",
                border: state.font === f ? "1px solid rgba(212,175,55,0.45)" : "1px solid rgba(255,255,255,0.08)",
                color: state.font === f ? GOLD_DIM : MUTED,
                fontFamily: f === "sans" ? "Inter, sans-serif" : "'Cormorant Garamond', Georgia, serif",
              }}>
              {f === "serif" ? "Serif" : "Modern"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
