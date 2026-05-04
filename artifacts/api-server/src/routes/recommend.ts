import { Router, type IRouter, type Request, type Response } from "express";
import { getRecommendations } from "../engine/recommend";
import { getRegisteredCategories } from "../engine/registry";
import { allowOnly } from "../middleware/sanitize";
import { RecommendRequest } from "../engine/types";
import { verifyToken } from "../lib/jwt";
import { getTasteProfile } from "../services/tasteProfile";
import { blendProfiles } from "../services/coupleProfiles";
import { applyQualityGate } from "../services/experienceDecisionEngine";

const VALID_SHAPES   = ["robusto","corona","toro","churchill","torpedo","belicoso"] as const;
const VALID_SESSIONS = ["quick","standard","extended","long"] as const;
const VALID_TIMES    = ["morning","afternoon","evening","night"] as const;

function safeShape(v: unknown): RecommendRequest["cigarShape"] {
  return typeof v === "string" && (VALID_SHAPES as readonly string[]).includes(v)
    ? (v as RecommendRequest["cigarShape"]) : undefined;
}
function safeSession(v: unknown): RecommendRequest["cigarSession"] {
  return typeof v === "string" && (VALID_SESSIONS as readonly string[]).includes(v)
    ? (v as RecommendRequest["cigarSession"]) : undefined;
}
function safeTime(v: unknown): RecommendRequest["timeOfDay"] {
  return typeof v === "string" && (VALID_TIMES as readonly string[]).includes(v)
    ? (v as RecommendRequest["timeOfDay"]) : undefined;
}

/** Validate a client-supplied taste profile bias. Returns undefined on
 *  any shape mismatch — never throws. Used by /couples where clients
 *  may pass each guest's profile inline (the standard /recommend route
 *  derives this server-side from the authed user's history instead). */
function safeTasteProfile(v: unknown): RecommendRequest["tasteProfile"] {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const isStrNumMap = (m: unknown): m is Record<string, number> =>
    !!m && typeof m === "object" && Object.values(m as Record<string, unknown>).every((n) => typeof n === "number" && Number.isFinite(n));
  if (!isStrNumMap(o.strength) || !isStrNumMap(o.flavor) || !isStrNumMap(o.mood) || !isStrNumMap(o.categories)) return undefined;
  if (typeof o.sampleCount !== "number" || o.sampleCount < 0) return undefined;
  // Cap key counts so a malicious client can't blow up the scorer with thousands of bogus dimensions.
  const cap = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).slice(0, 50));
  return {
    strength:    cap(o.strength as Record<string, number>),
    flavor:      cap(o.flavor   as Record<string, number>),
    mood:        cap(o.mood     as Record<string, number>),
    categories:  cap(o.categories as Record<string, number>),
    sampleCount: Math.min(10_000, Math.floor(o.sampleCount)),
  };
}

/** Normalize and validate a single profile payload. Returns null + error
 *  string on validation failure so the route can surface a clean 400. */
function parseProfile(raw: Partial<RecommendRequest>): { ok: true; req: RecommendRequest } | { ok: false; error: string } {
  const validCategories = getRegisteredCategories();
  if (!raw.category || !validCategories.includes(String(raw.category).toLowerCase())) {
    return { ok: false, error: `"category" must be one of: ${validCategories.join(", ")}` };
  }
  if (
    !Array.isArray(raw.flavorPreferences) ||
    raw.flavorPreferences.length === 0 ||
    !raw.flavorPreferences.every((v: unknown) => typeof v === "string" && v.trim().length > 0)
  ) {
    return { ok: false, error: '"flavorPreferences" must be a non-empty array of strings' };
  }
  if (typeof raw.strength !== "number" || raw.strength < 1 || raw.strength > 5) {
    return { ok: false, error: '"strength" must be a number between 1 and 5' };
  }
  if (!raw.mood || typeof raw.mood !== "string") {
    return { ok: false, error: '"mood" must be a non-empty string' };
  }
  return {
    ok: true,
    req: {
      category:          String(raw.category).toLowerCase(),
      flavorPreferences: raw.flavorPreferences,
      strength:          raw.strength,
      mood:              raw.mood,
      venueId:           typeof raw.venueId === "string" ? raw.venueId : undefined,
      cigarShape:        safeShape(raw.cigarShape),
      cigarSession:      safeSession(raw.cigarSession),
      timeOfDay:         safeTime(raw.timeOfDay),
      tasteProfile:      safeTasteProfile(raw.tasteProfile),
    },
  };
}

