/**
 * craftSessionApi.ts — thin client wrappers for /api/craft-sessions.
 *
 * All calls are fire-and-forget safe: if the user isn't authenticated (no
 * stored token) or the server is unreachable, calls resolve silently and
 * the kiosk UX continues uninterrupted.
 */

import { getAuthHeaders, getStoredToken } from "./auth";

export interface CraftSessionState {
  id:                string;
  userId:            string;
  venueId:           string | null;
  craft:             string;
  buildId:           string | null;
  timerStartedAt:    string | null;
  timerDurationSecs: number;
  phase:             string;
  streakCount:       number;
  lastSavedAt:       string | null;
  expiresAt:         string | null;
  createdAt:         string;
}

function hasAuth(): boolean {
  try { return Boolean(getStoredToken()); } catch { return false; }
}

export async function fetchCraftSession(
  craft: string,
): Promise<CraftSessionState | null> {
  if (!hasAuth()) return null;
  try {
    const res = await fetch(
      `/api/craft-sessions?craft=${encodeURIComponent(craft)}`,
      { headers: getAuthHeaders() },
    );
    if (!res.ok) return null;
    const data = await res.json() as { session: CraftSessionState | null };
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function startCraftSession(
  craft: string,
  timerDurationSecs: number,
): Promise<CraftSessionState | null> {
  if (!hasAuth()) return null;
  try {
    const res = await fetch("/api/craft-sessions", {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body:    JSON.stringify({ craft, timerDurationSecs }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { session: CraftSessionState };
    return data.session;
  } catch {
    return null;
  }
}

export async function saveCraftSession(params: {
  craft:        string;
  phase?:       string;
  streakCount?: number;
  buildId?:     string;
  remainingMs?: number;
}): Promise<void> {
  if (!hasAuth()) return;
  try {
    await fetch("/api/craft-sessions", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body:    JSON.stringify(params),
    });
  } catch { /* fire-and-forget */ }
}

export async function deleteCraftSession(id: string): Promise<void> {
  if (!hasAuth()) return;
  try {
    await fetch(`/api/craft-sessions/${encodeURIComponent(id)}`, {
      method:  "DELETE",
      headers: getAuthHeaders(),
    });
  } catch { /* fire-and-forget */ }
}
