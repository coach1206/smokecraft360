/**
 * mentorIntelligence.ts — Deterministic Mentor Memory & Chemistry Engine
 *
 * Phase 2 of the Human Foundation. Provides:
 *   - Flavor chemistry rules + "Why This Works" explanations
 *   - Live blend metrics: Harmony, Warmth, Complexity, Boldness, Aroma, Finish
 *   - Memory-aware mentor commentary referencing past sessions + flavor history
 *   - Flavor evolution and deviation detection across sessions
 *   - Adaptive return greeting for recognized guests
 *   - Educational micro-insights woven into mentor speech
 *
 * All computation is deterministic — no external AI calls.
 */

import type { GuestProfile, Mentor } from "@/contexts/GuestProfileContext";

// ── Flavor family sets ────────────────────────────────────────────────────────

const WARM_TAGS  = new Set(["cedar","oak","vanilla","caramel","cocoa","leather","malty","tobacco","chocolate","warm","roast","coffee","dark roast","toasted","spiced","aged","barrel"]);
const BRIGHT_TAGS = new Set(["citrus","tropical","berry","fruity","floral","bright","lemon","orange","zesty","juicy","summer","fresh"]);
const EARTHY_TAGS = new Set(["earthy","woody","peat","earth","mineral","natural","herbal","dried"]);
const SMOOTH_TAGS = new Set(["smooth","creamy","cream","sweet","mild","honey","wheat","light","delicate","soft","silky"]);
const BOLD_TAGS   = new Set(["bold","spicy","complex","rich","intense","hoppy","bitter","dark","robust","full","full body","heavy","strong"]);
const AROMA_TAGS  = new Set(["aromatic","floral","vanilla","mint","cedar","herbal","fragrant","aromatic","perfumed"]);
const COOL_TAGS   = new Set(["mint","cool","crisp","icy","clean","fresh","menthol"]);
const FINISH_TAGS = new Set(["oak","cedar","leather","peat","cocoa","tobacco","dark","complex","rich","aged","barrel"]);

// ── Known harmony pairs ───────────────────────────────────────────────────────

const HARMONY_PAIRS: [string, string][] = [
  ["cedar",  "leather"],   ["cedar",  "cocoa"],    ["cedar",  "earth"],
  ["cedar",  "tobacco"],   ["oak",    "vanilla"],  ["oak",    "caramel"],
  ["oak",    "leather"],   ["oak",    "spiced"],   ["peat",   "leather"],
  ["peat",   "dark"],      ["vanilla","caramel"],  ["vanilla","sweet"],
  ["vanilla","cream"],     ["cocoa",  "leather"],  ["cocoa",  "dark"],
  ["cocoa",  "tobacco"],   ["smooth", "sweet"],    ["smooth", "creamy"],
  ["creamy", "vanilla"],   ["malty",  "toasted"],  ["malty",  "caramel"],
  ["hoppy",  "crisp"],     ["hoppy",  "bitter"],   ["fruity", "tropical"],
  ["berry",  "sweet"],     ["mint",   "cream"],    ["mint",   "smooth"],
  ["citrus", "floral"],    ["floral", "light"],    ["light",  "crisp"],
  ["bold",   "complex"],   ["rich",   "bold"],     ["spicy",  "caramel"],
  ["spicy",  "oak"],       ["earthy", "cedar"],    ["earthy", "leather"],
  ["earthy", "tobacco"],
];

// ── Known conflict pairs ──────────────────────────────────────────────────────

const CONFLICT_PAIRS: [string, string][] = [
  ["cedar",     "mint"],    ["cedar",   "citrus"],  ["cedar",    "tropical"],
  ["peat",      "vanilla"], ["peat",    "tropical"],["peat",     "fruity"],
  ["bold",      "delicate"],["bold",    "floral"],  ["mint",     "leather"],
  ["mint",      "tobacco"], ["mint",    "oak"],     ["hoppy",    "sweet"],
  ["hoppy",     "creamy"],  ["dark roast","floral"],["dark roast","tropical"],
];

