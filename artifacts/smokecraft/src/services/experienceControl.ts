/**
 * experienceControl service — client-side API wrapper for Experience Control settings.
 */

import { getStoredToken } from "./auth";

export type PerformanceMode = "cinematic" | "balanced" | "low-power";
export type ExperienceCraftType = "smoke" | "pour" | "brew" | "vape";
export type VenueMode = "lounge" | "nightlife" | "premium" | "social" | "calm" | "event";

export interface ExperienceControlRow {
  id:                  string;
  venueId:             string | null;
  craftType:           string | null;
  atmosphereIntensity: number;
  particleDensity:     number;
  motionCalmness:      number;
  revealPacing:        number;
  soundVolume:         number;
  performanceMode:     PerformanceMode;
  venueMode:           VenueMode | null;
  createdAt:           string;
  updatedAt:           string;
}

export interface ExperienceControlData {
  global:   ExperienceControlRow | null;
  perCraft: Partial<Record<ExperienceCraftType, ExperienceControlRow>>;
}

// ── Default values (used when no DB settings exist) ───────────────────────────

export const DEFAULT_SETTINGS = {
  atmosphereIntensity: 70,
  particleDensity:     65,
  motionCalmness:      55,
  revealPacing:        70,
  soundVolume:         40,
  performanceMode:     "balanced" as PerformanceMode,
};

// ── API calls ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchExperienceControl(): Promise<ExperienceControlData> {
  const res = await fetch("/api/admin/experience-control", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load experience control settings");
  return res.json() as Promise<ExperienceControlData>;
}

export async function upsertExperienceControl(payload: {
  craftType?: ExperienceCraftType | null;
  atmosphereIntensity?: number;
  particleDensity?:     number;
  motionCalmness?:      number;
  revealPacing?:        number;
  soundVolume?:         number;
  performanceMode?:     PerformanceMode;
  venueMode?:           VenueMode | null;
}): Promise<ExperienceControlRow> {
  const res = await fetch("/api/admin/experience-control", {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Failed to save settings");
  }
  const data = await res.json() as { row: ExperienceControlRow };
  return data.row;
}

export async function patchExperienceControl(
  id: string,
  payload: Partial<Omit<ExperienceControlRow, "id" | "venueId" | "craftType" | "createdAt" | "updatedAt">>,
): Promise<ExperienceControlRow> {
  const res = await fetch(`/api/admin/experience-control/${id}`, {
    method:  "PATCH",
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Failed to update settings");
  }
  const data = await res.json() as { row: ExperienceControlRow };
  return data.row;
}
