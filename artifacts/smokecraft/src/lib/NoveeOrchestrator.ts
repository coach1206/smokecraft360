/**
 * NOVEE OS 1.0: Central E.A.T. Router & Orchestrator
 * Authority: Profound Innovations LLC
 *
 * Connects the /gate to SmokeCraft Steps 2–13.
 * Singleton — import NoveeOrchestrator directly; no React context needed.
 */

import { NoveeRegistry } from "./NoveeRegistry";
import type { EATState }  from "@/components/CinematicLanding/EATController";
import type { RitualData } from "@/components/CinematicLanding/RitualConfig";

// ── Types ──────────────────────────────────────────────────────────────────

export interface OrchestratorState {
  mode:          "RITUAL" | "COMMAND_HUB" | "IDLE";
  step:          number;
  authenticated: boolean;
  environment:   string;
  asset:         string | null;
}

export interface GateResult {
  status:   "SOVEREIGN_ACTIVE" | "DENIED";
  redirect: string;
  step:     number;
}

export interface PhaseResult {
  status:   "MORPH_TRIGGERED" | "RITUAL_COMPLETE";
  nextStep: number;
  theme:    ReturnType<typeof NoveeRegistry.themeForStep>;
  redirect?: string;
}

// ── Singleton state ────────────────────────────────────────────────────────

const _state: OrchestratorState = {
  mode:          "IDLE",
  step:          2,
  authenticated: false,
  environment:   "Luxury Lounge",
  asset:         null,
};

// ── Orchestrator ───────────────────────────────────────────────────────────

const NoveeOrchestrator = {

  /**
   * Bridge the /gate PIN validation to the Ritual Entry (Step 2).
   * Called immediately when PinGate fires onSuccess.
   */
  handleGateSuccess(
    pinVerified: boolean,
    selectedAsset: string | null = null,
  ): GateResult {
    if (!pinVerified) {
      console.error("NOVEE Security Alert: Unauthenticated access attempt.");
      return { status: "DENIED", redirect: "/gate", step: _state.step };
    }

    _state.authenticated = true;
    _state.mode          = "RITUAL";
    _state.step          = 2;
    _state.asset         = selectedAsset;

    NoveeRegistry.applyTheme(2);

    return {
      status:   "SOVEREIGN_ACTIVE",
      redirect: "/smokecraft/step2",
      step:     2,
    };
  },

  /**
   * Synchronized next-step progression (Steps 2–13).
   * Called from onStepChange in RitualEngine.
   * Handles theme morph and ledger sync; returns a morph trigger descriptor
   * for the caller to act on (e.g. animate, redirect on RITUAL_COMPLETE).
   */
  executeNextPhase(
    step:       number,
    eatState?:  EATState,
    ritualData?: RitualData,
  ): PhaseResult {
    if (step >= 13) {
      _state.step = 13;
      _state.mode = "COMMAND_HUB";
      const theme = NoveeOrchestrator.syncEnvironment(13);
      return {
        status:   "RITUAL_COMPLETE",
        nextStep: 13,
        theme,
        redirect: "/command-hub",
      };
    }

    _state.step = step;
    const theme = NoveeOrchestrator.syncEnvironment(step);

    if (eatState && ritualData) {
      const last = eatState.ledger.at(-1);
      if (last) {
        const phase      = step <= 7 ? "ritual" : "ritual_post" as const;
        const stepIndex  = phase === "ritual" ? step - 2 : step - 9;
        NoveeRegistry.commitToLedger(eatState, phase, step, stepIndex, ritualData);
      }
    }

    return { status: "MORPH_TRIGGERED", nextStep: step, theme };
  },

  /**
   * Sync environmental theme adjustments to CSS variables for the given step.
   * Returns the resolved RitualTheme for callers that need it.
   */
  syncEnvironment(step: number) {
    NoveeRegistry.applyTheme(step);
    return NoveeRegistry.themeForStep(step);
  },

  /** Returns a snapshot of the current orchestrator state. */
  getState(): Readonly<OrchestratorState> {
    return { ..._state };
  },

  /** Reset to idle — call whenever the ritual ledger is cleared. */
  reset(): void {
    _state.mode          = "IDLE";
    _state.step          = 2;
    _state.authenticated = false;
    _state.asset         = null;
  },
};

export default NoveeOrchestrator;
