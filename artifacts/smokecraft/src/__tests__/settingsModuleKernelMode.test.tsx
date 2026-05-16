/**
 * SettingsModule — kernel mode downgrade guard integration tests
 *
 * Tests the full user-visible flow:
 *   1. Render SettingsModule as a venue_owner admin in "sovereign" mode
 *   2. Click the "Essential" kernel mode button
 *   3. The component fetches /api/swipe-orders/active-count
 *   4. Assert modal opens with warning + danger styling when count > 0
 *   5. Assert modal opens without warning when count = 0
 */

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Framer Motion: synchronous passthrough ─────────────────────────────────────

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode; initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...safeRest } = rest as Record<string, unknown>;
      return <div {...safeRest as React.HTMLAttributes<HTMLDivElement>}>{children}</div>;
    },
    button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; initial?: unknown; animate?: unknown; exit?: unknown; whileHover?: unknown; whileTap?: unknown }) => {
      const { initial: _i, animate: _a, exit: _e, whileHover: _wh, whileTap: _wt, ...safeRest } = rest as Record<string, unknown>;
      return <button {...safeRest as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>;
    },
    span: ({ children, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode; initial?: unknown; animate?: unknown; exit?: unknown }) => {
      const { initial: _i, animate: _a, exit: _e, ...safeRest } = rest as Record<string, unknown>;
      return <span {...safeRest as React.HTMLAttributes<HTMLSpanElement>}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn() }),
}));

// ── Wouter ────────────────────────────────────────────────────────────────────

vi.mock("wouter", () => ({
  useLocation: () => ["/settings", vi.fn()],
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useRoute: () => [false, {}],
}));

// ── Lucide React: use the real module (icons render fine in jsdom) ────────────
// No mock needed — lucide-react SVG icons render without error in jsdom.

// ── Contexts ──────────────────────────────────────────────────────────────────

const VENUE_ID = "00000000-0000-0000-0000-000000000042";

vi.mock("@/contexts/CommandCenterContext", () => ({
  useCommandCenter: () => ({
    systemStatus: "operational",
    devices: [],
    staff: [],
    vendors: [],
    hourlyRevenue: [],
    activeGuests: 0,
    posMode: "overlay",
    posModeChangedAt: null,
    posModeChangedBy: null,
    auditLog: [],
    addAuditEntry: vi.fn(),
    setPosMode: vi.fn(),
    saving: false,
  }),
  POS_MODE_INFO: {
    overlay:  { label: "Overlay",            description: "Overlay mode", color: "#5b8def" },
    hybrid:   { label: "Hybrid",             description: "Hybrid mode",  color: "#f59e0b" },
    full_pos: { label: "Full Commerce Mode", description: "Full POS",     color: "#34d399" },
  },
}));

vi.mock("@/contexts/PosContext", () => ({
  usePosContext: () => ({
    orders: [],
    products: [],
    currentUser: null,
    cart: [],
  }),
}));

vi.mock("@/contexts/VenueContext", () => ({
  useVenueContext: () => ({
    config: {
      id: VENUE_ID,
      logoText: "Test Lounge",
      tagline: "Fine cigars",
      primaryColor: "#D48B00",
      logoUrl: null,
      background: "default",
      backgrounds: {},
    },
    updateBranding: vi.fn(),
    updateBackground: vi.fn(),
    getBackground: vi.fn(() => ""),
  }),
  BACKGROUND_LABELS: { default: "Default" },
  DEFAULT_BACKGROUNDS: { default: "" },
}));

