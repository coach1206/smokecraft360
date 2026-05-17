/**
 * visualPrompts — AI visual pipeline prompt templates.
 *
 * Architecture prep for future AI-generated imagery.
 * Each prompt template is used to generate craft-specific card imagery
 * via an image generation API (e.g. Stable Diffusion, DALL-E, Midjourney API).
 *
 * Usage:
 *   buildPrompt("smoke", "Smoky & Bold", ["smoky", "bold", "earthy"])
 */

export type CraftType = "smoke" | "pour" | "brew" | "vape" | "wine";

export interface VisualPromptConfig {
  baseStyle:      string;
  lighting:       string;
  atmosphere:     string;
  composition:    string;
  colorPalette:   string;
  negativePrompt: string;
}

// ── Per-craft cinematic descriptors ──────────────────────────────────────────

export const CRAFT_VISUAL_CONFIGS: Record<CraftType, VisualPromptConfig> = {
  smoke: {
    baseStyle:    "luxury cigar lounge photography, editorial style, cinematic depth of field",
    lighting:     "warm amber side-lighting, ember glow, candlelight highlights, deep shadows",
    atmosphere:   "executive lounge, mahogany walls, leather chairs, wisps of smoke curling upward",
    composition:  "close-up product hero, slight dutch angle, bokeh background",
    colorPalette: "deep burgundy, warm gold, dark mahogany, cream, soft amber",
    negativePrompt: "cartoon, anime, bright colors, daylight, casual setting, blurry product",
  },
  pour: {
    baseStyle:    "premium spirits photography, studio editorial, ultra-high detail",
    lighting:     "moody bar lighting, backlit glass refraction, golden liquid glow, spot highlights",
    atmosphere:   "upscale cocktail bar, crystal glassware, condensation, polished marble bar top",
    composition:  "bottle or glass hero shot, pour mid-action, ice cubes, slow motion feel",
    colorPalette: "amber, caramel, crystal clear, bronze, deep oak",
    negativePrompt: "cartoon, flat lay, bright overhead light, cluttered background, plastic",
  },
  brew: {
    baseStyle:    "craft beer editorial photography, artisan brewery aesthetic",
    lighting:     "natural warm light, foam glow, amber transparency, condensation sparkle",
    atmosphere:   "rustic taproom, exposed brick, wooden beams, fresh hop aroma",
    composition:  "pint glass hero, foam crown, beer pour sequence, depth of field",
    colorPalette: "golden amber, cream foam, copper, wheat gold, dark stout brown",
    negativePrompt: "plastic cups, fluorescent lighting, generic bar, flat composition",
  },
  vape: {
    baseStyle:    "luxury vape lounge editorial, neon-noir aesthetic, futuristic minimalism",
    lighting:     "cool neon ambient, purple/blue LED glow, backlit vapor clouds, rim light",
    atmosphere:   "sleek modern lounge, vapor haze, neon accents, dark architecture",
    composition:  "device hero shot, vapor cloud mid-exhale, dramatic atmosphere",
    colorPalette: "deep purple, electric blue, silver, black, vapor white",
    negativePrompt: "clinical, sterile, daylight, realistic smoke (not vapor), dirty",
  },
  wine: {
    baseStyle:    "fine wine editorial photography, vineyard estate luxury, cellar depth",
    lighting:     "warm candlelight or golden dusk, wine glass refraction, deep shadow",
    atmosphere:   "intimate cellar or estate dining, tannin elegance, old-world refinement",
    composition:  "glass hero shot, decanted pour, vineyard bokeh background",
    colorPalette: "deep burgundy, ruby red, garnet, champagne gold, dark oak",
    negativePrompt: "casual setting, bright overhead light, supermarket, plastic cups",
  },
};

// ── Flavor descriptor map ─────────────────────────────────────────────────────

