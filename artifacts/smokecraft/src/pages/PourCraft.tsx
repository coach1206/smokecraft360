import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import PourCraftPresence from "@/components/CinematicLanding/PourCraftPresence";
import { useCraftImages }   from "@/hooks/useDynamicImage";
import loungeBg      from "@assets/locked_cards/experience_pourcraft.png";
import pourSmoothImg from "@assets/generated_images/pour_smooth.png";
import pourSpicyImg  from "@assets/generated_images/pour_spicy.png";
import pourSmokyImg  from "@assets/generated_images/pour_smoky.png";
import pourRichImg   from "@assets/generated_images/pour_rich.png";

// ── Design tokens ─────────────────────────────────────────────────────────────
const OBSIDIAN  = "#0D0D12";
const COPPER    = "#C8762A";
const COPPER_DIM = "rgba(200,118,42,0.18)";
const COPPER_GLOW = "rgba(200,118,42,0.55)";
const GOLD_TEXT = "#E8C870";
const TEXT      = "#F0E8D4";

// ── Spirit Construction Panel data ────────────────────────────────────────────
const SPIRIT_ROWS = [
  {
    id:      "foundation",
    label:   "The Foundation Core",
    sub:     "Base Spirit Architecture",
    options: [
      { id: "cognac",   label: "Aged Cognac",       note: "XO · 20yr+ Oak",        glyph: "◈" },
      { id: "rye",      label: "Cask Strength Rye",  note: "Barrel Proof · Uncut",  glyph: "◉" },
    ],
  },
  {
    id:      "modifier",
    label:   "The Modifier Chord",
    sub:     "Character & Complexity Layer",
    options: [
      { id: "botanical", label: "Botanical",         note: "Juniper · Cardamom",    glyph: "◇" },
      { id: "bitter",    label: "Bitter Infusions",  note: "Gentian · Orange Peel", glyph: "◆" },
    ],
  },
  {
    id:      "vapor",
    label:   "The Aromatic Vapor Overlay",
    sub:     "Finish & Nose Expression",
    options: [
      { id: "citrus",  label: "Expressed Citrus",  note: "Sicilian Lemon · Zest", glyph: "○" },
      { id: "cedar",   label: "Cedar Haze",        note: "Smoke · Aged Wood",     glyph: "●" },
    ],
  },
] as const;

type RowId = (typeof SPIRIT_ROWS)[number]["id"];
type Selections = Partial<Record<RowId, string>>;

