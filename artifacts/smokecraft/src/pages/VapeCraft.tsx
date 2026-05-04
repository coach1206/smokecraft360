import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import vapeBg from "@assets/locked_cards/experience_vapecraft.png";
import vapeFruitImg   from "@assets/generated_images/vape_fruit.png";
import vapeDessertImg from "@assets/generated_images/vape_dessert.png";
import vapeMentholImg from "@assets/generated_images/vape_menthol.png";
import vapeTobaccoImg from "@assets/generated_images/vape_tobacco.png";

/**
 * VapeCraft — vapor-led guided experience using the unified CraftFlow
 * state machine. Cross-category cigar pairing is intentionally hidden
 * (no vape↔cigar bridges in engine/pairing.ts yet).
 */

const CONFIG: CraftFlowConfig = {
  testIdPrefix: "vapecraft",
  title: "VapeCraft",
  tagline: "Pick your vapor · we'll match the flavor",
  category: "vape",
  background: vapeBg,
  hidePairing: true,
  theme: {
    accent: "#B496E6",
    accentSoft: "#FF7AB8",
    tint: "rgba(118,80,180,0.4)",
    bodyTextOverlay: "rgba(0,0,0,0.55)",
  },
  language: {
    introHeadline: "A guided cloud, calibrated to your flavor.",
    introBody: "Five quick steps. Pick your vapor profile, dial in the mood, and we'll surface the e-liquid that matches.",
    introCta: "Start Crafting",
    stepStyleLabel: "Vapor Style",
    stepProfileLabel: "Mood",
    stylePrompt: "Choose your vapor style",
    profilePrompt: "What's the vibe?",
    matchingCopy: "Calibrating your vapor…",
    revealHeadline: "Your Flavor Match",
    productLabel: "The Vape",
    orderCta: "Order at POS",
  },
  styles: [
    { id: "fruit",   title: "Fruit & Bright",   subtitle: "Berry · Citrus · Tropical",      flavors: ["fruity","sweet","citrus","bright"],     strength: 1, mood: "social",  gradient: "linear-gradient(155deg, #ff7ab8 0%, #c0408c 50%, #3a0a30 100%)", image: vapeFruitImg,   glyph: "◐" },
    { id: "dessert", title: "Dessert & Sweet",  subtitle: "Vanilla · Custard · Caramel",    flavors: ["sweet","vanilla","caramel","creamy"],   strength: 2, mood: "relaxed", gradient: "linear-gradient(155deg, #f0d68a 0%, #c89548 50%, #5a3818 100%)", image: vapeDessertImg, glyph: "◑" },
    { id: "menthol", title: "Menthol & Cool",   subtitle: "Mint · Ice · Eucalyptus",        flavors: ["mint","cool","fresh","menthol"],        strength: 2, mood: "focused", gradient: "linear-gradient(155deg, #8de8ff 0%, #2c8ab8 50%, #08283a 100%)", image: vapeMentholImg, glyph: "◒" },
    { id: "tobacco", title: "Tobacco & Bold",   subtitle: "Tobacco · Smoky · Earthy",       flavors: ["smoky","earthy","tobacco","bold"],      strength: 4, mood: "bold",    gradient: "linear-gradient(155deg, #6a4828 0%, #3a2410 50%, #100804 100%)", image: vapeTobaccoImg, glyph: "●" },
  ],
  moods: [
    { id: "relaxed",     title: "Relaxed",     desc: "Slow draw, easy exhale" },
    { id: "social",      title: "Social",      desc: "Bright clouds, table conversation" },
    { id: "bold",        title: "Bold",        desc: "Heavy flavor, statement vapor" },
    { id: "focused",     title: "Focused",     desc: "Cool, clean, dialed-in" },
  ],
};

export default function VapeCraft() {
  return <CraftFlow config={CONFIG} />;
}
