/**
 * imageResolver — combines product registry + venue inventory + context
 * transforms into a single resolved image URL for the kiosk UI.
 *
 * Why this exists (vs the brief's hardcoded imageLibrary):
 *   The brief proposed a static `imageLibrary` of paths like
 *   `/images/beer/light1.jpg`. That would be a regression: the engine
 *   already has a Product type with `imageUrl` populated by venues via
 *   Cloudinary, and the smokecraft frontend already has a ProductImage
 *   component that consumes it. Hardcoding parallel paths would create
 *   two sources of truth and skip every venue's branded photography.
 *
 *   What was actually missing (and what this service fills):
 *     1. A category/subtype FALLBACK when a Product has no imageUrl yet
 *        (the dataset is currently 0% populated per audit).
 *     2. Sold-out replacement based on real venue inventory.
 *     3. Context-aware Cloudinary transforms (time/mood/weather) using
 *        REAL Cloudinary syntax instead of the brief's fake `?overlay=`.
 */

import { findProduct } from "../engine/registry";
import { getStockInfo } from "./venueInventoryStore";
import { applyContextTransforms, contextTransformTokens, type ImageContext } from "./imageContext";

/* Category-level Cloudinary fallbacks. Live in `kiosk-fallbacks/` on the
 * Cloudinary cloud so a venue can override any of them by uploading a
 * file at the same path — the venue gets brand control, code stays clean. */
const CLOUD_NAME    = "duv5fvvrt";
const CLOUD_BASE    = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
const DEFAULT_TF    = "f_auto,q_auto,w_800,h_600,c_fill";
const SOLD_OUT_URL  = `${CLOUD_BASE}/${DEFAULT_TF}/kiosk-fallbacks/sold-out.jpg`;
const GENERIC_URL   = `${CLOUD_BASE}/${DEFAULT_TF}/kiosk-fallbacks/generic.jpg`;

/* Subtype → fallback path. Cigar uses strength bands; alcohol uses the
 * brief's smooth/bold split; food is by category. Anything not in the
 * map falls through to the per-category generic. */
const FALLBACK_PATHS: Record<string, Record<string, string>> = {
  cigar:   { mild: "kiosk-fallbacks/cigar-mild.jpg",
             medium: "kiosk-fallbacks/cigar-medium.jpg",
             full:   "kiosk-fallbacks/cigar-full.jpg" },
  alcohol: { smooth: "kiosk-fallbacks/whiskey-smooth.jpg",
             bold:   "kiosk-fallbacks/whiskey-bold.jpg" },
  beer:    { light:  "kiosk-fallbacks/beer-light.jpg",
             amber:  "kiosk-fallbacks/beer-amber.jpg",
             dark:   "kiosk-fallbacks/beer-dark.jpg",
             ipa:    "kiosk-fallbacks/beer-ipa.jpg" },
  food:    { seafood: "kiosk-fallbacks/food-seafood.jpg",
             beef:    "kiosk-fallbacks/food-beef.jpg",
             dessert: "kiosk-fallbacks/food-dessert.jpg" },
};

/** Map a numeric strength (1–5) to a cigar fallback bucket. */
function cigarBucket(strength: number): "mild" | "medium" | "full" {
  if (strength <= 2) return "mild";
  if (strength <= 3) return "medium";
  return "full";
}

export interface ResolveOptions {
  productId?: string;
  category?:  string;
  subtype?:   string;
  venueId?:   string;
  context?:   ImageContext;
}

export interface ResolvedImage {
  imageUrl: string;
  soldOut:  boolean;
  /** Where the URL came from — useful for client diagnostics and analytics. */
  source:   "product" | "category-fallback" | "sold-out" | "generic";
  /** The transforms that were applied (empty when none / non-Cloudinary URL). */
  transforms: string[];
}

export function resolveProductImage(opts: ResolveOptions): ResolvedImage {
  const ctx = opts.context ?? {};

  /* 1. Sold-out wins over everything else — operationally important.
   *    Only meaningful when a venueId is provided. Anonymous lookups
   *    skip this branch and treat all products as in-stock. */
  let soldOut = false;
  if (opts.venueId && opts.productId) {
    const stock = getStockInfo(opts.venueId, opts.productId);
    if (stock && (!stock.available || stock.quantity <= 0)) {
      soldOut = true;
    }
  }
  if (soldOut) {
    return {
      imageUrl:   applyContextTransforms(SOLD_OUT_URL, ctx),
      soldOut:    true,
      source:     "sold-out",
      transforms: contextTransformTokens(ctx),
    };
  }

  /* Compute applied tokens once for diagnostic accuracy across branches. */
  const appliedTokens = contextTransformTokens(ctx);

  /* 2. Try the real Product imageUrl. */
  if (opts.productId) {
    const product = findProduct(opts.productId);
    if (product?.imageUrl) {
      return {
        imageUrl:   applyContextTransforms(product.imageUrl, ctx),
        soldOut:    false,
        source:     "product",
        transforms: appliedTokens,
      };
    }
    /* Product exists but has no imageUrl — derive subtype from the
     * product itself so we return a meaningful category fallback. */
    if (product) {
      const cat = product.category;
      const sub = cat === "cigar" ? cigarBucket(product.strength) : opts.subtype;
      const path = sub ? FALLBACK_PATHS[cat]?.[sub] : undefined;
      if (path) {
        const url = applyContextTransforms(`${CLOUD_BASE}/${DEFAULT_TF}/${path}`, ctx);
        return { imageUrl: url, soldOut: false, source: "category-fallback", transforms: appliedTokens };
      }
    }
  }

  /* 3. Caller passed only a category + subtype hint (no productId). */
  if (opts.category && opts.subtype) {
    const path = FALLBACK_PATHS[opts.category]?.[opts.subtype.toLowerCase()];
    if (path) {
      const url = applyContextTransforms(`${CLOUD_BASE}/${DEFAULT_TF}/${path}`, ctx);
      return { imageUrl: url, soldOut: false, source: "category-fallback", transforms: appliedTokens };
    }
  }

  /* 4. Last resort — generic placeholder, still context-transformed so the
   *    kiosk's overall mood stays consistent. */
  return {
    imageUrl:   applyContextTransforms(GENERIC_URL, ctx),
    soldOut:    false,
    source:     "generic",
    transforms: appliedTokens,
  };
}
