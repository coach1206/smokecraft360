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
      { timeout: 600 },
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

    // Use swipe_start (un-debounced) so the event fires within the 50 ms window
    // and no pending debounce timer bleeds into subsequent tests.
    await expect(
      new Promise<void>((resolve) => {
        emitKernelEvent("swipe_start", undefined, "craft-pour");
        setTimeout(resolve, 50);
      }),
    ).resolves.toBeUndefined();
  });

  // ── craftType is always present in payload for all four craft modules ───────
  //
  // Regression guard for task #197: ensures every craft-specific event type
  // carries craftType in its payload so the craft-activity dashboard query can
  // resolve it via COALESCE(payload->>'craftType', km.craft_type) rather than
  // silently falling back to 'unknown'.

  const CRAFT_CASES = [
    { craftType: "smoke" as const, slug: "craft-smoke" },
    { craftType: "pour"  as const, slug: "craft-pour"  },
    { craftType: "brew"  as const, slug: "craft-brew"  },
    { craftType: "vape"  as const, slug: "craft-vape"  },
  ];

  for (const { craftType, slug } of CRAFT_CASES) {
    it(`swipe_start payload includes craftType="${craftType}" for ${slug}`, async () => {
      emitKernelEvent("swipe_start", { craftType }, slug);
      const body = await capturePost();
      expect((body.payload as Record<string, unknown>).craftType).toBe(craftType);
    });

    it(`swipe_add payload includes craftType="${craftType}" for ${slug}`, async () => {
      emitKernelEvent("swipe_add", { cardId: "c1", title: "test", craftType }, slug);
      const body = await capturePost();
      expect((body.payload as Record<string, unknown>).craftType).toBe(craftType);
    });

    it(`swipe_skip payload includes craftType="${craftType}" for ${slug}`, async () => {
      emitKernelEvent("swipe_skip", { cardId: "c1", title: "test", craftType }, slug);
      const body = await capturePost();
      expect((body.payload as Record<string, unknown>).craftType).toBe(craftType);
    });

    it(`build_complete payload includes craftType="${craftType}" for ${slug}`, async () => {
      emitKernelEvent("build_complete", { craftType, count: 3 }, slug);
      const body = await capturePost();
      expect((body.payload as Record<string, unknown>).craftType).toBe(craftType);
    });

    it(`reveal_view payload includes craftType="${craftType}" for ${slug}`, async () => {
      emitKernelEvent("reveal_view", { craftType }, slug);
      const body = await capturePost();
      expect((body.payload as Record<string, unknown>).craftType).toBe(craftType);
    });
  }

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

// ─── emitKernelEvent — debounce behaviour ─────────────────────────────────────
//
// These tests use fake timers so the 300 ms window can be advanced
// deterministically without adding real wall-clock delays.

