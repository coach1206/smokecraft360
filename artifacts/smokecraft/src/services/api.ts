import { getAuthHeaders } from "./auth";

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
  | "sponsored_view";

export interface TrackEventParams {
  eventType: ClientEventType;
  productId?: string;
}

export interface PersistExperienceParams {
  selectedProductId: string;
  pairingProductId?: string;
  foodPairingId?: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchRecommendations(params: RecommendParams): Promise<RecommendResponse> {
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error("Failed to fetch recommendations");
  const data = await response.json();
  return {
    recommendations: data.recommendations ?? [],
    pairings:        data.pairings        ?? [],
    foodPairings:    data.foodPairings    ?? [],
    featured:        data.featured        ?? [],
  };
}

/**
 * Fire-and-forget event tracking.
 * Never throws — errors are swallowed so they never disrupt the user experience.
 */
export function trackEvent(params: TrackEventParams): void {
  fetch("/api/events", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  }).catch(() => { /* analytics failure must never surface */ });
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

// ─── Protected API ───────────────────────────────────────────────────────────

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch("/api/inventory");
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, "boostLevel" | "sponsored" | "brandId" | "campaignId">>,
): Promise<InventoryItem> {
  const res = await fetch(`/api/inventory/${id}`, {
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

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await fetch("/api/analytics", { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch analytics");
  }
  return res.json();
}
