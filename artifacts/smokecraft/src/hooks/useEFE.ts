/**
 * useEFE — React hook for the ExperienceFlowEngine (8-step SmokeCraftFlow).
 * Provides reactive step state + typed navigation helpers.
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ExperienceFlowEngine, type EFEStep } from "@/lib/experienceFlowEngine";

export interface EFEHook {
  step:             EFEStep;
  craftType:        string;
  isRitualUnlocked: boolean;
  isHudAllowed:     boolean;
  isLockdown:       boolean;
  advance:          () => void;
  back:             () => void;
  startCraft:       (craftType: string) => void;
  goTo:             (step: EFEStep) => void;
  enterChallenge:   () => void;
  enterSynchronization:    () => void;
  completeSynchronization: () => void;
  completeLegacyHandoff:   () => void;
}

export function useEFE(): EFEHook {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<EFEStep>(() => ExperienceFlowEngine.currentStep);

  const advance = useCallback(() => {
    const route = ExperienceFlowEngine.advance();
    setStep(ExperienceFlowEngine.currentStep);
    navigate(route);
  }, [navigate]);

  const back = useCallback(() => {
    const route = ExperienceFlowEngine.back();
    setStep(ExperienceFlowEngine.currentStep);
    navigate(route);
  }, [navigate]);

  const startCraft = useCallback((craftType: string) => {
    const route = ExperienceFlowEngine.startCraft(craftType);
    setStep("CINEMATIC_INTRO");
    navigate(route);
  }, [navigate]);

  const goTo = useCallback((s: EFEStep) => {
    ExperienceFlowEngine.goTo(s);
    setStep(s);
    navigate(ExperienceFlowEngine.getRoute(s));
  }, [navigate]);

  const enterChallenge = useCallback(() => {
    const route = ExperienceFlowEngine.enterChallenge();
    setStep("CHALLENGE_SELECTION");
    navigate(route);
  }, [navigate]);

  const enterSynchronization = useCallback(() => {
    const route = ExperienceFlowEngine.enterSynchronization();
    setStep("SYNCHRONIZATION");
    navigate(route);
  }, [navigate]);

  const completeSynchronization = useCallback(() => {
    const route = ExperienceFlowEngine.completeSynchronization();
    setStep("SWIPE_RITUAL");
    navigate(route);
  }, [navigate]);

  // completeLegacyHandoff — navigation is handled by ExperiencePage
  // (route includes sessionId which EFE does not own)
  const completeLegacyHandoff = useCallback(() => {
    ExperienceFlowEngine.completeLegacy();
    setStep("LEGACY_HANDOFF");
  }, []);

  return {
    step,
    craftType:               ExperienceFlowEngine.craftType,
    isRitualUnlocked:        ExperienceFlowEngine.isRitualUnlocked(),
    isHudAllowed:            ExperienceFlowEngine.isHudAllowed(),
    isLockdown:              ExperienceFlowEngine.currentStep === "LEGACY_HANDOFF",
    advance,
    back,
    startCraft,
    goTo,
    enterChallenge,
    enterSynchronization,
    completeSynchronization,
    completeLegacyHandoff,
  };
}
