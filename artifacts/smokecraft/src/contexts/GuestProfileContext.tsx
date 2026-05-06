/**
 * GuestProfileContext — persistent kiosk guest identity for the Human Foundation.
 *
 * Wraps the app so any component can:
 *   const { guestProfile, mentor, enroll, fastReturn, clearGuest } = useGuestProfile();
 *
 * State is mirrored to sessionStorage so it survives hot-reloads during dev
 * and soft page refreshes on kiosk screens, but resets when the tab closes
 * (appropriate for a shared kiosk device).
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
  atmospherePreference: string | null;
  experienceLevel:      string | null;
  boldnessPreference:   string | null;
  assignedMentorId:     string | null;
  sessionCount:         number;
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
  lastInitial:          string;
  phoneLast4?:          string;
  atmospherePreference?: string;
  experienceLevel?:     string;
  boldnessPreference?:  string;
  craftType?:           string;
}

interface GuestProfileContextValue {
  guestProfile:  GuestProfile | null;
  mentor:        Mentor | null;
  isReturning:   boolean;
  enroll:        (payload: EnrollPayload) => Promise<void>;
  fastReturn:    (firstName: string, phoneLast4: string) => Promise<boolean>;
  clearGuest:    () => void;
  updateMemory:  (flavorHistory: GuestProfile["flavorHistory"]) => Promise<void>;
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

  // Hydrate from sessionStorage on mount
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

  return (
    <GuestProfileContext.Provider
      value={{ guestProfile, mentor, isReturning, enroll, fastReturn, clearGuest, updateMemory }}
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
