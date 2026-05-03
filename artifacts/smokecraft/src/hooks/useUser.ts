import { useCallback, useEffect, useRef, useState } from "react";
import {
  addScore,
  ELITE_THRESHOLD,
  loadProfile,
  recordBlendScore,
  removeBlend,
  removeExperience,
  saveBlend,
  saveExperience,
  saveProfile,
  setCigarProfile,
  UserProfile,
  SavedBlend,
  CigarProfile,
} from "../services/storage";
import type { RecommendParams, ProductResult } from "../services/api";

interface UseUserReturn {
  profile: UserProfile;
  isElite: boolean;
  justUnlockedElite: boolean;
  clearEliteUnlock: () => void;
  recordSession: () => void;
  recordSwipe: () => void;
  /** Record a blend score and return the previous best + isNewBest flag. */
  recordBlend: (score: number) => { previousBest: number; isNewBest: boolean };
  handleSaveExperience: (
    preferences: RecommendParams,
    recommendations: ProductResult[],
    pairings: ProductResult[],
  ) => void;
  handleRemoveExperience: (id: string) => void;
  handleSaveBlend: (blend: Omit<SavedBlend, "id" | "createdAt">) => void;
  handleRemoveBlend: (id: string) => void;
  updateName: (name: string) => void;
  /** Persist the guest's cigar shape + session length so returning visits
   *  pre-select the Structure step instead of asking again. */
  updateCigarProfile: (cigarProfile: CigarProfile) => void;
}

export function useUser(): UseUserReturn {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [justUnlockedElite, setJustUnlockedElite] = useState(false);
  const prevLevelRef = useRef<UserProfile["level"]>(profile.level);
  const wasElite = useRef(profile.level === "elite");

  const applyProfile = useCallback((next: UserProfile) => {
    const prevWasElite = wasElite.current;
    const nowElite = next.level === "elite";
    wasElite.current = nowElite;
    if (!prevWasElite && nowElite) setJustUnlockedElite(true);
    setProfile(next);
  }, []);

  useEffect(() => {
    prevLevelRef.current = profile.level;
  }, [profile.level]);

  const recordSession = useCallback(() => {
    applyProfile(addScore(loadProfile(), 10));
  }, [applyProfile]);

  const recordSwipe = useCallback(() => {
    applyProfile(addScore(loadProfile(), 2));
  }, [applyProfile]);

  const recordBlend = useCallback(
    (score: number) => {
      const { profile: next, previousBest, isNewBest } = recordBlendScore(loadProfile(), score);
      applyProfile(next);
      return { previousBest, isNewBest };
    },
    [applyProfile],
  );

  const handleSaveExperience = useCallback(
    (preferences: RecommendParams, recommendations: ProductResult[], pairings: ProductResult[]) => {
      applyProfile(saveExperience(loadProfile(), { preferences, recommendations, pairings }));
    },
    [applyProfile],
  );

  const handleRemoveExperience = useCallback(
    (id: string) => { applyProfile(removeExperience(loadProfile(), id)); },
    [applyProfile],
  );

  const handleSaveBlend = useCallback(
    (blend: Omit<SavedBlend, "id" | "createdAt">) => {
      applyProfile(saveBlend(loadProfile(), blend));
    },
    [applyProfile],
  );

  const handleRemoveBlend = useCallback(
    (id: string) => { applyProfile(removeBlend(loadProfile(), id)); },
    [applyProfile],
  );

  const updateName = useCallback(
    (name: string) => { applyProfile(saveProfile({ ...loadProfile(), name })); },
    [applyProfile],
  );

  const updateCigarProfile = useCallback(
    (cigarProfile: CigarProfile) => { applyProfile(setCigarProfile(loadProfile(), cigarProfile)); },
    [applyProfile],
  );

  const clearEliteUnlock = useCallback(() => setJustUnlockedElite(false), []);

  return {
    profile,
    isElite: profile.level === "elite",
    justUnlockedElite,
    clearEliteUnlock,
    recordSession,
    recordSwipe,
    recordBlend,
    handleSaveExperience,
    handleRemoveExperience,
    handleSaveBlend,
    handleRemoveBlend,
    updateName,
    updateCigarProfile,
  };
}

export { ELITE_THRESHOLD };
