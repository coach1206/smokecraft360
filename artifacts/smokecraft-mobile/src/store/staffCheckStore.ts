/**
 * STAFF CHECK STORE
 * Active check state shared across FastBarTerminal, WaiterRitualMatrix,
 * and TransactionSplitConsole screens. Persists within a session.
 */

import { create } from "zustand";

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export interface CheckLineItem {
  lineId: string;
  assetId: string;
  name: string;
  priceCents: number;
  category: "bar" | "humidor" | "kitchen";
  isRitual: boolean;
}

export interface SeatState {
  seatId: string;
  label: string;
  assignedLineIds: string[];
}

interface StaffCheckStore {
  activeTableId: string;
  items: CheckLineItem[];
  seats: SeatState[];
  addItem: (item: Omit<CheckLineItem, "lineId">) => string;
  removeItem: (lineId: string) => void;
  clearCheck: () => void;
  setTable: (tableId: string) => void;
  assignToSeat: (lineId: string, seatId: string) => void;
  unassignFromSeat: (lineId: string) => void;
  resetSeats: (seatCount?: number) => void;
}

function makeSeat(n: number): SeatState {
  return { seatId: `seat-${n}`, label: `Seat ${n}`, assignedLineIds: [] };
}

export const useStaffCheckStore = create<StaffCheckStore>((set, get) => ({
  activeTableId: "T-01",
  items: [],
  seats: [makeSeat(1), makeSeat(2), makeSeat(3), makeSeat(4)],

  addItem: (item) => {
    const lineId = nanoid();
    set((s) => ({ items: [...s.items, { ...item, lineId }] }));
    return lineId;
  },

  removeItem: (lineId) => {
    set((s) => ({
      items: s.items.filter((i) => i.lineId !== lineId),
      seats: s.seats.map((seat) => ({
        ...seat,
        assignedLineIds: seat.assignedLineIds.filter((id) => id !== lineId),
      })),
    }));
  },

  clearCheck: () =>
    set({
      items: [],
      seats: [makeSeat(1), makeSeat(2), makeSeat(3), makeSeat(4)],
    }),

  setTable: (tableId) => set({ activeTableId: tableId }),

  assignToSeat: (lineId, seatId) => {
    set((s) => ({
      seats: s.seats.map((seat) => {
        if (seat.seatId === seatId) {
          if (seat.assignedLineIds.includes(lineId)) return seat;
          return { ...seat, assignedLineIds: [...seat.assignedLineIds, lineId] };
        }
        return {
          ...seat,
          assignedLineIds: seat.assignedLineIds.filter((id) => id !== lineId),
        };
      }),
    }));
  },

  unassignFromSeat: (lineId) => {
    set((s) => ({
      seats: s.seats.map((seat) => ({
        ...seat,
        assignedLineIds: seat.assignedLineIds.filter((id) => id !== lineId),
      })),
    }));
  },

  resetSeats: (seatCount = 4) =>
    set({
      seats: Array.from({ length: seatCount }, (_, i) => makeSeat(i + 1)),
    }),
}));