// ── Chemistry explanations (natural-language, for "Why This Works") ───────────

const CHEMISTRY_NOTES: Record<string, string> = {
  "cedar+leather":    "Cedar grounds the leather warmth and extends the room atmosphere.",
  "cedar+cocoa":      "Cedar slows the sharper cocoa edge — longer, more deliberate finish.",
  "cedar+earth":      "Wood and earth together — grounded, unhurried, reserve-quality.",
  "cedar+tobacco":    "Classic backbone. Cedar lifts the tobacco into something more elevated.",
  "oak+vanilla":      "The barrel gives structure; vanilla softens it without weakening it.",
  "oak+caramel":      "Aged oak carries caramel into the finish with quiet authority.",
  "oak+leather":      "Dried oak and old leather — reserve-level depth.",
  "oak+spiced":       "Spice accelerates through oak rather than burning — controlled heat.",
  "peat+leather":     "Peat opens the leather into something older, more weathered.",
  "peat+dark":        "Depth on depth. Peat and darkness together rarely overstay.",
  "vanilla+caramel":  "Vanilla rounds the caramel — no sharp edges, longer presence.",
  "vanilla+sweet":    "Double sweetness needs structure — watch what comes next.",
  "vanilla+cream":    "Soft on soft — the room stays light, the finish stays clean.",
  "cocoa+leather":    "Leather anchors the cocoa so it doesn't turn sweet.",
  "cocoa+dark":       "Depth on depth. Dark profiles become richer with cocoa threading through.",
  "cocoa+tobacco":    "A pairing built for patience. Neither dominates — both develop.",
  "smooth+creamy":    "Double softness — the room stays lighter, the finish lingers clean.",
  "smooth+sweet":     "Clean and gentle. The session stays in its lane.",
  "creamy+vanilla":   "Velvet on velvet. Completely intentional, and correct.",
  "malty+toasted":    "Toast and malt — sessionable warmth at its best.",
  "malty+caramel":    "Malt and caramel support each other — neither fights for the front.",
  "hoppy+crisp":      "Hop bitterness sharpens with crisp carbonation — very clean finish.",
  "hoppy+bitter":     "Double bitterness with intent — this one's for the experienced palate.",
  "fruity+tropical":  "Layered fruit with tropical brightness — opens the session considerably.",
  "berry+sweet":      "Berry and sweetness together — dessert logic applied to craft.",
  "mint+cream":       "Cool mint against cream — the contrast lengthens both sensations.",
  "mint+smooth":      "Mint softened by a smooth profile — the coolness stays precise.",
  "citrus+floral":    "Citrus edge sharpened by floral — very precise aromatic pairing.",
  "floral+light":     "Both delicate, both correct. The room notices.",
  "light+crisp":      "Clean and sessionable. The finish disappears — that's the point.",
  "bold+complex":     "Bold presence gives complexity the structure it needs to breathe.",
  "rich+bold":        "Full-profile experience. This one occupies the whole room.",
  "spicy+caramel":    "Spice cuts through the caramel before it settles. Smart tension.",
  "spicy+oak":        "Spice accelerates through oak rather than burning — controlled heat.",
  "earthy+cedar":     "Natural and grounded. Cedar and earth build slowly, correctly.",
  "earthy+leather":   "Old-world depth. This pairing requires no explanation.",
  "earthy+tobacco":   "Soil and dried leaf — agricultural, honest, without pretension.",
  "cedar+mint":       "Cedar and mint compete for the front — neither wins cleanly.",
  "cedar+citrus":     "Citrus brightness fights cedar's earthiness. Dissonant.",
  "peat+vanilla":     "Peat overwhelms the vanilla — the sweetness disappears early.",
  "peat+tropical":    "Peat and tropical can't share a room. One will always lose.",
  "bold+delicate":    "Bold presence tends to drown delicate notes before they develop.",
  "bold+floral":      "Bold profiles crowd out floral notes quickly. Watch the finish.",
  "mint+leather":     "Mint aggressiveness strips the leather warmth — tough pairing.",
  "mint+tobacco":     "Mint and tobacco fight. The tobacco usually wins, but damaged.",
  "hoppy+sweet":      "Bitterness and sweetness fight — neither finds space to settle.",
  "hoppy+creamy":     "Hop sharpness breaks through cream too easily. Off-balance.",
  "dark roast+floral":"Dark roast overwhelms anything floral. The flowers don't survive.",
  "dark roast+tropical":"Dark and tropical are on opposite ends. Rarely reconcile.",
};

