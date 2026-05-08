// ── Revenue Engine API client ──────────────────────────────────────────────
// Thin typed wrappers over /api/revenue-engine/* routes.

const BASE = "/api/revenue-engine";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

// ── Platform summary ────────────────────────────────────────────────────────

export interface PlatformSummary {
  totalMrr?:        number;
  activeVenues?:    number;
  totalRevenue?:    number;
  subscriptions?:   number;
  [k: string]: unknown;
}

export const getPlatformSummary = () => get<PlatformSummary>("/summary");

// ── Forecast ────────────────────────────────────────────────────────────────

export const getForecast = () => get<Record<string, unknown>>("/forecast");

// ── Events ──────────────────────────────────────────────────────────────────

export interface RevenueEvent {
  id:          string;
  eventType:   string;
  venueId:     string;
  amount?:     number | string;
  currency?:   string;
  metadata?:   Record<string, unknown>;
  createdAt:   string;
}

export interface PlatformEventsResponse {
  events: RevenueEvent[];
  count:  number;
}

export const getPlatformEvents = (limit = 50) =>
  get<PlatformEventsResponse>(`/events/platform?limit=${limit}`);

// ── Provision ───────────────────────────────────────────────────────────────

export interface TierMap { [tier: string]: string[] }

export const getTierMap = () => get<{ tierMap: TierMap }>("/provision/tier-map");

export const provisionVenue = (venueId: string, tier: string) =>
  post<{ success: boolean }>(`/provision/${venueId}/${tier}`);

export const deprovisionVenue = (venueId: string) =>
  post<{ success: boolean }>(`/deprovision/${venueId}`);

// ── Licensing / features ────────────────────────────────────────────────────

export const enableFeature  = (venueId: string, featureKey: string) =>
  post("/licensing/feature/enable",  { venueId, featureKey });

export const disableFeature = (venueId: string, featureKey: string) =>
  post("/licensing/feature/disable", { venueId, featureKey });

export const getVenueFeatures = (venueId: string) =>
  get<{ features: string[] }>(`/licensing/features/${venueId}`);

// ── Enterprise contracts ────────────────────────────────────────────────────

export interface EnterpriseContract {
  id:             string;
  tenantId?:      string;
  contractType?:  string;
  tier?:          string;
  status?:        string;
  startDate?:     string;
  endDate?:       string;
  monthlyValue?:  number;
  [k: string]: unknown;
}

export const getEnterpriseContracts = () =>
  get<{ contracts: EnterpriseContract[] }>("/enterprise/contracts");

// ── AI usage ────────────────────────────────────────────────────────────────

export interface AiUsage {
  venueId?:      string;
  tokensUsed?:   number;
  quota?:        number;
  cost?:         number;
  [k: string]: unknown;
}

export const getAiUsage = (venueId: string) =>
  get<AiUsage>(`/ai/usage/${venueId}`);

// ── Module catalog ──────────────────────────────────────────────────────────

export interface ModuleCatalogItem {
  id: string; name: string; description?: string;
  monthlyPrice?: number; category?: string; isActive?: boolean;
}

export const getModuleCatalog = () =>
  get<{ modules: ModuleCatalogItem[] }>("/modules/catalog");

// ── Hardware MRR ────────────────────────────────────────────────────────────

export const getHardwareMrr = () =>
  get<{ mrr: number; count: number }>("/hardware/platform/mrr");

// ── Marketplace ─────────────────────────────────────────────────────────────

export const getMarketplaceListings = () =>
  get<{ listings: unknown[] }>("/marketplace/listings");
