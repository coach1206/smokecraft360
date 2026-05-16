import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KernelModeProvider, useKernelMode } from "@/contexts/KernelModeContext";

// VenueContext — fixed venue id so the localStorage cache key is deterministic
vi.mock("@/contexts/VenueContext", () => ({
  useVenue: () => ({ id: "default" }),
  useVenueContext: () => ({}),
}));

// NULL_VENUE_ID used by KernelModeProvider when venue.id === "default"
const NULL_VENUE_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_KEY = `kernel_mode_${NULL_VENUE_ID}`;

// Persistent navigate spy — hoisted so it is in scope inside vi.mock factories.
const mockNavigate = vi.hoisted(() => vi.fn());

// Wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRoute: () => [false, {}],
}));

// Sounds
vi.mock("@/utils/sounds", () => ({ playSound: vi.fn() }));

// html2canvas
vi.mock("html2canvas", () => ({
  default: vi.fn(() => Promise.resolve({ toDataURL: () => "" })),
}));

// API services
vi.mock("@/services/api", () => ({
  fetchDesignDrafts: vi.fn(() => Promise.resolve([])),
  saveDesignDraft: vi.fn(() => Promise.resolve(null)),
  fetchLoungeLeague: vi.fn(() => Promise.resolve([])),
  fetchMyLoungeStats: vi.fn(() => Promise.resolve(null)),
}));
vi.mock("@/services/auth", () => ({ getAuthHeaders: vi.fn(() => ({})) }));
vi.mock("@/components/Band/bandConstants", () => ({ COLOR_OPTIONS: [] }));

// Auth context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, token: null, logout: vi.fn() }),
}));

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

// Ax components used by SwipeIntelligence
vi.mock("@/components/ax", () => ({
  AxEmptyState: ({ title }: { title?: string }) => <div data-testid="ax-empty">{title}</div>,
  AxLoadingState: () => <div data-testid="ax-loading" />,
}));

// POS context used by CommandCenter
vi.mock("@/contexts/PosContext", () => ({
  usePosContext: () => ({
    orders: [],
    products: [],
    currentUser: null,
  }),
}));

// CommandCenter context
vi.mock("@/contexts/CommandCenterContext", () => ({
  useCommandCenter: () => ({
    systemStatus: "operational",
    devices: [],
    staff: [],
    vendors: [],
    hourlyRevenue: [],
    activeGuests: 0,
    posMode: "overlay",
    addAuditEntry: vi.fn(),
    setPosMode: vi.fn(),
  }),
  POS_MODE_INFO: {
    overlay:  { label: "Overlay",            description: "", color: "#5b8def" },
    hybrid:   { label: "Hybrid",             description: "", color: "#f59e0b" },
    full_pos: { label: "Full Commerce Mode", description: "", color: "#34d399" },
  },
}));

// Engagement context used by CommandCenter
vi.mock("@/contexts/EngagementContext", () => ({
  useEngagementContext: () => ({
    totalPoints: 0,
    sessionActions: 0,
    lastReward: null,
    trackAction: vi.fn(),
    dismissReward: vi.fn(),
  }),
}));

// Audio engine used by CommandCenter
vi.mock("@/lib/audioEngine", () => ({ playSwitch: vi.fn() }));

