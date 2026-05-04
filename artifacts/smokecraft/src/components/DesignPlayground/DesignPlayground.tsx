/**
 * DesignPlayground — full-screen pre-craft overlay.
 *
 * Mounts before the CraftFlow intro for all four craft types. Users design
 * a visual identity for their creation first; the system then says
 * "Now build something worthy of this" before entering the craft challenge.
 *
 * Features:
 *  - Two-column layout: draggable canvas (left) + properties panel (right).
 *  - Framer Motion drag for brand-name chip + insignia/emblem chip.
 *  - Per-craft config: colors, emblems, select fields, locked fields (padlock).
 *  - "Save as Draft" → PATCH /api/design-drafts (localStorage fallback for guests).
 *  - Draft auto-loads on mount from API, then localStorage fallback.
 *  - Rule-based AI critique card slides up after save.
 *  - "Enter Challenge" → cinematic scale-up + fade-out, then calls onComplete().
 *  - touch-action: none on all drag targets for tablet support.
 *  - Session-storage gate: playground does not show again once completed in session.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Lock, Sparkles, ChevronRight, Check, Save } from "lucide-react";
import { fetchDesignDrafts, upsertDesignDraft } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlaygroundCraft = "smoke" | "brew" | "pour" | "vape";

interface ColorSwatch { id: string; label: string; primary: string; accent: string; locked?: boolean }
interface EmblemOption { id: string; label: string }
interface SelectOption  { id: string; label: string }
interface SelectField   { id: string; label: string; options: SelectOption[]; locked?: boolean }

interface PlaygroundConfig {
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

// ── Per-craft configs ─────────────────────────────────────────────────────────

const SMOKE_CONFIG: PlaygroundConfig = {
  craft: "smoke", craftLabel: "SmokeCraft",
  accent: "#D4AF37", accentSoft: "#C49A25",
  tint: "rgba(40,25,5,0.5)",
  background: "/images/cigar.png",
  brandNameLabel: "Brand Name",
  brandNamePlaceholder: "Name your cigar brand…",
  emblemLabel: "Insignia",
  emblemOptions: [
    { id: "crown",    label: "Crown ♛"   },
    { id: "crest",    label: "Crest ❧"   },
    { id: "initials", label: "Initials"  },
    { id: "flame",    label: "Flame 🔥"  },
    { id: "leaf",     label: "Leaf 🌿"   },
  ],
  colorSwatches: [
    { id: "gold",     label: "Gold",     primary: "#2A1F08", accent: "#D4AF37" },
    { id: "black",    label: "Onyx",     primary: "#141010", accent: "#8B7355" },
    { id: "burgundy", label: "Burgundy", primary: "#3A0F18", accent: "#C4708A" },
    { id: "navy",     label: "Navy",     primary: "#0F1B35", accent: "#4A8AC4" },
    { id: "forest",   label: "Forest",   primary: "#0F2018", accent: "#6AB87A" },
    { id: "crimson",  label: "Crimson",  primary: "#2A0808", accent: "#C46060" },
    { id: "obsidian", label: "Obsidian", primary: "#060606", accent: "#A0A0A0", locked: true },
    { id: "platinum", label: "Platinum", primary: "#1A1814", accent: "#C8C8C8", locked: true },
  ],
  selectFields: [
    {
      id: "woodTone", label: "Box Wood Tone",
      options: [
        { id: "cedar",    label: "Cedar"       },
        { id: "mahogany", label: "Mahogany"     },
        { id: "walnut",   label: "Dark Walnut"  },
        { id: "pine",     label: "Light Pine"   },
      ],
    },
    {
      id: "interiorColor", label: "Interior Color",
      options: [
        { id: "cream", label: "Cream Satin"  },
        { id: "ebony", label: "Ebony Velvet" },
        { id: "ivory", label: "Ivory Linen"  },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Engraving Text",
  engravingPlaceholder: "Add a personal engraving…",
  engravingLocked: false,
  lockedHint: "Obsidian & Platinum finishes, Interior colors, and 3D box editing unlock in Signature Studio.",
};

const BREW_CONFIG: PlaygroundConfig = {
  craft: "brew", craftLabel: "BrewCraft",
  accent: "#E6C76A", accentSoft: "#D49555",
  tint: "rgba(60,30,10,0.5)",
  background: "/images/scenes/social.jpg",
  brandNameLabel: "Brewery Name",
  brandNamePlaceholder: "Name your brewery…",
  emblemLabel: "Label Icon",
  emblemOptions: [
    { id: "hop",    label: "Hop ⊕"    },
    { id: "grain",  label: "Grain ✦"  },
    { id: "barrel", label: "Barrel ⬡" },
    { id: "star",   label: "Star ★"   },
    { id: "shield", label: "Shield ⬛" },
  ],
  colorSwatches: [
    { id: "amber",   label: "Amber",   primary: "#5A3018", accent: "#E6A830" },
    { id: "gold",    label: "Gold",    primary: "#3A2808", accent: "#E6C76A" },
    { id: "dark",    label: "Stout",   primary: "#1A0D06", accent: "#8A6640" },
    { id: "pale",    label: "Pale",    primary: "#4A3818", accent: "#F0D88A" },
    { id: "wheat",   label: "Wheat",   primary: "#3A3018", accent: "#D4C080" },
    { id: "red",     label: "Red Ale", primary: "#3A1008", accent: "#C87040" },
    { id: "craft",   label: "Craft",   primary: "#0A0806", accent: "#70B880", locked: true },
    { id: "reserve", label: "Reserve", primary: "#280818", accent: "#C870A0", locked: true },
  ],
  selectFields: [
    {
      id: "labelStyle", label: "Label Style",
      options: [
        { id: "classic", label: "Classic" },
        { id: "modern",  label: "Modern"  },
        { id: "retro",   label: "Retro"   },
        { id: "minimal", label: "Minimal" },
      ],
    },
    {
      id: "hopProfile", label: "Hop Profile",
      options: [
        { id: "bitter", label: "Bold Bitter" },
        { id: "floral", label: "Floral"      },
        { id: "citrus", label: "Citrus"      },
        { id: "earthy", label: "Earthy"      },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Tagline",
  engravingPlaceholder: "Brewed with intent…",
  engravingLocked: false,
  lockedHint: "Craft & Reserve palettes and hop-profile fine-tuning unlock in Signature Studio.",
};

const POUR_CONFIG: PlaygroundConfig = {
  craft: "pour", craftLabel: "PourCraft",
  accent: "#E8C870", accentSoft: "#C8704A",
  tint: "rgba(80,30,10,0.5)",
  background: "/images/whiskey.png",
  brandNameLabel: "Drink Name",
  brandNamePlaceholder: "Name your signature pour…",
  emblemLabel: "Garnish",
  emblemOptions: [
    { id: "orange", label: "Orange Peel 🍊" },
    { id: "cherry", label: "Maraschino 🍒"  },
    { id: "twist",  label: "Lemon Twist 🍋" },
    { id: "herb",   label: "Fresh Herb 🌿"  },
    { id: "smoke",  label: "Smoke ∿"        },
  ],
  colorSwatches: [
    { id: "whiskey", label: "Whiskey",  primary: "#3A2010", accent: "#C89040" },
    { id: "cognac",  label: "Cognac",   primary: "#2A1008", accent: "#C05828" },
    { id: "rum",     label: "Dark Rum", primary: "#200808", accent: "#A04030" },
    { id: "gin",     label: "Gin",      primary: "#0A1820", accent: "#6090B0" },
    { id: "vodka",   label: "Crystal",  primary: "#101018", accent: "#8890A8" },
    { id: "tequila", label: "Tequila",  primary: "#102808", accent: "#80A838" },
    { id: "aged",    label: "Aged Rare",primary: "#180804", accent: "#C86020", locked: true },
    { id: "vintage", label: "Vintage",  primary: "#0A0818", accent: "#A870D0", locked: true },
  ],
  selectFields: [
    {
      id: "glassType", label: "Glass Type",
      options: [
        { id: "rocks",    label: "Rocks"    },
        { id: "coupe",    label: "Coupe"    },
        { id: "highball", label: "Highball" },
        { id: "snifter",  label: "Snifter"  },
      ],
    },
    {
      id: "labelStyle", label: "Label Style",
      options: [
        { id: "elegant", label: "Elegant" },
        { id: "bold",    label: "Bold"    },
        { id: "minimal", label: "Minimal" },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Serving Note",
  engravingPlaceholder: "Best served over hand-cut ice…",
  engravingLocked: false,
  lockedHint: "Aged Rare & Vintage finishes and label style unlock in Signature Studio.",
};

const VAPE_CONFIG: PlaygroundConfig = {
  craft: "vape", craftLabel: "VapeCraft",
  accent: "#B496E6", accentSoft: "#FF7AB8",
  tint: "rgba(118,80,180,0.5)",
  background: "/images/scenes/bold.jpg",
  brandNameLabel: "Flavor Name",
  brandNamePlaceholder: "Name your flavor identity…",
  emblemLabel: "Identity Icon",
  emblemOptions: [
    { id: "cloud",    label: "Cloud ☁"   },
    { id: "spark",    label: "Spark ⚡"  },
    { id: "drop",     label: "Drop ◉"    },
    { id: "wave",     label: "Wave ∿"    },
    { id: "crystal",  label: "Crystal ⬡" },
  ],
  colorSwatches: [
    { id: "violet",    label: "Violet",  primary: "#1A0828", accent: "#B496E6" },
    { id: "rose",      label: "Rose",    primary: "#280818", accent: "#E07090" },
    { id: "sky",       label: "Sky",     primary: "#081828", accent: "#60A8D8" },
    { id: "mint",      label: "Mint",    primary: "#081808", accent: "#50C890" },
    { id: "amber",     label: "Amber",   primary: "#280808", accent: "#D07840" },
    { id: "ice",       label: "Arctic",  primary: "#081820", accent: "#80D0F0" },
    { id: "neon",      label: "Neon",    primary: "#081008", accent: "#80F040", locked: true },
    { id: "prismatic", label: "Prism",   primary: "#080810", accent: "#A0A0F8", locked: true },
  ],
  selectFields: [
    {
      id: "flavorProfile", label: "Flavor Profile",
      options: [
        { id: "fruity",  label: "Fruity & Sweet" },
        { id: "cool",    label: "Cool & Minty"   },
        { id: "dessert", label: "Dessert"         },
        { id: "tobacco", label: "Tobacco Rich"    },
      ],
    },
    {
      id: "nicotineLevel", label: "Nicotine Level",
      options: [
        { id: "zero",   label: "0mg"  },
        { id: "low",    label: "3mg"  },
        { id: "medium", label: "6mg"  },
        { id: "high",   label: "12mg" },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Flavor Tagline",
  engravingPlaceholder: "One inhale to rule them all…",
  engravingLocked: false,
  lockedHint: "Neon & Prismatic color identities and nicotine customization unlock in Signature Studio.",
};

const PLAYGROUND_CONFIGS: Record<PlaygroundCraft, PlaygroundConfig> = {
  smoke: SMOKE_CONFIG,
  brew:  BREW_CONFIG,
  pour:  POUR_CONFIG,
  vape:  VAPE_CONFIG,
};

// ── Session helpers ────────────────────────────────────────────────────────────

export function hasSeenPlayground(craft: string): boolean {
  try { return sessionStorage.getItem(`playground_seen_${craft}`) === "1"; }
  catch { return true; }
}

export function markPlaygroundSeen(craft: string): void {
  try { sessionStorage.setItem(`playground_seen_${craft}`, "1"); } catch {}
}

// ── Rule-based AI Critique ────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  craft:      PlaygroundCraft;
  onComplete: () => void;
}

export default function DesignPlayground({ craft, onComplete }: Props) {
  const config    = PLAYGROUND_CONFIGS[craft];
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
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [critique, setCritique] = useState<string | null>(null);

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
    // Fire-and-forget API save; always mirror to localStorage for guests
    void upsertDesignDraft({ craft, draftName: brandName || "My Draft", payload });
    try { localStorage.setItem(`playground_draft_${craft}`, JSON.stringify(payload)); } catch {}
    setSaving(false);
    setSaved(true);
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

          {/* LEFT: drag canvas */}
          <div
            ref={canvasRef}
            style={{
              position: "relative",
              borderRadius: 20,
              background: "rgba(255,255,255,0.022)",
              border: `1px solid ${config.accent}1A`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Canvas accent glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${swatch.accent}10, transparent 65%)`,
              pointerEvents: "none",
            }} />

            {/* Centered product mock */}
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

            {/* Draggable: Brand name chip */}
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
              whileDrag={{ cursor: "grabbing", scale: 1.06 }}
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
              }}>
                {brandName || "Your Brand"}
              </div>
            </motion.div>

            {/* Draggable: Emblem chip */}
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
              whileDrag={{ cursor: "grabbing", scale: 1.06 }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `${swatch.accent}18`,
                border: `1px solid ${swatch.accent}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
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
              Drag elements to arrange
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
                ? <><Check size={12} /> Draft Saved</>
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

// ── Panel section helper ───────────────────────────────────────────────────────

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