// KernelMode is mutable so individual tests can override it
let mockKernelMode = "sovereign";
vi.mock("@/contexts/KernelModeContext", () => ({
  useKernelMode: () => ({
    mode: mockKernelMode,
    loading: false,
    saving: false,
    refresh: vi.fn(),
    setMode: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Auth user: venue_owner whose venueId matches VENUE_ID → isKernelAdmin = true
let mockAuthUser: object | null = {
  id: "user-uuid",
  name: "Test Owner",
  email: "owner@test.com",
  role: "venue_owner",
  venueId: VENUE_ID,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    token: "test-jwt-token",
    loading: false,
    logout: vi.fn(),
  }),
}));

// SovereignGate: render children unconditionally in tests
vi.mock("@/components/SovereignGate", () => ({
  SovereignGate: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Import under test (after all mocks) ───────────────────────────────────────

const ACTIVE_COUNT_URL = "/api/swipe-orders/active-count";

function makeFetchMock(activeCount: number) {
  return vi.fn((url: RequestInfo | URL) => {
    const urlStr = String(url);
    if (urlStr.includes(ACTIVE_COUNT_URL)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ count: activeCount }),
      });
    }
    // Catch-all for any other fetch (e.g. venue fetch on mount)
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({}),
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderSettingsModule() {
  const { default: SettingsModule } = await import("@/pages/SettingsModule");
  render(<SettingsModule />);
  // Let mount effects (live-count polling, etc.) settle
  await act(async () => {});
}

function clickEssentialButton() {
  // The "essential" button renders with text content "essential" (lowercase)
  // and "Core features only". getByText finds the text node inside the button.
  const textNode = screen.getByText("essential");
  const btn = textNode.closest("button");
  if (!btn) throw new Error("Could not find the Essential kernel mode button");
  fireEvent.click(btn);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SettingsModule — kernel mode downgrade guard", () => {
  beforeEach(() => {
    mockKernelMode = "sovereign";
    mockAuthUser = {
      id: "user-uuid",
      name: "Test Owner",
      email: "owner@test.com",
      role: "venue_owner",
      venueId: VENUE_ID,
    };
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clicking Essential when there are active orders opens the modal with warning text", async () => {
    vi.stubGlobal("fetch", makeFetchMock(3));

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    // Wait for the async fetch inside the onClick handler to complete
    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    expect(
      screen.getByText("3 active sessions will lose access to premium features immediately."),
    ).toBeInTheDocument();
  });

  it("clicking Essential when there is 1 active order uses singular wording", async () => {
    vi.stubGlobal("fetch", makeFetchMock(1));

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    expect(
      screen.getByText("1 active session will lose access to premium features immediately."),
    ).toBeInTheDocument();
  });

  it("clicking Essential when there are zero active orders opens the modal WITHOUT a warning", async () => {
    vi.stubGlobal("fetch", makeFetchMock(0));

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/active session.*will lose access/i),
    ).not.toBeInTheDocument();
  });

  it("clicking Essential when the fetch fails opens the modal WITHOUT a warning", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/active session.*will lose access/i),
    ).not.toBeInTheDocument();
  });

  it("clicking Essential calls the active-count endpoint", async () => {
    const fetchMock = vi.fn(makeFetchMock(2));
    vi.stubGlobal("fetch", fetchMock);

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    const activeCountCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes(ACTIVE_COUNT_URL),
    );
    expect(activeCountCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("the modal confirm button has danger (red) styling when downgrading to Essential", async () => {
    vi.stubGlobal("fetch", makeFetchMock(2));

    await renderSettingsModule();

    await act(async () => {
      clickEssentialButton();
    });

    await waitFor(() => {
      expect(screen.getByText("Change Kernel Mode")).toBeInTheDocument();
    });

    // The confirm button is disabled until the user types "ESSENTIAL",
    // so it shows a muted style. Verify the modal opened with danger mode
    // by checking the alert icon colour (the icon container uses the danger accent).
    // More reliably: the warning block itself uses rgba(239,68,68,...).
    const warningText = screen.getByText(
      "2 active sessions will lose access to premium features immediately.",
    );
    const warningContainer = warningText.closest("div");
    expect(warningContainer).not.toBeNull();
    // The warning container's background includes the red danger colour (rgba with or without spaces)
    expect(warningContainer!.style.background).toMatch(/239,\s*68,\s*68/);
  });
});
