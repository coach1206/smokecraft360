/**
 * Tests for the venue background image cache layer and its integration points.
 *
 * Suite 1 — clearAllVenueBackgroundCaches()
 *   Verifies the utility removes every venue_backgrounds_* key and leaves
 *   all other localStorage entries untouched.
 *
 * Suite 2 — AuthContext: logout path
 *   Verifies that clearAllVenueBackgroundCaches is called before clearAuth()
 *   runs, preventing a stale venue background from surviving a session reset.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Shared mutable venue id ─────────────────────────────────────────────────
let mockVenueId = "venue-alpha";

// Wrap clearAllVenueBackgroundCaches in a spy while keeping the real
// implementation so Suite 1 (localStorage correctness) and Suite 2
// (call-order) both work.
vi.mock("@/contexts/VenueContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/contexts/VenueContext")>();
  return {
    ...actual,
    useVenue: () => ({ id: mockVenueId }),
    useVenueContext: () => ({}),
    clearAllVenueBackgroundCaches: vi.fn(actual.clearAllVenueBackgroundCaches),
  };
});

vi.mock("@/contexts/KernelModeContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/contexts/KernelModeContext")>();
  return {
    ...actual,
    clearAllKernelModeCache: vi.fn(actual.clearAllKernelModeCache),
  };
});

// Keep real auth helpers; wrap clearAuth in a spy; nullify the stored-token
// getter so the mount-time authMe effect never fires by default.
vi.mock("@/services/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/auth")>();
  return {
    ...actual,
    clearAuth: vi.fn(actual.clearAuth),
    getStoredToken: vi.fn(() => null),
    getStoredUser: vi.fn(() => null),
    authLogin: vi.fn(),
    authRegister: vi.fn(),
    authMe: vi.fn().mockRejectedValue(new Error("no server")),
  };
});

// ─── Suite 1: clearAllVenueBackgroundCaches ───────────────────────────────────

describe("clearAllVenueBackgroundCaches", () => {
  let clearAllVenueBackgroundCaches: () => void;

  beforeEach(async () => {
    localStorage.clear();
    const mod = await import("@/contexts/VenueContext");
    clearAllVenueBackgroundCaches = mod.clearAllVenueBackgroundCaches;
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("removes every venue_backgrounds_* key", () => {
    localStorage.setItem("venue_backgrounds_venue-a", '{"entry":"/a.jpg"}');
    localStorage.setItem("venue_backgrounds_venue-b", '{"pos":"/b.png"}');
    localStorage.setItem(
      "venue_backgrounds_00000000-0000-0000-0000-000000000000",
      "{}",
    );

    clearAllVenueBackgroundCaches();

    expect(localStorage.getItem("venue_backgrounds_venue-a")).toBeNull();
    expect(localStorage.getItem("venue_backgrounds_venue-b")).toBeNull();
    expect(
      localStorage.getItem(
        "venue_backgrounds_00000000-0000-0000-0000-000000000000",
      ),
    ).toBeNull();
  });

  it("leaves non-venue_backgrounds keys intact", () => {
    localStorage.setItem("venue_backgrounds_venue-a", '{"entry":"/a.jpg"}');
    localStorage.setItem("smokecraft_auth_token", "jwt.tok.here");
    localStorage.setItem("user_preferences", '{"theme":"dark"}');
    localStorage.setItem("smokecraft_venue", "venue-xyz");
    localStorage.setItem("kernel_mode_venue-a", "sovereign");

    clearAllVenueBackgroundCaches();

    expect(localStorage.getItem("smokecraft_auth_token")).toBe("jwt.tok.here");
    expect(localStorage.getItem("user_preferences")).toBe('{"theme":"dark"}');
    expect(localStorage.getItem("smokecraft_venue")).toBe("venue-xyz");
    expect(localStorage.getItem("kernel_mode_venue-a")).toBe("sovereign");
  });

  it("does not throw when localStorage is empty", () => {
    expect(() => clearAllVenueBackgroundCaches()).not.toThrow();
  });

  it("does not throw when there are no venue_backgrounds_* keys", () => {
    localStorage.setItem("some_other_key", "value");
    expect(() => clearAllVenueBackgroundCaches()).not.toThrow();
    expect(localStorage.getItem("some_other_key")).toBe("value");
  });

  it("removes all venue_backgrounds keys when interleaved with unrelated keys", () => {
    localStorage.setItem("venue_backgrounds_abc", '{"entry":"/abc.jpg"}');
    localStorage.setItem("unrelated", "keep-me");
    localStorage.setItem("venue_backgrounds_def", '{"pos":"/def.png"}');
    localStorage.setItem("other", "also-keep");

    clearAllVenueBackgroundCaches();

    expect(localStorage.getItem("venue_backgrounds_abc")).toBeNull();
    expect(localStorage.getItem("venue_backgrounds_def")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep-me");
    expect(localStorage.getItem("other")).toBe("also-keep");
  });

  it("removes multiple venue background cache keys in a single call", () => {
    const ids = ["v1", "v2", "v3", "v4", "v5"];
    ids.forEach((id) =>
      localStorage.setItem(`venue_backgrounds_${id}`, JSON.stringify({ entry: `/img/${id}.jpg` })),
    );

    clearAllVenueBackgroundCaches();

    ids.forEach((id) =>
      expect(localStorage.getItem(`venue_backgrounds_${id}`)).toBeNull(),
    );
  });
});

// ─── Suite 2: AuthContext logout path ─────────────────────────────────────────

describe("AuthContext: logout path clears venue background caches before auth", () => {
  const TOKEN_KEY = "smokecraft_auth_token";

  beforeEach(() => {
    localStorage.clear();
    mockVenueId = "venue-alpha";

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        }),
      ),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("calls clearAllVenueBackgroundCaches before clearAuth on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const venueMod = await import("@/contexts/VenueContext");
    const authService = await import("@/services/auth");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    const venueMockFn = vi.mocked(venueMod.clearAllVenueBackgroundCaches);
    const clearAuthMockFn = vi.mocked(authService.clearAuth);

    expect(venueMockFn).toHaveBeenCalledOnce();
    expect(clearAuthMockFn).toHaveBeenCalledOnce();

    const venueCallOrder = venueMockFn.mock.invocationCallOrder[0];
    const authCallOrder = clearAuthMockFn.mock.invocationCallOrder[0];

    expect(venueCallOrder).toBeLessThan(authCallOrder);
  });

  it("removes all venue_backgrounds_* keys on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

    localStorage.setItem("venue_backgrounds_venue-x", '{"entry":"/x.jpg"}');
    localStorage.setItem("venue_backgrounds_venue-y", '{"pos":"/y.png"}');
    localStorage.setItem(TOKEN_KEY, "jwt-abc");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("venue_backgrounds_venue-x")).toBeNull();
    expect(localStorage.getItem("venue_backgrounds_venue-y")).toBeNull();
  });

  it("removes the auth token on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

    localStorage.setItem("venue_backgrounds_venue-z", '{}');
    localStorage.setItem(TOKEN_KEY, "jwt-xyz");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("also clears venue background caches when authMe fails on mount", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const authService = await import("@/services/auth");
    const venueMod = await import("@/contexts/VenueContext");

    vi.mocked(authService.getStoredToken).mockReturnValue("expired-jwt");
    vi.mocked(authService.authMe).mockRejectedValue(new Error("expired"));

    localStorage.setItem("venue_backgrounds_venue-fail", '{"entry":"/fail.jpg"}');

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
    });

    expect(vi.mocked(venueMod.clearAllVenueBackgroundCaches)).toHaveBeenCalled();
    expect(localStorage.getItem("venue_backgrounds_venue-fail")).toBeNull();

    vi.mocked(authService.getStoredToken).mockReturnValue(null);
  });
});
