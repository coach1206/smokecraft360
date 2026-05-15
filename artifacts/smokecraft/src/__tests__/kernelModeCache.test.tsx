/**
 * Tests for the kernel-mode cache layer and its integration points.
 *
 * Suite 1 — clearAllKernelModeCache()
 *   Verifies the utility removes every kernel_mode_* key and leaves
 *   all other localStorage entries untouched.
 *
 * Suite 2 — KernelModeProvider: venue-switch path
 *   Verifies that when the active venueId changes the provider deletes
 *   the previous venue's cache key before reading the new one.
 *
 * Suite 3 — AuthContext: logout path
 *   Verifies that kernel mode cache is cleared before clearAuth() runs,
 *   preventing a stale-mode key from surviving a session reset.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";

// ─── Shared mutable venue id (mutated per-test for venue-switch suite) ───────
let mockVenueId = "venue-alpha";

vi.mock("@/contexts/VenueContext", () => ({
  useVenue: () => ({ id: mockVenueId }),
  useVenueContext: () => ({}),
  clearAllVenueBackgroundCaches: vi.fn(),
}));

// Wrap clearAllKernelModeCache in a spy while keeping the real implementation
// so both Suite 1 (localStorage correctness) and Suite 3 (call-order) work.
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

// ─── Suite 1: clearAllKernelModeCache ────────────────────────────────────────

describe("clearAllKernelModeCache", () => {
  let clearAllKernelModeCache: () => void;

  beforeEach(async () => {
    localStorage.clear();
    const mod = await import("@/contexts/KernelModeContext");
    clearAllKernelModeCache = mod.clearAllKernelModeCache;
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("removes every kernel_mode_* key", () => {
    localStorage.setItem("kernel_mode_venue-a", "sovereign");
    localStorage.setItem("kernel_mode_venue-b", "essential");
    localStorage.setItem(
      "kernel_mode_00000000-0000-0000-0000-000000000000",
      "sovereign",
    );

    clearAllKernelModeCache();

    expect(localStorage.getItem("kernel_mode_venue-a")).toBeNull();
    expect(localStorage.getItem("kernel_mode_venue-b")).toBeNull();
    expect(
      localStorage.getItem(
        "kernel_mode_00000000-0000-0000-0000-000000000000",
      ),
    ).toBeNull();
  });

  it("leaves non-kernel_mode keys intact", () => {
    localStorage.setItem("kernel_mode_venue-a", "sovereign");
    localStorage.setItem("smokecraft_auth_token", "jwt.tok.here");
    localStorage.setItem("user_preferences", '{"theme":"dark"}');
    localStorage.setItem("smokecraft_venue", "venue-xyz");

    clearAllKernelModeCache();

    expect(localStorage.getItem("smokecraft_auth_token")).toBe(
      "jwt.tok.here",
    );
    expect(localStorage.getItem("user_preferences")).toBe(
      '{"theme":"dark"}',
    );
    expect(localStorage.getItem("smokecraft_venue")).toBe("venue-xyz");
  });

  it("does not throw when localStorage is empty", () => {
    expect(() => clearAllKernelModeCache()).not.toThrow();
  });

  it("does not throw when there are no kernel_mode_* keys", () => {
    localStorage.setItem("some_other_key", "value");
    expect(() => clearAllKernelModeCache()).not.toThrow();
    expect(localStorage.getItem("some_other_key")).toBe("value");
  });

  it("removes all kernel_mode keys when interleaved with unrelated keys", () => {
    localStorage.setItem("kernel_mode_abc", "essential");
    localStorage.setItem("unrelated", "keep-me");
    localStorage.setItem("kernel_mode_def", "sovereign");
    localStorage.setItem("other", "also-keep");

    clearAllKernelModeCache();

    expect(localStorage.getItem("kernel_mode_abc")).toBeNull();
    expect(localStorage.getItem("kernel_mode_def")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep-me");
    expect(localStorage.getItem("other")).toBe("also-keep");
  });

  it("removes multiple keys in a single call", () => {
    const ids = ["v1", "v2", "v3", "v4", "v5"];
    ids.forEach((id) =>
      localStorage.setItem(`kernel_mode_${id}`, "sovereign"),
    );

    clearAllKernelModeCache();

    ids.forEach((id) =>
      expect(localStorage.getItem(`kernel_mode_${id}`)).toBeNull(),
    );
  });
});

// ─── Suite 2: KernelModeProvider venue-switch ────────────────────────────────

describe("KernelModeProvider: venue-switch path", () => {
  beforeEach(() => {
    localStorage.clear();
    mockVenueId = "venue-alpha";

    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown) => {
        if (
          typeof url === "string" &&
          url.includes("/api/kernel/mode/")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mode: "essential" }),
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        });
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockVenueId = "venue-alpha";
  });

  it("deletes old venue key before reading the new venue key on switch", async () => {
    const { KernelModeProvider } = await import(
      "@/contexts/KernelModeContext"
    );

    localStorage.setItem("kernel_mode_venue-alpha", "sovereign");
    localStorage.setItem("kernel_mode_venue-beta", "essential");

    type StorageOp = { op: "remove" | "get"; key: string };
    const callLog: StorageOp[] = [];

    // Patch the Storage prototype so all localStorage calls go through the
    // tracker regardless of how jsdom exposes the instance.
    const origProtoRemove = Storage.prototype.removeItem;
    const origProtoGet = Storage.prototype.getItem;

    Storage.prototype.removeItem = function patchedRemove(key) {
      callLog.push({ op: "remove", key });
      return origProtoRemove.call(this, key);
    };
    Storage.prototype.getItem = function patchedGet(key) {
      callLog.push({ op: "get", key });
      return origProtoGet.call(this, key);
    };

    try {
      const { rerender } = render(
        <KernelModeProvider>
          <span />
        </KernelModeProvider>,
      );

      // Reset log after initial render so only venue-switch ops are captured.
      callLog.length = 0;

      mockVenueId = "venue-beta";
      rerender(
        <KernelModeProvider>
          <span />
        </KernelModeProvider>,
      );

      const removeIdx = callLog.findIndex(
        (e) => e.op === "remove" && e.key === "kernel_mode_venue-alpha",
      );

      // The component body calls readCached(venueId) on every render, so
      // there may be an early getItem for the new key before the effect fires.
      // What matters is that the effect's own readCached call (which determines
      // state) comes AFTER the deleteCache call.  Find the last getItem for the
      // new key — that is the effect-level read.
      const allNewKeyGetIndices = callLog
        .map((e, i) => ({ e, i }))
        .filter(
          ({ e }) => e.op === "get" && e.key === "kernel_mode_venue-beta",
        )
        .map(({ i }) => i);
      const lastGetIdx =
        allNewKeyGetIndices[allNewKeyGetIndices.length - 1] ?? -1;

      expect(removeIdx).toBeGreaterThanOrEqual(0);
      expect(lastGetIdx).toBeGreaterThanOrEqual(0);
      expect(removeIdx).toBeLessThan(lastGetIdx);
    } finally {
      Storage.prototype.removeItem = origProtoRemove;
      Storage.prototype.getItem = origProtoGet;
    }
  });

  it("deletes the previous venue's cache key when the venue changes", async () => {
    const { KernelModeProvider } = await import(
      "@/contexts/KernelModeContext"
    );

    localStorage.setItem("kernel_mode_venue-alpha", "sovereign");

    const { rerender } = render(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    expect(localStorage.getItem("kernel_mode_venue-alpha")).not.toBeNull();

    mockVenueId = "venue-beta";
    rerender(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    expect(localStorage.getItem("kernel_mode_venue-alpha")).toBeNull();
  });

  it("does not delete the new venue's cache key when the venue changes", async () => {
    const { KernelModeProvider } = await import(
      "@/contexts/KernelModeContext"
    );

    localStorage.setItem("kernel_mode_venue-alpha", "sovereign");
    localStorage.setItem("kernel_mode_venue-beta", "essential");

    const { rerender } = render(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    mockVenueId = "venue-beta";
    rerender(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    expect(localStorage.getItem("kernel_mode_venue-alpha")).toBeNull();
    expect(localStorage.getItem("kernel_mode_venue-beta")).not.toBeNull();
  });

  it("preserves unrelated localStorage keys across a venue switch", async () => {
    const { KernelModeProvider } = await import(
      "@/contexts/KernelModeContext"
    );

    localStorage.setItem("kernel_mode_venue-alpha", "sovereign");
    localStorage.setItem("smokecraft_auth_token", "tok");
    localStorage.setItem("other_key", "other_val");

    const { rerender } = render(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    mockVenueId = "venue-gamma";
    rerender(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    expect(localStorage.getItem("smokecraft_auth_token")).toBe("tok");
    expect(localStorage.getItem("other_key")).toBe("other_val");
  });

  it("does not delete the cache key when the venue id stays the same", async () => {
    const { KernelModeProvider } = await import(
      "@/contexts/KernelModeContext"
    );

    localStorage.setItem("kernel_mode_venue-alpha", "essential");

    const { rerender } = render(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    rerender(
      <KernelModeProvider>
        <span />
      </KernelModeProvider>,
    );

    expect(localStorage.getItem("kernel_mode_venue-alpha")).not.toBeNull();
  });
});

// ─── Suite 3: AuthContext logout path ────────────────────────────────────────

describe("AuthContext: logout path clears kernel mode cache before auth", () => {
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

  it("calls clearAllKernelModeCache before clearAuth on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const kernelMod = await import("@/contexts/KernelModeContext");
    const authService = await import("@/services/auth");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    const kernelMockFn = vi.mocked(kernelMod.clearAllKernelModeCache);
    const clearAuthMockFn = vi.mocked(authService.clearAuth);

    expect(kernelMockFn).toHaveBeenCalledOnce();
    expect(clearAuthMockFn).toHaveBeenCalledOnce();

    const kernelCallOrder =
      kernelMockFn.mock.invocationCallOrder[0];
    const authCallOrder =
      clearAuthMockFn.mock.invocationCallOrder[0];

    expect(kernelCallOrder).toBeLessThan(authCallOrder);
  });

  it("removes all kernel_mode keys on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

    localStorage.setItem("kernel_mode_venue-x", "sovereign");
    localStorage.setItem("kernel_mode_venue-y", "essential");
    localStorage.setItem(TOKEN_KEY, "jwt-abc");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("kernel_mode_venue-x")).toBeNull();
    expect(localStorage.getItem("kernel_mode_venue-y")).toBeNull();
  });

  it("removes the auth token on logout", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");

    localStorage.setItem("kernel_mode_venue-z", "sovereign");
    localStorage.setItem(TOKEN_KEY, "jwt-xyz");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("also clears kernel mode cache when authMe fails on mount", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const authService = await import("@/services/auth");
    const kernelMod = await import("@/contexts/KernelModeContext");

    vi.mocked(authService.getStoredToken).mockReturnValue("expired-jwt");
    vi.mocked(authService.authMe).mockRejectedValue(new Error("expired"));

    localStorage.setItem("kernel_mode_venue-fail", "sovereign");

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
    });

    expect(vi.mocked(kernelMod.clearAllKernelModeCache)).toHaveBeenCalled();
    expect(localStorage.getItem("kernel_mode_venue-fail")).toBeNull();

    vi.mocked(authService.getStoredToken).mockReturnValue(null);
  });
});
