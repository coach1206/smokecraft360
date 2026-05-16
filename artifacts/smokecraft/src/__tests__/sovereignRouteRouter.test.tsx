/**
 * Router-level integration tests for SovereignRoute wiring.
 *
 * These tests mount a wouter Router + Switch + Route tree that mirrors the
 * sovereign-protected paths defined in App.tsx and verify that:
 *   - Essential mode: no page content renders (SovereignRoute blocks it)
 *   - Sovereign mode: page content renders normally
 *
 * Paths tested (canonical + alias):
 *   /designer, /governance, /central-command, /command-center (alias),
 *   /enterprise-intelligence, /operations
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Router, Switch, Route } from "wouter";
import { SovereignRoute } from "@/components/SovereignRoute";
import { KernelModeProvider } from "@/contexts/KernelModeContext";

// VenueContext — fixed venue id so the localStorage cache key is deterministic
vi.mock("@/contexts/VenueContext", () => ({
  useVenue: () => ({ id: "default" }),
  useVenueContext: () => ({}),
}));

const NULL_VENUE_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_KEY = `kernel_mode_${NULL_VENUE_ID}`;

function makeFetchStub(mode: "essential" | "sovereign") {
  return vi.fn((url: unknown) => {
    if (typeof url === "string" && url.includes("/api/kernel/mode/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ mode }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

// Sovereign paths to protect (canonical routes + alias).
const SOVEREIGN_PATHS = [
  "/designer",
  "/governance",
  "/central-command",
  "/command-center",
  "/enterprise-intelligence",
  "/operations",
];

/**
 * Builds a memory-based wouter location hook that reports `path` as the
 * current location and captures any navigate calls in `navigateSpy`.
 */
function makeMemoryHook(path: string, navigateSpy: ReturnType<typeof vi.fn>) {
  return () => [path, navigateSpy] as [string, (to: string) => void];
}

/**
 * Mounts a Router at `path` with all sovereign routes registered, wrapping
 * each page in SovereignRoute, inside KernelModeProvider.
 */
function renderAtPath(
  path: string,
  navigateSpy: ReturnType<typeof vi.fn>,
) {
  return render(
    <Router hook={makeMemoryHook(path, navigateSpy)}>
      <KernelModeProvider>
        <Switch>
          {SOVEREIGN_PATHS.map((p) => (
            <Route key={p} path={p}>
              <SovereignRoute>
                <div data-testid={`content${p.replace(/\//g, "-")}`}>
                  Content for {p}
                </div>
              </SovereignRoute>
            </Route>
          ))}
        </Switch>
      </KernelModeProvider>
    </Router>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("SovereignRoute router integration — Essential mode", () => {
  beforeEach(() => {
    localStorage.setItem(CACHE_KEY, "essential");
    vi.stubGlobal("fetch", makeFetchStub("essential"));
  });

  it.each(SOVEREIGN_PATHS)(
    "blocks content at %s when mode is essential",
    async (path) => {
      const navigate = vi.fn();
      renderAtPath(path, navigate);

      await act(async () => {});

      const testId = `content${path.replace(/\//g, "-")}`;
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    },
  );

  it.each(SOVEREIGN_PATHS)(
    "navigates to '/upgrade-required' from %s when mode is essential",
    async (path) => {
      const navigate = vi.fn();
      renderAtPath(path, navigate);

      await act(async () => {});

      expect(navigate).toHaveBeenCalled();
      expect(navigate.mock.calls[0][0]).toMatch(/^\/upgrade-required/);
    },
  );
});

describe("SovereignRoute router integration — Sovereign mode", () => {
  beforeEach(() => {
    localStorage.setItem(CACHE_KEY, "sovereign");
    vi.stubGlobal("fetch", makeFetchStub("sovereign"));
  });

  it.each(SOVEREIGN_PATHS)(
    "renders content at %s when mode is sovereign",
    async (path) => {
      const navigate = vi.fn();
      renderAtPath(path, navigate);

      await act(async () => {});

      const testId = `content${path.replace(/\//g, "-")}`;
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    },
  );

  it.each(SOVEREIGN_PATHS)(
    "does NOT navigate away from %s when mode is sovereign",
    async (path) => {
      const navigate = vi.fn();
      renderAtPath(path, navigate);

      await act(async () => {});

      expect(navigate).not.toHaveBeenCalledWith("/");
    },
  );
});
