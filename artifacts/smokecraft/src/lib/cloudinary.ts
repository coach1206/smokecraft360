/**
 * Cloudinary URL builder for venue-controlled product imagery.
 *
 * Why Cloudinary (per brief): venues want to swap in their own real cigar
 * photography over time without a code deploy. Cloudinary gives us a stable
 * URL contract — the agent / engineer wires the URLs once, the venue
 * uploads to fixed paths (cigars/<shape>.jpg, wrappers/<name>.jpg), and the
 * UI picks them up on the next page load.
 *
 * SAFETY CONTRACT: every helper here returns a URL that may 404 if no asset
 * has been uploaded yet. ALL call sites MUST render with <img onError={...}>
 * and degrade to a non-network fallback (SVG silhouette, locked AI image,
 * etc.). Never let an empty-Cloudinary state break the kiosk UI.
 *
 * Scope: cigar shape + wrapper imagery only. Flavor / strength / mood cards
 * are intentionally NOT routed through here — those are locked AI images
 * bundled by Vite (see attached_assets/locked_cards/) and must not regress
 * to network-dependent assets.
 */

/**
 * Inject Cloudinary transformation parameters into an EXISTING Cloudinary
 * image URL (e.g. a product `imageUrl` returned from the API). For non-
 * Cloudinary URLs the original string is returned unchanged. Used by the
 * dashboard, swipeable result cards, and ProductImage to keep payloads
 * sane on kiosk screens.
 */
export function cloudinaryOptimize(url: string, width: number, height: number): string {
  if (!url?.includes("res.cloudinary.com")) return url;
  return url.replace(
    "/upload/",
    `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`,
  );
}

const CLOUD_NAME = "duv5fvvrt";
const BASE       = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/** Per the brief: f_auto (modern format), q_auto (quality), and a 4:3 crop
 *  for consistency across whatever the venue uploads. */
const DEFAULT_TRANSFORM = "f_auto,q_auto,w_800,h_600,c_fill";

/** Cloudinary URL for a cigar vitola/shape photo. */
export function cigarShapeImage(shape: string): string {
  return `${BASE}/${DEFAULT_TRANSFORM}/cigars/${shape}.jpg`;
}

/** Cloudinary URL for a wrapper-leaf photo (claro/colorado/maduro/oscuro). */
export function wrapperImage(name: string): string {
  return `${BASE}/${DEFAULT_TRANSFORM}/wrappers/${name}.jpg`;
}
