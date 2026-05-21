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

const GOLD     = "rgba(212,139,0,0.9)";
const GOLD_DIM = "rgba(212,139,0,0.55)";
const MUTED    = "rgba(107,94,78,0.45)";

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
        {/* ── Nicaraguan Maduro Cigar — obsidian glass mat ── */}
        <div style={{
          width: "100%", borderRadius: 16,
          background: "linear-gradient(160deg, rgba(10,6,2,0.92) 0%, rgba(6,3,1,0.98) 100%)",
          border: "1px solid rgba(212,139,0,0.30)",
          boxShadow: "0 0 40px rgba(212,139,0,0.08), inset 0 1px 0 rgba(212,139,0,0.12)",
          position: "relative", overflow: "hidden",
          padding: "6px 6px 0",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.7), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.4), transparent)", pointerEvents: "none" }} />
          <div style={{ width: "100%", aspectRatio: "16/7", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <img
              src="https://images.unsplash.com/photo-1589831377283-33cb1cc6bd5d?auto=format&fit=crop&w=800&q=85"
              alt="Nicaraguan Maduro hand-rolled cigar"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", display: "block" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,2,0,0.08) 0%, transparent 40%, rgba(4,2,0,0.72) 100%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 10, left: 14, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 8, letterSpacing: "0.32em", color: "rgba(212,139,0,0.65)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", fontWeight: 700 }}>YOUR RESERVE · SIGNATURE BLEND</span>
              <span style={{ fontSize: 13, fontWeight: 300, color: "rgba(230,210,175,0.92)", fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.12em" }}>Nicaraguan Maduro · Hand-Rolled</span>
            </div>
          </div>
        </div>

        {/* Band preview with draggable label overlay */}
        <div className="flex flex-col items-center gap-2 p-6 rounded-2xl w-full"
          style={{ background: "rgba(26,26,27,0.08)", border: "1px solid rgba(26,26,27,0.07)" }}>
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
                background: "rgba(212,139,0,0.08)",
                border: "1px dashed rgba(212,139,0,0.35)",
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
            Band Preview · <span style={{ color: "rgba(212,139,0,0.4)" }}>Drag ⠿ to reposition</span>
          </p>
        </div>

        {state.boxEnabled && (
          <div className="flex flex-col items-center gap-2 p-6 rounded-2xl w-full"
            style={{ background: "rgba(26,26,27,0.08)", border: "1px solid rgba(26,26,27,0.07)" }}>
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
            style={{ background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.2)", color: GOLD_DIM }}>
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
          style={{ borderColor: "rgba(212,139,0,0.25)", color: "rgba(230,210,175,0.9)", caretColor: GOLD }}
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
                ? { background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.5)", color: GOLD }
                : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
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
                  background: active ? c.primary : "rgba(26,26,27,0.06)",
                  border: active ? `1px solid ${c.accent}` : "1px solid rgba(26,26,27,0.10)",
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
                  background: active ? "rgba(212,139,0,0.15)" : "rgba(26,26,27,0.06)",
                  border: active ? "1px solid rgba(212,139,0,0.5)" : "1px solid rgba(26,26,27,0.10)",
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
                  background: active ? "rgba(212,139,0,0.14)" : "rgba(26,26,27,0.06)",
                  border: active ? "1px solid rgba(212,139,0,0.45)" : "1px solid rgba(26,26,27,0.10)",
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
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.11)", color: MUTED }}>
            Reset to Center
          </button>
          <span className="text-[9px]" style={{ color: "rgba(107,94,78,0.30)" }}>
            or drag ⠿ in Preview tab
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label>Notes <span style={{ color: "rgba(107,94,78,0.30)", fontSize: 9, textTransform: "none", letterSpacing: 0 }}>(optional)</span></Label>
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
              ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.35)", color: GOLD_DIM }
              : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: MUTED }
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
                      ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.4)", color: GOLD_DIM }
                      : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
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
                      ? { background: `${c.id}cc`, border: "1px solid rgba(212,139,0,0.5)", color: "rgba(255,255,255,0.9)" }
                      : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
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
                      ? { background: `${ic.bg}cc`, border: "1px solid rgba(212,139,0,0.45)", color: ic.text }
                      : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
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
                style={{ borderColor: "rgba(212,139,0,0.2)", color: "rgba(230,210,175,0.9)" }}
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
                style={{ borderColor: "rgba(212,139,0,0.2)", color: "rgba(230,210,175,0.9)" }}
              />
            </div>

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Surface Finish</p>
              <div className="flex gap-2">
                {(["matte", "gloss", "embossed"] as FinishStyle[]).map(f => (
                  <button key={f} onClick={() => setBox("finishStyle", f)}
                    className="px-3 py-1.5 rounded-full text-xs capitalize transition-all"
                    style={state.box.finishStyle === f
                      ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.4)", color: GOLD_DIM }
                      : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }
                    }>
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-[8px] mt-1.5" style={{ color: "rgba(107,94,78,0.30)" }}>
                Cedar wood → choose Cedar under Wood Tone above.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
