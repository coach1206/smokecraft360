/**
 * Client-side theme loader for the multi-template kiosk.
 *
 * Fetches a theme profile from the server (`GET /api/themes/:slug`) and
 * resolves the per-tenant feature-flag set (`GET /api/feature-flags/resolve`).
 * Together these drive every visual / behavioral difference between
 * SmokeCraft, PourCraft, GrillCraft, etc. without rebuilding the kiosk.
 *
 * Resolution order for the active slug:
 *   1. explicit `slug` argument
 *   2. ?theme=<slug> URL param
 *   3. localStorage("smokecraft_theme")
 *   4. fallback to "smokecraft"
 *
 * The loader never throws — on any error it returns a SmokeCraft default
 * so the kiosk keeps booting.
 */

export interface ThemeProfile {
  slug:         string;
  displayName:  string;
  productType:  "cigar" | "wine" | "whiskey" | "spirits" | "coffee" | "scent" | string;
  primaryColor: string;
  visualStyle:  string;
  soundProfile: string;
  steps:        string[];
  metadata?:    Record<string, unknown> | null;
}

export interface ResolvedTheme {
  theme:        ThemeProfile;
  featureFlags: Record<string, boolean>;
  /** Resolved scene folder convention (`/images/scenes/<visualStyle>/`). */
  sceneFolder:  string;
}

const DEFAULT_THEME: ThemeProfile = {
  slug:         "smokecraft",
  displayName:  "SmokeCraft 360",
  productType:  "cigar",
  primaryColor: "#D4AF37",
  visualStyle:  "smoke",
  soundProfile: "crackle",
  steps:        ["mood", "flavor", "strength", "pairing"],
};

function pickSlug(arg?: string): string {
  if (arg) return arg;
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("theme");
    if (param) return param;
    const stored = window.localStorage.getItem("smokecraft_theme");
    if (stored) return stored;
  }
  return "smokecraft";
}

export async function loadTheme(slugArg?: string, venueId?: string): Promise<ResolvedTheme> {
  const slug = pickSlug(slugArg);

  let theme: ThemeProfile = DEFAULT_THEME;
  try {
    const r = await fetch(`/api/themes/${encodeURIComponent(slug)}`);
    if (r.ok) theme = (await r.json()) as ThemeProfile;
  } catch { /* network blip → keep default */ }

  let featureFlags: Record<string, boolean> = {};
  try {
    const qs = new URLSearchParams({ theme: theme.slug });
    if (venueId) qs.set("venue", venueId);
    const r = await fetch(`/api/feature-flags/resolve?${qs}`);
    if (r.ok) {
      const body = (await r.json()) as { flags: Record<string, boolean> };
      featureFlags = body.flags ?? {};
    }
  } catch { /* flags are optional */ }

  if (typeof window !== "undefined") {
    window.localStorage.setItem("smokecraft_theme", theme.slug);
    document.documentElement.style.setProperty("--venue-primary", theme.primaryColor);
  }

  return {
    theme,
    featureFlags,
    sceneFolder: `/images/scenes/${theme.visualStyle}/`,
  };
}

/** Convenience: resolve the per-step scene image path under the active theme. */
export function sceneFor(theme: ThemeProfile, stepKey: string): string {
  return `/images/scenes/${theme.visualStyle}/${stepKey}.jpg`;
}
