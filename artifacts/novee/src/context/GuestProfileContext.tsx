import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { saveSessionCheckpoint } from "../lib/sessionRestore";
import { trackEvent } from "../lib/analyticsEngine";
import { calcDifficultyTier } from "../lib/xpEngine";

export type Phase =
  | "crafthub"
  | "eat_dashboard"
  | "executive_command"
  | "pairing_view"
  | "lounge_view"
  | "profile_view"
  | "settings_view"
  | "s1_demo"
  | "s1_rules"
  | "s1_leaderboard"
  | "s1_mentor"
  | "s1_seed"
  | "s1_quiz"
  | "s1_posgate"
  | "s2_terroir"
  | "s2_voucher"
  | "s3_spiritquiz"
  | "s3_sensorytrap"
  | "s3_leafsliders"
  | "s4_vitola"
  | "s4_designstudio"
  | "s4_results"
  | "s1_country_select"
  | "s1_soil_calibration"
  | "s1_pilon_game"
  | "control-chamber"
  | "dev_console"
  | "coach_help";

export type DifficultyTier = "beginner" | "apprentice" | "blender" | "master" | "architect";
export type SessionType = "live" | "demo" | "investor" | "qa" | "presentation";

export interface PairingEntry {
  cigar: string;
  drink: string | null;
  food: string | null;
  xp: number;
}

export interface GuestProfile {
  firstName: string;
  lastName: string;
  phone4: string;
  age: number | null;
  mentor: string | null;
  points: number;
  merit: number;
  penalties: number;
  multiplier: number;
  cheatCodesUsed: number[];
  phase: Phase;
  soilN: number;
  soilK: number;
  soilPH: number;
  soilMoisture: number;
  volado: number;
  seco: number;
  ligero: number;
  vitola: string | null;
  capCut: string | null;
  woodGrain: string | null;
  goldFoil: boolean;
  receiptCode: string;
  voucherCode: string;
  quizScore: number;
  visitPairings: number;
  difficultyTier: DifficultyTier;
  sessionType: SessionType;
  blendCountry1: string | null;
  blendCountry2: string | null;
  pairingHistory: PairingEntry[];
  skipTokens: number;
  wrapper: string | null;
  flavorProfile: string[];
}

const DEFAULT_PROFILE: GuestProfile = {
  firstName: "",
  lastName: "",
  phone4: "",
  age: null,
  mentor: null,
  points: 0,
  merit: 0,
  penalties: 0,
  multiplier: 1,
  cheatCodesUsed: [],
  phase: "crafthub",
  soilN: 40,
  soilK: 35,
  soilPH: 6,
  soilMoisture: 60,
  volado: 30,
  seco: 40,
  ligero: 30,
  vitola: null,
  capCut: null,
  woodGrain: null,
  goldFoil: false,
  receiptCode: "",
  voucherCode: "",
  quizScore: 0,
  visitPairings: 0,
  difficultyTier: "beginner",
  sessionType: "live",
  blendCountry1: null,
  blendCountry2: null,
  pairingHistory: [],
  skipTokens: 0,
  wrapper: null,
  flavorProfile: [],
};

const STORAGE_KEY = "novee_guest_profile_v6";

interface GuestProfileCtx {
  profile: GuestProfile;
  setPhase: (p: Phase) => void;
  updateProfile: (partial: Partial<GuestProfile>) => void;
  addPoints: (n: number) => void;
  addMerit: (delta: number) => void;
  applyPenalty: (n: number) => void;
  applyCheatCode: (code: 1 | 2 | 3) => void;
  resetProfile: () => void;
  history: Phase[];
  goBack: () => void;
}

const Ctx = createContext<GuestProfileCtx | null>(null);

export function GuestProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<GuestProfile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Always start at crafthub on fresh load — kiosk resets to hub every session
        return { ...DEFAULT_PROFILE, ...JSON.parse(raw), phase: "crafthub" };
      }
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [history, setHistory] = useState<Phase[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const updateProfile = useCallback((partial: Partial<GuestProfile>) => {
    setProfile(prev => ({ ...prev, ...partial }));
  }, []);

  const setPhase = useCallback(
    (p: Phase) => {
      setHistory(prev => [...prev, profile.phase]);
      setProfile(prev => ({ ...prev, phase: p }));
      saveSessionCheckpoint(profile, p);
      trackEvent({
        type: "phase_enter",
        phase: p,
        data: { from: profile.phase },
        timestamp: Date.now(),
        sessionType: profile.sessionType,
      });
    },
    [profile.phase, profile.sessionType, profile],
  );

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      setProfile(p => ({ ...p, phase: last }));
      return next;
    });
  }, []);

  const addPoints = useCallback((n: number) => {
    setProfile(prev => ({
      ...prev,
      points: prev.points + Math.round(n * prev.multiplier),
    }));
  }, []);

  const addMerit = useCallback((delta: number) => {
    setProfile(prev => {
      const newMerit = Math.max(0, prev.merit + delta);
      const newTier  = calcDifficultyTier(newMerit);
      const newSkip  = delta >= 15 && prev.pairingHistory.filter(p => p.xp >= 20).length >= 3
        ? prev.skipTokens + 1
        : prev.skipTokens;
      return { ...prev, merit: newMerit, difficultyTier: newTier, skipTokens: newSkip };
    });
  }, []);

  const applyPenalty = useCallback((n: number) => {
    setProfile(prev => ({
      ...prev,
      points: Math.max(0, prev.points - n),
      penalties: prev.penalties + n,
    }));
  }, []);

  const applyCheatCode = useCallback((code: 1 | 2 | 3) => {
    setProfile(prev => {
      if (prev.cheatCodesUsed.includes(code)) return prev;
      const mult = code === 1 ? 2 : code === 2 ? 3 : 5;
      const purge = code === 3;
      return {
        ...prev,
        points: Math.round(prev.points * mult) + (purge ? prev.penalties : 0),
        penalties: purge ? 0 : prev.penalties,
        multiplier: mult,
        cheatCodesUsed: [...prev.cheatCodesUsed, code],
      };
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <Ctx.Provider
      value={{
        profile,
        setPhase,
        updateProfile,
        addPoints,
        addMerit,
        applyPenalty,
        applyCheatCode,
        resetProfile,
        history,
        goBack,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGuest must be inside GuestProfileProvider");
  return ctx;
}