export const FLAVOR_DESCRIPTORS: Record<string, string> = {
  smoky:      "wisps of rich smoke curling through warm amber light",
  bold:       "intense character, full-frame presence, dramatic shadow depth",
  earthy:     "natural textures, raw wood grain, terracotta tones",
  sweet:      "honeyed warmth, soft golden tones, caramel reflections",
  spicy:      "fiery amber accents, sharp angular shadows, heat distortion",
  creamy:     "soft diffused light, silky texture, cream and ivory palette",
  cedar:      "raw wood texture, forest light filtering, natural grain detail",
  oak:        "barrel stave texture, aged patina, warm whiskey tones",
  vanilla:    "soft cream tones, warm studio light, luxurious softness",
  citrus:     "bright highlight accents, zest texture, fresh lemon or orange",
  tropical:   "vivid saturated tones, lush warmth, exotic botanical detail",
  peat:       "dark moody atmosphere, Scottish highland fog, deep earth tones",
  floral:     "delicate petal detail, soft natural light, ethereal softness",
  hoppy:      "fresh green hop cones, crisp light, fresh-cut botanical",
  malty:      "toasted grain warmth, deep amber light, caramel drizzle",
  mint:       "cool blue-green tones, crisp light, icy freshness",
  berry:      "deep jewel-tone purples and reds, lush berry texture",
};

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildPrompt(
  craftType: CraftType,
  title: string,
  tags: string[],
): { positive: string; negative: string } {
  const config = CRAFT_VISUAL_CONFIGS[craftType];

  const flavorDesc = tags
    .map(t => FLAVOR_DESCRIPTORS[t.toLowerCase()])
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const positive = [
    `"${title}" craft experience`,
    config.baseStyle,
    config.lighting,
    config.atmosphere,
    config.composition,
    flavorDesc || "premium product hero",
    `color palette: ${config.colorPalette}`,
    "8K resolution, professional photography, award-winning composition",
  ].filter(Boolean).join(". ");

  return { positive, negative: config.negativePrompt };
}

// ── Sound hook stubs ──────────────────────────────────────────────────────────
// Architecture prep — audio engine hooks (not yet implemented).
// Replace stub functions with real audio triggers when audio engine is wired.

export const SOUND_HOOKS = {
  smoke: {
    swipeAdd:   "smoke_ember_crackle",
    swipeSkip:  "smoke_soft_exhale",
    reveal:     "smoke_lighter_flick",
    addToOrder: "smoke_glass_clink",
  },
  pour: {
    swipeAdd:   "pour_liquid_drip",
    swipeSkip:  "pour_soft_slosh",
    reveal:     "pour_ice_clink",
    addToOrder: "pour_liquid_pour",
  },
  brew: {
    swipeAdd:   "brew_carbonation_hiss",
    swipeSkip:  "brew_soft_tap",
    reveal:     "brew_foam_pour",
    addToOrder: "brew_pint_set_down",
  },
  vape: {
    swipeAdd:   "vape_vapor_inhale",
    swipeSkip:  "vape_soft_exhale",
    reveal:     "vape_ambient_synth",
    addToOrder: "vape_device_click",
  },
  wine: {
    swipeAdd:   "wine_cork_pop",
    swipeSkip:  "wine_soft_pass",
    reveal:     "wine_glass_ring",
    addToOrder: "wine_pour_finish",
  },
} as const;

export type SoundHook = typeof SOUND_HOOKS[CraftType][keyof typeof SOUND_HOOKS[CraftType]];

/** Trigger a sound hook by name — wired to Web Audio API synthesis in audioEngine. */
export function triggerSound(hook: SoundHook, _volume = 0.7): void {
  import("../lib/audioEngine").then((audio) => {
    const clinkHooks  = ["smoke_glass_clink", "pour_ice_clink", "pour_liquid_pour", "brew_foam_pour"] as const;
    const switchHooks = ["smoke_lighter_flick", "brew_pint_set_down", "vape_device_click"] as const;
    const woodHooks   = [] as const;

    if ((clinkHooks as readonly string[]).includes(hook)) {
      audio.playClink();
    } else if ((switchHooks as readonly string[]).includes(hook)) {
      audio.playSwitch();
    } else if ((woodHooks as readonly string[]).includes(hook)) {
      audio.playWoodGrain();
    } else {
      audio.playClick();
    }
  }).catch(() => { /* audio errors must never surface */ });
}