describe("emitKernelEvent — debounce behaviour", () => {
  let emitKernelEvent: (
    eventType: string,
    payload?: Record<string, unknown>,
    moduleSlug?: string,
  ) => void;
  let fetchMock: ReturnType<typeof vi.fn>;

  /** Flush all pending microtasks (promise callbacks). */
  async function flushPromises() {
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));
  }

  /** Return all telemetry POSTs captured so far. */
  function telemetryPosts(): Array<Record<string, unknown>> {
    return fetchMock.mock.calls
      .filter(
        ([url, opts]: [string, RequestInit]) =>
          url === "/api/kernel/telemetry" && opts?.method === "POST",
      )
      .map(([, opts]: [string, RequestInit]) =>
        JSON.parse(opts.body as string) as Record<string, unknown>,
      );
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    localStorage.clear();

    fetchMock = makeModulesFetch();
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("./kernelTelemetry");
    emitKernelEvent = mod.emitKernelEvent;

    // Flush the import-time warmup fetch (promise microtasks only — no timers)
    await flushPromises();
    fetchMock.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── swipe_add is debounced ────────────────────────────────────────────────

  it("swipe_add: rapid calls within the window produce exactly one POST", async () => {
    emitKernelEvent("swipe_add", { productId: "p1" });
    emitKernelEvent("swipe_add", { productId: "p2" });
    emitKernelEvent("swipe_add", { productId: "p3" });

    // No POST yet — window still open
    await flushPromises();
    expect(telemetryPosts().length).toBe(0);

    // Advance past the debounce window and flush resulting async work
    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].eventType).toBe("swipe_add");
  });

  it("swipe_add: last payload wins when calls are coalesced", async () => {
    emitKernelEvent("swipe_add", { productId: "first" });
    emitKernelEvent("swipe_add", { productId: "second" });
    emitKernelEvent("swipe_add", { productId: "last" });

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect((posts[0].payload as Record<string, unknown>).productId).toBe("last");
  });

  // ── swipe_skip is debounced ───────────────────────────────────────────────

  it("swipe_skip: rapid calls within the window produce exactly one POST", async () => {
    emitKernelEvent("swipe_skip", { cardId: "a" });
    emitKernelEvent("swipe_skip", { cardId: "b" });
    emitKernelEvent("swipe_skip", { cardId: "c" });

    await flushPromises();
    expect(telemetryPosts().length).toBe(0);

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].eventType).toBe("swipe_skip");
  });

  it("swipe_skip: last payload wins when calls are coalesced", async () => {
    emitKernelEvent("swipe_skip", { cardId: "x" });
    emitKernelEvent("swipe_skip", { cardId: "y" });
    emitKernelEvent("swipe_skip", { cardId: "z" });

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect((posts[0].payload as Record<string, unknown>).cardId).toBe("z");
  });

  // ── swipe_add and swipe_skip are debounced independently ─────────────────

  it("swipe_add and swipe_skip use independent debounce keys", async () => {
    emitKernelEvent("swipe_add",  { productId: "a" });
    emitKernelEvent("swipe_skip", { cardId: "b" });

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(2);
    const types = posts.map((p) => p.eventType).sort();
    expect(types).toEqual(["swipe_add", "swipe_skip"]);
  });

  // ── debounce keys are per-slug ────────────────────────────────────────────

  it("swipe_add calls for different slugs are debounced independently", async () => {
    emitKernelEvent("swipe_add", { productId: "smoke-1" }, "craft-smoke");
    emitKernelEvent("swipe_add", { productId: "pour-1"  }, "craft-pour");

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(2);
  });

  // ── swipe_start is NOT debounced ──────────────────────────────────────────

  it("swipe_start fires immediately without waiting for any timer", async () => {
    emitKernelEvent("swipe_start", { craftType: "smoke" });

    // Flush microtasks only — do not advance any timers
    await flushPromises();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].eventType).toBe("swipe_start");
  });

  it("multiple swipe_start calls each fire individually (no coalescing)", async () => {
    emitKernelEvent("swipe_start", { craftType: "smoke" });
    emitKernelEvent("swipe_start", { craftType: "pour"  }, "craft-pour");

    await flushPromises();
    await flushPromises();

    expect(telemetryPosts().length).toBe(2);
  });

  // ── build_complete is NOT debounced ───────────────────────────────────────

  it("build_complete fires immediately without waiting for any timer", async () => {
    emitKernelEvent("build_complete", { count: 5 });

    await flushPromises();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].eventType).toBe("build_complete");
  });

  // ── a new swipe_add after window elapses starts a fresh debounce ──────────

  it("swipe_add after the previous window has elapsed fires as a fresh event", async () => {
    emitKernelEvent("swipe_add", { productId: "first-batch" });

    await vi.runAllTimersAsync();
    await flushPromises();

    fetchMock.mockClear();

    emitKernelEvent("swipe_add", { productId: "second-batch" });

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect((posts[0].payload as Record<string, unknown>).productId).toBe(
      "second-batch",
    );
  });

  // ── debounced events carry the correct moduleId ───────────────────────────

  it("debounced swipe_add resolves the correct moduleId for craft-pour", async () => {
    emitKernelEvent("swipe_add", { productId: "w1" }, "craft-pour");
    emitKernelEvent("swipe_add", { productId: "w2" }, "craft-pour");

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].moduleId).toBe("mod-pour-001");
  });

  it("debounced swipe_skip resolves the correct moduleId for craft-brew", async () => {
    emitKernelEvent("swipe_skip", { cardId: "b1" }, "craft-brew");
    emitKernelEvent("swipe_skip", { cardId: "b2" }, "craft-brew");

    await vi.runAllTimersAsync();
    await flushPromises();

    const posts = telemetryPosts();
    expect(posts.length).toBe(1);
    expect(posts[0].moduleId).toBe("mod-brew-001");
  });
});
