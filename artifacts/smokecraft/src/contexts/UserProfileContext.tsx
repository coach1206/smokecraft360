/**
 * UserProfileContext — persistent user profile that drives the weighted scene engine.
 *
 * Profile is stored in localStorage (`axiom_user_profile`) and hydrated on mount.
 * Any update is immediately written back so it survives page reloads on the kiosk.
 *
 * Fields
 * ──────
 * mood / intensity / setting  — mirror of the active MoodControls preset
 * lastOrderType               — set by LiveEngineController from the POS feed
 * venueType                   — "lounge" | "bar" | "club" (from VenueContext)
 * history                     — ordered list of past order types (most recent first)
 * sceneBoosts                 — admin-set per-scene weight overrides
 */

import React, {
  createContext, useCallback, useContext, useState,
} from "react";

// ── Profile shape ─────────────────────────────────────────────────────────────

export interface UserProfile {
  mood:          string;
  intensity:     string;
  setting:       string;
  lastOrderType: string | null;
  venueType:     string;           // "lounge" | "bar" | "club"
  history:       string[];         // order type history, newest first
  sceneBoosts:   Record<string, number>; // scene id → additive weight bonus
}

const DEFAULT_PROFILE: UserProfile = {
  mood:          "social",
  intensity:     "strong",
  setting:       "night",
  lastOrderType: null,
  venueType:     "lounge",
  history:       [],
  sceneBoosts:   {},
};

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "axiom_user_profile";

export function readProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function writeProfile(p: UserProfile): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

// ── Context ───────────────────────────────────────────────────────────────────

interface UserProfileContextValue {
  profile:       UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  recordOrder:   (orderType: string)             => void; // updates lastOrderType + history
  boostScene:    (sceneId: string, delta?: number) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(readProfile);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      writeProfile(next);
      return next;
    });
  }, []);

  const recordOrder = useCallback((orderType: string) => {
    setProfile(prev => {
      const next: UserProfile = {
        ...prev,
        lastOrderType: orderType,
        history: [orderType, ...prev.history].slice(0, 20), // keep last 20
      };
      writeProfile(next);
      return next;
    });
  }, []);

  const boostScene = useCallback((sceneId: string, delta = 2) => {
    setProfile(prev => {
      const next: UserProfile = {
        ...prev,
        sceneBoosts: {
          ...prev.sceneBoosts,
          [sceneId]: (prev.sceneBoosts[sceneId] ?? 0) + delta,
        },
      };
      writeProfile(next);
      return next;
    });
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile, recordOrder, boostScene }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used inside <UserProfileProvider>");
  return ctx;
}
