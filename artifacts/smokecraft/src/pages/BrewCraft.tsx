import { useState }   from "react";
import CraftFlow, { type CraftFlowConfig } from "@/components/CraftFlow";
import DesignPlayground, { hasSeenPlayground, markPlaygroundSeen } from "@/components/DesignPlayground/DesignPlayground";
import loungeBg      from "@assets/generated_images/brewcraft_beer.png";
import brewLightImg  from "@assets/generated_images/brew_light.png";
import brewAmberImg  from "@assets/generated_images/brew_amber.png";
import brewIpaImg    from "@assets/generated_images/brew_ipa.png";
import brewDarkImg   from "@assets/generated_images/brew_dark.png";

/**
 * BrewCraft — beer-led guided experience.
 *
 * Uses the unified CraftFlow state machine (Intro → Style → Profile →
 * Match → Reveal → Order). Visuals stay beer-specific via the config.
 *
 * The DesignPlayground overlay runs once per session before CraftFlow starts.
 * Session-storage key "playground_seen_brew" suppresses it on repeat visits.
 */

const CONFIG: CraftFlowConfig = {
  testIdPrefix: "brewcraft",
  title: "BrewCraft",
  tagline: "Pick your beer · we'll pour the experience",
  category: "beer",
  background: loungeBg,
  theme: {
    accent: "#E6C76A",
    accentSoft: "#D49555",
    tint: "rgba(60,30,10,0.4)",
    bodyTextOverlay: "rgba(0,0,0,0.55)",
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
    orderCta: "Order at POS",
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
  const [showPlayground, setShowPlayground] = useState(() => !hasSeenPlayground("brew"));

  if (showPlayground) {
    return (
      <DesignPlayground
        craft="brew"
        onComplete={() => {
          markPlaygroundSeen("brew");
          setShowPlayground(false);
        }}
      />
    );
  }

  return <CraftFlow config={CONFIG} />;
}
