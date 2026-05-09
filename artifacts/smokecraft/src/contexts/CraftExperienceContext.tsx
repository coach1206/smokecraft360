/**
 * CraftExperienceContext — Hard-isolated per-craft runtime.
 *
 * Each craft (smoke / pour / brew / vape) gets its own isolated state bucket.
 * Switching crafts DESTROYS the previous session — no cross-contamination.
 *
 * Exposes:
 *   const { craftType, setCraft, sessionTags, addTag, removeTag,
 *           swipeHistory, recordSwipe, resetSession, purgeSessions } = useCraftExperience();
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export type CraftType = "smoke" | "pour" | "brew" | "vape";

export interface SwipeRecord {
  itemId:    string;
  itemTitle: string;
  action:    "add" | "skip";
  tags:      string[];
  ts:        number;
}

interface CraftSession {
  tags:         string[];
  swipeHistory: SwipeRecord[];
  startedAt:    number;
}

const EMPTY_SESSION = (): CraftSession => ({
  tags:         [],
  swipeHistory: [],
  startedAt:    Date.now(),
});

interface CraftExperienceValue {
  craftType:     CraftType | null;
  sessionTags:   string[];
  swipeHistory:  SwipeRecord[];
  sessionAge:    number;
  setCraft:      (type: CraftType) => void;
  addTag:        (tag: string) => void;
  removeTag:     (tag: string) => void;
  recordSwipe:   (record: SwipeRecord) => void;
  resetSession:  () => void;
  /** Sovereign Purge — clears ALL craft sessions and resets craftType to null */
  purgeSessions: () => void;
}

const CraftExperienceContext = createContext<CraftExperienceValue | null>(null);

export function CraftExperienceProvider({ children }: { children: ReactNode }) {
  const [craftType, setCraftType] = useState<CraftType | null>(null);
  const sessions = useRef<Map<CraftType, CraftSession>>(new Map());
  const [tick, setTick] = useState(0);

  const forceUpdate = useCallback(() => setTick(n => n + 1), []);

  const currentSession = craftType ? (sessions.current.get(craftType) ?? EMPTY_SESSION()) : null;

  const setCraft = useCallback((type: CraftType) => {
    setCraftType(prev => {
      if (prev && prev !== type) {
        sessions.current.delete(prev);
      }
      if (!sessions.current.has(type)) {
        sessions.current.set(type, EMPTY_SESSION());
      }
      return type;
    });
    forceUpdate();
  }, [forceUpdate]);

  const addTag = useCallback((tag: string) => {
    if (!craftType) return;
    const s = sessions.current.get(craftType) ?? EMPTY_SESSION();
    if (!s.tags.includes(tag)) {
      s.tags = [...s.tags, tag];
      sessions.current.set(craftType, s);
      forceUpdate();
    }
  }, [craftType, forceUpdate]);

  const removeTag = useCallback((tag: string) => {
    if (!craftType) return;
    const s = sessions.current.get(craftType) ?? EMPTY_SESSION();
    s.tags = s.tags.filter(t => t !== tag);
    sessions.current.set(craftType, s);
    forceUpdate();
  }, [craftType, forceUpdate]);

  const recordSwipe = useCallback((record: SwipeRecord) => {
    if (!craftType) return;
    const s = sessions.current.get(craftType) ?? EMPTY_SESSION();
    s.swipeHistory = [...s.swipeHistory, record];
    if (record.action === "add") {
      record.tags.forEach(t => { if (!s.tags.includes(t)) s.tags.push(t); });
    }
    sessions.current.set(craftType, s);
    forceUpdate();
  }, [craftType, forceUpdate]);

  const resetSession = useCallback(() => {
    if (!craftType) return;
    sessions.current.set(craftType, EMPTY_SESSION());
    forceUpdate();
  }, [craftType, forceUpdate]);

  /** Sovereign Purge — wipes every craft bucket and resets craftType to null */
  const purgeSessions = useCallback(() => {
    sessions.current.clear();
    setCraftType(null);
    forceUpdate();
  }, [forceUpdate]);

  const sessionAge = currentSession
    ? Math.floor((Date.now() - currentSession.startedAt) / 1000)
    : 0;

  return (
    <CraftExperienceContext.Provider value={{
      craftType,
      sessionTags:  currentSession?.tags ?? [],
      swipeHistory: currentSession?.swipeHistory ?? [],
      sessionAge,
      setCraft,
      addTag,
      removeTag,
      recordSwipe,
      resetSession,
      purgeSessions,
    }}>
      {children}
    </CraftExperienceContext.Provider>
  );
}

export function useCraftExperience() {
  const ctx = useContext(CraftExperienceContext);
  if (!ctx) throw new Error("useCraftExperience must be inside CraftExperienceProvider");
  return ctx;
}
