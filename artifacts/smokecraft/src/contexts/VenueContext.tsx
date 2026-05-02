/**
 * VenueContext — white-label venue configuration.
 *
 * Supports multi-tenant deployments where each venue can customize:
 *  - Logo text and tagline
 *  - Primary accent color
 *  - Feature flags (demoMode, bandCreator, foodPairing, etc.)
 *
 * Resolution order:
 *  1. ?venue=<id> URL search param  →  fetched from /api/venues/:id
 *  2. smokecraft_venue localStorage key (persisted on first load)
 *  3. SmokeCraft defaults (no fetch needed)
 *
 * The context never blocks rendering — defaults are shown instantly and
 * the venue config is applied as soon as the API responds.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface VenueFeatures {
  demoMode:    boolean;
  bandCreator: boolean;
  foodPairing: boolean;
  eliteMode:   boolean;
  vault:       boolean;
}

export interface VenueConfig {
  id:           string;
  logoText:     string;
  tagline:      string;
  primaryColor: string;
  features:     VenueFeatures;
}

const DEFAULT_CONFIG: VenueConfig = {
  id:           "default",
  logoText:     "SmokeCraft",
  tagline:      "Connoisseur's Companion",
  primaryColor: "#D4AF37",
  features: {
    demoMode:    true,
    bandCreator: true,
    foodPairing: true,
    eliteMode:   true,
    vault:       true,
  },
};

const VenueContext = createContext<VenueConfig>(DEFAULT_CONFIG);

/** Apply venue primary color as a CSS custom property so all gold accents
 *  can be overridden for white-label deployments. */
function applyTheme(color: string): void {
  document.documentElement.style.setProperty("--venue-primary", color);
}

export function VenueProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<VenueConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const venueId =
      params.get("venue") ??
      localStorage.getItem("smokecraft_venue") ??
      "default";

    applyTheme(DEFAULT_CONFIG.primaryColor);

    if (venueId === "default") return;

    fetch(`/api/venues/${venueId}`)
      .then((r) => {
        if (!r.ok) throw new Error("venue not found");
        return r.json() as Promise<VenueConfig>;
      })
      .then((data) => {
        const merged: VenueConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          features: { ...DEFAULT_CONFIG.features, ...data.features },
        };
        setConfig(merged);
        applyTheme(merged.primaryColor);
        localStorage.setItem("smokecraft_venue", venueId);
      })
      .catch(() => {
        // Fall back to defaults silently — never block the UI
      });
  }, []);

  return (
    <VenueContext.Provider value={config}>{children}</VenueContext.Provider>
  );
}

export function useVenue(): VenueConfig {
  return useContext(VenueContext);
}
