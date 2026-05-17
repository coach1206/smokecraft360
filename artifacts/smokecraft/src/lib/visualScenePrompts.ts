/**
 * visualScenePrompts — cinematic scene generation for the AI visual pipeline.
 *
 * Extends visualPrompts.ts with full scene-level prompts:
 * each craft generates multiple rotating scene variants with distinct
 * lighting, camera framing, texture, and atmosphere descriptors.
 *
 * Usage:
 *   const scene = getRotatingScene("smoke", ["smoky", "bold"], sessionIndex);
 *   // Returns a full cinematic prompt + scene metadata for AI image gen API
 */

import type { CraftType } from "./environmentEngine";

// ── Scene variant type ────────────────────────────────────────────────────────

export interface CinematicScene {
  id:          string;
  label:       string;
  scenePrompt: string;
  lighting:    string;
  atmosphere:  string;
  texture:     string;
  camera:      string;
  negPrompt:   string;
  bgColorHint: string; // CSS color for placeholder / tint
  intensity:   number; // 1–10
}

// ── Per-craft scene libraries ─────────────────────────────────────────────────

export const SCENE_LIBRARIES: Record<CraftType, CinematicScene[]> = {

  smoke: [
    {
      id:          "smoke_lounge_night",
      label:       "Private Lounge — Night",
      scenePrompt: "luxury private cigar lounge at night, mahogany paneling, leather Chesterfield armchairs, crystal decanters on credenza",
      lighting:    "warm amber pendant lamps, ember glow from fireplace, deep pool of gold light, heavy shadow pools",
      atmosphere:  "wisps of smoke rising from a lit Cohiba, haze softening the room edges, intimate executive atmosphere",
      texture:     "rich leather grain, polished mahogany wood, heavy wool carpet, crystal glass refraction",
      camera:      "shallow depth of field, f/1.8 lens feel, focus on cigar and rising smoke, slight low angle hero shot",
      negPrompt:   "daylight, bright overhead light, casual setting, people facing camera, harsh flash, cartoon",
      bgColorHint: "rgba(28,14,4,0.92)",
      intensity:   8,
    },
    {
      id:          "smoke_terrace_dusk",
      label:       "Rooftop Terrace — Dusk",
      scenePrompt: "upscale rooftop cigar terrace at golden hour, city skyline blurred in background, wrought iron furniture",
      lighting:    "golden hour sun at horizon, warm directional sidelight, long elegant shadows, amber sky gradient",
      atmosphere:  "light smoke drift, refined outdoor lounge, cool evening air, exclusive member atmosphere",
      texture:     "stone terrace tiles, iron rail detail, leather chair texture, soft city glow in bokeh",
      camera:      "wide establishing shot with shallow focus on cigar product, slight upward angle, cinematic crop",
      negPrompt:   "harsh noon sun, tourist crowds, plastic furniture, busy urban clutter, overexposed sky",
      bgColorHint: "rgba(38,20,6,0.85)",
      intensity:   6,
    },
    {
      id:          "smoke_study_dark",
      label:       "Private Study — Candlelight",
      scenePrompt: "gentleman's private study, antique book shelves, single candle illuminating the scene, cognac glass on desk",
      lighting:    "single candle warm flicker, extreme chiaroscuro, gold rim-light on cigar, deep black shadows",
      atmosphere:  "contemplative solitude, leather and tobacco scent implied, old-world refinement",
      texture:     "embossed leather book spines, aged oak desk, brass hardware, thick velvet curtains",
      camera:      "tight product close-up, macro lens feel, candlelight bokeh background, still life composition",
      negPrompt:   "modern minimalist, neon lights, groups of people, casual lifestyle, smartphone visible",
      bgColorHint: "rgba(14,8,3,0.96)",
      intensity:   9,
    },
  ],

  pour: [
    {
      id:          "pour_bar_evening",
      label:       "Hotel Bar — Evening",
      scenePrompt: "five-star hotel bar at evening service, backlit crystal spirits collection, polished obsidian bar surface",
      lighting:    "warm backlit amber bottles, directional bar spotlight, deep shadows, crystal refraction sparkle",
      atmosphere:  "clinking ice in crystal, hushed conversation, bartender silhouette, premium cocktail culture",
      texture:     "polished black marble bar top, crystal glass geometry, condensation on glass, aged wood shelving",
      camera:      "low bar-height angle, wide aperture, focus on pour mid-action, bar bottles as bokeh background",
      negPrompt:   "dive bar, bright overhead fluorescents, plastic cups, noisy crowds, casual outfit",
      bgColorHint: "rgba(22,12,4,0.90)",
      intensity:   7,
    },
    {
      id:          "pour_whiskey_pour",
      label:       "Whiskey Pour — Macro",
      scenePrompt: "macro shot of premium single malt being poured into crystal rocks glass, amber liquid mid-pour, ice cube",
      lighting:    "backlit amber liquid glow, single spot from above, golden light through bottle, condensation shimmer",
      atmosphere:  "silence of anticipation, amber liquid viscosity, slow pour physics, earthy spirit depth",
      texture:     "crystal facets catching light, liquid amber transparency, oak barrel etching on glass",
      camera:      "extreme close-up macro, frozen mid-pour moment, motion blur on liquid, crisp ice crystal focus",
      negPrompt:   "cocktail garnish, colourful mixers, cocktail umbrella, wide shot, lifestyle people shot",
      bgColorHint: "rgba(30,16,4,0.88)",
      intensity:   8,
    },
    {
      id:          "pour_cellar_aged",
      label:       "Barrel Cellar",
      scenePrompt: "aged whiskey cellar, oak barrel rows receding into darkness, single floor lamp illuminating dusty bottles",
      lighting:    "warm incandescent lamp, aged amber haze through cellar mist, directional shaft of light, deep shadow",
      atmosphere:  "time and patience, earthy oak and vanilla, heritage distillery atmosphere, decades of aging",
      texture:     "oak barrel stave grain, stone cellar floor, dusty glass bottle labels, iron hoop texture",
      camera:      "dutch angle slightly, depth into receding barrels, shallow focus on foreground barrel end, filmic grain",
      negPrompt:   "modern facility, white walls, commercial brewery, plastic tanks, industrial lighting",
      bgColorHint: "rgba(18,10,3,0.94)",
      intensity:   6,
    },
  ],

  brew: [
    {
      id:          "brew_taproom_social",
      label:       "Craft Taproom — Social",
      scenePrompt: "warm craft taproom, exposed brick walls, copper brewing tanks visible, golden beer in pint glass on oak bar",
      lighting:    "warm Edison bulbs, amber beer glow from backlit taps, window light cross lighting, cozy evening warmth",
      atmosphere:  "convivial conversation, artisan craft pride, fresh hop aroma, session social energy",
      texture:     "rough exposed brick, copper tank patina, wood grain bar top, foam crown texture on pint",
      camera:      "eye-level pint glass hero, foam crown sharp focus, bar atmosphere as soft bokeh behind",
      negPrompt:   "chain restaurant, plastic cups, fluorescent lighting, empty sterile bar, commercial macro brewery",
      bgColorHint: "rgba(24,14,4,0.86)",
      intensity:   6,
    },
    {
      id:          "brew_foam_macro",
      label:       "Foam Crown — Macro",
      scenePrompt: "extreme macro of a pint glass foam crown, thousands of perfect bubbles, amber beer below, condensation",
      lighting:    "side backlighting through amber beer, foam highlights, condensation droplet sparkle, pure product shot",
      atmosphere:  "carbonation science, natural organic texture, freshness and craft precision",
      texture:     "micro-bubble foam structure, amber liquid clarity, glass edge refraction, condensation beads",
      camera:      "extreme macro telephoto, foam bubbles in razor focus, DOF pulling through amber, studio silence",
      negPrompt:   "people, bar background, logo visible, commercial brewery, wide shot, lifestyle",
      bgColorHint: "rgba(30,18,4,0.82)",
      intensity:   5,
    },
    {
      id:          "brew_dark_stout",
      label:       "Dark Stout — Drama",
      scenePrompt: "imperial stout in a chalice glass, near-black liquid, thin cream tan collar, slate bar surface, moody",
      lighting:    "single directional sidelight, deep black liquid almost opaque, cream foam rim highlight, dark drama",
      atmosphere:  "serious contemplative beer drinking, roasted coffee depth, chocolate dark complexity",
      texture:     "near-black liquid with ruby highlights, creamy collar texture, slate stone bar surface",
      camera:      "portrait orientation glass hero, backlit from behind slightly, Rembrandt lighting on glass",
      negPrompt:   "bright cheery setting, lager, citrus, colorful, noisy bar scene, smartphone",
      bgColorHint: "rgba(12,8,4,0.94)",
      intensity:   8,
    },
  ],

  vape: [
    {
      id:          "vape_neon_lounge",
      label:       "Neon Lounge — Night",
      scenePrompt: "futuristic luxury vape lounge at night, deep purple and electric blue neon architectural lighting, vapor haze",
      lighting:    "neon purple rim lighting, electric blue ambient wash, vapor clouds backlit in neon, no natural light",
      atmosphere:  "sleek modern luxury, dense vapor atmosphere, futuristic calm, premium device culture",
      texture:     "brushed aluminum surfaces, tempered glass walls, vapor cloud volumetric texture, neon reflect in floor",
      camera:      "low angle upward cinematic, device in foreground sharp, vapor cloud soft in background, neon bokeh",
      negPrompt:   "daylight, realistic cigarettes, dirty environment, cheap products, garish rainbow colors",
      bgColorHint: "rgba(8,4,20,0.92)",
      intensity:   9,
    },
    {
      id:          "vape_exhale_macro",
      label:       "Exhale Cloud — Macro",
      scenePrompt: "extreme close-up of premium vapor exhale cloud, dense white vapor with purple edge glow, black background",
      lighting:    "single backlight creating vapor volumetric god-rays, purple and blue edge glow, total black bg",
      atmosphere:  "dense cloud science, slow motion physics implied, pure vapor aesthetics, sensory exhale moment",
      texture:     "vapor cloud density and turbulence, backlit translucency, wisps and tendrils, light diffusion",
      camera:      "macro telephoto, frozen exhale moment, vapour catching the backlight in volumetric rays",
      negPrompt:   "cigarette smoke, harsh chemical look, dirty ashtray, bad quality device, cartoon",
      bgColorHint: "rgba(4,2,14,0.96)",
      intensity:   10,
    },
    {
      id:          "vape_device_hero",
      label:       "Device Hero Shot",
      scenePrompt: "premium vape device product hero on brushed graphite surface, sleek geometric design, subtle vapor mist",
      lighting:    "cinematic product lighting, multiple controlled reflections, edge highlight, deep shadow below",
      atmosphere:  "technological precision, premium materials, luxury product photography, minimalist strength",
      texture:     "anodized aluminum, matte glass panels, precision machined edges, soft reflection in graphite",
      camera:      "45° overhead product angle, controlled reflections, depth shadow below device, editorial tension",
      negPrompt:   "lifestyle setting, people visible, colorful background, casual, generic product",
      bgColorHint: "rgba(6,4,16,0.94)",
      intensity:   7,
    },
  ],
  wine: [
    {
      id:          "wine_cellar_evening",
      label:       "Estate Cellar — Evening",
      scenePrompt: "private wine cellar at evening, stone arches, oak barrels stacked in rows, candlelit alcove",
      lighting:    "warm candlelight, deep amber glow on barrel oak, soft pool of light, rich shadow",
      atmosphere:  "aged terroir, intimate cellar silence, rare vintage presence, old-world gravitas",
      texture:     "rough stone walls, barrel wood grain, dusty bottle labels, hand-wrought iron racks",
      camera:      "shallow depth of field, f/1.8 lens, focus on glass of deep red wine, low hero angle",
      negPrompt:   "bright daylight, supermarket, plastic, fluorescent, casual setting",
      bgColorHint: "rgba(14,4,4,0.94)",
      intensity:   8,
    },
    {
      id:          "wine_vineyard_dusk",
      label:       "Vineyard Estate — Dusk",
      scenePrompt: "rolling vineyard estate at golden dusk, row after row of vines, stone chateau in background",
      lighting:    "golden hour directional light, warm glow across vine rows, long purple shadows",
      atmosphere:  "harvest season air, terroir romance, quiet elegance of the estate",
      texture:     "vine leaf detail, cluster of grapes glistening, terracotta soil, stone chateau facade",
      camera:      "wide cinematic establishing shot, slight elevation, vintage foreground in focus",
      negPrompt:   "industrial winery, plastic, harsh noon, flat composition, generic",
      bgColorHint: "rgba(30,12,6,0.88)",
      intensity:   6,
    },
    {
      id:          "wine_decanting_dark",
      label:       "Private Decanting — Candlelight",
      scenePrompt: "sommelier decanting a premium Bordeaux by candlelight, crystal decanter catching the light",
      lighting:    "single candle extreme chiaroscuro, ruby wine transparency illuminated, deep shadow",
      atmosphere:  "ritual of service, anticipation, old-world sommelier craft",
      texture:     "crystal decanter facets, bottle label aged paper, white linen, polished table",
      camera:      "tight still-life composition, macro feel on decanting stream, warm bokeh",
      negPrompt:   "casual, modern bar, bright overhead, group setting, smartphone visible",
      bgColorHint: "rgba(10,3,3,0.96)",
      intensity:   9,
    },
  ],
};

