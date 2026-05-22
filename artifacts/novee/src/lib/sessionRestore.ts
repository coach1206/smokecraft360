import { GuestProfile, Phase } from "../context/GuestProfileContext";

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
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoint)); } catch { /* storage blocked */ }
};

export const restoreSession = (): SessionCheckpoint | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const checkpoint: SessionCheckpoint = JSON.parse(raw);
    if (Date.now() - checkpoint.timestamp > 4 * 60 * 60 * 1000) {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
      return null;
    }
    return checkpoint;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
};

export const fastForwardTo = (targetPhase: Phase, profile: GuestProfile): GuestProfile => {
  return {
    ...profile,
    phase: targetPhase,
  };
};
