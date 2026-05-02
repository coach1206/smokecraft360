import { getAuthHeaders } from "./auth";
import { cacheSet, cacheGet } from "./cache";
import { enqueueEvent } from "./eventQueue";

export interface RecommendParams {
  category: "cigar" | "alcohol";
  flavorPreferences: string[];
  strength: number;
  mood: string;
}

export interface ProductResult {
  id: string;
  name: string;
  category: "cigar" | "alcohol";
  flavorNotes: string[];
  strength: number;
  moodTags: string[];
  pairingTags: string[];
  score: number;
  tier?: "premium" | "mid" | "standard";
  boostApplied?: number;
  boostLevel?: number;
  sponsored?: boolean;
  brandId?: string;
  campaignId?: string;
}

export interface FoodResult {
  id: string;
  name: string;
  category: "wings" | "steak" | "salad" | "appetizers" | "seafood" | "desserts";
  description: string;
  flavorTags: string[];
  strengthMin: number;
  strengthMax: number;
  score: number;
}

export interface RecommendResponse {
  recommendations: ProductResult[];
  pairings: ProductResult[];
  foodPairings: FoodResult[];
  featured: ProductResult[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  tier: string;
  boostLevel: number;
  sponsored: boolean;
  brandId?: string;
  campaignId?: string;
  impressions: number;
  featuredImpressions: number;
}

export interface AnalyticsSummary {
  summary: {
    totalProducts: number;
    boostedProducts: number;
    sponsoredProducts: number;
    totalImpressions: number;
    sponsoredImpressions: number;
    featuredImpressions: number;
  };
  topPerformers: InventoryItem[];
  sponsored: InventoryItem[];
}

export type ClientEventType =
  | "view"
  | "swipe_right"
  | "swipe_left"
  | "save"
  | "boost_click"
  | "sponsored_view"
  | "recommendation_view"
  | "product_selected"
  | "pairing_selected"
  | "food_selected"
  | "blend_created"
  | "save_experience";

export interface TrackEventParams {
  eventType: ClientEventType;
  productId?: string;
}

export interface PersistExperienceParams {
  selectedProductId: string;
  pairingProductId?: string;
  foodPairingId?: string;
}

// ── Recommendations ───────────────────────────────────────────────────────────

/** Cache key derived from the request so different preference combos cache separately. */
function recommendCacheKey(params: RecommendParams): string {
  return `${params.category}|${params.strength}|${params.mood}|${params.flavorPreferences.slice().sort().join(",")}`;
}

/**
 * Fetch recommendations from the API.
 * - On success: caches the result in IndexedDB for offline reuse.
 * - When offline: returns the last cached result for the same preferences.
 * - Throws only when both network and cache fail.
 */
export async function fetchRecommendations(params: RecommendParams): Promise<RecommendResponse> {
  const cacheKey = recommendCacheKey(params);

  try {
    const response = await fetch("/api/recommend", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(params),
    });

    if (!response.ok) throw new Error("Failed to fetch recommendations");

    const data = await response.json() as Partial<RecommendResponse>;
    const result: RecommendResponse = {
      recommendations: data.recommendations ?? [],
      pairings:        data.pairings        ?? [],
      foodPairings:    data.foodPairings     ?? [],
      featured:        data.featured         ?? [],
    };

    // Cache for offline use (fire-and-forget)
    void cacheSet("recommendations", cacheKey, result);

    return result;
  } catch {
    // Network failed — try the IndexedDB cache
    const cached = await cacheGet<RecommendResponse>("recommendations", cacheKey);
    if (cached) return cached;

    // Try the generic "last result" cache
    const last = await cacheGet<RecommendResponse>("recommendations", "last");
    if (last) return last;

    throw new Error("Recommendations unavailable — please check your connection");
  }
}

// ── Analytics (fire-and-forget with offline queue) ────────────────────────────

/**
 * Track a user interaction event.
 * - When online: fires directly to /api/events.
 * - When offline: queues the event locally for replay on reconnect.
 * Never throws — analytics failures must never disrupt the user experience.
 */
export function trackEvent(params: TrackEventParams): void {
  if (!navigator.onLine) {
    enqueueEvent({ eventType: params.eventType, productId: params.productId });
    return;
  }

  fetch("/api/events", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  }).catch(() => {
    // Network failed mid-request — queue it
    enqueueEvent({ eventType: params.eventType, productId: params.productId });
  });
}

/**
 * Persist a completed session to the database.
 * Links to the authenticated user when a JWT is present; anonymous otherwise.
 * Returns the server-assigned experience ID, or null on failure.
 */
export async function persistExperience(
  params: PersistExperienceParams,
): Promise<string | null> {
  try {
    const res = await fetch("/api/experiences", {
      method:  "POST",
      headers: getAuthHeaders(),
      body:    JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

// ── Partner dashboard (authenticated) ────────────────────────────────────────

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, "boostLevel" | "sponsored" | "brandId" | "campaignId">>,
): Promise<InventoryItem> {
  const res = await fetch(`/api/products/${id}`, {
    method:  "PATCH",
    headers: getAuthHeaders(),
    body:    JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to update product");
  }
  return res.json();
}

export async function createInventoryItem(
  item: Omit<InventoryItem, "impressions" | "featuredImpressions">,
): Promise<InventoryItem> {
  const res = await fetch("/api/products", {
    method:  "POST",
    headers: getAuthHeaders(),
    body:    JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create product");
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await fetch("/api/analytics", { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch analytics");
  }
  return res.json();
}
