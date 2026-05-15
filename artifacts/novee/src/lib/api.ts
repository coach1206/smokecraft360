/**
 * Thin fetch wrapper for NOVEE OS API calls.
 * All paths go through the shared proxy at /api/kernel.
 */

export const BASE = "/api/kernel";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(String(err?.error ?? "Request failed")), { status: res.status, data: err });
  }
  if (res.status === 204 || res.status === 205) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}
