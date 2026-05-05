export type UserRole =
  | "super_admin"
  | "venue_owner"
  | "manager"
  | "staff"
  | "brand_partner"
  | "customer";

export interface AuthUser {
  id:        string;
  name:      string;
  email:     string;
  role:      UserRole;
  score:     number;
  level:     "standard" | "elite";
  venueId:   string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user:  AuthUser;
}

const TOKEN_KEY = "smokecraft_auth_token";
const USER_KEY  = "smokecraft_auth_user";

import { getDeviceId } from "./deviceFingerprint";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Best-effort device id helper — re-exported so callers don't need a
 *  second import alongside `getAuthHeaders`. */
export function getDeviceIdHeader(): Record<string, string> {
  return { "X-Device-Id": getDeviceId() };
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function storeAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY,  JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    // Always tag requests with the device id so the server can update
    // last-seen + (when binding is enforced) verify the device row.
    "X-Device-Id":  getDeviceId(),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export const DASHBOARD_ROLES: UserRole[] = [
  "super_admin",
  "venue_owner",
  "manager",
];

export function canAccessDashboard(role: UserRole): boolean {
  return DASHBOARD_ROLES.includes(role);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export async function authRegister(
  name: string,
  email: string,
  password: string,
  role?: UserRole,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, email, password, role }),
  });
}

export async function authLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
}

export async function authMe(): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>("/api/auth/me", {
    headers: getAuthHeaders(),
  });
  return res.user;
}

// ── Kiosk device ID ───────────────────────────────────────────────────────────
const DEVICE_ID_KEY = "sc_device_id";

function ensureDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Bootstrap kiosk authentication.
 *
 * Calls POST /api/auth/kiosk to provision or refresh a device-scoped JWT.
 * Safe to call at any time — always replaces the stored token with a fresh one.
 * On network failure it is a no-op; the app continues in degraded mode.
 */
export async function bootstrapKioskAuth(): Promise<void> {
  try {
    const res = await fetch("/api/auth/kiosk", {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...getDeviceIdHeader() },
      body:    JSON.stringify({ deviceId: ensureDeviceId() }),
    });
    if (!res.ok) return;
    const data = await res.json() as AuthResponse;
    storeAuth(data.token, data.user);
  } catch {
    // Non-fatal — kiosk operates in degraded mode if network is down at boot
  }
}

/**
 * Fetch with automatic 401 token refresh and exponential-backoff retry.
 *
 * - On 401: silently re-bootstrap kiosk auth and retry once immediately.
 * - On network error: retry up to `retries` times (500ms → 1s → 2s backoff).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const mergedHeaders = { ...authHeaders, ...(init.headers as Record<string, string> ?? {}) };
      const res = await fetch(url, { ...init, headers: mergedHeaders });

      if (res.status === 401 && attempt === 0) {
        // Token expired — refresh and retry once immediately (no backoff)
        await bootstrapKioskAuth();
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}