// ── Scene selector ────────────────────────────────────────────────────────────

/** Returns a specific scene rotated by sessionIndex for variety. */
export function getRotatingScene(
  craft: CraftType,
  dominantTags: string[],
  sessionIndex: number,
): CinematicScene {
  const library = SCENE_LIBRARIES[craft];
  // Score scenes against dominant tags
  const scored = library.map(scene => {
    const text = [scene.scenePrompt, scene.atmosphere, scene.texture].join(" ").toLowerCase();
    const score = dominantTags.reduce((s, tag) => s + (text.includes(tag) ? 2 : 0), 0);
    return { scene, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Rotate through top scenes
  const index = sessionIndex % library.length;
  return scored[index]?.scene ?? library[0]!;
}

/** Builds a full AI generation prompt for the scene. */
export function buildScenePrompt(
  scene: CinematicScene,
  extraTags: string[] = [],
): { positive: string; negative: string } {
  const tagDesc = extraTags
    .slice(0, 3)
    .map(t => t.toLowerCase())
    .join(", ");

  const positive = [
    scene.scenePrompt,
    `Lighting: ${scene.lighting}`,
    `Atmosphere: ${scene.atmosphere}`,
    `Texture: ${scene.texture}`,
    `Camera: ${scene.camera}`,
    tagDesc ? `Flavor notes: ${tagDesc}` : "",
    "8K resolution, award-winning photography, Hasselblad medium format, cinematic color grade",
  ].filter(Boolean).join(". ");

  return { positive, negative: scene.negPrompt };
}

/** Returns CSS background hint colors for a scene (for placeholder/tint). */
export function getSceneBgColor(craft: CraftType, index = 0): string {
  return SCENE_LIBRARIES[craft][index % SCENE_LIBRARIES[craft].length]?.bgColorHint
    ?? "rgba(12,8,4,0.92)";
}

/** Grouped scene labels per craft for display in UI. */
export function getSceneList(craft: CraftType): { id: string; label: string }[] {
  return SCENE_LIBRARIES[craft].map(s => ({ id: s.id, label: s.label }));
}
