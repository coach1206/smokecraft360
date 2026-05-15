// DesignPlayground — 3D luxury configurator overlay used by all four craft flows.

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
const GOLD_GHOST    = "rgba(191,149,63,0.07)";
const TEXT_PRIMARY  = "rgba(235,225,210,0.92)";
const TEXT_MUTED    = "rgba(191,149,63,0.55)";
const TEXT_DIM      = "rgba(180,165,140,0.36)";
const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_BRIGHT} 50%, ${GOLD} 100%)`;
const GLASS_BG      = "rgba(10,7,3,0.78)";
const GLASS_BORDER  = "1px solid rgba(191,149,63,0.30)";
const GLASS_SHADOW  = "0 8px 48px rgba(0,0,0,0.80), inset 0 1px 0 rgba(191,149,63,0.10), inset 0 0 40px rgba(0,0,0,0.35)";

/* ── Material texture maps ─────────────────────────────────────────────── */
const WOOD_MAP: Record<string, { face: string; side: string; grain: string; hi: string }> = {
  cedar: {
    face:  "linear-gradient(170deg,#9A6B3E 0%,#B07C48 18%,#8A5B30 42%,#A86E3E 65%,#9A6B3E 100%)",
    side:  "linear-gradient(180deg,#6A4520 0%,#7A5228 100%)",
    grain: "repeating-linear-gradient(4deg,transparent 0,transparent 7px,rgba(70,35,8,.14) 7px,rgba(70,35,8,.14) 8px)",
    hi:    "rgba(180,130,80,0.40)",
  },
  mahogany: {
    face:  "linear-gradient(170deg,#4E1C08 0%,#6C280E 22%,#4A1A06 50%,#6A2610 75%,#4E1C08 100%)",
    side:  "linear-gradient(180deg,#350E04 0%,#4A1A06 100%)",
    grain: "repeating-linear-gradient(2deg,transparent 0,transparent 5px,rgba(100,30,8,.18) 5px,rgba(100,30,8,.18) 6px)",
    hi:    "rgba(130,50,20,0.35)",
  },
  walnut: {  /* Macassar Ebony */
    face:  "linear-gradient(170deg,#1A0E08 0%,#251506 28%,#1A0E08 55%,#201208 80%,#1A0E08 100%)",
    side:  "linear-gradient(180deg,#100804 0%,#1A0E08 100%)",
    grain: "repeating-linear-gradient(6deg,transparent 0,transparent 10px,rgba(50,25,8,.22) 10px,rgba(50,25,8,.22) 11px)",
    hi:    "rgba(60,35,15,0.40)",
  },
  pine: {  /* Maple Burl */
    face:  "linear-gradient(170deg,#C8A46A 0%,#DAB87A 20%,#BEA060 48%,#D4B075 72%,#C8A46A 100%)",
    side:  "linear-gradient(180deg,#A88448 0%,#BEA060 100%)",
    grain: "repeating-linear-gradient(8deg,transparent 0,transparent 6px,rgba(140,90,30,.12) 6px,rgba(140,90,30,.12) 7px)",
    hi:    "rgba(220,190,120,0.35)",
  },
  rosewood: {
    face:  "linear-gradient(170deg,#2E0E08 0%,#4C1C10 24%,#2A0C06 52%,#481810 78%,#2E0E08 100%)",
    side:  "linear-gradient(180deg,#200804 0%,#2A0C06 100%)",
    grain: "repeating-linear-gradient(3deg,transparent 0,transparent 4px,rgba(100,30,15,.20) 4px,rgba(100,30,15,.20) 5px)",
    hi:    "rgba(100,35,15,0.38)",
  },
};

const INTERIOR_MAP: Record<string, { gradient: string }> = {
  crimson:  { gradient: "linear-gradient(145deg,#5C0A0A 0%,#7A1010 40%,#4A0808 70%,#680E0E 100%)" },
  obsidian: { gradient: "linear-gradient(145deg,#0A0A0C 0%,#141420 40%,#080810 70%,#101018 100%)" },
  navy:     { gradient: "linear-gradient(145deg,#080C1A 0%,#101828 40%,#060A14 70%,#0C1420 100%)" },
  ivory:    { gradient: "linear-gradient(145deg,#F0EAD6 0%,#E8E0C4 40%,#F4EED8 70%,#EAE2CC 100%)" },
  cream:    { gradient: "linear-gradient(145deg,#F0EAD6 0%,#E8E0C4 40%,#F4EED8 70%,#EAE2CC 100%)" },
  ebony:    { gradient: "linear-gradient(145deg,#0A0A0C 0%,#141420 40%,#080810 70%,#101018 100%)" },
};

const HARDWARE_MAP: Record<string, { gradient: string; color: string; hi: string }> = {
  rosegold: {
    gradient: "linear-gradient(135deg,#C9956C 0%,#E8B48A 30%,#C9956C 60%,#D4A07A 100%)",
    color:    "#D4A070",
    hi:       "rgba(232,180,138,0.80)",
  },
  platinum: {
    gradient: "linear-gradient(135deg,#A0A8B0 0%,#D8DDE4 35%,#A8B0B8 65%,#C0C8D0 100%)",
    color:    "#C0C8D0",
    hi:       "rgba(220,228,236,0.80)",
  },
  gunmetal: {
    gradient: "linear-gradient(135deg,#303840 0%,#484E58 35%,#303840 65%,#3C4248 100%)",
    color:    "#808890",
    hi:       "rgba(120,130,140,0.60)",
  },
  gold: {
    gradient: "linear-gradient(135deg,#B8860B 0%,#D4AF37 35%,#B8860B 65%,#C49A25 100%)",
    color:    "#D4AF37",
    hi:       "rgba(212,175,55,0.80)",
  },
};

function getHardware(fields: Record<string, string>) {
  const id = fields["hardware"] ?? "rosegold";
  return HARDWARE_MAP[id] ?? HARDWARE_MAP.rosegold!;
}

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

export function hasSeenPlayground(craft: string): boolean {
  try { return sessionStorage.getItem(`playground_seen_${craft}`) === "1"; }
  catch { return false; }
}
export function markPlaygroundSeen(craft: string): void {
  try { sessionStorage.setItem(`playground_seen_${craft}`, "1"); } catch {}
}

const NAME_PHRASES = [
  "commands the room","speaks with quiet conviction",
  "makes its presence known immediately","carries a rare kind of authority","refuses to be ordinary",
];
const COLOR_NOTES: Record<string, string> = {
  gold:"The Gold palette invokes timeless authority.", black:"Onyx speaks in quiet power.",
  burgundy:"Burgundy signals depth and passion.", navy:"Navy carries calm confidence.",
  forest:"Forest green roots your brand in something ancient.", crimson:"Crimson is bold and unapologetic.",
  whiskey:"Whiskey amber carries warmth and gravitas.", cognac:"Cognac speaks of provenance.",
  violet:"Violet signals something uncommon.", rose:"Rose is modern and precise.",
};
const MOTIVATIONS = [
  "Now build something worthy of this.","The craft will test whether the creation lives up to the design.",
  "Vision is set. The real challenge starts now.","Your blend awaits — make it earn this identity.",
  "Design complete. One thing left: honor it.",
];

function generateCritique(config: PlaygroundConfig, brandName: string, colorId: string, selectFields: Record<string, string>): string {
  const name   = brandName.trim() || "Untitled";
  const swatch = config.colorSwatches.find(c => c.id === colorId) ?? config.colorSwatches[0];
  const namePhrase = NAME_PHRASES[name.length % NAME_PHRASES.length] ?? NAME_PHRASES[0];
  const colorNote  = swatch.locked
    ? `The ${swatch.label} finish marks you as someone who already knows what lies ahead.`
    : (COLOR_NOTES[colorId] ?? `The ${swatch.label} palette strikes a distinctive mood.`);
  const styleField = config.selectFields.find(sf => !sf.locked && selectFields[sf.id]);
  const styleNote  = styleField
    ? (() => { const c = styleField.options.find(o => o.id === selectFields[styleField.id]); return c ? `Your ${styleField.label.toLowerCase()} — ${c.label} — anchors the character.` : null; })()
    : null;
  const seed       = name.length + (colorId.charCodeAt(0) ?? 65) + (styleField ? styleField.id.charCodeAt(0) : 0);
  const motivation = MOTIVATIONS[seed % MOTIVATIONS.length] ?? MOTIVATIONS[0];
  return styleNote ? `"${name}" ${namePhrase}. ${colorNote} ${styleNote} ${motivation}` : `"${name}" ${namePhrase}. ${colorNote} ${motivation}`;
}

/* ── CSS 3D Cigar Box ──────────────────────────────────────────────────── */
function CigarBox3D({ woodId, interiorId, fields, monogram, scale }: {
  woodId: string; interiorId: string; fields: Record<string, string>;
  monogram: string; scale: number;
}) {
  const wood     = WOOD_MAP[woodId]     ?? WOOD_MAP.cedar!;
  const interior = INTERIOR_MAP[interiorId] ?? INTERIOR_MAP.crimson!;
  const hw       = getHardware(fields);
  const W = 300; const BH = 105; const LH = 115;

  return (
    <div style={{
      position: "relative",
      width: W + 24,
      filter: "drop-shadow(0 48px 64px rgba(0,0,0,0.85))",
      transform: `scale(${scale})`,
      transformOrigin: "center bottom",
      userSelect: "none",
    }}>

      {/* ── LID ── */}
      <div style={{
        width: W, height: LH,
        background: wood.face,
        transform: "perspective(900px) rotateX(-32deg)",
        transformOrigin: "bottom center",
        borderRadius: "6px 6px 0 0",
        position: "relative",
        overflow: "hidden",
        boxShadow: `inset 0 1px 0 ${wood.hi}, inset -3px 0 0 rgba(0,0,0,.22), 0 -6px 28px rgba(0,0,0,.30)`,
        marginBottom: -2,
      }}>
        <div style={{ position:"absolute",inset:0, background:wood.grain, opacity:.55 }} />
        <div style={{ position:"absolute",inset:0, background:"linear-gradient(160deg,rgba(255,255,255,.07) 0%,transparent 55%)" }} />
        {/* Monogram plate */}
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-55%)",
          padding:"9px 22px",
          border:`1px solid ${hw.hi}`,
          borderRadius:4,
          background:"rgba(0,0,0,.20)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
        }}>
          <span style={{
            fontFamily:"var(--app-font-serif,Georgia,serif)",
            fontSize:22, fontWeight:700, letterSpacing:".15em",
            color:hw.color, textShadow:`0 0 14px ${hw.color}90`, lineHeight:1,
          }}>
            {(monogram || "✦").slice(0, 3)}
          </span>
          <div style={{ width:36, height:1, background:`linear-gradient(90deg,transparent,${hw.color}80,transparent)` }} />
        </div>
        {/* Hinge dots */}
        {[0.22, 0.50, 0.78].map(p => (
          <div key={p} style={{
            position:"absolute", bottom:5, left:`calc(${p*100}% - 5px)`,
            width:10, height:10, borderRadius:"50%",
            background:hw.gradient, boxShadow:"0 2px 5px rgba(0,0,0,.65)",
          }} />
        ))}
        {/* Bottom edge metallic hinge bar */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:3,
          background:hw.gradient, opacity:.70,
        }} />
      </div>

      {/* ── BOX BODY ── */}
      <div style={{
        width:W, height:BH,
        background:wood.face,
        position:"relative",
        overflow:"hidden",
        borderRadius:"0 0 6px 6px",
        boxShadow:`inset 0 1px 0 ${wood.hi}, inset -3px 0 0 rgba(0,0,0,.25), 0 10px 0 rgba(0,0,0,.22)`,
      }}>
        <div style={{ position:"absolute",inset:0, background:wood.grain, opacity:.55 }} />
        {/* Interior lining strip visible at top opening */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:18, background:interior.gradient }} />
        <div style={{ position:"absolute",top:18,left:0,right:0,height:1, background:`linear-gradient(90deg,transparent,${hw.color}55,transparent)` }} />
        {/* Front clasp */}
        <div style={{
          position:"absolute", bottom:14, left:"50%",
          transform:"translateX(-50%)",
          width:42, height:11, borderRadius:6,
          background:hw.gradient,
          boxShadow:`0 3px 10px rgba(0,0,0,.60), inset 0 1px 0 ${hw.hi}`,
        }}>
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            width:14, height:4, borderRadius:2,
            background:"rgba(0,0,0,.32)",
          }} />
        </div>
        {/* Right-edge shadow for depth */}
        <div style={{
          position:"absolute",inset:0,
          background:"linear-gradient(90deg,transparent 82%,rgba(0,0,0,.32) 100%)",
          pointerEvents:"none",
        }} />
      </div>

      {/* Simulated right depth face */}
      <div style={{
        position:"absolute", right:-20,
        top: LH * 0.58,
        width:22, height: BH + LH * 0.44,
        background: wood.side,
        opacity:.75,
        borderRadius:"0 4px 4px 0",
        transform:"skewY(-5deg)",
        transformOrigin:"top left",
        overflow:"hidden",
      }}>
        <div style={{ position:"absolute",inset:0, background:wood.grain, opacity:.40 }} />
        <div style={{ position:"absolute",inset:0, background:"linear-gradient(90deg,rgba(0,0,0,.30),transparent)" }} />
      </div>

      {/* Ground shadow */}
      <div style={{
        position:"absolute", bottom:-20, left:"5%",
        width:"90%", height:22,
        background:"radial-gradient(ellipse,rgba(0,0,0,.72) 0%,transparent 70%)",
        filter:"blur(12px)",
      }} />
    </div>
  );
}

/* ── Material swatch thumbnail ─────────────────────────────────────────── */
function MaterialSwatch({ gradient, label, active, locked, onClick }: {
  gradient: string; label: string; active: boolean; locked?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={!locked ? onClick : undefined}
      whileHover={!locked ? { scale: 1.06 } : {}}
      whileTap={!locked ? { scale: 0.96 } : {}}
      style={{
        display:"flex", flexDirection:"column", gap:5, alignItems:"flex-start",
        background:"transparent", border:"none",
        cursor: locked ? "not-allowed" : "pointer",
        padding:0, opacity: locked ? 0.38 : 1,
      }}
    >
      <div style={{
        width:74, height:50, borderRadius:6,
        background:gradient,
        border:`1.5px solid ${active ? GOLD_MID : "rgba(191,149,63,0.16)"}`,
        boxShadow: active
          ? `0 0 0 1px ${GOLD}80, 0 8px 22px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)`
          : "0 4px 14px rgba(0,0,0,.45)",
        position:"relative", overflow:"hidden",
        transition:"all .18s ease",
      }}>
        {active && (
          <div style={{ position:"absolute",inset:0, background:"linear-gradient(135deg,rgba(191,149,63,.12) 0%,transparent 60%)" }} />
        )}
        {locked && (
          <div style={{ position:"absolute",inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.25)" }}>
            <Lock size={13} color={GOLD_DIM} />
          </div>
        )}
      </div>
      <span style={{
        fontSize:9, letterSpacing:".06em", textTransform:"uppercase",
        color: active ? GOLD_MID : TEXT_MUTED,
        fontWeight: active ? 700 : 500,
        maxWidth:74, lineHeight:1.35, textAlign:"left",
      }}>
        {label}
      </span>
    </motion.button>
  );
}

/* ── Section label ─────────────────────────────────────────────────────── */
function SectionLabel({ label, locked }: { label: string; locked?: boolean }) {
  return (
    <p style={{
      margin:"0 0 10px", fontSize:9, letterSpacing:".32em",
      textTransform:"uppercase", color: locked ? TEXT_DIM : GOLD_MID,
      fontWeight:700, display:"flex", alignItems:"center", gap:5,
    }}>
      {label}
      {locked && <Lock size={8} style={{ color:GOLD_DIM }} />}
    </p>
  );
}

/* ── Glass panel wrapper ───────────────────────────────────────────────── */
function GlassPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:GLASS_BG,
      backdropFilter:"blur(28px)",
      WebkitBackdropFilter:"blur(28px)",
      border:GLASS_BORDER,
      borderRadius:16,
      boxShadow:GLASS_SHADOW,
      padding:"18px 16px",
      display:"flex", flexDirection:"column",
      overflowY:"auto", overflowX:"hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
interface Props { craft: PlaygroundCraft; config: PlaygroundConfig; onComplete: () => void }

export default function DesignPlayground({ craft, config, onComplete }: Props) {
  const controls  = useAnimation();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [brandName,      setBrandName]      = useState("");
  const [selectedColor,  setSelectedColor]  = useState(config.colorSwatches[0].id);
  const [selectedEmblem, setSelectedEmblem] = useState(config.emblemOptions[0].id);
  const [selectFields,   setSelectFields]   = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const sf of config.selectFields) init[sf.id] = sf.options[0]?.id ?? "";
    return init;
  });
  const [engravingText, setEngravingText] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveLocal,setSaveLocal]= useState(false);
  const [critique, setCritique] = useState<string | null>(null);
  const [canvasScale, setCanvasScale]  = useState(1.0);
  const pinchStartDistRef              = useRef<number | null>(null);
  const pinchStartScaleRef             = useRef<number>(1.0);

  const fieldKey   = `${brandName}|${selectedColor}|${selectedEmblem}|${engravingText}|${Object.values(selectFields).join("|")}`;
  const savedRef   = useRef(false);
  savedRef.current = saved;
  useEffect(() => { if (savedRef.current) { setSaved(false); setSaveLocal(false); } }, [fieldKey]); // eslint-disable-line

  useEffect(() => {
    void (async () => {
      const drafts = await fetchDesignDrafts(craft);
      const p = (drafts[0]?.payload ?? null) as Record<string, unknown> | null;
      const apply = (src: Record<string, unknown>) => {
        if (typeof src["brandName"]     === "string") setBrandName(src["brandName"]);
        if (typeof src["selectedColor"] === "string") setSelectedColor(src["selectedColor"]);
        if (typeof src["selectedEmblem"]=== "string") setSelectedEmblem(src["selectedEmblem"]);
        if (typeof src["engravingText"] === "string") setEngravingText(src["engravingText"]);
        if (src["selectFields"] && typeof src["selectFields"] === "object")
          setSelectFields(prev => ({ ...prev, ...(src["selectFields"] as Record<string, string>) }));
      };
      if (p) { apply(p); return; }
      try { const raw = localStorage.getItem(`playground_draft_${craft}`); if (raw) apply(JSON.parse(raw) as Record<string,unknown>); } catch {}
    })();
  }, [craft]);

  const swatch = config.colorSwatches.find(c => c.id === selectedColor) ?? config.colorSwatches[0];

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const payload = { brandName, selectedColor, selectedEmblem, engravingText, selectFields };
    let localOk = false;
    try { localStorage.setItem(`playground_draft_${craft}`, JSON.stringify(payload)); localOk = true; } catch {}
    const cloudResult = await upsertDesignDraft({ craft, draftName: brandName || "My Draft", payload });
    const cloudOk     = cloudResult !== null;
    setSaving(false); setSaved(localOk || cloudOk); setSaveLocal(!cloudOk && localOk);
    setCritique(generateCritique(config, brandName, selectedColor, selectFields));
  };

  const handleEnterChallenge = async () => {
    await controls.start({ opacity: 0, scale: 1.07, transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] } });
    onComplete();
  };

  function getPinchDist(t1: React.Touch, t2: React.Touch) {
    return Math.sqrt((t1.clientX-t2.clientX)**2 + (t1.clientY-t2.clientY)**2);
  }
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) { pinchStartDistRef.current = getPinchDist(e.touches[0],e.touches[1]); pinchStartScaleRef.current = canvasScale; }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDistRef.current === null) return;
    const next = Math.max(0.55, Math.min(2.0, pinchStartScaleRef.current * getPinchDist(e.touches[0],e.touches[1]) / pinchStartDistRef.current));
    setCanvasScale(next);
  };
  const onTouchEnd = (e: React.TouchEvent) => { if (e.touches.length < 2) pinchStartDistRef.current = null; };

  const isSmoke = craft === "smoke";

  /* For smoke: split select fields into left (veneer/lining) and right (hardware) panels */
  const leftFields  = isSmoke ? config.selectFields.filter(sf => ["woodTone","interiorColor"].includes(sf.id)) : [];
  const rightFields = isSmoke ? config.selectFields.filter(sf => sf.id === "hardware") : config.selectFields;

  return (
    <motion.div
      animate={controls}
      style={{
        position:"fixed", inset:0, zIndex:200,
        background:OBSIDIAN,
        display:"flex", flexDirection:"column",
        overflow:"hidden",
      }}
    >
      {/* Lounge backdrop — craft image, visually prominent for smoke */}
      <div style={{
        position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`url(${config.background})`,
        backgroundSize:"cover", backgroundPosition:"center",
        opacity: isSmoke ? 0.30 : 0.07,
        filter:"saturate(0.5) brightness(0.55)",
      }} />
      {/* Dark vignette over backdrop */}
      <div style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 70% 80% at 50% 50%, rgba(1,1,1,0.55) 0%, transparent 100%),
          linear-gradient(180deg, rgba(1,1,1,0.65) 0%, rgba(1,1,1,0.30) 40%, rgba(1,1,1,0.55) 100%)
        `,
      }} />
      {/* Ambient gold blooms */}
      <div style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
        background:`
          radial-gradient(ellipse 45% 40% at 18% 88%, rgba(191,149,63,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 35% 30% at 82% 12%, rgba(191,149,63,0.04) 0%, transparent 55%)
        `,
      }} />
      {/* Gold hairline top strip */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:1, zIndex:2, pointerEvents:"none",
        background:`linear-gradient(90deg,transparent 0%,${GOLD}55 28%,${GOLD_BRIGHT}80 50%,${GOLD}55 72%,transparent 100%)`,
      }} />

      <div style={{
        position:"relative", zIndex:3,
        flex:1, display:"flex", flexDirection:"column",
        maxWidth:1340, width:"100%", margin:"0 auto",
        padding:"16px 22px 20px",
        overflow:"hidden",
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:14, flexShrink:0,
        }}>
          <div>
            <p style={{ margin:0, fontSize:10, letterSpacing:".34em", textTransform:"uppercase", color:TEXT_MUTED, fontWeight:700 }}>
              {config.craftLabel} · Signature Studio
            </p>
            <h1 style={{
              margin:"4px 0 0",
              fontSize:"clamp(18px,2.0vw,26px)",
              fontFamily:"var(--app-font-serif,Georgia,serif)",
              fontWeight:600, letterSpacing:".18em", textTransform:"uppercase",
              background:GOLD_GRADIENT,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>
              Design First. Build Worthy of It.
            </h1>
          </div>
          <Sparkles size={22} color={GOLD_MID} style={{ opacity:.72 }} />
        </div>

        {/* ── Main grid ───────────────────────────────────────────── */}
        <div style={{
          flex:1,
          display:"grid",
          gridTemplateColumns: isSmoke ? "248px 1fr 248px" : "1fr 360px",
          gap:16,
          overflow:"hidden",
          minHeight:0,
        }}>

          {/* ── LEFT PANEL (smoke only): veneer + lining ──────────── */}
          {isSmoke && (
            <GlassPanel>
              {leftFields.map(sf => {
                const isVeneer   = sf.id === "woodTone";
                const isInterior = sf.id === "interiorColor";
                return (
                  <div key={sf.id} style={{ marginBottom:20, flexShrink:0 }}>
                    <SectionLabel label={sf.label} locked={sf.locked} />
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {sf.options.map(opt => {
                        const isActive = !sf.locked && selectFields[sf.id] === opt.id;
                        let gradient = GOLD_GHOST;
                        if (isVeneer)   gradient = (WOOD_MAP[opt.id]?.face)     ?? GOLD_GHOST;
                        if (isInterior) gradient = (INTERIOR_MAP[opt.id]?.gradient) ?? GOLD_GHOST;
                        return (
                          <MaterialSwatch
                            key={opt.id}
                            gradient={gradient}
                            label={opt.label}
                            active={isActive}
                            locked={sf.locked}
                            onClick={() => setSelectFields(prev => ({ ...prev, [sf.id]: opt.id }))}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Palette (color) swatches — compact in left panel for smoke */}
              <div style={{ marginBottom:20, flexShrink:0 }}>
                <SectionLabel label="Brand Palette" />
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {config.colorSwatches.map(sw => {
                    const isActive = selectedColor === sw.id;
                    return (
                      <button
                        key={sw.id}
                        onClick={() => !sw.locked && setSelectedColor(sw.id)}
                        title={sw.locked ? `${sw.label} — unlocks in Signature Studio` : sw.label}
                        style={{
                          display:"flex", alignItems:"center", gap:5,
                          padding:"5px 10px", borderRadius:999,
                          background: isActive ? `linear-gradient(135deg,${sw.accent}28,${sw.accent}14)` : GOLD_GHOST,
                          border:`1px solid ${isActive ? sw.accent+"70" : GOLD_FAINT}`,
                          color: sw.locked ? TEXT_DIM : isActive ? sw.accent : TEXT_MUTED,
                          fontSize:11, fontWeight:600, letterSpacing:".08em",
                          opacity: sw.locked ? 0.5 : 1,
                          cursor: sw.locked ? "not-allowed" : "pointer",
                          boxShadow: isActive ? `0 0 10px ${sw.accent}20` : "none",
                          transition:"all .18s ease",
                        }}
                      >
                        <span style={{ width:8, height:8, borderRadius:"50%", background:sw.accent, flexShrink:0 }} />
                        {sw.label}
                        {sw.locked && <Lock size={8} style={{ color:GOLD_DIM }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locked hint */}
              <div style={{
                marginTop:"auto", padding:"9px 11px", borderRadius:10,
                background:GOLD_GHOST, border:`1px solid rgba(191,149,63,0.13)`,
                fontSize:10, color:TEXT_MUTED, letterSpacing:".03em", lineHeight:1.65,
                display:"flex", gap:7, alignItems:"flex-start", flexShrink:0,
              }}>
                <Lock size={10} style={{ flexShrink:0, marginTop:1, color:GOLD }} />
                <span>{config.lockedHint}</span>
              </div>
            </GlassPanel>
          )}

          {/* ── CENTER: 3D product stage ─────────────────────────── */}
          <div
            ref={canvasRef}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{
              position:"relative", borderRadius:18,
              background:"transparent",
              overflow:"hidden",
              display:"flex", alignItems:"center", justifyContent:"center",
              touchAction:"none", flexDirection:"column", gap:24,
            }}
          >
            {/* Swatch accent bloom in center */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:`radial-gradient(ellipse at 50% 48%, ${swatch.accent}0C, transparent 58%)`,
            }} />

            {/* 3D product */}
            {isSmoke ? (
              <CigarBox3D
                woodId={selectFields["woodTone"] ?? "cedar"}
                interiorId={selectFields["interiorColor"] ?? "crimson"}
                fields={selectFields}
                monogram={brandName.slice(0,3).toUpperCase() || "✦"}
                scale={canvasScale}
              />
            ) : (craft === "pour" || craft === "brew") ? (
              <div style={{
                transform:`scale(${canvasScale})`, transformOrigin:"center",
                filter:`drop-shadow(0 24px 48px ${swatch.accent}40) drop-shadow(0 0 22px ${swatch.accent}22)`,
              }}>
                <CraftRenderer craft={craft} styleId={undefined} accentColor={swatch.accent} fillLevel={65} width={craft === "pour" ? 130 : 145} />
              </div>
            ) : (
              <div style={{
                width:220, height:200, borderRadius:24,
                background:`linear-gradient(155deg,${swatch.primary},${swatch.accent}18)`,
                border:`1.5px solid ${swatch.accent}60`,
                boxShadow:`0 32px 80px rgba(0,0,0,.72),0 0 50px ${swatch.accent}22,inset 0 1px 0 ${swatch.accent}30`,
                display:"flex", alignItems:"center", justifyContent:"center",
                transform:`scale(${canvasScale})`, transformOrigin:"center",
              }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:".32em", textTransform:"uppercase", color:swatch.accent, opacity:.55 }}>
                  {config.craftLabel}
                </span>
              </div>
            )}

            {/* Draggable brand label */}
            <motion.div
              drag dragConstraints={canvasRef} dragMomentum={false} dragElastic={0.05}
              style={{ cursor:"grab", touchAction:"none", userSelect:"none" }}
              whileDrag={{ cursor:"grabbing" }}
            >
              <div style={{
                padding:"6px 16px", borderRadius:999,
                background:"linear-gradient(135deg,rgba(12,8,3,.92),rgba(22,15,5,.88))",
                border:`1px solid ${swatch.accent}70`,
                boxShadow:`0 8px 28px rgba(0,0,0,.55),0 0 14px ${swatch.accent}22`,
                fontSize:13, fontFamily:"var(--app-font-serif,Georgia,serif)",
                fontWeight:600, color:swatch.accent, letterSpacing:".08em",
                whiteSpace:"nowrap", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis",
              }}>
                {brandName || "Your Brand"}
              </div>
            </motion.div>

            <p style={{
              position:"absolute", bottom:10,
              fontSize:9, letterSpacing:".24em", textTransform:"uppercase",
              color:TEXT_DIM, fontWeight:600, pointerEvents:"none",
            }}>
              Drag · Pinch to scale
            </p>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────────── */}
          <GlassPanel>

            {/* Hardware swatches (smoke: right panel; others: first) */}
            {rightFields.map(sf => {
              const isHardware = sf.id === "hardware";
              return (
                <div key={sf.id} style={{ marginBottom:20, flexShrink:0 }}>
                  <SectionLabel label={sf.label} locked={sf.locked} />
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, opacity: sf.locked ? 0.45 : 1 }}>
                    {sf.options.map(opt => {
                      const isActive = !sf.locked && selectFields[sf.id] === opt.id;
                      const hw = HARDWARE_MAP[opt.id] ?? HARDWARE_MAP.gold!;
                      const gradient = isHardware ? hw.gradient : GOLD_GHOST;
                      return (
                        <MaterialSwatch
                          key={opt.id}
                          gradient={gradient}
                          label={opt.label}
                          active={isActive}
                          locked={sf.locked}
                          onClick={() => !sf.locked && setSelectFields(prev => ({ ...prev, [sf.id]: opt.id }))}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Non-smoke: palette chips in right panel */}
            {!isSmoke && (
              <div style={{ marginBottom:18, flexShrink:0 }}>
                <SectionLabel label="Palette" />
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {config.colorSwatches.map(sw => {
                    const isActive = selectedColor === sw.id;
                    return (
                      <button key={sw.id}
                        onClick={() => !sw.locked && setSelectedColor(sw.id)}
                        style={{
                          display:"flex", alignItems:"center", gap:5,
                          padding:"5px 10px", borderRadius:999,
                          background: isActive ? `linear-gradient(135deg,${sw.accent}28,${sw.accent}14)` : GOLD_GHOST,
                          border:`1px solid ${isActive ? sw.accent+"70" : GOLD_FAINT}`,
                          color: sw.locked ? TEXT_DIM : isActive ? sw.accent : TEXT_MUTED,
                          fontSize:11, fontWeight:600, letterSpacing:".08em",
                          opacity: sw.locked ? 0.5 : 1,
                          cursor: sw.locked ? "not-allowed" : "pointer",
                          transition:"all .18s ease",
                        }}
                      >
                        <span style={{ width:8,height:8,borderRadius:"50%",background:sw.accent,flexShrink:0 }} />
                        {sw.label}
                        {sw.locked && <Lock size={8} style={{ color:GOLD_DIM }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Brand Name */}
            <div style={{ marginBottom:16, flexShrink:0 }}>
              <SectionLabel label={config.brandNameLabel} />
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder={config.brandNamePlaceholder}
                maxLength={32}
                style={{
                  width:"100%", background:"transparent",
                  border:"none", borderBottom:`1px solid ${GOLD_DIM}`,
                  outline:"none",
                  fontFamily:"var(--app-font-serif,Georgia,serif)",
                  fontSize:17, color:TEXT_PRIMARY,
                  caretColor:GOLD_MID, padding:"5px 0",
                  letterSpacing:".06em",
                }}
              />
            </div>

            {/* Insignia */}
            <div style={{ marginBottom:16, flexShrink:0 }}>
              <SectionLabel label={config.emblemLabel} />
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {config.emblemOptions.map(em => {
                  const isActive = selectedEmblem === em.id;
                  return (
                    <button key={em.id} onClick={() => setSelectedEmblem(em.id)} style={{
                      padding:"5px 11px", borderRadius:8, fontSize:12,
                      background: isActive ? `${GOLD}22` : GOLD_GHOST,
                      border:`1px solid ${isActive ? GOLD_DIM : GOLD_FAINT}`,
                      color: isActive ? GOLD_MID : TEXT_MUTED,
                      cursor:"pointer", fontWeight:600,
                      boxShadow: isActive ? `0 0 10px ${GOLD}20` : "none",
                      transition:"all .18s ease",
                    }}>
                      {em.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lid Engraving */}
            <div style={{ marginBottom:16, flexShrink:0 }}>
              <SectionLabel label={config.engravingLabel} locked={config.engravingLocked} />
              <input
                value={engravingText}
                onChange={e => !config.engravingLocked && setEngravingText(e.target.value)}
                placeholder={config.engravingPlaceholder}
                maxLength={64} disabled={config.engravingLocked}
                style={{
                  width:"100%", background:"transparent",
                  border:"none", borderBottom:`1px solid ${config.engravingLocked ? GOLD_GHOST : GOLD_FAINT}`,
                  outline:"none", fontSize:13,
                  color: config.engravingLocked ? TEXT_DIM : TEXT_PRIMARY,
                  caretColor:GOLD_MID, padding:"5px 0", letterSpacing:".04em",
                }}
              />
            </div>

            <div style={{ flex:1, minHeight:4 }} />

            {/* AI Critique */}
            <AnimatePresence>
              {critique && (
                <motion.div
                  initial={{ opacity:0, y:12, height:0 }} animate={{ opacity:1, y:0, height:"auto" }}
                  exit={{ opacity:0, height:0 }} transition={{ duration:.40, ease:[.22,1,.36,1] }}
                  style={{ overflow:"hidden", marginBottom:10, flexShrink:0 }}
                >
                  <div style={{
                    padding:"11px 13px", borderRadius:12,
                    background:"linear-gradient(135deg,rgba(191,149,63,0.08),rgba(191,149,63,0.03))",
                    border:"1px solid rgba(191,149,63,0.22)",
                    boxShadow:"inset 0 1px 0 rgba(191,149,63,0.10)",
                  }}>
                    <p style={{ margin:"0 0 5px",fontSize:9,letterSpacing:".30em",textTransform:"uppercase",color:GOLD_MID,fontWeight:700,opacity:.75 }}>
                      Craft Intelligence
                    </p>
                    <p style={{ margin:0,fontSize:12,color:TEXT_PRIMARY,lineHeight:1.65 }}>{critique}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save as Draft */}
            <motion.button
              onClick={handleSave} disabled={saving}
              whileHover={{ scale:1.02, boxShadow:`0 0 28px ${GOLD}38` }}
              whileTap={{ scale:.97 }}
              style={{
                width:"100%", padding:"12px 18px", borderRadius:12, flexShrink:0,
                background: saved
                  ? "linear-gradient(135deg,rgba(52,211,153,.14),rgba(52,211,153,.06))"
                  : GOLD_GRADIENT,
                border: saved ? "1px solid rgba(52,211,153,.35)" : "none",
                color: saved ? "rgba(52,211,153,.90)" : "#0D0900",
                fontSize:11, fontWeight:800, letterSpacing:".22em", textTransform:"uppercase",
                cursor: saving ? "default" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                marginBottom:8,
                boxShadow: saved ? "none" : `0 8px 28px rgba(191,149,63,.30),inset 0 1px 0 rgba(255,255,255,.08)`,
                opacity: saving ? 0.6 : 1, transition:"all .22s ease",
              }}
            >
              {saved ? <><Check size={12} /> {saveLocal ? "Saved Locally" : "Draft Saved"}</> : <><Save size={12} /> Save as Draft</>}
            </motion.button>

            {/* Enter Challenge */}
            <motion.button
              onClick={handleEnterChallenge}
              whileHover={{ scale:1.02, boxShadow:`0 16px 50px rgba(191,149,63,.42)` }}
              whileTap={{ scale:.97 }}
              style={{
                width:"100%", padding:"15px 20px", borderRadius:14, flexShrink:0,
                background:"linear-gradient(135deg,#1a1200,#2c1f00,#1a1200)",
                border:`1px solid ${GOLD}80`,
                color:GOLD_MID,
                fontSize:12, fontWeight:800, letterSpacing:".28em", textTransform:"uppercase",
                cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:9,
                boxShadow:`0 8px 36px rgba(191,149,63,.22),inset 0 1px 0 rgba(191,149,63,.20)`,
                transition:"all .22s ease",
              }}
            >
              Enter Challenge <ChevronRight size={15} />
            </motion.button>

            <p style={{ textAlign:"center",margin:"8px 0 0",flexShrink:0,fontSize:10,color:TEXT_DIM,letterSpacing:".12em",fontStyle:"italic" }}>
              Now build something worthy of this.
            </p>
          </GlassPanel>
        </div>
      </div>
    </motion.div>
  );
}
