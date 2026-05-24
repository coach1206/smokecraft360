import { useState, useMemo } from "react";
import { motion }            from "framer-motion";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import { useCraftImages } from "@/hooks/useDynamicImage";

const PLAYGROUND_CONFIG: PlaygroundConfig = {
  craft: "wine", craftLabel: "WineCraft",
  accent: "#8B1A2F", accentSoft: "#C9637A",
  tint: "rgba(100,20,40,0.5)",
  background: "/images/scenes/craft-hub.jpg",
  brandNameLabel: "Cuvée Name",
  brandNamePlaceholder: "Name your cuvée…",
  emblemLabel: "Bottle Icon",
  emblemOptions: [
    { id: "bordeaux", label: "Bordeaux ◈" },
    { id: "burgundy", label: "Burgundy ◉" },
    { id: "sparkling", label: "Sparkling ✦" },
    { id: "decanter",  label: "Decanter ⊟" },
    { id: "grape",     label: "Grape ◬"    },
  ],
  colorSwatches: [
    { id: "burgundy", label: "Burgundy",   primary: "#1A0010", accent: "#8B1A2F" },
    { id: "garnet",   label: "Garnet",     primary: "#0E0008", accent: "#A52842" },
    { id: "velvet",   label: "Dark Velvet",primary: "#12000A", accent: "#6B1030" },
    { id: "rose",     label: "Rosé",       primary: "#1A0A10", accent: "#C9637A", locked: true },
  ],
  selectFields: [
    {
      id: "region", label: "Region",
      options: [
        { id: "bordeaux",  label: "Bordeaux"  },
        { id: "burgundy",  label: "Burgundy"  },
        { id: "tuscany",   label: "Tuscany"   },
        { id: "napa",      label: "Napa Valley" },
      ],
    },
    {
      id: "vintage", label: "Vintage",
      options: [
        { id: "young",   label: "Young & Fresh" },
        { id: "mature",  label: "Mature"        },
        { id: "reserve", label: "Reserve"       },
        { id: "grand",   label: "Grand Cru"     },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Tasting Note",
  engravingPlaceholder: "Aged with intention…",
  engravingLocked: false,
  lockedHint: "Reserve and Grand Cru vintage selections unlock in Signature Studio.",
};

const STYLE_IDS = ["light", "rose", "bold", "reserve"] as const;

const wineBg = "/images/scenes/craft-hub.jpg";
const wineRoseImg    = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=75";
const wineLightImg   = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=75";
const wineBoldImg    = "https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?auto=format&fit=crop&w=600&q=75";
const wineReserveImg = "https://images.unsplash.com/photo-1583394293214-7b3e6c9eba4b?auto=format&fit=crop&w=600&q=75";

const BASE_CONFIG: CraftFlowConfig = {
  testIdPrefix: "winecraft",
  title: "WineCraft",
  tagline: "Pick your varietal · we'll pour the experience",
  category: "wine",
  background: wineBg,
  theme: {
    accent: "#8B1A2F",
    accentSoft: "#C9637A",
    tint: "rgba(100,20,40,0.4)",
    bodyTextOverlay: "rgba(20,0,10,0.22)",
  },
  language: {
    introHeadline: "A guided pour from vine to glass.",
    introBody: "Five quick steps. We'll match your palate and mood to a wine in the cellar — and suggest the ideal cigar pairing.",
    introCta: "Begin Tasting",
    stepStyleLabel: "Wine Style",
    stepProfileLabel: "Mood",
    stylePrompt: "Choose your varietal style",
    profilePrompt: "Set the atmosphere",
    matchingCopy: "Consulting the cellar…",
    revealHeadline: "Your Wine Pairing",
    productLabel: "The Wine",
    pairingLabel: "Paired Cigar",
    orderCta: "Order at the Table",
  },
  styles: [
    {
      id: "light",   title: "Crisp & Bright",     subtitle: "Sauvignon · Citrus · Clean",
      flavors: ["citrus","mineral","crisp","green-apple"],     strength: 1, mood: "relaxed",
      gradient: "linear-gradient(155deg, #f5e8d0 0%, #ddd0a8 45%, #8a7a40 100%)",
      image: wineLightImg, glyph: "◐",
    },
    {
      id: "rose",    title: "Elegant Rosé",        subtitle: "Strawberry · Floral · Silk",
      flavors: ["strawberry","floral","peach","fresh"],        strength: 2, mood: "social",
      gradient: "linear-gradient(155deg, #f5a0a0 0%, #c96080 50%, #6a1828 100%)",
      image: wineRoseImg,  glyph: "◑",
    },
    {
      id: "bold",    title: "Bold & Tannic",       subtitle: "Cabernet · Dark Fruit · Oak",
      flavors: ["dark-cherry","oak","leather","smoky","earthy"], strength: 3, mood: "bold",
      gradient: "linear-gradient(155deg, #a82040 0%, #5a0818 50%, #200008 100%)",
      image: wineBoldImg,  glyph: "◒",
    },
    {
      id: "reserve", title: "Grand Reserve",       subtitle: "Complex · Layered · Legendary",
      flavors: ["complex","dark-chocolate","spice","terroir"],  strength: 4, mood: "focused",
      gradient: "linear-gradient(155deg, #500010 0%, #200008 60%, #070002 100%)",
      image: wineReserveImg, glyph: "●",
    },
  ],
  moods: [
    { id: "relaxed",  title: "Relaxed",  desc: "Quiet sip, candle-lit evening"     },
    { id: "social",   title: "Social",   desc: "Shared bottle, vibrant conversation" },
    { id: "bold",     title: "Bold",     desc: "Power and presence in every pour"   },
    { id: "focused",  title: "Focused",  desc: "Contemplative tasting, deep notes"  },
  ],
};

export default function WineCraft() {
  const [showPlayground, setShowPlayground] = useState(
    () => !hasSeenPlayground("wine"),
  );

  const aiImages = useCraftImages("wine", STYLE_IDS as unknown as string[]);

  const config = useMemo<CraftFlowConfig>(() => ({
    ...BASE_CONFIG,
    styles: BASE_CONFIG.styles.map(s => ({
      ...s,
      image: aiImages[s.id] ?? s.image,
    })),
  }), [aiImages]);

  if (showPlayground) {
    return (
      <DesignPlayground
        craft="wine"
        config={PLAYGROUND_CONFIG}
        onComplete={() => {
          markPlaygroundSeen("wine");
          setShowPlayground(false);
        }}
      />
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
