/**
 * imageContext — pure Cloudinary URL transformer for context-aware visuals.
 *
 * The 22nd brief's "?overlay=dark / ?filter=gold" syntax is illustrative
 * but not real — Cloudinary uses path segments like e_brightness:-30 and
 * co_rgb:cccc99. This service emits the real syntax so the URLs actually
 * render transformed images instead of 404-ing on bogus query strings.
 *
 * Contract:
 *   - Input is any string (could be a Cloudinary URL, a local /images/foo.png,
 *     or empty). Non-Cloudinary inputs are returned UNCHANGED so kiosk-bundled
 *     locked card art keeps working.
 *   - Cloudinary inputs get transformations injected directly after the
 *     `/upload/` segment, in addition to whatever's already there.
 *   - Empty / undefined input → returns input as-is. Caller decides fallback.
 *
 * No I/O, fully deterministic, unit-testable.
 */

export interface ImageContext {
  /** From RecommendRequest.timeOfDay — drives lighting overlay. */
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  /** Free-form mood tag. Only "premium"/"elegant"/"luxe" trigger gold tint. */
  mood?:      string;
  /** Hot/cold weather brightness/cool nudge. Optional. */
  weather?:   "hot" | "cold" | "neutral";
}

/**
 * Map context → ordered list of real Cloudinary transformation tokens.
 * Kept as ordered array (not concatenated string) so callers can join with
 * commas safely and so the unit test can assert each token independently.
 *
 * Strength notes:
 *   - night → moderate darken (-25 brightness) + slight saturation drop.
 *   - morning → soft brighten (+12).
 *   - premium mood → warm sepia overlay (e_sepia:35) for a "gold" feel.
 *   - hot weather → small brightness boost; cold → cool color grade.
 *
 * All values are conservative — never so aggressive that the underlying
 * product becomes unrecognisable.
 */
export function contextTransformTokens(ctx: ImageContext): string[] {
  const tokens: string[] = [];

  switch (ctx.timeOfDay) {
    case "night":
      tokens.push("e_brightness:-25", "e_saturation:-15");
      break;
    case "evening":
      tokens.push("e_brightness:-10");
      break;
    case "morning":
      tokens.push("e_brightness:12");
      break;
    // afternoon = no-op (neutral baseline)
  }

  if (ctx.mood) {
    const m = ctx.mood.toLowerCase();
    if (m === "premium" || m === "elegant" || m === "luxe") {
      tokens.push("e_sepia:35");
    }
  }

  switch (ctx.weather) {
    case "hot":
      tokens.push("e_brightness:8");
      break;
    case "cold":
      tokens.push("e_blue:20");
      break;
    // neutral / undefined = no-op
  }

  return tokens;
}

/**
 * Apply context transformations to a Cloudinary URL. Non-Cloudinary URLs
 * (local kiosk assets, third-party CDNs) pass through unchanged so the
 * kiosk's bundled "locked cards" never get mangled.
 */
export function applyContextTransforms(url: string, ctx: ImageContext): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;

  const tokens = contextTransformTokens(ctx);
  if (tokens.length === 0) return url;

  // Inject right after /upload/ — Cloudinary chains transformations from
  // left to right so context tokens land first and any existing per-call
  // resize/quality tokens still apply after.
  return url.replace("/upload/", `/upload/${tokens.join(",")}/`);
}