// ── Mentor commentary line pools ──────────────────────────────────────────────

type MentorStyle = "balanced" | "bold" | "smooth" | "aromatic";

interface LinePool {
  first:      string[];
  momentum:   string[];
  onSmooth:   string[];
  onBold:     string[];
  highComplex: string[];
  deviation:  string[];
  generic:    string[];
}

const MENTOR_LINES: Record<MentorStyle, LinePool> = {
  bold: {
    first:      ["Good instinct.", "That took some confidence.", "You didn't start safe. I respect that."],
    momentum:   ["You're building something with teeth.", "Each one is darker than the last — intentional?", "Bold stack. I'll stay curious about the finish."],
    onSmooth:   ["A concession, or a plan?", "You could do that… but I wouldn't.", "Interesting choice. Smoothing a bold session is a deliberate move."],
    onBold:     ["Now you're speaking the language.", "Consistent. That's either conviction or habit.", "Good. Keep going."],
    highComplex:["Most guests don't push this far. The complexity will pay off.", "You're building a reserve-level session.", "I wasn't sure you'd get here. You did."],
    deviation:  ["This is a departure from what I expected.", "Different direction tonight.", "Not what your profile suggested — but you know your own mind."],
    generic:    ["There are no accidents here.", "That one earns its place.", "Noted."],
  },
  smooth: {
    first:      ["A measured start.", "Good. You're not in a hurry.", "This one rewards patience."],
    momentum:   ["You're creating something that breathes slowly.", "Smooth doesn't mean passive. You know that.", "The room is getting quieter — that's the session working."],
    onBold:     ["Bolder than your usual. Seeing how far you want to push tonight?", "That's a departure. Worth watching.", "You're testing something. I'll stay close."],
    onSmooth:   ["Consistent. This session knows what it wants.", "Good restraint.", "The profile is settling nicely."],
    highComplex:["Smooth and complex is rare. You're threading a needle.", "This is elegant work.", "The balance here is becoming something."],
    deviation:  ["That's not where I expected you to go.", "Unusual choice for your profile — but I'm listening.", "You're surprising me tonight."],
    generic:    ["The right choice arrives quietly.", "That wrapper rewards patience.", "Understated. Which is usually correct."],
  },
  balanced: {
    first:      ["A considered start.", "Good foundation.", "Solid. Let's see where this builds."],
    momentum:   ["The session is finding its rhythm.", "You're building with intention.", "Good range so far — nothing wasted."],
    onBold:     ["Adding weight here — are you sure?", "Bold entry into an otherwise balanced session.", "That's a pivot. Could pay off."],
    onSmooth:   ["Balancing as you go. Smart.", "That smooths the profile nicely.", "Good adjustment."],
    highComplex:["You've built something layered here.", "The complexity is earning itself.", "Reserve-level thinking."],
    deviation:  ["That's an interesting direction.", "Departing from your pattern.", "I'll note that — something shifted tonight."],
    generic:    ["Each choice shapes what comes next.", "There's logic in your pattern.", "That belongs here."],
  },
  aromatic: {
    first:      ["The aroma tells you everything.", "That opens the room.", "Good — start with what the nose reveals."],
    momentum:   ["The layers here are beginning to speak.", "The room aroma is building — can you sense it?", "You're composing something the room will hold."],
    onBold:     ["Bold note in an aromatic session — it'll compete for space.", "The aroma may recede with that one. Watch it.", "Interesting tension."],
    onSmooth:   ["The aromatics stay forward with smoother profiles. Good choice.", "That lets the nose stay prominent.", "The aroma layer appreciates that."],
    highComplex:["Aromatic complexity at this level is extremely rare.", "The layering here is approaching something exceptional.", "You have an instinct for this."],
    deviation:  ["That's outside your usual aromatic range.", "The nose is going somewhere new tonight.", "Unexpected. I want to see where it lands."],
    generic:    ["Aroma is the first chapter — keep building.", "That adds a note to the room.", "The profile is becoming aromatic enough to feel."],
  },
};

