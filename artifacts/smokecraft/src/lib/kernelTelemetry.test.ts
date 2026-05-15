import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Poll `fn` every 10 ms until it stops throwing or the timeout elapses. */
async function waitFor(
  fn: () => void,
  options: { timeout?: number } = {},
): Promise<void> {
  const deadline = Date.now() + (options.timeout ?? 500);
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      fn();
      return;
    } catch (e) {
      lastError = e;
      await new Promise<void>((r) => setTimeout(r, 10));
    }
  }
  throw lastError;
}

// All kernel modules fixture – reused across suites
const KERNEL_MODULES = [
  { id: "mod-smoke-001", slug: "craft-smoke" },
  { id: "mod-pour-001",  slug: "craft-pour"  },
  { id: "mod-brew-001",  slug: "craft-brew"  },
  { id: "mod-vape-001",  slug: "craft-vape"  },
];

function makeModulesFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ modules: KERNEL_MODULES }),
  });
}

// ─── craftToModuleSlug ────────────────────────────────────────────────────────

describe("craftToModuleSlug", () => {
  let craftToModuleSlug: (craft: string) => string;

  beforeEach(async () => {
    vi.resetModules();
    // Silence the import-time warmup fetch for craft-smoke
    vi.stubGlobal("fetch", makeModulesFetch());
    const mod = await import("./kernelTelemetry");
    craftToModuleSlug = mod.craftToModuleSlug;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "craft-smoke" for "smoke"', () => {
    expect(craftToModuleSlug("smoke")).toBe("craft-smoke");
  });

  it('returns "craft-pour" for "pour"', () => {
    expect(craftToModuleSlug("pour")).toBe("craft-pour");
  });

  it('returns "craft-brew" for "brew"', () => {
    expect(craftToModuleSlug("brew")).toBe("craft-brew");
  });

  it('returns "craft-vape" for "vape"', () => {
    expect(craftToModuleSlug("vape")).toBe("craft-vape");
  });

  it('returns "craft-smoke" for an unrecognised craft type', () => {
    expect(craftToModuleSlug("cocktail")).toBe("craft-smoke");
  });

  it('returns "craft-smoke" for an empty string', () => {
    expect(craftToModuleSlug("")).toBe("craft-smoke");
  });

  it('is case-sensitive and treats "POUR" / "Brew" as unknown (falls back to craft-smoke)', () => {
    expect(craftToModuleSlug("POUR")).toBe("craft-smoke");
    expect(craftToModuleSlug("Brew")).toBe("craft-smoke");
  });
});

// ─── emitKernelEvent ──────────────────────────────────────────────────────────

