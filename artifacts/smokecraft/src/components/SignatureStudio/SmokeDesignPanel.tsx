/**
 * SmokeDesignPanel — SmokeCraft band + box editor inside the Signature Studio.
 * All COLOR_OPTIONS, EMBLEM_OPTIONS, and TEXT_STYLES are fully unlocked here.
 * Supports touch-drag fine-positioning of the band label via pointer events.
 */
import { useId, useRef } from "react";
import { motion }        from "framer-motion";
import { CigarBandPreview }  from "@/components/Band/CigarBandPreview";
import { CigarBoxPreview, type WoodTone, type FinishStyle, type LogoPlacement } from "@/components/Band/CigarBoxPreview";
import { COLOR_OPTIONS, EMBLEM_OPTIONS, TEXT_STYLES, BLEND_STYLES } from "@/components/Band/bandConstants";
import type { BlendDesign } from "@/services/storage";

export type InteriorColor = "cream-satin" | "ebony-velvet" | "ivory-linen";

export interface SmokeDesignState {
  bandName:    string;
  description: string;
  style:       string;
  design:      BlendDesign;
  boxEnabled:  boolean;
  labelOffset: { x: number; y: number };
  box: {
    woodTone:           WoodTone;
    boxColor:           string;
    interiorColor:      InteriorColor;
    logoPlacement:      LogoPlacement;
    labelText:          string;
    limitedEditionName: string;
    finishStyle:        FinishStyle;
  };
}

export const DEFAULT_SMOKE_STATE: SmokeDesignState = {
  bandName:    "",
  description: "",
  style:       "bold",
  design:      { primaryColor: "gold", accentColor: "gold", emblem: "crown", textStyle: "serif" },
  boxEnabled:  false,
  labelOffset: { x: 0, y: 0 },
  box: {
    woodTone:           "cedar",
    boxColor:           "#2A1F08",
    interiorColor:      "cream-satin",
    logoPlacement:      "top-center",
    labelText:          "",
    limitedEditionName: "",
    finishStyle:        "gloss",
  },
};

const GOLD     = "rgba(212,175,55,0.9)";
const GOLD_DIM = "rgba(212,175,55,0.55)";
const MUTED    = "rgba(180,155,100,0.45)";

const WOOD_LABELS: Record<WoodTone, string> = {
  mahogany: "Mahogany", walnut: "Walnut", cedar: "Cedar",
  ebony: "Ebony", maple: "Maple",
};

const BOX_COLORS = [
  { id: "#2A1F08", label: "Tobacco" },
  { id: "#141010", label: "Onyx"    },
  { id: "#3A0F18", label: "Burgundy"},
  { id: "#0F1B35", label: "Navy"    },
  { id: "#0F2018", label: "Forest"  },
  { id: "#2A0808", label: "Crimson" },
];

const INTERIOR_COLORS: Array<{ id: InteriorColor; label: string; bg: string; text: string }> = [
  { id: "cream-satin",  label: "Cream Satin",  bg: "#F5F0E0", text: "#2A1F08" },
  { id: "ebony-velvet", label: "Ebony Velvet", bg: "#1A1410", text: "#D4C4A0" },
  { id: "ivory-linen",  label: "Ivory Linen",  bg: "#F0EDD8", text: "#3A2A18" },
];

interface Props {
  state:    SmokeDesignState;
  onChange: (s: SmokeDesignState) => void;
  tab:      "preview" | "design";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.24em] mb-2.5" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