// ── Educational micro-insights (surfaced occasionally on relevant tags) ───────

const MICRO_INSIGHTS: [string[], string][] = [
  [["cedar","woody"],           "Cedar's tannins slow the inhale and extend the room aroma — the slower you go, the more it reveals."],
  [["peat"],                    "Peat is the terroir of the spirit. It tells you exactly where it came from."],
  [["oak","barrel","aged"],     "Barrel aging doesn't add flavor — it removes the harsh edges and lets what's underneath breathe."],
  [["vanilla"],                 "Vanilla in a profile means the barrel did its work well. It's a marker of patient aging."],
  [["mint","cool","icy"],       "Cool notes shorten the perceived finish — they reset the palate before the session fully settles."],
  [["floral","delicate"],       "Floral profiles are fragile. They need space, low intensity, and nothing competing on the front end."],
  [["malty","toasted"],         "Malt complexity develops on the retrohale — the second breath is almost always richer than the first."],
  [["hoppy","bitter"],          "Bitterness in craft beer is calibration, not punishment. The best bitter profiles finish completely clean."],
  [["cocoa","chocolate"],       "Cocoa in a profile signals fermentation depth — the longer the process, the darker and more layered the result."],
  [["leather"],                 "Leather notes indicate age and cellar time. You can't manufacture that."],
  [["earthy"],                  "Earth-forward profiles connect to origin. You're tasting the soil the raw material grew in."],
  [["cream","creamy"],          "Creamy profiles coat the palate and slow everything down. Room chemistry follows the session."],
];

// ── Return greeting lines (memory-aware) ──────────────────────────────────────

