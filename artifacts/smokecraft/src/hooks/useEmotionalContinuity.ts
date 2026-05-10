/**
 * useEmotionalContinuity — React hook for the EmotionalContinuityEngine.
 *
 * Subscribes to emotionalStateStore and re-renders the consumer whenever the
 * emotional state changes. Exposes all mutation methods as stable callbacks.
 */

import { useState, useEffect, useCallback } from "react";
import {
  emotionalStateStore,
  type EmotionalState,
  type RitualPhase,
} from "@/lib/emotionalStateStore";

export interface UseEmotionalContinuityReturn {
  emotionalState:       EmotionalState;
  advancePhase:         (phase: RitualPhase) => void;
  recordFlavorSelection:(flavorId: string) => void;
  recordMentorSelection:(mentorName: string) => void;
  recordInteraction:    () => void;
  purge:                () => void;
}

export function useEmotionalContinuity(): UseEmotionalContinuityReturn {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(
    () => emotionalStateStore.getState(),
  );

  useEffect(() => emotionalStateStore.subscribe(setEmotionalState), []);

  const advancePhase = useCallback((phase: RitualPhase) => {
    emotionalStateStore.advancePhase(phase);
  }, []);

  const recordFlavorSelection = useCallback((flavorId: string) => {
    emotionalStateStore.recordFlavorSelection(flavorId);
  }, []);

  const recordMentorSelection = useCallback((mentorName: string) => {
    emotionalStateStore.recordMentorSelection(mentorName);
  }, []);

  const recordInteraction = useCallback(() => {
    emotionalStateStore.recordInteraction();
  }, []);

  const purge = useCallback(() => {
    emotionalStateStore.purge();
  }, []);

  return {
    emotionalState,
    advancePhase,
    recordFlavorSelection,
    recordMentorSelection,
    recordInteraction,
    purge,
  };
}
