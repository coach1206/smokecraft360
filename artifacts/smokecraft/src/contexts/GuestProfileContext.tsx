/**
 * GuestProfileContext — Sovereign guest identity for the Human Foundation.
 *
 * Wraps the app so any component can access:
 *   const { guestProfile, mentor, enroll, fastReturn, clearGuest,
 *           updateMemory, evolveMastery } = useGuestProfile();
 *
 * Includes mastery evolution (total_mastery → Golden Box unlock)
 * and new identity fields (gender, region, email, phoneLast4).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestProfile {
  id:                   string;
  publicId:             string;
  firstName:            string;
  lastInitial:          string;
  phoneLast4:           string | null;
  email:                string | null;
  gender:               string | null;
  region:               string | null;
  atmospherePreference: string | null;
  experienceLevel:      string | null;
  boldnessPreference:   string | null;
  assignedMentorId:     string | null;
  sessionCount:         number;
  totalMastery:         number;
  masteryTier:          string;
  lastSessionScore:     number;
  flavorHistory:        { tag: string; count: number; lastSeen: string }[];
}

export interface Mentor {
  id:         string;
  name:       string;
  craftType:  string;
  origin:     string;
  philosophy: string;
  style:      string;
  greeting:   string;
  traits:     string[];
}

export interface EnrollPayload {
  firstName:            string;
  lastInitial?:         string;  // optional — derived from lastName on the server if absent
  lastName?:            string;  // Universal Identity Key: Last Name + Phone Last 4
  phoneLast4?:          string;
  email?:               string;
  gender?:              string;
  region?:              string;
  atmospherePreference?: string;
  experienceLevel?:     string;
  boldnessPreference?:  string;
  craftType?:           "smoke" | "pour" | "brew" | "vape";
  mentorId?:            string;
}

export const MASTERY_TIER_LABELS: Record<string, string> = {
  explorer:    "Explorer",
  apprentice:  "Apprentice",
  craftsman:   "Craftsman",
  sommelier:   "Sommelier",
  grand_master: "Grand Master",
};

interface GuestProfileContextValue {
  guestProfile:  GuestProfile | null;
  mentor:        Mentor | null;
  isReturning:   boolean;
  enroll:        (payload: EnrollPayload) => Promise<void>;
  fastReturn:    (firstName: string, phoneLast4: string) => Promise<boolean>;
  clearGuest:    () => void;
  updateMemory:  (flavorHistory: GuestProfile["flavorHistory"]) => Promise<void>;
  evolveMastery: (sessionScore: number, opts?: {
    harmony?: number;
    complexity?: number;
    craftType?: string;
    venueId?: string;
  }) => Promise<{ masteryGain: number; newTier: string; newBadges: string[] } | null>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const GuestProfileContext = createContext<GuestProfileContextValue | null>(null);

const STORAGE_KEY = "smokecraft_guest";

function loadFromStorage(): { profile: GuestProfile; mentor: Mentor; isReturning: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(profile: GuestProfile, mentor: Mentor, isReturning: boolean) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, mentor, isReturning }));
  } catch {
    // sessionStorage unavailable — kiosk will re-enroll next load
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function GuestProfileProvider({ children }: { children: ReactNode }) {
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [mentor,       setMentor]       = useState<Mentor | null>(null);
  const [isReturning,  setIsReturning]  = useState(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setGuestProfile(stored.profile);
      setMentor(stored.mentor ?? null);
      setIsReturning(stored.isReturning ?? false);
    }
  }, []);

  const enroll = useCallback(async (payload: EnrollPayload) => {
    const res = await fetch("/api/enrollment/enroll", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Enrollment failed");
    const data = await res.json();
    setGuestProfile(data.profile);
    setMentor(data.mentor ?? null);
    setIsReturning(false);
    saveToStorage(data.profile, data.mentor, false);
  }, []);

  const fastReturn = useCallback(async (firstName: string, phoneLast4: string): Promise<boolean> => {
    const res = await fetch("/api/enrollment/return", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ firstName, phoneLast4 }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setGuestProfile(data.profile);
    setMentor(data.mentor ?? null);
    setIsReturning(true);
    saveToStorage(data.profile, data.mentor, true);
    return true;
  }, []);

  const clearGuest = useCallback(() => {
    setGuestProfile(null);
    setMentor(null);
    setIsReturning(false);
    sessionStorage.removeItem(STORAGE_KEY);
    // Also purge all NOVEE OS session keys so no mentor/craft/EEIS
    // data leaks between guests or after System Purge
    sessionStorage.removeItem("axiom_eeis_journey");
    sessionStorage.removeItem("axiom_experience_level");
    sessionStorage.removeItem("axiom_craft_build");
  }, []);

  const updateMemory = useCallback(async (
    flavorHistory: GuestProfile["flavorHistory"],
  ) => {
    if (!guestProfile) return;
    const res = await fetch(`/api/enrollment/${guestProfile.id}/memory`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ flavorHistory }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setGuestProfile(data.profile);
    if (mentor) saveToStorage(data.profile, mentor, isReturning);
  }, [guestProfile, mentor, isReturning]);

  const evolveMastery = useCallback(async (
    sessionScore: number,
    opts?: { harmony?: number; complexity?: number; craftType?: string; venueId?: string },
  ) => {
    if (!guestProfile) return null;
    try {
      const res = await fetch(`/api/mastery/${guestProfile.id}/evolve`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionScore, ...opts }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Update local state with new mastery values
      const updated: GuestProfile = {
        ...guestProfile,
        totalMastery:     data.profile.totalMastery ?? guestProfile.totalMastery,
        masteryTier:      data.profile.masteryTier  ?? guestProfile.masteryTier,
        lastSessionScore: sessionScore,
        sessionCount:     guestProfile.sessionCount + 1,
      };
      setGuestProfile(updated);
      if (mentor) saveToStorage(updated, mentor, isReturning);
      return {
        masteryGain: data.masteryGain ?? 0,
        newTier:     data.newTier ?? guestProfile.masteryTier,
        newBadges:   data.newBadges ?? [],
      };
    } catch {
      return null;
    }
  }, [guestProfile, mentor, isReturning]);

  return (
    <GuestProfileContext.Provider
      value={{ guestProfile, mentor, isReturning, enroll, fastReturn, clearGuest, updateMemory, evolveMastery }}
    >
      {children}
    </GuestProfileContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGuestProfile() {
  const ctx = useContext(GuestProfileContext);
  if (!ctx) throw new Error("useGuestProfile must be used inside GuestProfileProvider");
  return ctx;
}
