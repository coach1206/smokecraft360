import { useState, useMemo } from "react";
import { motion }            from "framer-motion";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import BeerCraftPresence from "@/components/CinematicLanding/BeerCraftPresence";
import { useCraftImages }   from "@/hooks/useDynamicImage";
import loungeBg      from "@assets/generated_images/brewcraft_beer.png";
import brewLightImg  from "@assets/generated_images/brew_light.png";
import brewAmberImg  from "@assets/generated_images/brew_amber.png";
import brewIpaImg    from "@assets/generated_images/brew_ipa.png";
import brewDarkImg   from "@assets/generated_images/brew_dark.png";

const PLAYGROUND_CONFIG: PlaygroundConfig = {
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
    { id: "craft",   label: "Craft",   primary: "#F5F2ED", accent: "#70B880", locked: true },
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

const STYLE_IDS = ["light", "amber", "ipa", "dark"] as const;

const BASE_CONFIG: CraftFlowConfig = {
  testIdPrefix: "brewcraft",
  title: "BrewCraft",
  tagline: "Pick your beer · we'll pour the experience",
  category: "beer",
  background: loungeBg,
  theme: {
    accent: "#E6C76A",
    accentSoft: "#D49555",
    tint: "rgba(60,30,10,0.4)",
    bodyTextOverlay: "rgba(26,26,27,0.22)",
  },
  language: {
    introHeadline: "A guided pour, brewed for your palate.",
    introBody: "Five quick steps. We'll match your style and mood to a beer in stock — and pair the cigar that completes it.",
    introCta: "Start Brewing",
    stepStyleLabel: "Beer Style",
    stepProfileLabel: "Mood",
    stylePrompt: "Choose your brew style",
    profilePrompt: "What's the vibe?",
    matchingCopy: "Pulling the perfect pour…",
    revealHeadline: "Your Brew Pairing",
    productLabel: "The Beer",
    pairingLabel: "Paired Cigar",
    orderCta: "Order at the Bar",
  },
  styles: [
    { id: "light",  title: "Light & Easy",       subtitle: "Crisp · Citrus · Sessionable", flavors: ["light","crisp","citrus","sweet"],          strength: 1, mood: "relaxed", gradient: "linear-gradient(155deg, #f5e8a0 0%, #e6c76a 45%, #8a6a1e 100%)", image: brewLightImg, glyph: "◐" },
    { id: "amber",  title: "Toasted & Balanced", subtitle: "Caramel · Oak · Smooth",       flavors: ["caramel","oak","nutty","toasted","sweet"], strength: 2, mood: "social",  gradient: "linear-gradient(155deg, #d49555 0%, #9c5a1e 50%, #4a2810 100%)", image: brewAmberImg, glyph: "◑" },
    { id: "ipa",    title: "Bold & Hoppy",       subtitle: "Citrus · Spice · Adventurous", flavors: ["citrus","fruity","spicy","floral"],        strength: 3, mood: "bold",    gradient: "linear-gradient(155deg, #e8a04a 0%, #b8651a 50%, #5a2c08 100%)", image: brewIpaImg,   glyph: "◒" },
    { id: "dark",   title: "Dark & Heavy",       subtitle: "Roasted · Cocoa · Deep",       flavors: ["dark-chocolate","cocoa","smoky","cream"],  strength: 4, mood: "focused", gradient: "linear-gradient(155deg, #3a2412 0%, #1a0d06 60%, #050202 100%)", image: brewDarkImg,  glyph: "●" },
  ],
  moods: [
    { id: "relaxed",  title: "Relaxed",  desc: "Slow sip, end-of-day exhale"   },
    { id: "social",   title: "Social",   desc: "Round of pints with the table"  },
    { id: "bold",     title: "Bold",     desc: "Loud flavor, no apologies"      },
    { id: "focused",  title: "Focused",  desc: "Quiet pour, deep concentration" },
  ],
};

export default function BrewCraft() {
  const [showPresence,   setShowPresence]   = useState(true);
  const [showPlayground, setShowPlayground] = useState(() => !hasSeenPlayground("brew"));

  const aiImages = useCraftImages("brew", STYLE_IDS as unknown as string[]);

  const config = useMemo<CraftFlowConfig>(() => ({
    ...BASE_CONFIG,
    styles: BASE_CONFIG.styles.map(s => ({
      ...s,
      image: aiImages[s.id] ?? s.image,
    })),
  }), [aiImages]);

  if (showPresence) {
    return <BeerCraftPresence onComplete={() => setShowPresence(false)} />;
  }

  if (showPlayground) {
    return (
      <DesignPlayground
        craft="brew"
        config={PLAYGROUND_CONFIG}
        onComplete={() => {
          markPlaygroundSeen("brew");
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
