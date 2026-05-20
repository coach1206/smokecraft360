import { GuestProfile, Phase } from "../contexts/NoveeGuestProfileContext";

const STORAGE_KEY = "novee_session_checkpoint";

export interface SessionCheckpoint {
  profile: GuestProfile;
  phase: Phase;
  timestamp: number;
}

export const saveSessionCheckpoint = (profile: GuestProfile, phase: Phase) => {
  const checkpoint: SessionCheckpoint = {
    profile,
    phase,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoint));
};

export const restoreSession = (): SessionCheckpoint | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const checkpoint: SessionCheckpoint = JSON.parse(raw);
    // Optional: check for expiration (e.g., 4 hours)
    if (Date.now() - checkpoint.timestamp > 4 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return checkpoint;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const fastForwardTo = (targetPhase: Phase, profile: GuestProfile): GuestProfile => {
  // In a real app, we might apply some summary XP/merit based on skipped phases
  return {
    ...profile,
    phase: targetPhase,
  };
};
