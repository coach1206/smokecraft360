import { useState, useMemo } from "react";
import { motion }            from "framer-motion";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import { useCraftImages }   from "@/hooks/useDynamicImage";
import loungeBg      from "@assets/locked_cards/experience_pourcraft.png";
import pourSmoothImg from "@assets/generated_images/pour_smooth.png";
import pourSpicyImg  from "@assets/generated_images/pour_spicy.png";
import pourSmokyImg  from "@assets/generated_images/pour_smoky.png";
import pourRichImg   from "@assets/generated_images/pour_rich.png";

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
    bodyTextOverlay: "rgba(0,0,0,0.55)",
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
  const [showPlayground, setShowPlayground] = useState(() => !hasSeenPlayground("pour"));

  const aiImages = useCraftImages("pour", STYLE_IDS as unknown as string[]);

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
        craft="pour"
        config={PLAYGROUND_CONFIG}
        onComplete={() => {
          markPlaygroundSeen("pour");
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
