import { AI_BEHAVIOR_PROFILE, type BehaviorContext } from "../config/aiBehavior";
import { type ScoredProduct, type RecommendResponse } from "../engine/types";
import { isInStock } from "./venueInventoryStore";
import { logger } from "../lib/logger";

const STRENGTH_MISMATCH_THRESHOLD = 3;
const BEGINNER_PRICE_CAP = 150;

export function buildBehaviorContext(context: string): BehaviorContext {
  return {
    identity: AI_BEHAVIOR_PROFILE.identity,
    principles: AI_BEHAVIOR_PROFILE.principles,
    context,
  };
}

export function validateExperience(rec: RecommendResponse): boolean {
  if (!rec.recommendations || rec.recommendations.length === 0) return false;
  if (!rec.pairings) return false;
  return true;
}

export function validatePairingQuality(
  primary: ScoredProduct,
  paired: ScoredProduct | undefined,
): boolean {
  if (!paired) return true;
  const diff = Math.abs((primary.strength ?? 3) - (paired.strength ?? 3));
  if (diff >= STRENGTH_MISMATCH_THRESHOLD) return false;
  return true;
}

export function validateUpsell(
  userLevelIndex: number,
  product: ScoredProduct & { price?: number },
): boolean {
  if (userLevelIndex <= 0 && (product.price ?? 0) > BEGINNER_PRICE_CAP) return false;
  return true;
}

export function validateInventoryItem(
  productId: string,
  venueId: string,
): boolean {
  return isInStock(venueId, productId);
}

export function applyQualityGate(
  response: RecommendResponse,
  venueId: string | undefined,
): RecommendResponse {
  const ctx = buildBehaviorContext("quality-gate");

  if (!validateExperience(response)) {
    logger.warn({ ctx: ctx.context, identity: ctx.identity }, "empty experience blocked");
    return response;
  }

  if (response.pairings.length > 0 && response.recommendations.length > 0) {
    const validPairings = response.pairings.filter((p) =>
      validatePairingQuality(response.recommendations[0], p),
    );
    if (validPairings.length < response.pairings.length) {
      const blocked = response.pairings.length - validPairings.length;
      logger.info(
        { blocked, identity: ctx.identity },
        "strength-mismatched pairings filtered",
      );
    }
    response = { ...response, pairings: validPairings };
  }

  if (venueId) {
    const validFeatured = response.featured.filter((f) =>
      validateInventoryItem(f.id, venueId),
    );
    if (validFeatured.length < response.featured.length) {
      logger.info(
        { blocked: response.featured.length - validFeatured.length },
        "out-of-stock featured items filtered",
      );
    }
    response = { ...response, featured: validFeatured };
  }

  return response;
}

export function filterUpsells(
  featured: ScoredProduct[],
  userLevelIndex: number,
): ScoredProduct[] {
  return featured.filter((f) => validateUpsell(userLevelIndex, f));
}

export function getEngineStatus() {
  return {
    active: true,
    system: AI_BEHAVIOR_PROFILE.identity,
    mode: AI_BEHAVIOR_PROFILE.mode,
    version: AI_BEHAVIOR_PROFILE.version,
    principles: AI_BEHAVIOR_PROFILE.principles.length,
  };
}