describe("emitKernelEvent", () => {
  let emitKernelEvent: (
    eventType: string,
    payload?: Record<string, unknown>,
    moduleSlug?: string,
  ) => void;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();

    fetchMock = makeModulesFetch();
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("./kernelTelemetry");
    emitKernelEvent = mod.emitKernelEvent;

    // Wait deterministically for the import-time craft-smoke warmup to resolve
    // before resetting call history so each test starts with a clean slate.
    await waitFor(
      () => {
        const calls = fetchMock.mock.calls.filter(
          ([url]: [string]) => url === "/api/kernel/modules",
        );
        expect(calls.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 1000 },
    );
    fetchMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  // Wait for a POST to /api/kernel/telemetry and return its parsed JSON body.
  // Uses waitFor so the assertion is deterministic rather than time-bounded.
  async function capturePost() {
    let body: Record<string, unknown> = {};
    await waitFor(
      () => {
        const posts = fetchMock.mock.calls.filter(
          ([url, opts]: [string, RequestInit]) =>
            url === "/api/kernel/telemetry" && opts?.method === "POST",
        );
        expect(posts.length).toBeGreaterThan(0);
        body = JSON.parse(
          posts[posts.length - 1][1].body as string,
        ) as Record<string, unknown>;
      },
      { timeout: 500 },
    );
    return body;
  }

  // ── default slug (craft-smoke) ────────────────────────────────────────────
  // craft-smoke was already resolved by the warmup, so no extra module fetch.

  it("sends swipe_start with moduleId for craft-smoke", async () => {
    emitKernelEvent("swipe_start");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_start");
    expect(body.moduleId).toBe("mod-smoke-001");
  });

  it("sends swipe_add with moduleId for craft-smoke", async () => {
    emitKernelEvent("swipe_add", { productId: "p1" });
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_add");
    expect(body.moduleId).toBe("mod-smoke-001");
    expect((body.payload as Record<string, unknown>).productId).toBe("p1");
  });

  it("sends swipe_skip with moduleId for craft-smoke", async () => {
    emitKernelEvent("swipe_skip");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_skip");
    expect(body.moduleId).toBe("mod-smoke-001");
  });

  it("sends build_complete with moduleId for craft-smoke", async () => {
    emitKernelEvent("build_complete", { rank: 1 });
    const body = await capturePost();
    expect(body.eventType).toBe("build_complete");
    expect(body.moduleId).toBe("mod-smoke-001");
  });

  // ── craft-pour ────────────────────────────────────────────────────────────

  it("resolves craft-pour module ID independently and sends it for swipe_start", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-pour");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_start");
    expect(body.moduleId).toBe("mod-pour-001");
  });

  it("sends swipe_add with correct moduleId for craft-pour", async () => {
    emitKernelEvent("swipe_add", { productId: "whiskey-1" }, "craft-pour");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_add");
    expect(body.moduleId).toBe("mod-pour-001");
  });

  it("sends build_complete with correct moduleId for craft-pour", async () => {
    emitKernelEvent("build_complete", {}, "craft-pour");
    const body = await capturePost();
    expect(body.moduleId).toBe("mod-pour-001");
  });

  // ── craft-brew ────────────────────────────────────────────────────────────

  it("resolves craft-brew module ID independently and sends it for swipe_start", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-brew");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_start");
    expect(body.moduleId).toBe("mod-brew-001");
  });

  it("sends swipe_skip with correct moduleId for craft-brew", async () => {
    emitKernelEvent("swipe_skip", undefined, "craft-brew");
    const body = await capturePost();
    expect(body.moduleId).toBe("mod-brew-001");
  });

  it("sends build_complete with correct moduleId for craft-brew", async () => {
    emitKernelEvent("build_complete", { sessionId: "s99" }, "craft-brew");
    const body = await capturePost();
    expect(body.moduleId).toBe("mod-brew-001");
    expect((body.payload as Record<string, unknown>).sessionId).toBe("s99");
  });

  // ── craft-vape ────────────────────────────────────────────────────────────

  it("resolves craft-vape module ID independently and sends it for swipe_start", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-vape");
    const body = await capturePost();
    expect(body.eventType).toBe("swipe_start");
    expect(body.moduleId).toBe("mod-vape-001");
  });

  it("sends swipe_add with correct moduleId for craft-vape", async () => {
    emitKernelEvent("swipe_add", { productId: "vape-x" }, "craft-vape");
    const body = await capturePost();
    expect(body.moduleId).toBe("mod-vape-001");
  });

  it("sends build_complete with correct moduleId for craft-vape", async () => {
    emitKernelEvent("build_complete", undefined, "craft-vape");
    const body = await capturePost();
    expect(body.moduleId).toBe("mod-vape-001");
  });

  // ── module IDs are distinct across all four crafts ────────────────────────

  it("resolves a unique moduleId for each craft type", async () => {
    const slugs = ["craft-smoke", "craft-pour", "craft-brew", "craft-vape"];
    const expected = [
      "mod-smoke-001",
      "mod-pour-001",
      "mod-brew-001",
      "mod-vape-001",
    ];

    for (let i = 0; i < slugs.length; i++) {
      fetchMock.mockClear();
      emitKernelEvent("swipe_start", undefined, slugs[i]);
      const body = await capturePost();
      expect(body.moduleId).toBe(expected[i]);
    }
  });

  // ── GET /api/kernel/modules is called per non-smoke slug (cache isolation) ─
  //
  // After beforeEach, craft-smoke is already resolved and cached.
  // Pour / brew / vape have no cache entry yet, so each requires exactly ONE
  // GET /api/kernel/modules fetch of its own — independent of craft-smoke.

  it("makes exactly one /api/kernel/modules fetch for craft-pour (independent of craft-smoke cache)", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-pour");

    await waitFor(
      () => {
        const moduleCalls = fetchMock.mock.calls.filter(
          ([url]: [string]) => url === "/api/kernel/modules",
        );
        // Exactly 1: pour's own lookup; craft-smoke's warmup already resolved
        expect(moduleCalls.length).toBe(1);
      },
      { timeout: 500 },
    );
  });

  it("makes exactly one /api/kernel/modules fetch for craft-brew (independent of craft-smoke cache)", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-brew");

    await waitFor(
      () => {
        const moduleCalls = fetchMock.mock.calls.filter(
          ([url]: [string]) => url === "/api/kernel/modules",
        );
        expect(moduleCalls.length).toBe(1);
      },
      { timeout: 500 },
    );
  });

  it("makes exactly one /api/kernel/modules fetch for craft-vape (independent of craft-smoke cache)", async () => {
    emitKernelEvent("swipe_start", undefined, "craft-vape");

    await waitFor(
      () => {
        const moduleCalls = fetchMock.mock.calls.filter(
          ([url]: [string]) => url === "/api/kernel/modules",
        );
        expect(moduleCalls.length).toBe(1);
      },
      { timeout: 500 },
    );
  });

  it("does not re-fetch /api/kernel/modules on a second event for the same non-smoke slug", async () => {
    // First call populates the pour cache
    emitKernelEvent("swipe_start", undefined, "craft-pour");
    await capturePost();
    fetchMock.mockClear();

    // Second call should hit the cache — no new module fetch
    emitKernelEvent("swipe_add", undefined, "craft-pour");
    await capturePost();

    const moduleCalls = fetchMock.mock.calls.filter(
      ([url]: [string]) => url === "/api/kernel/modules",
    );
    expect(moduleCalls.length).toBe(0);
  });

  // ── resilience ────────────────────────────────────────────────────────────

  it("does not throw if /api/kernel/modules fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(
      new Promise<void>((resolve) => {
        emitKernelEvent("swipe_start", undefined, "craft-pour");
        setTimeout(resolve, 50);
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw if /api/kernel/telemetry POST fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ modules: KERNEL_MODULES }),
      })
      .mockRejectedValueOnce(new Error("telemetry endpoint down"));

    await expect(
      new Promise<void>((resolve) => {
        emitKernelEvent("swipe_add", undefined, "craft-pour");
        setTimeout(resolve, 50);
      }),
    ).resolves.toBeUndefined();
  });

  // ── venueId is included when set in localStorage ──────────────────────────

  it("includes venueId in the POST body when set in localStorage", async () => {
    localStorage.setItem("smokecraft_venue", "venue-abc");
    emitKernelEvent("swipe_start", undefined, "craft-smoke");
    const body = await capturePost();
    expect(body.venueId).toBe("venue-abc");
  });

  it('omits venueId when localStorage value is "default"', async () => {
    localStorage.setItem("smokecraft_venue", "default");
    emitKernelEvent("swipe_start", undefined, "craft-smoke");
    const body = await capturePost();
    expect(body.venueId).toBeUndefined();
  });
});
