import { useState } from "react";
import { motion }   from "framer-motion";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import vapeBg         from "@assets/locked_cards/experience_vapecraft.png";
import vapeFruitImg   from "@assets/generated_images/vape_fruit.png";
import vapeDessertImg from "@assets/generated_images/vape_dessert.png";
import vapeMentholImg from "@assets/generated_images/vape_menthol.png";
import vapeTobaccoImg from "@assets/generated_images/vape_tobacco.png";

const PLAYGROUND_CONFIG: PlaygroundConfig = {
  craft: "vape", craftLabel: "VapeCraft",
  accent: "#a855f7", accentSoft: "#06b6d4",
  tint: "rgba(100,40,200,0.5)",
  background: "/images/scenes/bold.jpg",
  brandNameLabel: "Flavor Name",
  brandNamePlaceholder: "Name your flavor identity…",
  emblemLabel: "Identity Icon",
  emblemOptions: [
    { id: "cloud",   label: "Cloud ☁"   },
    { id: "spark",   label: "Spark ⚡"  },
    { id: "drop",    label: "Drop ◉"    },
    { id: "wave",    label: "Wave ∿"    },
    { id: "crystal", label: "Crystal ◬" },
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

const CONFIG: CraftFlowConfig = {
  testIdPrefix: "vapecraft",
  title: "VapeCraft",
  tagline: "Pick your vapor · we'll match the flavor",
  category: "vape",
  background: vapeBg,
  hidePairing: true,
  theme: {
    accent: "#a855f7",
    accentSoft: "#06b6d4",
    tint: "rgba(100,40,200,0.4)",
    bodyTextOverlay: "rgba(26,26,27,0.26)",
  },
  language: {
    introHeadline: "A sensory environment, calibrated to your frequency.",
    introBody: "Five quick steps. Define your vapor profile, set the atmosphere, and the AI surfaces the exact match.",
    introCta: "Start Crafting",
    stepStyleLabel: "Vapor Style",
    stepProfileLabel: "Mood",
    stylePrompt: "Choose your vapor style",
    profilePrompt: "What's the vibe?",
    matchingCopy: "Calibrating your vapor…",
    revealHeadline: "Your Flavor Match",
    productLabel: "The Vape",
    orderCta: "Order at the Bar",
  },
  styles: [
    { id: "fruit",   title: "Fruit & Bright",  subtitle: "Berry · Citrus · Tropical",   flavors: ["fruity","sweet","citrus","bright"],   strength: 1, mood: "social",  gradient: "linear-gradient(155deg, #ff7ab8 0%, #c0408c 50%, #3a0a30 100%)", image: vapeFruitImg,   glyph: "◐" },
    { id: "dessert", title: "Dessert & Sweet",  subtitle: "Vanilla · Custard · Caramel", flavors: ["sweet","vanilla","caramel","creamy"], strength: 2, mood: "relaxed", gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)", image: vapeDessertImg, glyph: "◑" },
    { id: "menthol", title: "Menthol & Cool",   subtitle: "Mint · Ice · Eucalyptus",     flavors: ["mint","cool","fresh","menthol"],      strength: 2, mood: "focused", gradient: "linear-gradient(155deg, #8de8ff 0%, #2c8ab8 50%, #08283a 100%)", image: vapeMentholImg, glyph: "◒" },
    { id: "tobacco", title: "Tobacco & Bold",   subtitle: "Tobacco · Smoky · Earthy",    flavors: ["smoky","earthy","tobacco","bold"],    strength: 4, mood: "bold",    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)", image: vapeTobaccoImg, glyph: "●" },
  ],
  moods: [
    { id: "relaxed", title: "Relaxed", desc: "Slow draw, easy exhale"           },
    { id: "social",  title: "Social",  desc: "Bright clouds, table conversation" },
    { id: "bold",    title: "Bold",    desc: "Heavy flavor, statement vapor"    },
    { id: "focused", title: "Focused", desc: "Cool, clean, dialed-in"           },
  ],
};

export default function VapeCraft() {
  const [showPlayground, setShowPlayground] = useState(() => !hasSeenPlayground("vape"));

  if (showPlayground) {
    return (
      <DesignPlayground
        craft="vape"
        config={PLAYGROUND_CONFIG}
        onComplete={() => {
          markPlaygroundSeen("vape");
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
      <CraftFlow config={CONFIG} />
    </motion.div>
  );
}
