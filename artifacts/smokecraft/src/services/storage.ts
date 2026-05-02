import type { ProductResult, RecommendParams } from "./api";

const STORAGE_KEY = "smokecraft_user_v1";
const ELITE_THRESHOLD = 50;

export interface SavedExperience {
  id: string;
  savedAt: string;
  preferences: RecommendParams;
  recommendations: ProductResult[];
  pairings: ProductResult[];
}

export interface UserProfile {
  name: string;
  level: "standard" | "elite";
  score: number;
  savedExperiences: SavedExperience[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  level: "standard",
  score: 0,
  savedExperiences: [],
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return JSON.parse(raw) as UserProfile;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): UserProfile {
  const updated: UserProfile = {
    ...profile,
    level: profile.score >= ELITE_THRESHOLD ? "elite" : "standard",
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* quota exceeded — fail silently */
  }
  return updated;
}

export function addScore(profile: UserProfile, points: number): UserProfile {
  return saveProfile({ ...profile, score: profile.score + points });
}

export function saveExperience(
  profile: UserProfile,
  experience: Omit<SavedExperience, "id" | "savedAt">,
): UserProfile {
  const entry: SavedExperience = {
    ...experience,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const updated = addScore(
    { ...profile, savedExperiences: [entry, ...profile.savedExperiences] },
    5,
  );
  return updated;
}

export function removeExperience(profile: UserProfile, id: string): UserProfile {
  return saveProfile({
    ...profile,
    savedExperiences: profile.savedExperiences.filter((e) => e.id !== id),
  });
}

export function resetProfile(): UserProfile {
  const fresh = { ...DEFAULT_PROFILE };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export { ELITE_THRESHOLD };