// ── Spirit Construction Panel ──────────────────────────────────────────────────
function SpiritConstructionPanel({ onComplete }: { onComplete: () => void }) {
  const [selections, setSelections] = useState<Selections>({});
  const allSelected = SPIRIT_ROWS.every(r => selections[r.id]);

  function select(rowId: RowId, optionId: string) {
    setSelections(prev => ({ ...prev, [rowId]: optionId }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:       "fixed",
        inset:          0,
        background:     "#0A0A0F",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "40px 24px",
        overflowY:      "auto",
      }}
    >
      {/* Ambient top glow */}
      <div style={{
        position:  "absolute",
        top:       0,
        left:      0,
        right:     0,
        height:    220,
        background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(200,118,42,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.6 }}
        style={{ textAlign: "center", marginBottom: 44, zIndex: 2 }}
      >
        <p style={{
          fontSize: 11, letterSpacing: "0.40em", textTransform: "uppercase",
          color: COPPER, fontWeight: 700, margin: "0 0 10px",
        }}>
          PourCraft 360 · Spirit Construction
        </p>
        <h1 style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(28px, 4vw, 44px)",
          fontWeight:    300,
          color:         TEXT,
          letterSpacing: "0.06em",
          margin:        0,
          lineHeight:    1.2,
        }}>
          Compose Your Pour
        </h1>
        <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 14, marginTop: 10, letterSpacing: "0.04em" }}>
          Three decisions. One signature spirit.
        </p>
      </motion.div>

      {/* Rows */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           18,
        width:         "100%",
        maxWidth:      780,
        zIndex:        2,
      }}>
        {SPIRIT_ROWS.map((row, rowIdx) => {
          const active = selections[row.id];
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26 + rowIdx * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background:     OBSIDIAN,
                border:         active
                  ? `1.5px solid ${COPPER_GLOW}`
                  : "1px solid rgba(255,255,255,0.07)",
                borderRadius:   16,
                padding:        "20px 22px",
                boxShadow:      active
                  ? `0 0 40px rgba(200,118,42,0.22), 0 0 12px rgba(200,118,42,0.10)`
                  : "0 4px 24px rgba(0,0,0,0.40)",
                transition:     "border-color 0.28s, box-shadow 0.28s",
              }}
            >
              {/* Row header */}
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 10, letterSpacing: "0.30em", textTransform: "uppercase",
                  color: active ? COPPER : "rgba(255,255,255,0.28)",
                  fontWeight: 700, margin: "0 0 4px",
                  transition: "color 0.22s",
                }}>
                  {row.sub}
                </p>
                <h3 style={{
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontSize:      22,
                  fontWeight:    400,
                  color:         active ? GOLD_TEXT : "rgba(240,232,212,0.70)",
                  letterSpacing: "0.04em",
                  margin:        0,
                  transition:    "color 0.22s",
                }}>
                  {row.label}
                </h3>
              </div>

              {/* Options */}
              <div style={{ display: "flex", gap: 12 }}>
                {row.options.map(opt => {
                  const isActive = active === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ background: isActive ? COPPER_DIM : "rgba(255,255,255,0.06)" }}
                      onClick={() => select(row.id, opt.id)}
                      style={{
                        flex:           1,
                        background:     isActive ? COPPER_DIM : "rgba(255,255,255,0.03)",
                        border:         isActive
                          ? `1.5px solid ${COPPER}`
                          : "1px solid rgba(255,255,255,0.10)",
                        borderRadius:   12,
                        padding:        "16px 14px",
                        cursor:         "pointer",
                        textAlign:      "left",
                        fontFamily:     "inherit",
                        position:       "relative",
                        overflow:       "hidden",
                        transition:     "background 0.2s, border-color 0.2s",
                        boxShadow:      isActive
                          ? `0 0 20px rgba(200,118,42,0.28), inset 0 0 12px rgba(200,118,42,0.08)`
                          : "none",
                      }}
                    >
                      {/* Active aura pulse */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            key="aura"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.18, 0.38, 0.18] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              position:   "absolute",
                              inset:      -1,
                              borderRadius: 12,
                              background: `radial-gradient(ellipse at 50% 50%, ${COPPER_GLOW} 0%, transparent 70%)`,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <span style={{
                        display:  "block",
                        fontSize: 20,
                        color:    isActive ? COPPER : "rgba(255,255,255,0.22)",
                        marginBottom: 6,
                        transition: "color 0.22s",
                      }}>
                        {opt.glyph}
                      </span>
                      <span style={{
                        display:       "block",
                        fontSize:      16,
                        fontWeight:    700,
                        color:         isActive ? TEXT : "rgba(240,232,212,0.55)",
                        letterSpacing: "0.03em",
                        marginBottom:  4,
                        transition:    "color 0.22s",
                      }}>
                        {opt.label}
                      </span>
                      <span style={{
                        display:       "block",
                        fontSize:      11,
                        color:         isActive ? "rgba(232,200,112,0.70)" : "rgba(240,232,212,0.28)",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        transition:    "color 0.22s",
                      }}>
                        {opt.note}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Proceed CTA */}
      <AnimatePresence>
        {allSelected && (
          <motion.button
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            type="button"
            onClick={onComplete}
            whileTap={{ scale: 0.96 }}
            whileHover={{ boxShadow: `0 0 48px ${COPPER_GLOW}, 0 0 16px rgba(200,118,42,0.30)` }}
            style={{
              marginTop:     36,
              padding:       "18px 60px",
              background:    `linear-gradient(135deg, ${COPPER} 0%, #9A4E14 100%)`,
              border:        `1.5px solid rgba(200,118,42,0.80)`,
              borderRadius:  14,
              color:         "#0A0604",
              fontSize:      14,
              fontWeight:    900,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              cursor:        "pointer",
              fontFamily:    "inherit",
              zIndex:        2,
              boxShadow:     `0 0 32px rgba(200,118,42,0.35), 0 4px 20px rgba(0,0,0,0.50)`,
            }}
          >
            Begin Pour
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Playground config ──────────────────────────────────────────────────────────
const PLAYGROUND_CONFIG: PlaygroundConfig = {
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
    },
  ],
  engravingLabel: "Serving Note",
  engravingPlaceholder: "Best served over hand-cut ice…",
  engravingLocked: false,
  lockedHint: "Aged Rare & Vintage finishes unlock in Signature Studio.",
};

