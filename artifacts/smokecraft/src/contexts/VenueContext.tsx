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

export type BackgroundKey =
  | "entry" | "pinLogin" | "dashboard" | "pos"
  | "analytics" | "devices" | "vendors" | "staff"
  | "experiences" | "settings" | "touchHome"
  | "adminTouch" | "venueTouch" | "vendorTouch"
  | "demoCenter" | "demoWalk"
  | "orders" | "inventory" | "rewards" | "campaigns";

export const DEFAULT_BACKGROUNDS: Record<BackgroundKey, string> = {
  entry:       "/images/lounge-bg.png",
  pinLogin:    "/images/lounge-bg.png",
  dashboard:   "/images/lounge-bg.jpg",
  pos:         "/images/cigar1.png",
  analytics:   "/images/scenes/reflective.jpg",
  devices:     "/images/scenes/bold.jpg",
  vendors:     "/images/cigar4.png",
  staff:       "/images/scenes/social.jpg",
  experiences: "/images/cigar1.png",
  settings:    "/images/lounge-bg.jpg",
  touchHome:   "/images/lounge-bg.jpg",
  adminTouch:  "/images/cigar3.png",
  venueTouch:  "/images/cigar.png",
  vendorTouch: "/images/cigar2.png",
  demoCenter:  "/images/lounge-bg.png",
  demoWalk:    "/images/lounge-bg.jpg",
  orders:      "/images/scenes/reflective.jpg",
  inventory:   "/images/cigar2.png",
  rewards:     "/images/scenes/relaxed.jpg",
  campaigns:   "/images/lounge-bg.jpg",
};

export const BACKGROUND_LABELS: Record<BackgroundKey, string> = {
  entry:       "Entry / Home",
  pinLogin:    "PIN Login",
  dashboard:   "Command Hub",
  pos:         "Axiom Commerce",
  analytics:   "Analytics",
  devices:     "Devices",
  vendors:     "Vendors",
  staff:       "Staff",
  experiences: "Experiences",
  settings:    "Settings",
  touchHome:   "Touchscreen Home",
  adminTouch:  "Admin Console",
  venueTouch:  "Venue Dashboard",
  vendorTouch: "Vendor Portal",
  demoCenter:  "Demo Center",
  demoWalk:    "Demo Walkthrough",
  orders:      "Orders",
  inventory:   "Inventory",
  rewards:     "Rewards",
  campaigns:   "Campaigns",
};

export interface VenueConfig {
  id:           string;
  logoText:     string;
  tagline:      string;
  primaryColor: string;
  logoUrl:      string | null;
  features:     VenueFeatures;
  backgrounds:  Partial<Record<BackgroundKey, string>>;
}

interface VenueContextValue {
  config: VenueConfig;
  updateBranding: (patch: Partial<Pick<VenueConfig, "logoText" | "tagline" | "primaryColor" | "logoUrl">>) => void;
  updateBackground: (key: BackgroundKey, url: string) => void;
  getBackground: (key: BackgroundKey) => string;
}

const DEFAULT_CONFIG: VenueConfig = {
  id:           "default",
  logoText:     "SmokeCraft 360",
  tagline:      "Connoisseur's Companion",
  primaryColor: "#D4AF37",
  logoUrl:      null,
  features: {
    demoMode:    true,
    bandCreator: true,
    foodPairing: true,
    eliteMode:   true,
    vault:       true,
  },
  backgrounds:  {},
};

const VenueContext = createContext<VenueContextValue>({
  config: DEFAULT_CONFIG,
  updateBranding: () => {},
  updateBackground: () => {},
  getBackground: (key) => DEFAULT_BACKGROUNDS[key],
});

/** Apply venue primary color as a CSS custom property so all gold accents
 *  can be overridden for white-label deployments. */
function applyTheme(color: string): void {
  document.documentElement.style.setProperty("--venue-primary", color);
}

function loadLocalBackgrounds(venueId: string): Partial<Record<BackgroundKey, string>> {
  try {
    const raw = localStorage.getItem(`venue_backgrounds_${venueId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function VenueProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<VenueConfig>(() => ({
    ...DEFAULT_CONFIG,
    backgrounds: loadLocalBackgrounds("default"),
  }));

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
        const localBgs = loadLocalBackgrounds(venueId);
        const merged: VenueConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          features: { ...DEFAULT_CONFIG.features, ...data.features },
          backgrounds: { ...(data.backgrounds ?? {}), ...localBgs },
        };
        setConfig(merged);
        applyTheme(merged.primaryColor);
        localStorage.setItem("smokecraft_venue", venueId);
      })
      .catch(() => {});
  }, []);

  function updateBranding(patch: Partial<Pick<VenueConfig, "logoText" | "tagline" | "primaryColor" | "logoUrl">>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.primaryColor) applyTheme(patch.primaryColor);
      return next;
    });
  }

  function updateBackground(key: BackgroundKey, url: string) {
    setConfig((prev) => {
      const next = { ...prev, backgrounds: { ...prev.backgrounds, [key]: url || undefined } };
      if (!url) delete next.backgrounds[key];
      try {
        const stored = JSON.parse(localStorage.getItem(`venue_backgrounds_${prev.id}`) ?? "{}");
        if (url) stored[key] = url; else delete stored[key];
        localStorage.setItem(`venue_backgrounds_${prev.id}`, JSON.stringify(stored));
      } catch { /* ignore */ }
      return next;
    });
  }

  function getBackground(key: BackgroundKey): string {
    return config.backgrounds[key] || DEFAULT_BACKGROUNDS[key];
  }

  return (
    <VenueContext.Provider value={{ config, updateBranding, updateBackground, getBackground }}>{children}</VenueContext.Provider>
  );
}

export function useVenue(): VenueConfig {
  return useContext(VenueContext).config;
}

export function useVenueContext(): VenueContextValue {
  return useContext(VenueContext);
}
