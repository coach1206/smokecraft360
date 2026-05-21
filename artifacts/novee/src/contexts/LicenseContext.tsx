/**
 * LicenseContext (NOVEE OS) — polls /api/license/status and exposes the
 * subscription state so any component can react.
 *
 * Re-checks every 5 minutes and on window focus to catch admin overrides
 * applied while a kiosk is sitting idle.
 *
 * Frontend enforcement is UX only — the server-side `requireActiveLicense`
 * middleware is the actual security boundary.
 */

import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";

export type LicenseStatus = "active" | "past_due" | "canceled" | "none";

export interface LicenseState {
  status:           LicenseStatus;
  plan:             "starter" | "pro" | "premium" | null;
  source:           "stripe" | "admin_override" | "unmetered";
  currentPeriodEnd: string | null;
  graceEndsAt:      string | null;
  daysRemaining:    number | null;
  adminOverride:    boolean;
  nextRetryAt:      string | null;
  canUpgrade:       boolean;
  loading:          boolean;
  offline:          boolean;
}

const DEFAULT_STATE: LicenseState = {
  status:           "active",
  plan:             null,
  source:           "unmetered",
  currentPeriodEnd: null,
  graceEndsAt:      null,
  daysRemaining:    null,
  adminOverride:    false,
  nextRetryAt:      null,
  canUpgrade:       false,
  loading:          true,
  offline:          false,
};

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const STORAGE_KEY      = "novee_license_cache";

const LicenseContext = createContext<LicenseState>(DEFAULT_STATE);

function readCache(): LicenseState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LicenseState;
    return { ...parsed, loading: false, offline: true };
  } catch { return null; }
}

function writeCache(state: LicenseState): void {
  try {
    const { loading: _l, offline: _o, ...persistable } = state;
    void _l; void _o;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch { /* ignore */ }
}

function getVenueIdFromStorage(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("venue") ?? localStorage.getItem("smokecraft_venue") ?? null;
  } catch { return null; }
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>(() => readCache() ?? DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const venueId = getVenueIdFromStorage();
      const url     = venueId
        ? `/api/license/status?venueId=${encodeURIComponent(venueId)}`
        : "/api/license/status";

      const token = localStorage.getItem("axiom_token") ?? "";

      try {
        const r = await fetch(url, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const data = await r.json() as Partial<Omit<LicenseState, "loading" | "offline">>;
        if (cancelled) return;
        const next: LicenseState = { ...DEFAULT_STATE, ...data, loading: false, offline: false };
        setState(next);
        writeCache(next);
      } catch {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, offline: true }));
      }
    }

    check();
    const id = window.setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <LicenseContext.Provider value={state}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseState {
  return useContext(LicenseContext);
}
