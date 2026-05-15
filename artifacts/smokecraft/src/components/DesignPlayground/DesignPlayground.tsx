// DesignPlayground — full-screen pre-craft overlay used by all four craft flows.
// Config is supplied by the parent page. Types are exported for page use.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Lock, Sparkles, ChevronRight, Check, Save } from "lucide-react";
import { fetchDesignDrafts, upsertDesignDraft } from "@/services/api";
import CraftRenderer from "@/components/CraftRenderer/CraftRenderer";

/* ── Design tokens ─────────────────────────────────────────────────────── */
const OBSIDIAN      = "#010101";
const GOLD          = "#bf953f";
const GOLD_BRIGHT   = "#fcf6ba";
const GOLD_MID      = "#D4AF37";
const GOLD_DIM      = "rgba(191,149,63,0.55)";
const GOLD_FAINT    = "rgba(191,149,63,0.18)";
const GOLD_GHOST    = "rgba(191,149,63,0.08)";
const TEXT_PRIMARY  = "rgba(235,225,210,0.92)";
const TEXT_MUTED    = "rgba(191,149,63,0.52)";
const TEXT_DIM      = "rgba(180,165,140,0.38)";
const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_BRIGHT} 50%, ${GOLD} 100%)`;
const GLASS_BG      = "rgba(12,9,5,0.82)";
const GLASS_BORDER  = "1px solid rgba(191,149,63,0.32)";
const GLASS_SHADOW  = "0 8px 48px rgba(0,0,0,0.72), inset 0 1px 0 rgba(191,149,63,0.10), inset 0 0 40px rgba(0,0,0,0.30)";

/* ── Types ─────────────────────────────────────────────────────────────── */
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

/* ── Helpers ───────────────────────────────────────────────────────────── */
export function hasSeenPlayground(craft: string): boolean {
  try { return sessionStorage.getItem(`playground_seen_${craft}`) === "1"; }
  catch { return false; }
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

function generateCritique(
  config:       PlaygroundConfig,
  brandName:    string,
  colorId:      string,
  selectFields: Record<string, string>,
): string {
  const name   = brandName.trim() || "Untitled";
  const swatch = config.colorSwatches.find(c => c.id === colorId) ?? config.colorSwatches[0];

  const namePhrase = NAME_PHRASES[name.length % NAME_PHRASES.length] ?? NAME_PHRASES[0];
  const colorNote  = swatch.locked
    ? `The ${swatch.label} finish marks you as someone who already knows what lies ahead.`
    : (COLOR_NOTES[colorId] ?? `The ${swatch.label} palette strikes a distinctive mood that will set this apart.`);

  const styleField = config.selectFields.find(sf => !sf.locked && selectFields[sf.id]);
  const styleNote  = styleField
    ? (() => {
        const chosen = styleField.options.find(o => o.id === selectFields[styleField.id]);
        return chosen
          ? `Your ${styleField.label.toLowerCase()} — ${chosen.label} — anchors the character of this creation.`
          : null;
      })()
    : null;

  const seed       = name.length + (colorId.charCodeAt(0) ?? 65) + (styleField ? styleField.id.charCodeAt(0) : 0);
  const motivation = MOTIVATIONS[seed % MOTIVATIONS.length] ?? MOTIVATIONS[0];

  return styleNote
    ? `"${name}" ${namePhrase}. ${colorNote} ${styleNote} ${motivation}`
    : `"${name}" ${namePhrase}. ${colorNote} ${motivation}`;
}

/* ── PanelSection sub-component ────────────────────────────────────────── */
function PanelSection({
  label, locked, children,
}: {
  label: string; locked?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18, flexShrink: 0 }}>
      <p style={{
        margin: "0 0 8px", fontSize: 9,
        letterSpacing: "0.30em", textTransform: "uppercase",
        color: locked ? TEXT_DIM : GOLD_MID,
        fontWeight: 700,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {label}
        {locked && <Lock size={8} style={{ color: GOLD_DIM }} />}
      </p>
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
interface Props {
  craft:      PlaygroundCraft;
  config:     PlaygroundConfig;
  onComplete: () => void;
}

export default function DesignPlayground({ craft, config, onComplete }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const controls  = useAnimation();

  const [brandName,      setBrandName]      = useState("");
  const [selectedColor,  setSelectedColor]  = useState(config.colorSwatches[0].id);
  const [selectedEmblem, setSelectedEmblem] = useState(config.emblemOptions[0].id);
  const [selectFields,   setSelectFields]   = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sf of config.selectFields) init[sf.id] = sf.options[0]?.id ?? "";
    return init;
  });
  const [engravingText, setEngravingText] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveLocal, setSaveLocal] = useState(false);
  const [critique,  setCritique]  = useState<string | null>(null);

  const [canvasScale, setCanvasScale]  = useState(1.0);
  const pinchStartDistRef              = useRef<number | null>(null);
  const pinchStartScaleRef             = useRef<number>(1.0);

  const fieldKey   = `${brandName}|${selectedColor}|${selectedEmblem}|${engravingText}|${Object.values(selectFields).join("|")}`;
  const savedRef   = useRef(false);
  savedRef.current = saved;
  useEffect(() => {
    if (savedRef.current) { setSaved(false); setSaveLocal(false); }
  }, [fieldKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
    let localOk = false;
    try { localStorage.setItem(`playground_draft_${craft}`, JSON.stringify(payload)); localOk = true; } catch {}
    const cloudResult = await upsertDesignDraft({ craft, draftName: brandName || "My Draft", payload });
    const cloudOk     = cloudResult !== null;
    setSaving(false);
    setSaved(localOk || cloudOk);
    setSaveLocal(!cloudOk && localOk);
    setCritique(generateCritique(config, brandName, selectedColor, selectFields));
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

  const productW = craft === "smoke" ? 240 : craft === "pour" ? 160 : 220;
  const productH = craft === "pour"  ? 300 : craft === "smoke" ? 140 : craft === "vape" ? 200 : 160;
  const productR = craft === "smoke" ? 10  : craft === "pour"  ? 80  : craft === "vape"  ? 24 : 16;

  return (
    <motion.div
      animate={controls}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: OBSIDIAN,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Ambient depth gradient */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 60% 50% at 15% 85%, rgba(191,149,63,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 40% 35% at 85% 15%, rgba(191,149,63,0.04) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 50% 50%, rgba(5,3,1,0.60) 0%, transparent 100%)
        `,
      }} />

      {/* Craft texture — ultra-dim */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${config.background})`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.04, filter: "saturate(0) brightness(0.4)",
        pointerEvents: "none",
      }} />

      {/* Hairline gold top-edge glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1, zIndex: 1,
        background: `linear-gradient(90deg, transparent 0%, ${GOLD}55 30%, ${GOLD_BRIGHT}80 50%, ${GOLD}55 70%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: 1280, width: "100%", margin: "0 auto",
        padding: "20px 28px 24px",
        overflow: "hidden",
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20, flexShrink: 0,
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10,
              letterSpacing: "0.35em", textTransform: "uppercase",
              color: TEXT_MUTED, fontWeight: 700,
            }}>
              {config.craftLabel} · Design Playground
            </p>
            <h1 style={{
              margin: "5px 0 0",
              fontSize: "clamp(20px, 2.2vw, 28px)",
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontWeight: 600,
              letterSpacing: "0.2em",
              background: GOLD_GRADIENT,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textTransform: "uppercase",
            }}>
              Design First. Build Worthy of It.
            </h1>
          </div>
          <Sparkles size={24} color={GOLD_MID} style={{ opacity: 0.70 }} />
        </div>

        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 370px",
          gap: 20,
          overflow: "hidden",
          minHeight: 0,
        }}>

          {/* ── Canvas ──────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            style={{
              position: "relative",
              borderRadius: 20,
              background: `radial-gradient(ellipse at 50% 40%, rgba(30,22,8,0.95), rgba(5,3,1,0.98))`,
              border: `1px solid ${GOLD_FAINT}`,
              boxShadow: `inset 0 0 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(191,149,63,0.06)`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "none",
            }}
          >
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse at 50% 40%, ${swatch.accent}0D, transparent 60%)`,
            }} />

            {(craft === "pour" || craft === "brew") ? (
              <div style={{
                position: "relative", flexShrink: 0,
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
                filter: `drop-shadow(0 24px 40px ${swatch.accent}40) drop-shadow(0 0 20px ${swatch.accent}22)`,
              }}>
                <CraftRenderer
                  craft={craft}
                  styleId={undefined}
                  accentColor={swatch.accent}
                  fillLevel={65}
                  width={craft === "pour" ? 130 : 140}
                />
              </div>
            ) : (
              <div style={{
                position: "relative",
                width: productW, height: productH,
                borderRadius: productR,
                background: `linear-gradient(155deg, ${swatch.primary}, ${swatch.accent}18)`,
                border: `1.5px solid ${swatch.accent}60`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.70), 0 0 50px ${swatch.accent}22, inset 0 1px 0 ${swatch.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 6,
                flexShrink: 0,
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
              }}>
                <div style={{
                  position: "absolute", inset: 8,
                  border: `1px solid ${swatch.accent}28`,
                  borderRadius: Math.max(productR - 6, 4),
                  pointerEvents: "none",
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.32em", textTransform: "uppercase",
                  color: swatch.accent, opacity: 0.55,
                }}>
                  {config.craftLabel.toUpperCase()}
                </span>
              </div>
            )}

            {/* Draggable brand chip */}
            <motion.div
              drag
              dragConstraints={canvasRef}
              dragMomentum={false}
              dragElastic={0.06}
              style={{
                position: "absolute", top: "28%", left: "20%",
                cursor: "grab", touchAction: "none",
                userSelect: "none", zIndex: 10,
              }}
              whileDrag={{ cursor: "grabbing" }}
            >
              <div style={{
                padding: "7px 16px", borderRadius: 999,
                background: `linear-gradient(135deg, rgba(15,11,5,0.92), rgba(30,22,8,0.88))`,
                border: `1px solid ${swatch.accent}70`,
                boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 14px ${swatch.accent}22`,
                fontSize: 14,
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontWeight: 600,
                color: swatch.accent,
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
              }}>
                {brandName || "Your Brand"}
              </div>
            </motion.div>

            {/* Draggable emblem chip */}
            <motion.div
              drag
              dragConstraints={canvasRef}
              dragMomentum={false}
              dragElastic={0.06}
              style={{
                position: "absolute", top: "54%", left: "60%",
                cursor: "grab", touchAction: "none",
                userSelect: "none", zIndex: 10,
              }}
              whileDrag={{ cursor: "grabbing" }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `rgba(15,11,5,0.88)`,
                border: `1px solid ${swatch.accent}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
                boxShadow: `0 6px 20px rgba(0,0,0,0.50), 0 0 12px ${swatch.accent}18`,
                transform: `scale(${canvasScale})`,
                transformOrigin: "center",
              }}>
                {(emblem.label.split(" ")[1] ?? emblem.label.charAt(0)) || "✦"}
              </div>
            </motion.div>

            <p style={{
              position: "absolute", bottom: 12,
              fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
              color: TEXT_DIM, fontWeight: 600,
              pointerEvents: "none",
            }}>
              Drag · Pinch to scale
            </p>
          </div>

          {/* ── RIGHT: Glassmorphic properties panel ──────────────── */}
          <div style={{
            display: "flex", flexDirection: "column",
            overflowY: "auto", overflowX: "hidden",
            paddingRight: 2,
            background: GLASS_BG,
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
            border: GLASS_BORDER,
            borderRadius: 18,
            boxShadow: GLASS_SHADOW,
            padding: "20px 18px 18px",
          }}>

            <PanelSection label={config.brandNameLabel}>
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={config.brandNamePlaceholder}
                maxLength={32}
                style={{
                  width: "100%", background: "transparent",
                  border: "none", borderBottom: `1px solid ${GOLD_DIM}`,
                  outline: "none",
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: 18, color: TEXT_PRIMARY,
                  caretColor: GOLD_MID, padding: "5px 0",
                  letterSpacing: "0.06em",
                }}
              />
            </PanelSection>

            <PanelSection label="Palette">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {config.colorSwatches.map(sw => {
                  const isActive = selectedColor === sw.id;
                  return (
                    <button
                      key={sw.id}
                      onClick={() => !sw.locked && setSelectedColor(sw.id)}
                      title={sw.locked ? `${sw.label} — unlocks in Signature Studio` : sw.label}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 999,
                        background: isActive
                          ? `linear-gradient(135deg, ${sw.accent}28, ${sw.accent}14)`
                          : GOLD_GHOST,
                        border: `1px solid ${isActive ? sw.accent + "70" : GOLD_FAINT}`,
                        color: sw.locked ? TEXT_DIM : isActive ? sw.accent : TEXT_MUTED,
                        fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                        opacity: sw.locked ? 0.5 : 1,
                        cursor: sw.locked ? "not-allowed" : "pointer",
                        boxShadow: isActive ? `0 0 10px ${sw.accent}20` : "none",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: sw.accent, flexShrink: 0 }} />
                      {sw.label}
                      {sw.locked && <Lock size={8} style={{ color: GOLD_DIM }} />}
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            <PanelSection label={config.emblemLabel}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {config.emblemOptions.map(em => {
                  const isActive = selectedEmblem === em.id;
                  return (
                    <button
                      key={em.id}
                      onClick={() => setSelectedEmblem(em.id)}
                      style={{
                        padding: "5px 11px", borderRadius: 8, fontSize: 12,
                        background: isActive ? `${GOLD}22` : GOLD_GHOST,
                        border: `1px solid ${isActive ? GOLD_DIM : GOLD_FAINT}`,
                        color: isActive ? GOLD_MID : TEXT_MUTED,
                        cursor: "pointer", fontWeight: 600,
                        boxShadow: isActive ? `0 0 10px ${GOLD}20` : "none",
                        transition: "all 0.18s ease",
                      }}
                    >
                      {em.label}
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {config.selectFields.map(sf => (
              <PanelSection key={sf.id} label={sf.label} locked={sf.locked}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: sf.locked ? 0.38 : 1 }}>
                  {sf.options.map(opt => {
                    const isActive = !sf.locked && selectFields[sf.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !sf.locked && setSelectFields(prev => ({ ...prev, [sf.id]: opt.id }))}
                        style={{
                          padding: "5px 11px", borderRadius: 8, fontSize: 12,
                          background: isActive ? `${GOLD}22` : GOLD_GHOST,
                          border: `1px solid ${isActive ? GOLD_DIM : GOLD_FAINT}`,
                          color: isActive ? GOLD_MID : TEXT_MUTED,
                          cursor: sf.locked ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          boxShadow: isActive ? `0 0 10px ${GOLD}20` : "none",
                          transition: "all 0.18s ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            ))}

            <PanelSection label={config.engravingLabel} locked={config.engravingLocked}>
              <input
                value={engravingText}
                onChange={e => !config.engravingLocked && setEngravingText(e.target.value)}
                placeholder={config.engravingPlaceholder}
                maxLength={64}
                disabled={config.engravingLocked}
                style={{
                  width: "100%", background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${config.engravingLocked ? GOLD_GHOST : GOLD_FAINT}`,
                  outline: "none", fontSize: 13,
                  color: config.engravingLocked ? TEXT_DIM : TEXT_PRIMARY,
                  caretColor: GOLD_MID, padding: "5px 0",
                  letterSpacing: "0.04em",
                }}
              />
            </PanelSection>

            {/* Locked hint */}
            <div style={{
              padding: "9px 12px", borderRadius: 10,
              background: GOLD_GHOST,
              border: `1px solid rgba(191,149,63,0.14)`,
              fontSize: 10, color: TEXT_MUTED,
              letterSpacing: "0.03em", lineHeight: 1.65,
              display: "flex", gap: 8, alignItems: "flex-start",
              marginBottom: 14, flexShrink: 0,
            }}>
              <Lock size={10} style={{ flexShrink: 0, marginTop: 1, color: GOLD }} />
              <span>{config.lockedHint}</span>
            </div>

            <div style={{ flex: 1, minHeight: 4 }} />

            {/* Save as Draft — pinned gold action button */}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${GOLD}38` }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "12px 18px", borderRadius: 12, flexShrink: 0,
                background: saved
                  ? "linear-gradient(135deg, rgba(52,211,153,0.14), rgba(52,211,153,0.06))"
                  : GOLD_GRADIENT,
                border: saved ? "1px solid rgba(52,211,153,0.35)" : "none",
                color: saved ? "rgba(52,211,153,0.90)" : "#0D0900",
                fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: saving ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                marginBottom: 8,
                boxShadow: saved
                  ? "none"
                  : `0 8px 28px rgba(191,149,63,0.30), inset 0 1px 0 rgba(255,255,255,0.08)`,
                opacity: saving ? 0.6 : 1,
                transition: "all 0.22s ease",
              }}
            >
              {saved
                ? <><Check size={12} /> {saveLocal ? "Saved Locally" : "Draft Saved"}</>
                : <><Save size={12} /> Save as Draft</>
              }
            </motion.button>

            {/* AI Critique */}
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
                    padding: "12px 14px", borderRadius: 12,
                    background: `linear-gradient(135deg, rgba(191,149,63,0.08), rgba(191,149,63,0.03))`,
                    border: `1px solid rgba(191,149,63,0.22)`,
                    boxShadow: `inset 0 1px 0 rgba(191,149,63,0.10)`,
                  }}>
                    <p style={{
                      margin: "0 0 5px", fontSize: 9,
                      letterSpacing: "0.30em", textTransform: "uppercase",
                      color: GOLD_MID, fontWeight: 700, opacity: 0.75,
                    }}>
                      Craft Intelligence
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: TEXT_PRIMARY, lineHeight: 1.65 }}>
                      {critique}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enter Challenge CTA */}
            <motion.button
              onClick={handleEnterChallenge}
              whileHover={{ scale: 1.02, boxShadow: `0 16px 50px rgba(191,149,63,0.42)` }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "15px 20px", borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, #1a1200, #2c1f00, #1a1200)`,
                border: `1px solid ${GOLD}80`,
                color: GOLD_MID,
                fontSize: 12, fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                boxShadow: `0 8px 36px rgba(191,149,63,0.22), inset 0 1px 0 rgba(191,149,63,0.20)`,
                transition: "all 0.22s ease",
              }}
            >
              Enter Challenge <ChevronRight size={15} />
            </motion.button>

            <p style={{
              textAlign: "center", margin: "8px 0 0", flexShrink: 0,
              fontSize: 10, color: TEXT_DIM, letterSpacing: "0.12em",
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