// LiveKpi widget used by CommandCenter
vi.mock("@/components/LiveKpi", () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

// SystemStatusPanel used by CommandCenter
vi.mock("@/components/SystemStatusPanel", () => ({ default: () => null }));

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
  mockNavigate.mockClear();
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

// ─── LoungeLeagueTab ──────────────────────────────────────────────────────────

describe("LoungeLeagueTab in Essential mode", () => {
  async function renderLeague() {
    const { LoungeLeagueTab } = await import(
      "@/components/Dashboard/LoungeLeagueTab"
    );
    return withKernel(<LoungeLeagueTab />);
  }

  it("renders the locked overlay", async () => {
    await renderLeague();
    expect(screen.getByText("ESSENTIAL MODE ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("Lounge League")).toBeInTheDocument();
    expect(screen.getByText(/sovereign-tier feature/i)).toBeInTheDocument();
  });

  it("does not render the leaderboard or rankings content", async () => {
    await renderLeague();
    expect(screen.queryByText("Top Lounge This Week")).not.toBeInTheDocument();
    expect(screen.queryByText("Full Rankings")).not.toBeInTheDocument();
    expect(screen.queryByText("Lounge Badges")).not.toBeInTheDocument();
  });
});

// ─── SwipeIntelligence ────────────────────────────────────────────────────────

describe("SwipeIntelligence in Essential mode", () => {
  async function renderSwipeIntel() {
    const { default: SwipeIntelligence } = await import(
      "@/pages/SwipeIntelligence"
    );
    return withKernel(<SwipeIntelligence />);
  }

  it("hides the sovereign-only Orchestration IQ tab", async () => {
    await renderSwipeIntel();
    expect(screen.queryByText("Orchestration IQ")).not.toBeInTheDocument();
  });

  it("still shows the non-sovereign tabs", async () => {
    await renderSwipeIntel();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Taste Clusters")).toBeInTheDocument();
    expect(screen.getByText("Revenue Funnel")).toBeInTheDocument();
    expect(screen.getByText("Craft Compare")).toBeInTheDocument();
  });

  it("does not render the Orchestration IQ panel content", async () => {
    await renderSwipeIntel();
    expect(screen.queryByText("Session Mood Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText("Pacing Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText("Sessions Scored")).not.toBeInTheDocument();
  });
});

// ─── KernelModeContext refresh() ──────────────────────────────────────────────

describe("KernelModeContext refresh()", () => {
  function KernelConsumer() {
    const { mode, loading, refresh } = useKernelMode();
    return (
      <div>
        <span data-testid="mode">{mode}</span>
        <span data-testid="loading">{String(loading)}</span>
        <button onClick={() => void refresh()}>refresh</button>
      </div>
    );
  }

  it("triggers a new GET /api/kernel/mode/:venueId fetch when called", async () => {
    render(
      <KernelModeProvider>
        <KernelConsumer />
      </KernelModeProvider>,
    );

    // Let the initial mount fetch settle
    await act(async () => {});

    const fetchMock = vi.mocked(fetch);
    const kernelGetsBefore = fetchMock.mock.calls.filter(
      ([url]) => typeof url === "string" && (url as string).includes("/api/kernel/mode/"),
    ).length;

    await act(async () => {
      screen.getByRole("button", { name: "refresh" }).click();
    });

    const kernelGetsAfter = fetchMock.mock.calls.filter(
      ([url]) => typeof url === "string" && (url as string).includes("/api/kernel/mode/"),
    ).length;

    expect(kernelGetsAfter).toBe(kernelGetsBefore + 1);
  });

  it("updates mode state and localStorage cache after a successful refresh", async () => {
    // Start with "essential" (set by beforeEach) then switch server response to "sovereign"
    render(
      <KernelModeProvider>
        <KernelConsumer />
      </KernelModeProvider>,
    );
    await act(async () => {});

    expect(screen.getByTestId("mode").textContent).toBe("essential");
    expect(localStorage.getItem(CACHE_KEY)).toBe("essential");

    // Override fetch to now return "sovereign"
    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown) => {
        if (typeof url === "string" && url.includes("/api/kernel/mode/")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mode: "sovereign" }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }),
    );

    await act(async () => {
      screen.getByRole("button", { name: "refresh" }).click();
    });

    expect(screen.getByTestId("mode").textContent).toBe("sovereign");
    expect(localStorage.getItem(CACHE_KEY)).toBe("sovereign");
  });

  it("sets loading to true during refresh and false once the fetch resolves", async () => {
    render(
      <KernelModeProvider>
        <KernelConsumer />
      </KernelModeProvider>,
    );
    await act(async () => {});

    // Confirm loading is false at rest
    expect(screen.getByTestId("loading").textContent).toBe("false");

    // Replace fetch with a promise we control manually
    let resolveFetch!: () => void;
    const gate = new Promise<void>((res) => { resolveFetch = res; });

    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown) => {
        if (typeof url === "string" && url.includes("/api/kernel/mode/")) {
          return gate.then(() => ({
            ok: true,
            json: () => Promise.resolve({ mode: "essential" }),
          }));
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }),
    );

    // Kick off refresh without awaiting so we can inspect mid-flight state
    act(() => {
      screen.getByRole("button", { name: "refresh" }).click();
    });

    // loading should be true while the fetch is still pending
    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Resolve the fetch and let React flush
    await act(async () => { resolveFetch(); });

    // loading should return to false after the fetch completes
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});

// ─── SovereignRoute ───────────────────────────────────────────────────────────

describe("SovereignRoute", () => {
  const SOVEREIGN_ROUTES = [
    "/designer",
    "/governance",
    "/central-command",
    "/command-center",
    "/enterprise-intelligence",
    "/operations",
  ];

  function renderWithRoute(
    mode: "essential" | "sovereign",
    children: React.ReactNode,
  ) {
    // Override the fetch mock to return the given mode
    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown) => {
        if (typeof url === "string" && url.includes("/api/kernel/mode/")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mode }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }),
    );

    // Set the localStorage cache to match
    const NULL_VENUE_ID = "00000000-0000-0000-0000-000000000000";
    localStorage.setItem(`kernel_mode_${NULL_VENUE_ID}`, mode);

    return render(<KernelModeProvider>{children}</KernelModeProvider>);
  }

  it("renders children in sovereign mode", async () => {
    const { SovereignRoute } = await import("@/components/SovereignRoute");
    renderWithRoute("sovereign", (
      <SovereignRoute>
        <div data-testid="protected-content">Protected</div>
      </SovereignRoute>
    ));

    await act(async () => {});
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("does not render children in essential mode", async () => {
    const { SovereignRoute } = await import("@/components/SovereignRoute");
    renderWithRoute("essential", (
      <SovereignRoute>
        <div data-testid="protected-content">Protected</div>
      </SovereignRoute>
    ));

    await act(async () => {});
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("calls navigate to redirect away in essential mode", async () => {
    const { SovereignRoute } = await import("@/components/SovereignRoute");

    const NULL_VENUE_ID = "00000000-0000-0000-0000-000000000000";
    localStorage.setItem(`kernel_mode_${NULL_VENUE_ID}`, "essential");

    render(
      <KernelModeProvider>
        <SovereignRoute>
          <div>Protected</div>
        </SovereignRoute>
      </KernelModeProvider>,
    );

    await act(async () => {});
    expect(mockNavigate).toHaveBeenCalled();
    expect(mockNavigate.mock.calls[0][0]).toMatch(/^\/upgrade-required/);
  });

  it.each(SOVEREIGN_ROUTES)(
    "protects %s — renders nothing in essential mode",
    async (path) => {
      const { SovereignRoute } = await import("@/components/SovereignRoute");
      renderWithRoute("essential", (
        <SovereignRoute>
          <div data-testid={`content-${path}`}>{path} content</div>
        </SovereignRoute>
      ));

      await act(async () => {});
      expect(screen.queryByTestId(`content-${path}`)).not.toBeInTheDocument();
    },
  );
});

// ─── CommandCenter ────────────────────────────────────────────────────────────

describe("CommandCenter in Essential mode", () => {
  async function renderCommandCenter() {
    const { default: CommandCenter } = await import("@/pages/CommandCenter");
    return withKernel(<CommandCenter />);
  }

  it("shows 'Sovereign Required' badge on all sovereign-only tiles", async () => {
    await renderCommandCenter();
    const badges = screen.getAllByText(/Sovereign Required/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("locks the Designer tile", async () => {
    await renderCommandCenter();
    const badges = screen.getAllByText(/Sovereign Required/i);
    const sovereignTileNames = ["Designer", "Governance", "Central Command", "Intel", "Master Ops"];
    const renderedTileNames = sovereignTileNames.filter(
      name => screen.queryByText(name) !== null,
    );
    expect(renderedTileNames.length).toBeGreaterThanOrEqual(1);
    expect(badges.length).toBe(renderedTileNames.length);
  });

  it("does not lock standard non-sovereign tiles", async () => {
    await renderCommandCenter();
    expect(screen.getByText("SmokeCraft")).toBeInTheDocument();
    expect(screen.getAllByText("Orders").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });
});

// ─── CommandCenter upgrade modal ──────────────────────────────────────────────

describe("CommandCenter upgrade modal", () => {
  async function renderCommandCenter() {
    const { default: CommandCenter } = await import("@/pages/CommandCenter");
    return withKernel(<CommandCenter />);
  }

  it("opens the upgrade modal when a locked tile is clicked", async () => {
    await renderCommandCenter();

    const designerTile = screen.getByText("Designer").closest("button");
    expect(designerTile).not.toBeNull();

    await act(async () => {
      designerTile!.click();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the correct feature headline in the modal", async () => {
    await renderCommandCenter();

    const designerTile = screen.getByText("Designer").closest("button");
    await act(async () => {
      designerTile!.click();
    });

    expect(screen.getByText("Signature Brand Designer")).toBeInTheDocument();
  });

  it("shows the correct body copy in the modal", async () => {
    await renderCommandCenter();

    const designerTile = screen.getByText("Designer").closest("button");
    await act(async () => {
      designerTile!.click();
    });

    expect(
      screen.getByText(/Craft custom cigar bands.*live previews/i),
    ).toBeInTheDocument();
  });

  it("shows the correct headline for a different locked tile (Governance)", async () => {
    await renderCommandCenter();

    const governanceTile = screen.getByText("Governance").closest("button");
    expect(governanceTile).not.toBeNull();

    await act(async () => {
      governanceTile!.click();
    });

    expect(screen.getByText("Governance & Access Control")).toBeInTheDocument();
  });

  it("closes the modal when the Close button is clicked", async () => {
    await renderCommandCenter();

    const designerTile = screen.getByText("Designer").closest("button");
    await act(async () => {
      designerTile!.click();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /not now/i });
    await act(async () => {
      closeBtn.click();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when the backdrop is clicked", async () => {
    await renderCommandCenter();

    const designerTile = screen.getByText("Designer").closest("button");
    await act(async () => {
      designerTile!.click();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const backdrop = screen.getByTestId("sovereign-backdrop");
    await act(async () => {
      fireEvent.click(backdrop);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