const STYLE_IDS = ["smooth", "spicy", "smoky", "rich"] as const;

const BASE_CONFIG: CraftFlowConfig = {
  testIdPrefix: "pourcraft",
  title: "PourCraft",
  tagline: "Pick your pour · we'll pair the cigar",
  category: "alcohol",
  background: loungeBg,
  theme: {
    accent: "#E8C870",
    accentSoft: "#C8704A",
    tint: "rgba(80,30,10,0.4)",
    bodyTextOverlay: "rgba(26,26,27,0.22)",
  },
  language: {
    introHeadline: "A guided pour from glass to lounge chair.",
    introBody: "Five quick steps. Choose your style, set the mood, and we'll uncork a spirit — and the cigar that loves it back.",
    introCta: "Start Pouring",
    stepStyleLabel: "Pour Style",
    stepProfileLabel: "Mood",
    stylePrompt: "Choose your pour style",
    profilePrompt: "What's the moment?",
    matchingCopy: "Decanting your pairing…",
    revealHeadline: "Your Signature Pour",
    productLabel: "The Pour",
    pairingLabel: "Paired Cigar",
    orderCta: "Order at the Bar",
  },
  styles: [
    { id: "smooth", title: "Smooth & Mellow", subtitle: "Honey · Vanilla · Easy",      flavors: ["sweet","vanilla","honey","smooth"],       strength: 2, mood: "relaxed", gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)", image: pourSmoothImg, glyph: "◐" },
    { id: "spicy",  title: "Spicy & Warm",    subtitle: "Rye · Pepper · Caramel",      flavors: ["spicy","caramel","oak","warm"],           strength: 3, mood: "social",  gradient: "linear-gradient(155deg, #d88848 0%, #a04818 50%, #4a2008 100%)", image: pourSpicyImg,  glyph: "◑" },
    { id: "smoky",  title: "Smoky & Bold",    subtitle: "Peat · Earth · Adventurous",  flavors: ["smoky","earthy","peaty","bold"],          strength: 4, mood: "bold",    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)", image: pourSmokyImg,  glyph: "◒" },
    { id: "rich",   title: "Rich & Sweet",    subtitle: "Cognac · Dried fruit · Deep", flavors: ["sweet","rich","fruity","dark-chocolate"], strength: 4, mood: "focused", gradient: "linear-gradient(155deg, #6a2818 0%, #3a1008 60%, #100404 100%)", image: pourRichImg,   glyph: "●" },
  ],
  moods: [
    { id: "relaxed",     title: "Relaxed",     desc: "Quiet glass, slow sunset"          },
    { id: "social",      title: "Social",      desc: "Toast with friends, second round"  },
    { id: "bold",        title: "Bold",        desc: "Statement pour, no chaser"         },
    { id: "celebratory", title: "Celebratory", desc: "Mark the moment in something rare" },
  ],
};

export default function PourCraft() {
  const [showPresence,       setShowPresence]       = useState(false);
  const [showPlayground,     setShowPlayground]     = useState(false);
  const [showSpiritPanel,    setShowSpiritPanel]    = useState(true);

  const aiImages = useCraftImages("pour", STYLE_IDS as unknown as string[]);

  const config = useMemo<CraftFlowConfig>(() => ({
    ...BASE_CONFIG,
    styles: BASE_CONFIG.styles.map(s => ({
      ...s,
      image: aiImages[s.id] ?? s.image,
    })),
  }), [aiImages]);

  if (showPresence) {
    return <PourCraftPresence onComplete={() => setShowPresence(false)} />;
  }

  if (showPlayground) {
    return (
      <DesignPlayground
        craft="pour"
        config={PLAYGROUND_CONFIG}
        onComplete={() => {
          markPlaygroundSeen("pour");
          setShowPlayground(false);
        }}
      />
    );
  }

  if (showSpiritPanel) {
    return (
      <AnimatePresence mode="wait">
        <SpiritConstructionPanel
          key="spirit-panel"
          onComplete={() => setShowSpiritPanel(false)}
        />
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", inset: 0 }}
    >
      <CraftFlow config={config} />
    </motion.div>
  );
}
