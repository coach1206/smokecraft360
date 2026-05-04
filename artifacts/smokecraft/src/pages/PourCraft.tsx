import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import loungeBg from "@assets/locked_cards/experience_pourcraft.png";
import pourSmoothImg from "@assets/generated_images/pour_smooth.png";
import pourSpicyImg  from "@assets/generated_images/pour_spicy.png";
import pourSmokyImg  from "@assets/generated_images/pour_smoky.png";
import pourRichImg   from "@assets/generated_images/pour_rich.png";

/**
 * PourCraft — spirit-led guided experience using the unified CraftFlow
 * state machine. Same flow as SmokeCraft / BrewCraft, distinct visuals.
 */

const CONFIG: CraftFlowConfig = {
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
    orderCta: "Order at POS",
  },
  styles: [
    { id: "smooth", title: "Smooth & Mellow", subtitle: "Honey · Vanilla · Easy",        flavors: ["sweet","vanilla","honey","smooth"],     strength: 2, mood: "relaxed", gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)", image: pourSmoothImg, glyph: "◐" },
    { id: "spicy",  title: "Spicy & Warm",    subtitle: "Rye · Pepper · Caramel",        flavors: ["spicy","caramel","oak","warm"],         strength: 3, mood: "social",  gradient: "linear-gradient(155deg, #d88848 0%, #a04818 50%, #4a2008 100%)", image: pourSpicyImg,  glyph: "◑" },
    { id: "smoky",  title: "Smoky & Bold",    subtitle: "Peat · Earth · Adventurous",    flavors: ["smoky","earthy","peaty","bold"],        strength: 4, mood: "bold",    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)", image: pourSmokyImg,  glyph: "◒" },
    { id: "rich",   title: "Rich & Sweet",    subtitle: "Cognac · Dried fruit · Deep",   flavors: ["sweet","rich","fruity","dark-chocolate"], strength: 4, mood: "focused", gradient: "linear-gradient(155deg, #6a2818 0%, #3a1008 60%, #100404 100%)", image: pourRichImg,   glyph: "●" },
  ],
  moods: [
    { id: "relaxed",     title: "Relaxed",     desc: "Quiet glass, slow sunset" },
    { id: "social",      title: "Social",      desc: "Toast with friends, second round" },
    { id: "bold",        title: "Bold",        desc: "Statement pour, no chaser" },
    { id: "celebratory", title: "Celebratory", desc: "Mark the moment in something rare" },
  ],
};

export default function PourCraft() {
  return <CraftFlow config={CONFIG} />;
}
