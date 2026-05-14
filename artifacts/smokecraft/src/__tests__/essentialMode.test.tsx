import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KernelModeProvider } from "@/contexts/KernelModeContext";

// VenueContext — fixed venue id so the localStorage cache key is deterministic
vi.mock("@/contexts/VenueContext", () => ({
  useVenue: () => ({ id: "default" }),
}));

// NULL_VENUE_ID used by KernelModeProvider when venue.id === "default"
const NULL_VENUE_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_KEY = `kernel_mode_${NULL_VENUE_ID}`;

// Wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRoute: () => [false, {}],
}));

// Sounds
vi.mock("@/utils/sounds", () => ({ playSound: vi.fn() }));

// html2canvas
vi.mock("html2canvas", () => ({
  default: vi.fn(() => Promise.resolve({ toDataURL: () => "" })),
}));

// API services used by SignatureStudio
vi.mock("@/services/api", () => ({
  fetchDesignDrafts: vi.fn(() => Promise.resolve([])),
  saveDesignDraft: vi.fn(() => Promise.resolve(null)),
}));
vi.mock("@/services/auth", () => ({ getAuthHeaders: vi.fn(() => ({})) }));
vi.mock("@/components/Band/bandConstants", () => ({ COLOR_OPTIONS: [] }));

// SignatureStudio craft panels
vi.mock("@/components/SignatureStudio/SmokeDesignPanel", () => ({
  SmokeDesignPanel: () => <div data-testid="smoke-panel" />,
  DEFAULT_SMOKE_STATE: {
    bandName: "", style: "", description: "",
    design: { primaryColor: "black", accentColor: "#D48B00", emblem: "crown", textStyle: "serif" },
  },
}));
vi.mock("@/components/SignatureStudio/BrewDesignPanel", () => ({
  BrewDesignPanel: () => <div />, BrewPreview: () => <div />,
  DEFAULT_BREW_STATE: { brandName: "", labelOffset: { x: 0, y: 0 } },
}));
vi.mock("@/components/SignatureStudio/PourDesignPanel", () => ({
  PourDesignPanel: () => <div />, PourPreview: () => <div />,
  DEFAULT_POUR_STATE: { labelName: "", labelOffset: { x: 0, y: 0 } },
}));
vi.mock("@/components/SignatureStudio/VapeDesignPanel", () => ({
  VapeDesignPanel: () => <div />, VapePreview: () => <div />,
  DEFAULT_VAPE_STATE: { flavorName: "", labelOffset: { x: 0, y: 0 } },
}));

// Seed localStorage cache AND mock the fetch endpoint before each test so
// KernelModeProvider resolves to "essential" both synchronously (cache) and
// via the GET /api/kernel/mode/:venueId contract.
beforeEach(() => {
  localStorage.setItem(CACHE_KEY, "essential");
  vi.stubGlobal(
    "fetch",
    vi.fn((url: unknown) => {
      if (typeof url === "string" && url.includes("/api/kernel/mode/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ mode: "essential" }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    }),
  );
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function withKernel(ui: React.ReactElement) {
  return render(<KernelModeProvider>{ui}</KernelModeProvider>);
}

// ─── DesignerPage ─────────────────────────────────────────────────────────────

describe("DesignerPage in Essential mode", () => {
  it("renders the locked overlay", async () => {
    const { default: DesignerPage } = await import("@/pages/DesignerPage");
    withKernel(<DesignerPage />);

    expect(screen.getByText("ESSENTIAL MODE ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Design Playground")).toBeInTheDocument();
    expect(screen.getByText(/sovereign-tier feature/i)).toBeInTheDocument();
  });

  it("does not render the configurator", async () => {
    const { default: DesignerPage } = await import("@/pages/DesignerPage");
    withKernel(<DesignerPage />);

    expect(screen.queryByText("Craft Visual Engine")).not.toBeInTheDocument();
    expect(screen.queryByText("Brand Engraving")).not.toBeInTheDocument();
  });
});

// ─── SignatureStudio ──────────────────────────────────────────────────────────

describe("SignatureStudio in Essential mode", () => {
  async function renderStudio() {
    const { default: SignatureStudio } = await import(
      "@/components/SignatureStudio/SignatureStudio"
    );
    return withKernel(
      <SignatureStudio
        isOpen={true}
        craft="smoke"
        score={80}
        accentColor="#D48B00"
        onClose={() => {}}
      />,
    );
  }

  it("shows the locked modal", async () => {
    await renderStudio();
    expect(screen.getByText("ESSENTIAL MODE ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Signature Studio")).toBeInTheDocument();
    expect(screen.getByText(/sovereign-tier feature/i)).toBeInTheDocument();
  });

  it("does not show the Preview / Design / History tabs", async () => {
    await renderStudio();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Design")).not.toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
  });
});

// ─── StaffCockpit ─────────────────────────────────────────────────────────────

describe("StaffCockpit in Essential mode", () => {
  async function renderCockpit() {
    const { StaffCockpit } = await import("@/pages/eeie/StaffCockpit");
    const { buildTheme } = await import("@/pages/eeie/shared");
    return withKernel(<StaffCockpit T={buildTheme(false)} />);
  }

  it("hides the Blend Intelligence panel", async () => {
    await renderCockpit();
    expect(
      screen.queryByText("SmokeCraft Blend Intelligence"),
    ).not.toBeInTheDocument();
  });

  it("still shows the AI Pairing Showcase (non-gated)", async () => {
    await renderCockpit();
    expect(screen.getByText("AI Pairing Showcase")).toBeInTheDocument();
  });
});
