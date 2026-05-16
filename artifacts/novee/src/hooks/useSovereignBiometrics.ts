/**
 * useSovereignBiometrics — SARV (Sovereign Athletic Recovery Vault)
 *
 * Models real-time biometric ingestion parameters for high-performance
 * wearables (smart rings, bracelets, watches).
 *
 * Streams four vital signs:
 *   heartRate        — bpm
 *   oxygenSaturation — SpO2 %
 *   stressIndex      — 0–100 composite score
 *   coreTemperature  — °C
 *
 * Environmental trigger:
 *   When stressIndex > 60 OR heartRate > 95, dispatches an E.A.T. ambient
 *   event to dim the smart lounge to low amber and simulate ventilation /
 *   oxygen restoration (POST /api/intelligence/ambient/:venueId).
 *   Dispatches are debounced to one per DISPATCH_COOLDOWN_MS to prevent
 *   API saturation from high-frequency streaming updates.
 *
 * Usage:
 *   const bio = useSovereignBiometrics("venue-uuid");
 *   bio.streaming        // boolean — whether the interval is running
 *   bio.heartRate        // current simulated bpm
 *   bio.oxygenSaturation // SpO2 %
 *   bio.stressIndex      // 0–100
 *   bio.coreTemperature  // °C
 *   bio.lastDispatch     // ISO timestamp of last E.A.T. trigger | null
 *   bio.start()          // begin streaming
 *   bio.stop()           // halt streaming
 */

import { useState, useEffect, useRef, useCallback } from "react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// Threshold constants — kept named for tuning without touching hook logic
const STRESS_THRESHOLD   = 60;
const HR_THRESHOLD       = 95;
const DISPATCH_COOLDOWN_MS = 8_000; // minimum gap between E.A.T. dispatches

// Simulated baseline ranges (realistic wearable noise model)
const SIM = {
  heartRate:        { base: 68, amplitude: 18, period: 7_000  },
  oxygenSaturation: { base: 97, amplitude: 2.5, period: 11_000 },
  stressIndex:      { base: 35, amplitude: 32,  period: 9_000  },
  coreTemperature:  { base: 36.8, amplitude: 0.45, period: 13_000 },
} as const;

function sine(base: number, amplitude: number, period: number, t: number): number {
  return base + amplitude * Math.sin((2 * Math.PI * t) / period);
}

function round(v: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

export interface BiometricSnapshot {
  heartRate:        number;
  oxygenSaturation: number;
  stressIndex:      number;
  coreTemperature:  number;
  streaming:        boolean;
  lastDispatch:     string | null;
  start:            () => void;
  stop:             () => void;
}

export function useSovereignBiometrics(venueId: string): BiometricSnapshot {
  const [streaming,        setStreaming]        = useState(false);
  const [heartRate,        setHeartRate]        = useState<number>(SIM.heartRate.base);
  const [oxygenSaturation, setOxygenSaturation] = useState<number>(SIM.oxygenSaturation.base);
  const [stressIndex,      setStressIndex]      = useState<number>(SIM.stressIndex.base);
  const [coreTemperature,  setCoreTemperature]  = useState<number>(SIM.coreTemperature.base);
  const [lastDispatch,     setLastDispatch]      = useState<string | null>(null);

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDispatchTime = useRef<number>(0);
  const startTime        = useRef<number>(Date.now());

  // ── E.A.T. ambient dispatch ────────────────────────────────────────────────
  const dispatchAmbientRecovery = useCallback(async (
    hr: number, si: number,
  ): Promise<void> => {
    const now = Date.now();
    if (now - lastDispatchTime.current < DISPATCH_COOLDOWN_MS) return;
    lastDispatchTime.current = now;
    setLastDispatch(new Date().toISOString());

    try {
      await fetch(`${BASE}/api/intelligence/ambient/${venueId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId:  "low_amber_recovery",
          source:   "sarv_biometric_trigger",
          metadata: {
            heartRate:  hr,
            stressIndex: si,
            trigger:    hr > HR_THRESHOLD ? "elevated_heart_rate" : "elevated_stress",
            recovery: {
              lighting:     "dim_low_amber",
              ventilation:  "oxygen_restore_override",
              temperature:  "cool_ambient",
            },
          },
        }),
      });
    } catch { /* non-fatal — E.A.T. dispatch is best-effort */ }
  }, [venueId]);

  // ── Streaming tick ─────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const t = Date.now() - startTime.current;

    const hr = round(Math.min(180, Math.max(45, sine(
      SIM.heartRate.base, SIM.heartRate.amplitude, SIM.heartRate.period, t,
    ) + (Math.random() - 0.5) * 4), 3), 0);

    const spo2 = round(Math.min(100, Math.max(88, sine(
      SIM.oxygenSaturation.base, SIM.oxygenSaturation.amplitude, SIM.oxygenSaturation.period, t,
    ) + (Math.random() - 0.5) * 0.6)), 1);

    const si = round(Math.min(100, Math.max(0, sine(
      SIM.stressIndex.base, SIM.stressIndex.amplitude, SIM.stressIndex.period, t,
    ) + (Math.random() - 0.5) * 5)), 1);

    const temp = round(Math.min(39.5, Math.max(35.5, sine(
      SIM.coreTemperature.base, SIM.coreTemperature.amplitude, SIM.coreTemperature.period, t,
    ) + (Math.random() - 0.5) * 0.05)), 2);

    setHeartRate(hr);
    setOxygenSaturation(spo2);
    setStressIndex(si);
    setCoreTemperature(temp);

    // Environmental trigger check
    if (si > STRESS_THRESHOLD || hr > HR_THRESHOLD) {
      dispatchAmbientRecovery(hr, si).catch(() => {});
    }
  }, [dispatchAmbientRecovery]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (intervalRef.current) return;
    startTime.current = Date.now();
    setStreaming(true);
    intervalRef.current = setInterval(tick, 100); // 100ms = 10 Hz hardware tactility
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return {
    heartRate,
    oxygenSaturation,
    stressIndex,
    coreTemperature,
    streaming,
    lastDispatch,
    start,
    stop,
  };
}