/** Pull a userId from the optional Bearer token. Never throws. */
async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

/**
 * POST /api/recommend
 *
 * Returns ranked product recommendations, cross-category pairings, food pairings,
 * and featured/sponsored products.
 *
 * Body (only these fields are accepted — all others are stripped):
 *  {
 *    "category":          "cigar" | "alcohol" | "beer" | "wine" | "cocktail",
 *    "flavorPreferences": ["smoky", "cedar"],
 *    "strength":          3,          // 1–5
 *    "mood":              "relaxed"
 *  }
 *
 * The list of accepted categories is defined by the engine registry
 * (see engine/registry.ts → datasets) and surfaced at request time via
 * getRegisteredCategories(), so adding a new vertical needs no change here.
 */
router.post(
  "/",
  allowOnly("category", "flavorPreferences", "strength", "mood", "venueId", "cigarShape", "cigarSession", "timeOfDay", "tasteProfile"),
  async (req: Request, res: Response) => {
    const parsed = parseProfile(req.body as Partial<RecommendRequest>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    /* Optional personalization — auto-recommend bias from past behavior.
     * Pulled only for authenticated users; anonymous kiosk requests skip
     * this entirely so behavior is unchanged. Failure is non-fatal: any
     * error inside getTasteProfile returns EMPTY_PROFILE and the engine
     * just behaves as it always has. */
    const userId = await tryGetUserId(req);
    const tasteProfile = userId
      ? await getTasteProfile(userId).catch(() => undefined)
      : undefined;

    const raw = getRecommendations({
      ...parsed.req,
      tasteProfile: tasteProfile && tasteProfile.sampleCount > 0
        ? {
            strength:    tasteProfile.strength,
            flavor:      tasteProfile.flavor,
            mood:        tasteProfile.mood,
            categories:  tasteProfile.categories,
            sampleCount: tasteProfile.sampleCount,
          }
        : undefined,
    });

    const result = applyQualityGate(raw, parsed.req.venueId);

    req.log.info(
      {
        category: parsed.req.category,
        strength: parsed.req.strength,
        mood:     parsed.req.mood,
        venueId:  parsed.req.venueId,
        timeOfDay: parsed.req.timeOfDay,
        resultCount:     result.recommendations.length,
        outOfStockCount: result.outOfStock?.length ?? 0,
      },
      "recommendation request processed",
    );

    res.json(result);
  },
);

/**
 * POST /api/recommend/couples
 *
 * Couples mode — accepts two profiles in `{ profileA, profileB }`, blends
 * them into a single compromise request via blendProfiles(), and runs the
 * standard recommendation pipeline. Returns the same shape as POST /
 * plus a `blended` field showing exactly what was scored, so the UI can
 * explain "we picked this because both of you wanted [X]".
 *
 * Both profiles must share the same `category` — there's no compromise
 * between "I want a cigar" and "I want a beer".
 */
router.post(
  "/couples",
  allowOnly("profileA", "profileB"),
  async (req: Request, res: Response) => {
    const body = req.body as { profileA?: Partial<RecommendRequest>; profileB?: Partial<RecommendRequest> };
    if (!body.profileA || !body.profileB) {
      res.status(400).json({ error: '"profileA" and "profileB" are both required' });
      return;
    }
    const a = parseProfile(body.profileA);
    const b = parseProfile(body.profileB);
    if (!a.ok) { res.status(400).json({ error: `profileA: ${a.error}` }); return; }
    if (!b.ok) { res.status(400).json({ error: `profileB: ${b.error}` }); return; }
    if (a.req.category !== b.req.category) {
      res.status(400).json({ error: "Both profiles must share the same category" });
      return;
    }

    const blended = blendProfiles(a.req, b.req);
    const raw = getRecommendations(blended);
    const result = applyQualityGate(raw, blended.venueId);

    req.log.info(
      { category: blended.category, blendedStrength: blended.strength, flavors: blended.flavorPreferences.length },
      "couples recommendation processed",
    );

    res.json({ ...result, blended });
  },
);

export default router;
