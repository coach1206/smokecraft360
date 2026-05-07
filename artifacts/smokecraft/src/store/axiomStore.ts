import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PrestigeRank = 'Novice' | 'Connoisseur' | 'Master' | 'Legend';

interface AxiomState {
  // PHASE 3: REVENUE
  occupancy: number;
  isDynamicActive: boolean;
  isMember: boolean;
  totalLift: number;

  // PHASE 4: PRESTIGE
  xp: number;
  rank: PrestigeRank;

  // PHASE 5: COMMAND
  isKioskLocked: boolean;

  // PHASE 6: TICKER COMMAND
  tickerMode:      "auto" | "manual";
  tickerBroadcast: string;

  // ACTIONS
  updateOccupancy:    (val: number) => void;
  toggleDynamic:      () => void;
  toggleMember:       () => void;
  addXP:              (val: number) => void;
  processSale:        (basePrice: number, finalPrice: number) => void;
  resetSession:       () => void;
  setTickerMode:      (mode: "auto" | "manual") => void;
  setTickerBroadcast: (msg: string) => void;
}

export const useAxiomStore = create<AxiomState>()(
  persist(
    (set) => ({
      occupancy:        50,
      isDynamicActive:  false,
      isMember:         false,
      totalLift:        0,
      xp:               0,
      rank:             'Novice',
      isKioskLocked:    true,
      tickerMode:       'auto',
      tickerBroadcast:  '',

      updateOccupancy: (val) => set({ occupancy: val }),

      toggleDynamic: () =>
        set((state) => ({ isDynamicActive: !state.isDynamicActive })),

      toggleMember: () =>
        set((state) => ({ isMember: !state.isMember })),

      addXP: (val) =>
        set((state) => {
          const newXP = state.xp + val;
          let newRank: PrestigeRank = 'Novice';
          if      (newXP >= 5000) newRank = 'Legend';
          else if (newXP >= 2000) newRank = 'Master';
          else if (newXP >= 500)  newRank = 'Connoisseur';
          return { xp: newXP, rank: newRank };
        }),

      processSale: (base, final) =>
        set((state) => ({ totalLift: state.totalLift + (final - base) })),

      resetSession: () =>
        set({ xp: 0, rank: 'Novice', totalLift: 0 }),

      setTickerMode:      (mode) => set({ tickerMode: mode }),
      setTickerBroadcast: (msg)  => set({ tickerBroadcast: msg }),
    }),
    { name: 'axiom-360-storage' },
  ),
);
