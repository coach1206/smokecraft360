/**
 * predictiveOrchestrator — pure behavioral scoring service.
 *
 * Stateless: given accumulated session signals, returns an orchestration profile.
 * No DB or network calls — pure math so it can be called synchronously from a route.
 *
 * Client-side mirrors this algorithm in OrchestratorContext for real-time local scoring.
 * Server-side is the authority for analytics persistence and venue mode integration.
 */

export type CraftType  = "smoke" | "pour" | "brew" | "vape";
export type VenueMode  = "lounge" | "nightlife" | "premium" | "social" | "calm" | "event";
export type SessionMood = "immersed" | "exploratory" | "social" | "focused" | "disengaged";
export type Pacing     = "slow-cinematic" | "balanced" | "fast-fluid" | "energetic";

// ── Input types ───────────────────────────────────────────────────────────────

export interface SwipeSignal {
  direction:    "add" | "skip";
  swipeMs:      number;      // time between this and previous swipe
  hesitationMs: number;      // time spent viewing before swiping
  tags:         string[];    // item tags
  marginPct:    number;      // 0-100
  isPremium:    boolean;     // high-margin / premium item flag
}

export interface SessionAccumulator {
  signals:      SwipeSignal[];
  craftType:    CraftType;
  sessionStart: number;       // epoch ms
}

// ── Output type ───────────────────────────────────────────────────────────────

export interface OrchestrationProfile {
  mood:                   SessionMood;
  pacing:                 Pacing;
  confidence:             number;   // 0-100 (grows with depth)
  premiumIntent:          number;   // 0-100
  socialEnergy:           number;   // 0-100
  recommendationPressure: number;   // 0-100
  atmosphereIntensity:    number;   // 0-100
  venueMode:              VenueMode | null;
  sessionDepth:           number;
  avgSwipeMs:             number;
  skipRatio:              number;   // 0-1
  computedAt:             string;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Tags that signal premium preference
const PREMIUM_TAGS = new Set([
  "bold", "reserve", "aged", "single malt", "limited", "rare", "vintage",
  "premium", "luxury", "full body", "rich", "complex", "oaky", "robust",
]);

// ── Venue mode bias ───────────────────────────────────────────────────────────

interface VenueBias {
  premiumIntentDelta:          number;
  socialEnergyDelta:           number;
  recommendationPressureDelta: number;
  atmosphereIntensityDelta:    number;
  pacingOverride?:             Pacing;
}

const VENUE_BIASES: Record<VenueMode, VenueBias> = {
  lounge:    { premiumIntentDelta: +5,  socialEnergyDelta: -10, recommendationPressureDelta: -15, atmosphereIntensityDelta: -10 },
  nightlife: { premiumIntentDelta: -5,  socialEnergyDelta: +20, recommendationPressureDelta: +10, atmosphereIntensityDelta: +5,  pacingOverride: "fast-fluid"    },
  premium:   { premiumIntentDelta: +15, socialEnergyDelta: -10, recommendationPressureDelta: -10, atmosphereIntensityDelta: +10, pacingOverride: "slow-cinematic" },
  social:    { premiumIntentDelta: -5,  socialEnergyDelta: +15, recommendationPressureDelta: +5,  atmosphereIntensityDelta: -5                                   },
  calm:      { premiumIntentDelta: 0,   socialEnergyDelta: -15, recommendationPressureDelta: -20, atmosphereIntensityDelta: -15, pacingOverride: "slow-cinematic" },
  event:     { premiumIntentDelta: -5,  socialEnergyDelta: +20, recommendationPressureDelta: +20, atmosphereIntensityDelta: +5,  pacingOverride: "energetic"      },
};

// ── Core scoring function ─────────────────────────────────────────────────────

export function computeOrchestrationProfile(
  acc: SessionAccumulator,
  venueMode: VenueMode | null = null,
): OrchestrationProfile {
  const { signals, craftType, sessionStart } = acc;
  const depth = signals.length;

  if (depth === 0) {
    return emptyProfile(venueMode, craftType);
  }

  // ── Raw signal extraction ─────────────────────────────────────────────────

  const swipeMsArr      = signals.map(s => s.swipeMs).filter(v => v > 0);
  const hesitationMsArr = signals.map(s => s.hesitationMs).filter(v => v > 0);
  const addCount        = signals.filter(s => s.direction === "add").length;
  const skipCount       = signals.filter(s => s.direction === "skip").length;
  const premiumHits     = signals.filter(s => s.isPremium || s.direction === "add").length;
  const premiumTagHits  = signals.flatMap(s => s.tags).filter(t => PREMIUM_TAGS.has(t.toLowerCase())).length;
  const allTags         = signals.flatMap(s => s.tags);
  const uniqueTags      = new Set(allTags).size;
  const marginArr       = signals.filter(s => s.direction === "add").map(s => s.marginPct);

  const avgSwipeMs      = avg(swipeMsArr.length > 0 ? swipeMsArr : [2000]);
  const avgHesitationMs = avg(hesitationMsArr.length > 0 ? hesitationMsArr : [1500]);
  const avgMargin       = avg(marginArr.length > 0 ? marginArr : [50]);
  const skipRatio       = depth > 0 ? skipCount / depth : 0.5;
  const sessionAgeMin   = (Date.now() - sessionStart) / 60000;

  // ── Premium Intent: 0–100 ────────────────────────────────────────────────

  let premiumIntent = 30;
  premiumIntent += clamp(premiumHits * 8, 0, 40);            // add swipes on premium items
  premiumIntent += clamp(premiumTagHits * 5, 0, 25);         // tag hits on premium vocabulary
  premiumIntent += clamp((avgHesitationMs - 1000) / 400, 0, 12);  // slow hesitation = engaged
  premiumIntent += clamp((avgMargin - 50) / 5, -10, 10);     // high-margin preference
  if (avgSwipeMs < 700) premiumIntent -= 12;                  // rapid swipers rarely premium
  if (craftType === "pour" || craftType === "smoke") premiumIntent += 5; // high-value crafts
  premiumIntent = clamp(premiumIntent, 0, 100);

  // ── Social Energy: 0–100 ─────────────────────────────────────────────────

  let socialEnergy = 40;
  if (avgSwipeMs < 700)  socialEnergy += 20;   // fast = social/energetic
  if (avgSwipeMs > 2800) socialEnergy -= 15;   // very slow = private/focused
  if (craftType === "brew" || craftType === "vape") socialEnergy += 8;
  if (uniqueTags > 8)    socialEnergy += 10;   // diverse taste = exploratory/social
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 2) socialEnergy += 12;   // late night = social
  if (hour >= 6 && hour < 11) socialEnergy -= 8;    // morning = private
  socialEnergy = clamp(socialEnergy, 0, 100);

