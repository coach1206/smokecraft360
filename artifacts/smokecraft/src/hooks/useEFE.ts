/**
 * useEFE — React hook for the ExperienceFlowEngine.
 * Provides reactive step state + typed navigation helpers.
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ExperienceFlowEngine, type EFEStep } from "@/lib/experienceFlowEngine";

export interface EFEHook {
  step:             EFEStep;
  craftType:        string;
  isRitualUnlocked: boolean;
  advance:          () => void;
  back:             () => void;
  startCraft:       (craftType: string) => void;
  goTo:             (step: EFEStep) => void;
  completeSynchronization: () => void;
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

  const completeSynchronization = useCallback(() => {
    const route = ExperienceFlowEngine.completeSynchronization();
    setStep("SYNCHRONIZATION");
    navigate(route);
  }, [navigate]);

  return {
    step,
    craftType:        ExperienceFlowEngine.craftType,
    isRitualUnlocked: ExperienceFlowEngine.isRitualUnlocked(),
    advance,
    back,
    startCraft,
    goTo,
    completeSynchronization,
  };
}