const RETURN_LINES: Record<MentorStyle, string[]> = {
  bold: [
    "Last session you pushed dark and complex — let's see if you hold the line tonight.",
    "You've been leaning heavier with every visit. I want to see where that leads.",
    "You have a pattern. Tonight we either confirm it or break it.",
  ],
  smooth: [
    "You always come back to something measured. I've started to expect that.",
    "Your sessions have been getting more refined. I've noticed.",
    "Last time you built something slow and correct. We start there again.",
  ],
  balanced: [
    "Last session you leaned darker than usual toward the end. I remember.",
    "You've been exploring — your range has widened across visits.",
    "I track what you choose, not just what you say you like. It's more honest.",
  ],
  aromatic: [
    "Your nose has been leading your sessions lately. That's not an accident.",
    "Last session you lingered on the aromatic end longer than any guest this week.",
    "You've been building toward something aromatic. Tonight, let's find out what.",
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlendChemistry {
  harmony:    number;
  warmth:     number;
  complexity: number;
  boldness:   number;
  aroma:      number;
  finish:     number;
  mentorNote: string;
}

export interface MentorCommentaryContext {
  mentorStyle:      MentorStyle;
  mentorId:         string;
  newTags:          string[];
  allAddedTags:     string[];
  addedCount:       number;
  craftType:        string;
  guestBoldness:    string | null;
  guestAtmosphere:  string | null;
  flavorHistory:    GuestProfile["flavorHistory"];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tagFamily(t: string): string {
  const tl = t.toLowerCase();
  if (WARM_TAGS.has(tl))   return "warm";
  if (BRIGHT_TAGS.has(tl)) return "bright";
  if (EARTHY_TAGS.has(tl)) return "earthy";
  if (SMOOTH_TAGS.has(tl)) return "smooth";
  if (BOLD_TAGS.has(tl))   return "bold";
  if (COOL_TAGS.has(tl))   return "cool";
  return "other";
}

function familySet(tags: string[]): Set<string> {
  const s = new Set<string>();
  tags.forEach(t => { const f = tagFamily(t); if (f !== "other") s.add(f); });
  return s;
}

function isBoldTag(t: string)   { return BOLD_TAGS.has(t.toLowerCase()); }
function isSmoothTag(t: string) { return SMOOTH_TAGS.has(t.toLowerCase()); }

// ── "Why This Works" explanation ──────────────────────────────────────────────

export function generateWhyThisWorks(newTags: string[], sessionTags: string[]): string | null {
  if (sessionTags.length === 0) return null;

  const nl = newTags.map(t => t.toLowerCase());
  const sl = sessionTags.map(t => t.toLowerCase());

  for (const [a, b] of HARMONY_PAIRS) {
    const key = `${a}+${b}`;
    if (!CHEMISTRY_NOTES[key]) continue;
    if ((nl.some(t => t.includes(a)) && sl.some(t => t.includes(b))) ||
        (nl.some(t => t.includes(b)) && sl.some(t => t.includes(a)))) {
      return CHEMISTRY_NOTES[key];
    }
  }
  for (const [a, b] of CONFLICT_PAIRS) {
    const key = `${a}+${b}`;
    if (!CHEMISTRY_NOTES[key]) continue;
    if ((nl.some(t => t.includes(a)) && sl.some(t => t.includes(b))) ||
        (nl.some(t => t.includes(b)) && sl.some(t => t.includes(a)))) {
      return CHEMISTRY_NOTES[key];
    }
  }
  return null;
}

// ── Blend chemistry metrics ───────────────────────────────────────────────────

export function computeBlendChemistry(allAddedTags: string[], craftType: string): BlendChemistry {
  const n = allAddedTags.length;
  if (n === 0) {
    return { harmony: 0, warmth: 0, complexity: 0, boldness: 0, aroma: 0, finish: 0, mentorNote: "" };
  }

  const tags = allAddedTags.map(t => t.toLowerCase());

  const warmth     = Math.round((tags.filter(t => WARM_TAGS.has(t)).length  / n) * 100);
  const boldness   = Math.round((tags.filter(t => BOLD_TAGS.has(t)).length  / n) * 100);
  const aroma      = Math.round((tags.filter(t => AROMA_TAGS.has(t)).length / n) * 100);
  const finish     = Math.min(100, Math.round((tags.filter(t => FINISH_TAGS.has(t)).length / n) * 190));
  const complexity = Math.round((familySet(tags).size / 6) * 100);

  let harmonyScore = 48 + Math.min(22, n * 3);
  for (const [a, b] of HARMONY_PAIRS) {
    if (tags.some(t => t.includes(a)) && tags.some(t => t.includes(b))) harmonyScore += 7;
  }
  for (const [a, b] of CONFLICT_PAIRS) {
    if (tags.some(t => t.includes(a)) && tags.some(t => t.includes(b))) harmonyScore -= 11;
  }
  const harmony = Math.max(0, Math.min(100, Math.round(harmonyScore)));

  const mentorNote = _buildMentorNote(harmony, complexity, boldness, warmth, aroma, craftType);

  return { harmony, warmth, complexity, boldness, aroma, finish, mentorNote };
}

function _buildMentorNote(h: number, c: number, b: number, w: number, a: number, _craft: string): string {
  if (h >= 82 && c >= 60) return "You're close to a reserve-level balance.";
  if (h >= 72 && b >= 58) return "Strong core. Bold without losing structure.";
  if (c >= 75)            return "Rare complexity. Most guests don't build this deep.";
  if (w >= 70)            return "Warm profiles like this slow the room down naturally.";
  if (a >= 60)            return "The aroma layer here is layered — it'll outlast the session.";
  if (h < 38)             return "The profile is pulling in different directions. Might be worth slowing down.";
  if (b < 22 && w < 22)  return "Light and exploratory. Good foundation for something deeper.";
  if (h >= 60 && c >= 50) return "Solid balance. The session knows where it's going.";
  return "The session is finding its shape.";
}

// ── Mentor commentary (swipe-time) ────────────────────────────────────────────

export function generateMentorLine(ctx: MentorCommentaryContext): string {
  const { mentorStyle, newTags, allAddedTags, addedCount } = ctx;

  const style  = (MENTOR_LINES[mentorStyle] ? mentorStyle : "balanced") as MentorStyle;
  const pool   = MENTOR_LINES[style];
  const nl     = newTags.map(t => t.toLowerCase());
  const al     = allAddedTags.map(t => t.toLowerCase());
  const isNewBold   = nl.some(isBoldTag);
  const isNewSmooth = nl.some(isSmoothTag);

  let bucket: keyof LinePool = "generic";

  if (addedCount === 1) {
    bucket = "first";
  } else if (isNewBold && style === "smooth") {
    bucket = "onBold";
  } else if (isNewBold && style === "aromatic") {
    bucket = "onBold";
  } else if (isNewSmooth && style === "bold") {
    bucket = "onSmooth";
  } else if (al.length >= 6 && familySet(al).size >= 4) {
    bucket = "highComplex";
  } else if (addedCount >= 3) {
    bucket = "momentum";
  } else if (addedCount >= 2) {
    bucket = isNewBold ? "onBold" : isNewSmooth ? "onSmooth" : "generic";
  }

  const lines = pool[bucket].length > 0 ? pool[bucket] : pool.generic;
  return lines[addedCount % lines.length]!;
}

// ── Micro-insight (occasional educational note) ───────────────────────────────

export function generateMicroInsight(tags: string[]): string | null {
  const tl = tags.map(t => t.toLowerCase());
  for (const [triggers, insight] of MICRO_INSIGHTS) {
    if (triggers.some(kw => tl.some(t => t.includes(kw)))) {
      return insight;
    }
  }
  return null;
}

// ── Memory-aware return greeting ──────────────────────────────────────────────

export function generateReturnGreeting(profile: GuestProfile, mentor: Mentor): string {
  const { flavorHistory, sessionCount } = profile;
  const style = (mentor.style ?? "balanced") as MentorStyle;

  if (!flavorHistory || flavorHistory.length === 0 || sessionCount < 2) {
    return mentor.greeting;
  }

  const sorted  = [...flavorHistory].sort((a, b) => b.count - a.count);
  const topTags = sorted.slice(0, 4).map(f => f.tag.toLowerCase());

  const dominantBold   = topTags.filter(isBoldTag).length >= 2;
  const dominantSmooth = topTags.filter(isSmoothTag).length >= 2;
  const dominantWarm   = topTags.filter(t => WARM_TAGS.has(t)).length >= 2;
  const dominantBright = topTags.filter(t => BRIGHT_TAGS.has(t)).length >= 2;

  if (dominantBold) {
    return `Last session you leaned heavily into darker profiles — tonight we'll see if that holds.`;
  }
  if (dominantSmooth) {
    return `Your sessions have been consistently smooth. ${sessionCount > 3 ? "It's becoming a signature." : "Let's see where you take it tonight."}`;
  }
  if (dominantWarm) {
    return `Warm, cedar-heavy profiles have been your territory lately. I've been saving something for you.`;
  }
  if (dominantBright) {
    return `You've been exploring the brighter end of the spectrum. Tonight we go deeper or wider — your call.`;
  }

  const pool = RETURN_LINES[style];
  return pool[((sessionCount - 1) % pool.length)]!;
}

// ── Flavor evolution detection (across sessions) ──────────────────────────────

export function detectEvolution(
  flavorHistory: GuestProfile["flavorHistory"],
  currentTags: string[],
): string | null {
  if (!flavorHistory || flavorHistory.length < 3) return null;

  const hist = flavorHistory.map(f => f.tag.toLowerCase());
  const curr = currentTags.map(t => t.toLowerCase());

  const hBoldR   = hist.filter(isBoldTag).length   / hist.length;
  const hSmoothR = hist.filter(isSmoothTag).length  / hist.length;
  const cBoldR   = curr.filter(isBoldTag).length   / Math.max(curr.length, 1);
  const cSmoothR = curr.filter(isSmoothTag).length  / Math.max(curr.length, 1);
  const hWarmR   = hist.filter(t => WARM_TAGS.has(t)).length  / hist.length;
  const cWarmR   = curr.filter(t => WARM_TAGS.has(t)).length  / Math.max(curr.length, 1);

  if (hBoldR > 0.40 && cBoldR < 0.18) return "You've been moving toward smoother profiles over your recent sessions.";
  if (hBoldR < 0.18 && cBoldR > 0.42) return "You've become more experimental over your last several visits.";
  if (hSmoothR > 0.45 && cSmoothR < 0.15) return "You used to stay light — tonight feels like a departure.";
  if (hWarmR < 0.22 && cWarmR > 0.50) return "Your preference has been shifting toward warmer, richer profiles lately.";

  const hFam = familySet(hist);
  const cFam = familySet(curr);
  if (cFam.size > hFam.size + 1) return "Your atmosphere preference has been broadening across recent sessions.";

  return null;
}

// ── Deviation detection (tonight vs profile) ──────────────────────────────────

export function detectDeviation(currentTags: string[], profile: GuestProfile): string | null {
  const { boldnessPreference, flavorHistory } = profile;
  const curr = currentTags.map(t => t.toLowerCase());
  const cBoldR   = curr.filter(isBoldTag).length   / Math.max(curr.length, 1);
  const cCoolR   = curr.filter(t => COOL_TAGS.has(t)).length  / Math.max(curr.length, 1);
  const cSmoothR = curr.filter(isSmoothTag).length  / Math.max(curr.length, 1);

  if (boldnessPreference === "mild" || boldnessPreference === "smooth") {
    if (cBoldR > 0.52) return "Tonight's session is bolder than your usual atmosphere.";
  }
  if (boldnessPreference === "bold" || boldnessPreference === "adventurous") {
    if (cBoldR < 0.18) return "You normally lean adventurous — tonight feels more reflective.";
  }

  if (flavorHistory && flavorHistory.length >= 3) {
    const hist    = flavorHistory.map(f => f.tag.toLowerCase());
    const hSmooth = hist.filter(isSmoothTag).length / hist.length;
    const hWarm   = hist.filter(t => WARM_TAGS.has(t)).length / hist.length;

    if (hSmooth > 0.42 && cSmoothR < 0.10) return "This is a more adventurous blend than your standard profile.";
    if (hSmooth < 0.10 && cSmoothR > 0.45) return "You normally avoid lighter finishes — tonight is different.";
    if (hWarm   > 0.42 && cCoolR   > 0.32) return "Tonight's session is brighter than your usual atmosphere.";
  }

  return null;
}

// ── Blend summary label ───────────────────────────────────────────────────────

export function blendSummaryLabel(chemistry: BlendChemistry): string {
  const { harmony, complexity, boldness, warmth } = chemistry;
  if (harmony >= 80 && complexity >= 65) return "Reserve Balance";
  if (boldness >= 70)                    return "Bold Session";
  if (warmth   >= 70)                    return "Warm & Grounded";
  if (complexity >= 70)                  return "Complex Profile";
  if (harmony >= 65)                     return "Well-Paired";
  if (boldness < 25 && warmth < 25)     return "Light & Exploratory";
  return "Session in Progress";
}
