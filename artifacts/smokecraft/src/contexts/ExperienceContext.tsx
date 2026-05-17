/**
 * ExperienceContext — Central Intelligence State
 *
 * Typed implementation of the NOVEE OS Master Blueprint experience schema.
 * Manages active craft module, guest profile, session data, inventory status,
 * and the EEIS per-craft hidden intelligence mode.
 *
 * Actions:
 *   SET_MODULE          — switch active craft module
 *   UPDATE_PROFILE      — merge partial guest profile fields
 *   UPDATE_SESSION      — merge partial session data
 *   SET_INVENTORY_STATUS — update inventory sync state
 *   TOGGLE_EEIS         — flip the per-craft intelligence overlay
 *   SOVEREIGN_PURGE     — absolute reset (JC security wipe)
 *
 * Usage:
 *   const { state, dispatch } = useExperience();
 *   dispatch({ type: "SET_MODULE", payload: "smoke" });
 *   dispatch({ type: "TOGGLE_EEIS" });
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Module          = "portal" | "smoke" | "pour" | "brew" | "vape" | "wine";
export type InventoryStatus = "synced" | "stale" | "error";

export interface GuestProfile {
  name:        string;
  preferences: string[];
  history:     string[];
}

export interface SessionData {
  currentRound: number;
  score:        number;
  pairings:     string[];
}

export interface ExperienceState {
  activeModule:    Module;
  guestProfile:    GuestProfile;
  sessionData:     SessionData;
  inventoryStatus: InventoryStatus;
  eeisMode:        boolean;
}

export type ExperienceAction =
  | { type: "SET_MODULE";           payload: Module }
  | { type: "UPDATE_PROFILE";       payload: Partial<GuestProfile> }
  | { type: "UPDATE_SESSION";       payload: Partial<SessionData> }
  | { type: "SET_INVENTORY_STATUS"; payload: InventoryStatus }
  | { type: "TOGGLE_EEIS" }
  | { type: "SOVEREIGN_PURGE" };

// ── Initial state ──────────────────────────────────────────────────────────────

const initialState: ExperienceState = {
  activeModule:    "portal",
  guestProfile:    { name: "", preferences: [], history: [] },
  sessionData:     { currentRound: 1, score: 0, pairings: [] },
  inventoryStatus: "synced",
  eeisMode:        false,
};

// ── Reducer ────────────────────────────────────────────────────────────────────

function experienceReducer(
  state: ExperienceState,
  action: ExperienceAction,
): ExperienceState {
  switch (action.type) {
    case "SET_MODULE":
      return { ...state, activeModule: action.payload };

    case "UPDATE_PROFILE":
      return {
        ...state,
        guestProfile: { ...state.guestProfile, ...action.payload },
      };

    case "UPDATE_SESSION":
      return {
        ...state,
        sessionData: { ...state.sessionData, ...action.payload },
      };

    case "SET_INVENTORY_STATUS":
      return { ...state, inventoryStatus: action.payload };

    case "TOGGLE_EEIS":
      return { ...state, eeisMode: !state.eeisMode };

    case "SOVEREIGN_PURGE":
      return { ...initialState }; // Absolute reset — JC security wipe

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface ExperienceContextValue {
  state:    ExperienceState;
  dispatch: React.Dispatch<ExperienceAction>;
  // Convenience helpers
  setModule:           (m: Module)                     => void;
  updateProfile:       (p: Partial<GuestProfile>)      => void;
  updateSession:       (s: Partial<SessionData>)       => void;
  setInventoryStatus:  (v: InventoryStatus)             => void;
  toggleEeis:          ()                               => void;
  sovereignPurge:      ()                               => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(experienceReducer, initialState);

  const setModule          = useCallback((m: Module)                => dispatch({ type: "SET_MODULE",           payload: m }), []);
  const updateProfile      = useCallback((p: Partial<GuestProfile>) => dispatch({ type: "UPDATE_PROFILE",       payload: p }), []);
  const updateSession      = useCallback((s: Partial<SessionData>)  => dispatch({ type: "UPDATE_SESSION",       payload: s }), []);
  const setInventoryStatus = useCallback((v: InventoryStatus)        => dispatch({ type: "SET_INVENTORY_STATUS", payload: v }), []);
  const toggleEeis         = useCallback(()                          => dispatch({ type: "TOGGLE_EEIS" }), []);
  const sovereignPurge     = useCallback(()                          => dispatch({ type: "SOVEREIGN_PURGE" }), []);

  return (
    <ExperienceContext.Provider value={{
      state,
      dispatch,
      setModule,
      updateProfile,
      updateSession,
      setInventoryStatus,
      toggleEeis,
      sovereignPurge,
    }}>
      {children}
    </ExperienceContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be inside ExperienceProvider");
  return ctx;
}
