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

export interface BlendDesign {
  primaryColor: string;
  accentColor: string;
  emblem: string;
  textStyle: "serif" | "sans" | "italic";
}

export interface SavedBlend {
  id: string;
  createdAt: string;
  blendName: string;
  description: string;
  style: string;
  design: BlendDesign;
  cigarBaseName: string;
  pairingName: string;
  foodPairingName?: string;
}

/* ── Cigar Structure (vitola intelligence) ─────────────────────────────────
 * Captures the guest's PHYSICAL cigar preference so the engine can boost
 * products whose names match the chosen vitola (e.g. selecting "Toro" boosts
 * any product with "Toro" in its name). Ring gauge and burn time are
 * derived from the shape per the standard vitola conventions, so the kiosk
 * UI only asks for shape + session length. Persisted on UserProfile so
 * returning guests get the same physical match without re-asking.            */
export type CigarShape =
  | "robusto"   // 5×50, ~30–45 min, full-bodied fast impact
  | "corona"    // 5.5×42, balanced classic ~45 min
  | "toro"      // 6×50, longer smoother ~75 min
  | "churchill" // 7×47, slow burn ~90 min
  | "torpedo"   // 6×52 tapered head, focused draw
  | "belicoso"; // 5×50 short tapered, intense flavor

export type CigarSession = "quick" | "standard" | "extended" | "long";

export interface CigarProfile {
  shape:   CigarShape;
  session: CigarSession;
}

export interface UserProfile {
  name: string;
  level: "standard" | "elite";
  score: number;
  savedExperiences: SavedExperience[];
  savedBlends: SavedBlend[];
  /** Best blend score this user has ever earned (drives "Beat Your Last Score"). */
  bestBlendScore: number;
  /** Last 5 blend scores (most-recent first) for the evolution / streak surface. */
  recentBlendScores: number[];
  /** Total blends scored — drives sessions count. */
  blendsScored: number;
  /** Last selected cigar shape + session length. Optional — only set after
   *  the guest has gone through the Structure step at least once. Persists
   *  across sessions so returning guests skip re-entering preference.       */
  cigarProfile?: CigarProfile;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  level: "standard",
  score: 0,
  savedExperiences: [],
  savedBlends: [],
  bestBlendScore: 0,
  recentBlendScores: [],
  blendsScored: 0,
};

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as UserProfile;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      savedBlends:        parsed.savedBlends        ?? [],
      bestBlendScore:     parsed.bestBlendScore     ?? 0,
      recentBlendScores:  parsed.recentBlendScores  ?? [],
      blendsScored:       parsed.blendsScored       ?? 0,
      cigarProfile:       parsed.cigarProfile,           // optional, may be undefined
    };
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
  } catch { /* quota exceeded — fail silently */ }
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
  return addScore(
    { ...profile, savedExperiences: [entry, ...profile.savedExperiences] },
    5,
  );
}

export function removeExperience(profile: UserProfile, id: string): UserProfile {
  return saveProfile({
    ...profile,
    savedExperiences: profile.savedExperiences.filter((e) => e.id !== id),
  });
}

export function saveBlend(
  profile: UserProfile,
  blend: Omit<SavedBlend, "id" | "createdAt">,
): UserProfile {
  const entry: SavedBlend = {
    ...blend,
    id: `blend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  return addScore(
    { ...profile, savedBlends: [entry, ...profile.savedBlends] },
    15,
  );
}

export function removeBlend(profile: UserProfile, id: string): UserProfile {
  return saveProfile({
    ...profile,
    savedBlends: profile.savedBlends.filter((b) => b.id !== id),
  });
}

/**
 * Record a fresh blend score. Returns the updated profile plus the previous
 * best (so the reveal can show "Your best: 92" before any animation runs)
 * and an `isNewBest` flag so the reveal can swap to a celebration badge.
 *
 * Pure function: caller is responsible for re-rendering with the returned
 * profile. Persists via saveProfile so the next session reads the same best.
 */
export function recordBlendScore(
  profile: UserProfile,
  score: number,
): { profile: UserProfile; previousBest: number; isNewBest: boolean } {
  const previousBest = profile.bestBlendScore;
  const isNewBest    = score > previousBest;
  const next: UserProfile = {
    ...profile,
    bestBlendScore:    Math.max(previousBest, score),
    recentBlendScores: [score, ...profile.recentBlendScores].slice(0, 5),
    blendsScored:      profile.blendsScored + 1,
  };
  return { profile: saveProfile(next), previousBest, isNewBest };
}

/**
 * Persist the guest's cigar physical preference. Returning guests can be
 * pre-selected on the Structure step so they only re-confirm rather than
 * re-pick. Pure function: caller handles re-render with returned profile.
 */
export function setCigarProfile(profile: UserProfile, cigarProfile: CigarProfile): UserProfile {
  return saveProfile({ ...profile, cigarProfile });
}

export function resetProfile(): UserProfile {
  const fresh = { ...DEFAULT_PROFILE };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export { ELITE_THRESHOLD };
