// DesignPlayground — full-screen pre-craft overlay used by all four craft flows.
// Config is supplied by the parent page. Types are exported for page use.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Lock, Sparkles, ChevronRight, Check, Save } from "lucide-react";
import { fetchDesignDrafts, upsertDesignDraft } from "@/services/api";

export type PlaygroundCraft = "smoke" | "brew" | "pour" | "vape";

export interface ColorSwatch  { id: string; label: string; primary: string; accent: string; locked?: boolean }
export interface EmblemOption { id: string; label: string }
export interface SelectOption { id: string; label: string }
export interface SelectField  { id: string; label: string; options: SelectOption[]; locked?: boolean }

export interface PlaygroundConfig {
  craft:                PlaygroundCraft;
  craftLabel:           string;
  accent:               string;
  accentSoft:           string;
  tint:                 string;
  background:           string;
  brandNameLabel:       string;
  brandNamePlaceholder: string;
  emblemLabel:          string;
  emblemOptions:        EmblemOption[];
  colorSwatches:        ColorSwatch[];
  selectFields:         SelectField[];
  engravingLabel:       string;
  engravingPlaceholder: string;
  engravingLocked:      boolean;
  lockedHint:           string;
}

export function hasSeenPlayground(craft: string): boolean {
  try { return sessionStorage.getItem(`playground_seen_${craft}`) === "1"; }
  catch { return true; }
}

export function markPlaygroundSeen(craft: string): void {
  try { sessionStorage.setItem(`playground_seen_${craft}`, "1"); } catch {}
}

const NAME_PHRASES: string[] = [
  "commands the room",
  "speaks with quiet conviction",
  "makes its presence known immediately",
  "carries a rare kind of authority",
  "refuses to be ordinary",
];

const COLOR_NOTES: Record<string, string> = {
  gold:     "The Gold palette invokes timeless authority — a standard others will be measured against.",
  black:    "Onyx speaks in quiet power. Those who know, know.",
  burgundy: "Burgundy signals depth and passion with restrained elegance.",
  navy:     "Navy carries the calm confidence of something that has been proven.",
  forest:   "Forest green roots your brand in something ancient and enduring.",
  crimson:  "Crimson is bold and unapologetic — this is a brand that makes its intentions clear.",
  whiskey:  "Whiskey amber carries warmth and gravitas in equal measure.",
  cognac:   "Cognac gold speaks of provenance. Every drop earns its place.",
  violet:   "Violet signals something uncommon — a flavor people seek out.",
  rose:     "Rose is modern and precise. It knows exactly who it's for.",
};

const MOTIVATIONS: string[] = [
  "Now build something worthy of this.",
  "The craft will test whether the creation lives up to the design.",
  "Vision is set. The real challenge starts now.",
  "Your blend awaits — make it earn this identity.",
  "Design complete. One thing left: honor it.",
];

function generateCritique(config: PlaygroundConfig, brandName: string, colorId: string): string {
  const name    = brandName.trim() || "Untitled";
  const swatch  = config.colorSwatches.find(c => c.id === colorId) ?? config.colorSwatches[0];

  const namePhrase = NAME_PHRASES[name.length % NAME_PHRASES.length] ?? NAME_PHRASES[0];
  const colorNote  = swatch.locked
    ? `The ${swatch.label} finish marks you as someone who already knows what lies ahead.`
    : (COLOR_NOTES[colorId] ?? `The ${swatch.label} palette strikes a distinctive mood that will set this apart.`);

  const motivation = MOTIVATIONS[(name.length + (colorId.charCodeAt(0) ?? 65)) % MOTIVATIONS.length] ?? MOTIVATIONS[0];

  return `"${name}" ${namePhrase}. ${colorNote} ${motivation}`;
}

interface Props {
  craft:      PlaygroundCraft;
  config:     PlaygroundConfig;
  onComplete: () => void;
}

