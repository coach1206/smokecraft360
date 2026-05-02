import { useCallback, useEffect, useRef, useState } from "react";
import {
  addScore,
  ELITE_THRESHOLD,
  loadProfile,
  removeExperience,
  saveExperience,
  saveProfile,
  UserProfile,
  SavedExperience,
} from "../services/storage";
import type { RecommendParams, ProductResult } from "../services/api";

interface UseUserReturn {
  profile: UserProfile;
  isElite: boolean;
  justUnlockedElite: boolean;
  clearEliteUnlock: () => void;
  recordSession: () => void;
  recordSwipe: () => void;
  handleSaveExperience: (
    preferences: RecommendParams,
    recommendations: ProductResult[],
    pairings: ProductResult[],
  ) => void;
  handleRemoveExperience: (id: string) => void;
  updateName: (name: string) => void;
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

    if (!prevWasElite && nowElite) {
      setJustUnlockedElite(true);
    }
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

  const handleSaveExperience = useCallback(
    (
      preferences: RecommendParams,
      recommendations: ProductResult[],
      pairings: ProductResult[],
    ) => {
      const current = loadProfile();
      applyProfile(saveExperience(current, { preferences, recommendations, pairings }));
    },
    [applyProfile],
  );

  const handleRemoveExperience = useCallback(
    (id: string) => {
      applyProfile(removeExperience(loadProfile(), id));
    },
    [applyProfile],
  );

  const updateName = useCallback(
    (name: string) => {
      applyProfile(saveProfile({ ...loadProfile(), name }));
    },
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
    handleSaveExperience,
    handleRemoveExperience,
    updateName,
  };
}

export { ELITE_THRESHOLD };
