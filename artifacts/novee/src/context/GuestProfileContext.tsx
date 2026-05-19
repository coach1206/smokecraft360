import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Phase =
  | "reentry"
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
  | "s4_results";

export interface GuestProfile {
  firstName: string;
  lastName: string;
  phone4: string;
  age: number | null;
  mentor: string | null;
  points: number;
  penalties: number;
  multiplier: number;
  cheatCodesUsed: number[];
  phase: Phase;
  soilN: number;
  soilK: number;
  soilPH: number;
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
}

const DEFAULT_PROFILE: GuestProfile = {
  firstName: "",
  lastName: "",
  phone4: "",
  age: null,
  mentor: null,
  points: 0,
  penalties: 0,
  multiplier: 1,
  cheatCodesUsed: [],
  phase: "reentry",
  soilN: 40,
  soilK: 35,
  soilPH: 6,
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
};

const STORAGE_KEY = "novee_guest_profile_v4";

interface GuestProfileCtx {
  profile: GuestProfile;
  setPhase: (p: Phase) => void;
  updateProfile: (partial: Partial<GuestProfile>) => void;
  addPoints: (n: number) => void;
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
      if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
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
    },
    [profile.phase],
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
