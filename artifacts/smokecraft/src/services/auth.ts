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

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
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
  const headers: HeadersInit = { "Content-Type": "application/json" };
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
