/**
 * ThemeContext — global access to the active multi-tenant theme profile.
 *
 * Resolves the active theme exactly once at boot via `loadTheme()` (which
 * reads the URL path / query / localStorage in priority order) and exposes
 * the resolved profile + feature flags + helpers to all descendants.
 *
 * Pairs with VenueContext: VenueContext owns *who* (which venue) the kiosk
 * is operating for, ThemeContext owns *what experience* (which template).
 * Components never need to know which is which — they just call useTheme().
 *
 * Switching themes at runtime calls `setTheme(slug)` which re-resolves and
 * writes the new slug to localStorage so subsequent boots remember it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadTheme,
  sceneFor,
  type ResolvedTheme,
  type ThemeProfile,
} from "@/lib/loadTheme";

interface ThemeContextValue {
  /** Current theme profile (display name, colors, steps, …). */
  theme:        ThemeProfile;
  /** Effective feature flags for (theme × venue). */
  featureFlags: Record<string, boolean>;
  /** Convention-based scene folder for the active visualStyle. */
  sceneFolder:  string;
  /** True until the first network resolution completes. */
  loading:      boolean;
  /** Switch themes at runtime — re-fetches profile + flags. */
  setTheme:     (slug: string) => Promise<void>;
  /** Resolve a per-step scene image under the active theme. */
  sceneFor:     (stepKey: string) => string;
}

const FALLBACK: ResolvedTheme = {
  theme: {
    slug:         "smokecraft",
    displayName:  "SmokeCraft 360",
    productType:  "cigar",
    primaryColor: "#D4AF37",
    visualStyle:  "smoke",
    soundProfile: "crackle",
    steps:        ["mood", "flavor", "strength", "pairing"],
  },
  featureFlags: {},
  sceneFolder:  "/images/scenes/smoke/",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, venueId }: { children: ReactNode; venueId?: string }) {
  const [resolved, setResolved] = useState<ResolvedTheme>(FALLBACK);
  const [loading,  setLoading]  = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    loadTheme(undefined, venueId)
      .then((r) => { if (!cancelled) setResolved(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [venueId]);

  const setTheme = useCallback(async (slug: string) => {
    setLoading(true);
    const r = await loadTheme(slug, venueId);
    setResolved(r);
    setLoading(false);
  }, [venueId]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme:        resolved.theme,
    featureFlags: resolved.featureFlags,
    sceneFolder:  resolved.sceneFolder,
    loading,
    setTheme,
    sceneFor:     (stepKey: string) => sceneFor(resolved.theme, stepKey),
  }), [resolved, loading, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used inside <ThemeProvider>");
  return ctx;
}
