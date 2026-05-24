import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEV_CODE = "6810";

const ALL_TIERS = [
  "initiate",
  "novice",
  "enthusiast",
  "connoisseur",
  "aficionado",
  "master",
] as const;

export interface RouteSnapshot {
  lastRoute: string;
  scrollPosition: number;
  activeScreen: string;
  activeSection: string;
  formState: Record<string, unknown>;
  timestamp: number;
}

interface GoldenBoxState {
  developerMode: boolean;
  developerName: string;
  developerCode: string;
  devPanelOpen: boolean;
  skipAnimations: boolean;
  xp: number;
  unlockedLevels: string[];
  mentorSelection: string | null;
  routeSnapshot: RouteSnapshot;

  tickerSpeed: number;
  tickerPaused: boolean;
  tickerTestMessage: string | null;
  tickerTestCategory: string | null;

  enableDeveloperMode: (name: string, code: string) => boolean;
  disableDeveloperMode: () => void;
  setDevPanelOpen: (open: boolean) => void;
  addXP: (amount: number) => void;
  unlockAllLevels: () => void;
  resetSession: () => void;
  setSkipAnimations: (skip: boolean) => void;
  setMentorSelection: (mentor: string) => void;
  saveRoute: (snapshot: Partial<RouteSnapshot>) => void;
  setTickerSpeed: (speed: number) => void;
  setTickerPaused: (paused: boolean) => void;
  setTickerTestMessage: (msg: string | null, category?: string | null) => void;
}

const DEFAULT_SNAPSHOT: RouteSnapshot = {
  lastRoute: "/",
  scrollPosition: 0,
  activeScreen: "",
  activeSection: "",
  formState: {},
  timestamp: 0,
};

export const useGoldenBoxStore = create<GoldenBoxState>()(
  persist(
    (set) => ({
      developerMode: false,
      developerName: "",
      developerCode: "",
      devPanelOpen: false,
      skipAnimations: false,
      xp: 0,
      unlockedLevels: ["initiate"],
      mentorSelection: null,
      routeSnapshot: DEFAULT_SNAPSHOT,

      tickerSpeed: 1.0,
      tickerPaused: false,
      tickerTestMessage: null,
      tickerTestCategory: null,

      enableDeveloperMode: (name, code) => {
        if (code !== DEV_CODE) return false;
        set({ developerMode: true, developerName: name || "JC Collins", developerCode: code });
        return true;
      },

      disableDeveloperMode: () =>
        set({
          developerMode: false,
          developerName: "",
          developerCode: "",
          devPanelOpen: false,
        }),

      setDevPanelOpen: (open) => set({ devPanelOpen: open }),

      addXP: (amount) =>
        set((state) => {
          const newXP = state.xp + amount;
          const unlocked = [...state.unlockedLevels];
          const thresholds: [string, number][] = [
            ["novice", 1000],
            ["enthusiast", 5000],
            ["connoisseur", 12000],
            ["aficionado", 20000],
            ["master", 35000],
          ];
          for (const [tier, threshold] of thresholds) {
            if (newXP >= threshold && !unlocked.includes(tier)) unlocked.push(tier);
          }
          return { xp: newXP, unlockedLevels: unlocked };
        }),

      unlockAllLevels: () =>
        set({ unlockedLevels: [...ALL_TIERS], xp: 35000 }),

      resetSession: () =>
        set({
          xp: 0,
          unlockedLevels: ["initiate"],
          mentorSelection: null,
          routeSnapshot: DEFAULT_SNAPSHOT,
        }),

      setSkipAnimations: (skip) => set({ skipAnimations: skip }),
      setMentorSelection: (mentor) => set({ mentorSelection: mentor }),

      saveRoute: (snapshot) =>
        set((state) => ({
          routeSnapshot: {
            ...state.routeSnapshot,
            ...snapshot,
            timestamp: Date.now(),
          },
        })),

      setTickerSpeed: (speed) => set({ tickerSpeed: Math.max(0.2, Math.min(3.0, speed)) }),
      setTickerPaused: (paused) => set({ tickerPaused: paused }),
      setTickerTestMessage: (msg, category = null) =>
        set({ tickerTestMessage: msg, tickerTestCategory: category }),
    }),
    {
      name: "golden-box-store",
      partialize: (state) => ({
        developerMode: state.developerMode,
        developerName: state.developerName,
        developerCode: state.developerCode,
        skipAnimations: state.skipAnimations,
        xp: state.xp,
        unlockedLevels: state.unlockedLevels,
        mentorSelection: state.mentorSelection,
        routeSnapshot: state.routeSnapshot,
        tickerSpeed: state.tickerSpeed,
      }),
    },
  ),
);