export default function DesignPlayground({ craft, config, onComplete }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const controls  = useAnimation();

  // Design values
  const [brandName,    setBrandName]    = useState("");
  const [selectedColor, setSelectedColor] = useState(config.colorSwatches[0].id);
  const [selectedEmblem, setSelectedEmblem] = useState(config.emblemOptions[0].id);
  const [selectFields,  setSelectFields]  = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sf of config.selectFields) init[sf.id] = sf.options[0]?.id ?? "";
    return init;
  });
  const [engravingText, setEngravingText] = useState("");

  // UI state
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveLocal, setSaveLocal] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);

  // Pinch-to-scale — tablet two-finger gesture on the canvas
  const [canvasScale, setCanvasScale]  = useState(1.0);
  const pinchStartDistRef              = useRef<number | null>(null);
  const pinchStartScaleRef             = useRef<number>(1.0);

  // Reset "Draft Saved" label when any field changes after a successful save
  const fieldKey   = `${brandName}|${selectedColor}|${selectedEmblem}|${engravingText}|${Object.values(selectFields).join("|")}`;
  const savedRef   = useRef(false);
  savedRef.current = saved;
  useEffect(() => {
    if (savedRef.current) { setSaved(false); setSaveLocal(false); }
  }, [fieldKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load latest draft on mount
  useEffect(() => {
    void (async () => {
      const drafts = await fetchDesignDrafts(craft);
      const p = (drafts[0]?.payload ?? null) as Record<string, unknown> | null;
      if (p) {
        if (typeof p["brandName"]     === "string") setBrandName(p["brandName"]);
        if (typeof p["selectedColor"] === "string") setSelectedColor(p["selectedColor"]);
        if (typeof p["selectedEmblem"]=== "string") setSelectedEmblem(p["selectedEmblem"]);
        if (typeof p["engravingText"] === "string") setEngravingText(p["engravingText"]);
        if (p["selectFields"] && typeof p["selectFields"] === "object") {
          setSelectFields(prev => ({ ...prev, ...(p["selectFields"] as Record<string, string>) }));
        }
        return;
      }
      // localStorage fallback for guests
      try {
        const raw = localStorage.getItem(`playground_draft_${craft}`);
        if (!raw) return;
        const lp = JSON.parse(raw) as Record<string, unknown>;
        if (typeof lp["brandName"]     === "string") setBrandName(lp["brandName"]);
        if (typeof lp["selectedColor"] === "string") setSelectedColor(lp["selectedColor"]);
        if (typeof lp["selectedEmblem"]=== "string") setSelectedEmblem(lp["selectedEmblem"]);
        if (typeof lp["engravingText"] === "string") setEngravingText(lp["engravingText"]);
        if (lp["selectFields"] && typeof lp["selectFields"] === "object") {
          setSelectFields(prev => ({ ...prev, ...(lp["selectFields"] as Record<string, string>) }));
        }
      } catch { /* guest: no local draft */ }
    })();
  }, [craft]);

  const swatch = config.colorSwatches.find(c => c.id === selectedColor) ?? config.colorSwatches[0];
  const emblem = config.emblemOptions.find(e => e.id === selectedEmblem)  ?? config.emblemOptions[0];

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const payload = { brandName, selectedColor, selectedEmblem, engravingText, selectFields };
    // Mirror to localStorage; track whether write confirmed (fails silently on private browsing)
    let localOk = false;
    try { localStorage.setItem(`playground_draft_${craft}`, JSON.stringify(payload)); localOk = true; } catch {}
    // PATCH upsert aligns with existing backend route (idempotent, craft-scoped)
    const cloudResult = await upsertDesignDraft({ craft, draftName: brandName || "My Draft", payload });
    const cloudOk     = cloudResult !== null;
    setSaving(false);
    setSaved(localOk || cloudOk);      // only show saved if at least one path succeeded
    setSaveLocal(!cloudOk && localOk); // "Saved locally" = local confirmed, cloud unavailable
    setCritique(generateCritique(config, brandName, selectedColor));
  };

  const handleEnterChallenge = async () => {
    await controls.start({
      opacity: 0,
      scale: 1.07,
      transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
    });
    onComplete();
  };

  function getPinchDist(t1: React.Touch, t2: React.Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current  = getPinchDist(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = canvasScale;
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDistRef.current === null) return;
    const dist  = getPinchDist(e.touches[0], e.touches[1]);
    const ratio = dist / pinchStartDistRef.current;
    const next  = Math.max(0.55, Math.min(2.5, pinchStartScaleRef.current * ratio));
    setCanvasScale(next);
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDistRef.current = null;
  };

  // Canvas product shape dimensions per craft
  const productW = craft === "smoke" ? 240 : craft === "pour" ? 160 : 220;
  const productH = craft === "pour"  ? 300 : craft === "smoke" ? 140 : craft === "vape" ? 200 : 160;
  const productR = craft === "smoke" ? 10  : craft === "pour"  ? 80  : craft === "vape"  ? 24 : 16;

  return (
    <motion.div
      animate={controls}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,6,4,0.97)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Craft background image */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${config.background})`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.1, filter: "saturate(0.5)",
        pointerEvents: "none",
      }} />
      {/* Tint overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: `radial-gradient(ellipse at 30% 50%, ${config.tint}, transparent 65%), linear-gradient(135deg,rgba(8,6,4,0.72),rgba(8,6,4,0.88))`,
        pointerEvents: "none",
      }} />

      {/* ── Page content ───────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: 1280, width: "100%", margin: "0 auto",
        padding: "20px 28px 24px",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20, flexShrink: 0,
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10,
              letterSpacing: "0.32em", textTransform: "uppercase",
              color: config.accent, fontWeight: 700,
            }}>
              {config.craftLabel} · Design Playground
            </p>
            <h1 style={{
              margin: "4px 0 0",
              fontSize: "clamp(20px, 2.2vw, 28px)",
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontWeight: 600, color: "#fff", letterSpacing: "0.02em",
            }}>
              Design First. Build Worthy of It.
            </h1>
          </div>
          <Sparkles size={26} color={config.accent} style={{ opacity: 0.55 }} />
        </div>

        {/* ── Two-column layout ─────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 370px",
          gap: 22,
          overflow: "hidden",
          minHeight: 0,
        }}>

          {/* LEFT: drag canvas — drag elements to reposition, pinch with two
               fingers on tablet to zoom the canvas in or out (0.55×–2.5×). */}
          <div
            ref={canvasRef}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            style={{
              position: "relative",
              borderRadius: 20,
              background: "rgba(255,255,255,0.022)",
              border: `1px solid ${config.accent}1A`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "none",
            }}
          >
            {/* Canvas accent glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${swatch.accent}10, transparent 65%)`,
              pointerEvents: "none",
            }} />

            {/* Centered product mock — scales with pinch gesture */}
            <div style={{
              position: "relative",
              width: productW, height: productH,
              borderRadius: productR,
              background: `linear-gradient(155deg, ${swatch.primary}, ${swatch.accent}20)`,
              border: `2px solid ${swatch.accent}50`,
              boxShadow: `0 24px 72px rgba(0,0,0,0.65), 0 0 40px ${swatch.accent}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 6,
              flexShrink: 0,
              transform: `scale(${canvasScale})`,
              transformOrigin: "center",
            }}>
              {/* Inner decorative frame */}
              <div style={{
                position: "absolute", inset: 8,
                border: `1px solid ${swatch.accent}30`,
                borderRadius: Math.max(productR - 6, 4),
                pointerEvents: "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: "0.3em", textTransform: "uppercase",
                color: swatch.accent, opacity: 0.45,
              }}>
                {config.craftLabel.toUpperCase()}
              </span>
            </div>

            {/* Draggable: Brand name chip
                 Outer motion.div handles drag constraints on the unscaled canvas.
                 Inner div applies canvasScale so the chip visually matches the
                 product mock zoom level without disturbing drag bounds. */}
            <motion.div
              drag
              dragConstraints={canvasRef}
              dragMomentum={false}
              dragElastic={0.06}
              style={{
                position: "absolute",
                top: "28%", left: "20%",
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
                zIndex: 10,
              }}
              whileDrag={{ cursor: "grabbing" }}
            >
              <div style={{
                padding: "7px 15px", borderRadius: 999,
                background: `linear-gradient(135deg, ${swatch.primary}dd, ${swatch.accent}28)`,
                border: `1px solid ${swatch.accent}66`,
                boxShadow: `0 6px 22px rgba(0,0,0,0.55), 0 0 12px ${swatch.accent}18`,
                fontSize: 14,
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontWeight: 600,
                color: swatch.accent,
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
              }}>
                {brandName || "Your Brand"}
              </div>
            </motion.div>

            {/* Draggable: Emblem chip (same scale-inner pattern as brand chip) */}
            <motion.div
              drag
              dragConstraints={canvasRef}
              dragMomentum={false}
              dragElastic={0.06}
              style={{
                position: "absolute",
                top: "54%", left: "60%",
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
                zIndex: 10,
              }}
              whileDrag={{ cursor: "grabbing" }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `${swatch.accent}18`,
                border: `1px solid ${swatch.accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
              }}>
                {(emblem.label.split(" ")[1] ?? emblem.label.charAt(0)) || "✦"}
              </div>
            </motion.div>

            {/* Canvas hint */}
            <p style={{
              position: "absolute", bottom: 12,
              fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase",
              color: "rgba(232,224,200,0.22)", fontWeight: 600,
              pointerEvents: "none",
            }}>
              Drag · Pinch to scale
            </p>
          </div>

          {/* RIGHT: Properties panel */}
          <div style={{
            display: "flex", flexDirection: "column",
            overflowY: "auto", overflowX: "hidden",
            paddingRight: 2,
          }}>

            {/* Brand Name */}
            <PanelSection label={config.brandNameLabel} accent={config.accent}>
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={config.brandNamePlaceholder}
                maxLength={32}
                style={{
                  width: "100%", background: "transparent",
                  border: "none", borderBottom: `1px solid ${config.accent}30`,
                  outline: "none",
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: 18, color: "rgba(232,224,200,0.95)",
                  caretColor: config.accent, padding: "5px 0",
                  letterSpacing: "0.04em",
                }}
              />
            </PanelSection>

            {/* Color palette */}
            <PanelSection label="Palette" accent={config.accent}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {config.colorSwatches.map(sw => (
                  <button
                    key={sw.id}
                    onClick={() => !sw.locked && setSelectedColor(sw.id)}
                    title={sw.locked ? `${sw.label} — unlocks in Signature Studio` : sw.label}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 9px", borderRadius: 999,
                      background: selectedColor === sw.id ? `${sw.accent}20` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedColor === sw.id ? sw.accent + "70" : "rgba(255,255,255,0.08)"}`,
                      color: sw.locked ? "rgba(180,155,100,0.3)" : selectedColor === sw.id ? sw.accent : "rgba(180,155,100,0.6)",
                      fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
                      opacity: sw.locked ? 0.6 : 1,
                      cursor: sw.locked ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: sw.accent, flexShrink: 0 }} />
                    {sw.label}
                    {sw.locked && <Lock size={8} style={{ color: `${config.accent}45` }} />}
                  </button>
                ))}
              </div>
            </PanelSection>

            {/* Emblem / insignia picker */}
            <PanelSection label={config.emblemLabel} accent={config.accent}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {config.emblemOptions.map(em => (
                  <button
                    key={em.id}
                    onClick={() => setSelectedEmblem(em.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 12,
                      background: selectedEmblem === em.id ? `${config.accent}15` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedEmblem === em.id ? config.accent + "55" : "rgba(255,255,255,0.08)"}`,
                      color: selectedEmblem === em.id ? config.accent : "rgba(180,155,100,0.6)",
                      cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    {em.label}
                  </button>
                ))}
              </div>
            </PanelSection>

            {/* Dynamic select fields */}
            {config.selectFields.map(sf => (
              <PanelSection key={sf.id} label={sf.label} accent={config.accent} locked={sf.locked}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: sf.locked ? 0.45 : 1 }}>
                  {sf.options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => !sf.locked && setSelectFields(prev => ({ ...prev, [sf.id]: opt.id }))}
                      style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: 12,
                        background: !sf.locked && selectFields[sf.id] === opt.id ? `${config.accent}15` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${!sf.locked && selectFields[sf.id] === opt.id ? config.accent + "55" : "rgba(255,255,255,0.08)"}`,
                        color: !sf.locked && selectFields[sf.id] === opt.id ? config.accent : "rgba(180,155,100,0.6)",
                        cursor: sf.locked ? "not-allowed" : "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PanelSection>
            ))}

            {/* Engraving / tagline text */}
            <PanelSection
              label={config.engravingLabel}
              accent={config.accent}
              locked={config.engravingLocked}
            >
              <input
                value={engravingText}
                onChange={e => !config.engravingLocked && setEngravingText(e.target.value)}
                placeholder={config.engravingPlaceholder}
                maxLength={64}
                disabled={config.engravingLocked}
                style={{
                  width: "100%", background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${config.accent}${config.engravingLocked ? "15" : "28"}`,
                  outline: "none", fontSize: 13,
                  color: config.engravingLocked ? "rgba(180,155,100,0.3)" : "rgba(210,190,155,0.85)",
                  caretColor: config.accent, padding: "5px 0",
                }}
              />
            </PanelSection>

            {/* Locked field hint */}
            <div style={{
              padding: "9px 12px", borderRadius: 10,
              background: `${config.accent}07`,
              border: `1px solid ${config.accent}16`,
              fontSize: 10, color: `${config.accent}65`,
              letterSpacing: "0.03em", lineHeight: 1.65,
              display: "flex", gap: 8, alignItems: "flex-start",
              marginBottom: 14, flexShrink: 0,
            }}>
              <Lock size={10} style={{ flexShrink: 0, marginTop: 1, color: config.accent }} />
              <span>{config.lockedHint}</span>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1, minHeight: 4 }} />

            {/* Save as Draft */}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "10px 18px", borderRadius: 12, flexShrink: 0,
                background: saved ? "rgba(100,200,120,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${saved ? "rgba(100,200,120,0.32)" : config.accent + "28"}`,
                color: saved ? "rgba(100,200,120,0.85)" : "rgba(232,224,200,0.7)",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
                cursor: saving ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                marginBottom: 8,
              }}
            >
              {saved
                ? <><Check size={12} /> {saveLocal ? "Saved locally" : "Draft Saved"}</>
                : <><Save size={12} /> Save as Draft</>
              }
            </motion.button>

            {/* AI Critique card */}
            <AnimatePresence>
              {critique && (
                <motion.div
                  initial={{ opacity: 0, y: 14, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden", marginBottom: 10, flexShrink: 0 }}
                >
                  <div style={{
                    padding: "11px 13px", borderRadius: 12,
                    background: `linear-gradient(135deg, ${config.accent}0E, rgba(10,8,6,0.5))`,
                    border: `1px solid ${config.accent}28`,
                  }}>
                    <p style={{
                      margin: "0 0 5px", fontSize: 9,
                      letterSpacing: "0.28em", textTransform: "uppercase",
                      color: config.accent, fontWeight: 700, opacity: 0.65,
                    }}>
                      Craft Intelligence
                    </p>
                    <p style={{
                      margin: 0, fontSize: 12,
                      color: "rgba(232,224,200,0.8)",
                      lineHeight: 1.65,
                    }}>
                      {critique}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enter Challenge CTA */}
            <motion.button
              onClick={handleEnterChallenge}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, ${config.accent}, ${config.accentSoft})`,
                border: "none",
                color: "#0a0806",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                boxShadow: `0 10px 36px ${config.accent}38`,
              }}
            >
              Enter Challenge <ChevronRight size={15} />
            </motion.button>
            <p style={{
              textAlign: "center", margin: "7px 0 0", flexShrink: 0,
              fontSize: 10, color: "rgba(180,155,100,0.3)", letterSpacing: "0.1em",
              fontStyle: "italic",
            }}>
              Now build something worthy of this.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PanelSection({
  label, accent, locked, children,
}: {
  label: string; accent: string; locked?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16, flexShrink: 0 }}>
      <p style={{
        margin: "0 0 7px", fontSize: 9,
        letterSpacing: "0.28em", textTransform: "uppercase",
        color: locked ? "rgba(180,155,100,0.28)" : accent,
        fontWeight: 700,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {label}
        {locked && <Lock size={8} style={{ color: `${accent}40` }} />}
      </p>
      {children}
    </div>
  );
}