export function SmokeDesignPanel({ state, onChange, tab }: Props) {
  const uid        = useId();
  const dragStart  = useRef<{ clientX: number; clientY: number; ox: number; oy: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof SmokeDesignState>(k: K, v: SmokeDesignState[K]) =>
    onChange({ ...state, [k]: v });
  const setDesign = <K extends keyof BlendDesign>(k: K, v: BlendDesign[K]) =>
    onChange({ ...state, design: { ...state.design, [k]: v } });
  const setBox = <K extends keyof SmokeDesignState["box"]>(k: K, v: SmokeDesignState["box"][K]) =>
    onChange({ ...state, box: { ...state.box, [k]: v } });

  const off = state.labelOffset ?? { x: 0, y: 0 };

  if (tab === "preview") {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Band preview with draggable label overlay */}
        <div className="flex flex-col items-center gap-2 p-6 rounded-2xl w-full"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div
            ref={overlayRef}
            className="relative select-none"
            style={{ touchAction: "none" }}
            onPointerMove={(e) => {
              if (!dragStart.current) return;
              const container = overlayRef.current;
              if (!container) return;
              onChange({
                ...state,
                labelOffset: {
                  x: dragStart.current.ox + e.clientX - dragStart.current.clientX,
                  y: dragStart.current.oy + e.clientY - dragStart.current.clientY,
                },
              });
            }}
            onPointerUp={() => { dragStart.current = null; }}
            onPointerLeave={() => { dragStart.current = null; }}
          >
            <CigarBandPreview
              design={state.design}
              blendName={state.bandName || "My Signature"}
              style={state.style}
              size="lg"
            />
            {/* Draggable label indicator */}
            <div
              className="absolute flex items-center justify-center pointer-events-auto"
              style={{
                top:    `calc(50% + ${off.y}px)`,
                left:   `calc(50% + ${off.x}px)`,
                transform: "translate(-50%, -50%)",
                cursor: "grab",
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(212,175,55,0.08)",
                border: "1px dashed rgba(212,175,55,0.35)",
                backdropFilter: "blur(2px)",
              }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture(e.pointerId);
                dragStart.current = { clientX: e.clientX, clientY: e.clientY, ox: off.x, oy: off.y };
              }}
            >
              <span className="text-[9px] font-serif" style={{ color: GOLD, opacity: 0.7 }}>
                ⠿
              </span>
            </div>
          </div>
          <p className="text-[8px] uppercase tracking-[0.28em] mt-1" style={{ color: MUTED }}>
            Band Preview · <span style={{ color: "rgba(212,175,55,0.4)" }}>Drag ⠿ to reposition</span>
          </p>
        </div>

        {state.boxEnabled && (
          <div className="flex flex-col items-center gap-2 p-6 rounded-2xl w-full"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <CigarBoxPreview
              design={{ ...state.box, logoUrl: null }}
              size="md"
            />
            <p className="text-[8px] uppercase tracking-[0.28em] mt-1" style={{ color: MUTED }}>
              Box Preview · Interior: <span style={{ color: GOLD_DIM }}>
                {INTERIOR_COLORS.find(c => c.id === state.box.interiorColor)?.label ?? "Cream Satin"}
              </span>
            </p>
          </div>
        )}
        {!state.boxEnabled && (
          <button onClick={() => set("boxEnabled", true)}
            className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.15em]"
            style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)", color: GOLD_DIM }}>
            Add Box Design
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Blend name */}
      <div>
        <Label>Signature Name</Label>
        <input
          id={`${uid}-name`}
          value={state.bandName}
          onChange={e => set("bandName", e.target.value)}
          maxLength={28}
          placeholder="Name your blend…"
          className="w-full bg-transparent outline-none font-serif text-xl py-2 border-b"
          style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(230,210,175,0.9)", caretColor: GOLD }}
        />
      </div>

      {/* Style */}
      <div>
        <Label>Blend Style</Label>
        <div className="flex flex-wrap gap-2">
          {BLEND_STYLES.map(s => (
            <button key={s.id} onClick={() => set("style", s.id)}
              className="px-3.5 py-2 rounded-full text-xs font-serif tracking-wide transition-all"
              style={state.style === s.id
                ? { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)", color: GOLD }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
              }>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Band Color — ALL options unlocked */}
      <div>
        <Label>Band Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(c => {
            const active = state.design.primaryColor === c.id;
            return (
              <button key={c.id} onClick={() => setDesign("primaryColor", c.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: active ? c.primary : "rgba(255,255,255,0.04)",
                  border: active ? `1px solid ${c.accent}` : "1px solid rgba(255,255,255,0.08)",
                  color: active ? c.text : MUTED,
                }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.accent }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Emblem — ALL unlocked */}
      <div>
        <Label>Emblem</Label>
        <div className="flex flex-wrap gap-2">
          {EMBLEM_OPTIONS.map(em => {
            const active = state.design.emblem === em.id;
            return (
              <button key={em.id} onClick={() => setDesign("emblem", em.id)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: active ? GOLD : MUTED,
                }}>
                {em.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Text style */}
      <div>
        <Label>Lettering</Label>
        <div className="flex gap-2">
          {TEXT_STYLES.map(t => {
            const active = state.design.textStyle === t.id;
            return (
              <button key={t.id} onClick={() => setDesign("textStyle", t.id as BlendDesign["textStyle"])}
                className="px-4 py-2 rounded text-sm transition-all"
                style={{
                  background: active ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(212,175,55,0.45)" : "1px solid rgba(255,255,255,0.08)",
                  color: active ? GOLD : MUTED,
                  fontFamily: t.id === "sans" ? "Inter" : "'Cormorant Garamond', serif",
                  fontStyle: t.id === "italic" ? "italic" : "normal",
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Label position reset */}
      <div>
        <Label>Label Position</Label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set("labelOffset", { x: 0, y: 0 })}
            className="px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.15em]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: MUTED }}>
            Reset to Center
          </button>
          <span className="text-[9px]" style={{ color: "rgba(180,155,100,0.3)" }}>
            or drag ⠿ in Preview tab
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Notes <span style={{ color: "rgba(180,155,100,0.3)", fontSize: 9, textTransform: "none", letterSpacing: 0 }}>(optional)</span></Label>
        <textarea rows={2} maxLength={160}
          value={state.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe your signature blend…"
          className="w-full bg-transparent outline-none resize-none text-sm py-2 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(210,190,155,0.8)" }}
        />
      </div>

      {/* Box designer */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Custom Box</Label>
          <button onClick={() => set("boxEnabled", !state.boxEnabled)}
            className="text-[9px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-all"
            style={state.boxEnabled
              ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", color: GOLD_DIM }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: MUTED }
            }>
            {state.boxEnabled ? "Enabled" : "Add Box"}
          </button>
        </div>

        {state.boxEnabled && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pl-1">
            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Wood Tone</p>
              <div className="flex flex-wrap gap-2">
                {(["mahogany", "walnut", "cedar", "ebony", "maple"] as WoodTone[]).map(tone => (
                  <button key={tone} onClick={() => setBox("woodTone", tone)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={state.box.woodTone === tone
                      ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)", color: GOLD_DIM }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
                    }>
                    {WOOD_LABELS[tone]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Label Color</p>
              <div className="flex flex-wrap gap-2">
                {BOX_COLORS.map(c => (
                  <button key={c.id} onClick={() => setBox("boxColor", c.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all"
                    style={state.box.boxColor === c.id
                      ? { background: `${c.id}cc`, border: "1px solid rgba(212,175,55,0.5)", color: "rgba(255,255,255,0.9)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
                    }>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.id }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Interior Color</p>
              <div className="flex gap-2">
                {INTERIOR_COLORS.map(ic => (
                  <button key={ic.id} onClick={() => setBox("interiorColor", ic.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all"
                    style={state.box.interiorColor === ic.id
                      ? { background: `${ic.bg}cc`, border: "1px solid rgba(212,175,55,0.45)", color: ic.text }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
                    }>
                    <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: ic.bg }} />
                    {ic.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Label Text</p>
              <input
                value={state.box.labelText}
                onChange={e => setBox("labelText", e.target.value.slice(0, 18))}
                maxLength={18}
                placeholder="Brand name…"
                className="w-full bg-transparent outline-none text-sm py-1.5 border-b"
                style={{ borderColor: "rgba(212,175,55,0.2)", color: "rgba(230,210,175,0.9)" }}
              />
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Edition Name</p>
              <input
                value={state.box.limitedEditionName}
                onChange={e => setBox("limitedEditionName", e.target.value.slice(0, 40))}
                maxLength={40}
                placeholder="Reserve No. 1…"
                className="w-full bg-transparent outline-none text-sm py-1.5 border-b"
                style={{ borderColor: "rgba(212,175,55,0.2)", color: "rgba(230,210,175,0.9)" }}
              />
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Finish</p>
              <div className="flex gap-2">
                {(["matte", "gloss", "embossed"] as FinishStyle[]).map(f => (
                  <button key={f} onClick={() => setBox("finishStyle", f)}
                    className="px-3 py-1.5 rounded-full text-xs capitalize transition-all"
                    style={state.box.finishStyle === f
                      ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)", color: GOLD_DIM }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }
                    }>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