  // ── Recommendation Pressure: 0–100 ───────────────────────────────────────

  let recPressure = 50;
  if (depth < 4)           recPressure += 20;  // early session → push to engage
  if (skipRatio > 0.7)     recPressure += 15;  // lots of skips → needs stronger direction
  if (addCount > 3)        recPressure -= 15;  // already converting → ease off
  if (premiumIntent > 70)  recPressure -= 10;  // premium user → softer, sophisticated
  if (sessionAgeMin > 8)   recPressure += 10;  // long session, maybe stalled
  recPressure = clamp(recPressure, 20, 90);

  // ── Atmosphere Intensity: 0–100 ──────────────────────────────────────────

  let atmosphereIntensity = 65;
  atmosphereIntensity += (premiumIntent - 50) * 0.3;
  atmosphereIntensity += (100 - socialEnergy) * 0.12;
  atmosphereIntensity = clamp(atmosphereIntensity, 30, 95);

  // ── Mood classification ───────────────────────────────────────────────────

  let mood: SessionMood;
  if (premiumIntent > 70 && avgSwipeMs > 1800)            mood = "immersed";
  else if (socialEnergy > 65)                              mood = "social";
  else if (depth < 3 && avgSwipeMs < 800 && skipRatio > 0.5) mood = "disengaged";
  else if (uniqueTags > 8 && avgSwipeMs < 2200)            mood = "exploratory";
  else                                                     mood = "focused";

  // ── Pacing ───────────────────────────────────────────────────────────────

  let pacing: Pacing;
  if (premiumIntent > 70 || avgSwipeMs > 2500)             pacing = "slow-cinematic";
  else if (socialEnergy > 65 || avgSwipeMs < 700)          pacing = "fast-fluid";
  else if (avgSwipeMs < 1400)                              pacing = "energetic";
  else                                                     pacing = "balanced";

  // ── Venue mode bias ───────────────────────────────────────────────────────

  if (venueMode && VENUE_BIASES[venueMode]) {
    const b = VENUE_BIASES[venueMode];
    premiumIntent          = clamp(premiumIntent          + b.premiumIntentDelta,          0, 100);
    socialEnergy           = clamp(socialEnergy           + b.socialEnergyDelta,           0, 100);
    recPressure            = clamp(recPressure            + b.recommendationPressureDelta, 20, 90);
    atmosphereIntensity    = clamp(atmosphereIntensity    + b.atmosphereIntensityDelta,    30, 95);
    if (b.pacingOverride)  pacing = b.pacingOverride;
  }

  // Confidence grows with session depth (max 95 at 7+ swipes)
  const confidence = clamp(40 + depth * 8, 40, 95);

  return {
    mood,
    pacing,
    confidence,
    premiumIntent:          Math.round(premiumIntent),
    socialEnergy:           Math.round(socialEnergy),
    recommendationPressure: Math.round(recPressure),
    atmosphereIntensity:    Math.round(atmosphereIntensity),
    venueMode,
    sessionDepth:           depth,
    avgSwipeMs:             Math.round(avgSwipeMs),
    skipRatio:              Math.round(skipRatio * 1000) / 1000,
    computedAt:             new Date().toISOString(),
  };
}

function emptyProfile(venueMode: VenueMode | null, craftType: CraftType): OrchestrationProfile {
  return {
    mood:                   "focused",
    pacing:                 "balanced",
    confidence:             40,
    premiumIntent:          30,
    socialEnergy:           40,
    recommendationPressure: 50,
    atmosphereIntensity:    65,
    venueMode,
    sessionDepth:           0,
    avgSwipeMs:             2000,
    skipRatio:              0.5,
    computedAt:             new Date().toISOString(),
  };
}
