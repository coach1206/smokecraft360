import { getAuthHeaders, getStoredToken } from "./auth";
import { cacheSet, cacheGet } from "./cache";
import { enqueueEvent } from "./eventQueue";
import { DEMO_MODE, DEMO_RECOMMENDATIONS } from "@/config/demo";

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
  /** Cloudinary image URL — may be absent for static / seed products */
  imageUrl?: string;
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
  imageUrl?: string;
}

export interface RecommendResponse {
  recommendations: ProductResult[];
  pairings:        ProductResult[];
  foodPairings:    FoodResult[];
  featured:        ProductResult[];
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
  /** Cloudinary image URL */
  imageUrl?: string;
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
  | "order_created"
  | "blend_created"
  | "save_experience";

export interface TrackEventParams {
  eventType: ClientEventType;
  productId?: string;
  venueId?:  string;
  metadata?: Record<string, unknown>;
}

export interface PersistExperienceParams {
  selectedProductId: string;
  pairingProductId?: string;
  foodPairingId?: string;
}

// ── Recommendations ───────────────────────────────────────────────────────────

function recommendCacheKey(params: RecommendParams): string {
  return `${params.category}|${params.strength}|${params.mood}|${params.flavorPreferences.slice().sort().join(",")}`;
}

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

    void cacheSet("recommendations", cacheKey, result);
    return result;
  } catch {
    const cached = await cacheGet<RecommendResponse>("recommendations", cacheKey);
    if (cached) return cached;

    const last = await cacheGet<RecommendResponse>("recommendations", "last");
    if (last) return last;

    // Demo safe-mode fallback — never show a failure to the user
    if (DEMO_MODE) return DEMO_RECOMMENDATIONS as RecommendResponse;

    throw new Error("Recommendations unavailable — please check your connection");
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function trackEvent(params: TrackEventParams): void {
  if (!navigator.onLine) {
    enqueueEvent({ eventType: params.eventType, productId: params.productId });
    return;
  }
  fetch("/api/events", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(params),
  }).catch(() => {
    enqueueEvent({ eventType: params.eventType, productId: params.productId });
  });
}

/** Fire-and-forget — records the user's preference snapshot for trend analytics. */
export function trackPreferences(params: {
  category:          "cigar" | "alcohol";
  flavorPreferences: string[];
  strength:          number;
  mood:              string;
  venueId?:          string;
}): void {
  fetch("/api/preferences", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(params),
  }).catch(() => { /* fire-and-forget — never block UI */ });
}

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
  updates: Partial<Pick<InventoryItem, "boostLevel" | "sponsored" | "brandId" | "campaignId" | "imageUrl">>,
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

/**
 * Upload an image file to Cloudinary via the backend.
 * Returns the Cloudinary secure URL on success.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers,
    body:   formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Image upload failed");
  }

  const data = await res.json() as { url: string };
  return data.url;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderType   = "table" | "pickup" | "delivery";
export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled" | "paid";

export interface CreateOrderParams {
  cigarId?:    string;
  cigarName?:  string;
  drinkId?:    string;
  drinkName?:  string;
  foodId?:     string;
  foodName?:   string;
  orderType:   OrderType;
  tableNumber?: string;
  venueId?:    string;
}

export interface Order {
  id:          string;
  userId?:     string;
  venueId?:    string;
  cigarId?:    string;
  cigarName?:  string;
  drinkId?:    string;
  drinkName?:  string;
  foodId?:     string;
  foodName?:   string;
  orderType:   OrderType;
  status:      OrderStatus;
  tableNumber?: string;
  createdAt:   string;
  updatedAt:   string;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const res = await fetch("/api/orders", {
    method:  "POST",
    headers: getAuthHeaders(),
    body:    JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create order");
  }
  return res.json();
}

export async function fetchOrders(status?: OrderStatus): Promise<Order[]> {
  const url = status ? `/api/orders?status=${status}` : "/api/orders";
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const res = await fetch(`/api/orders/${id}/status`, {
    method:  "PATCH",
    headers: getAuthHeaders(),
    body:    JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}

// ── Stripe Checkout ───────────────────────────────────────────────────────────

export interface CheckoutItem {
  name:      string;
  price:     number;
  quantity?: number;
}

export async function createCheckoutSession(params: {
  items:     CheckoutItem[];
  orderId:   string;
  venueId?:  string;
}): Promise<{ url: string }> {
  const res = await fetch("/api/create-checkout-session", {
    method:  "POST",
    headers: getAuthHeaders(),
    body:    JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create checkout session");
  }
  return res.json() as Promise<{ url: string }>;
}

// ── Venue analytics ───────────────────────────────────────────────────────────

export interface VenueAnalyticsProduct {
  productId:   string | null;
  name:        string;
  impressions?: number;
  swipeRights?: number;
  swipeLefts?:  number;
  skips?:       number;
  selections?:  number;
  orders?:      number;
  tier?:        string;
  boostLevel?:  number;
  sponsored?:   boolean;
}

export interface VenueAnalytics {
  venueId:    string;
  period:     string;
  topCigars:  VenueAnalyticsProduct[];
  topSkipped: VenueAnalyticsProduct[];
  topPairings: VenueAnalyticsProduct[];
  topFood:     VenueAnalyticsProduct[];
  flavorTrends: { flavor: string; count: number }[];
  boostedPerformance:   (VenueAnalyticsProduct & { boostLevel: number })[];
  sponsoredPerformance: (VenueAnalyticsProduct & { totalImpressions: number; sponsoredViews: number })[];
  orderConversion: {
    totalOrders:    number;
    withCigar:      number;
    withPairing:    number;
    withFood:       number;
    conversionRate: number;
  };
}

export async function fetchVenueAnalytics(venueId: string): Promise<VenueAnalytics> {
  const res = await fetch(`/api/analytics/venue/${venueId}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch venue analytics");
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

// ── Demo helpers ──────────────────────────────────────────────────────────────

/** Clears all server-side demo data (orders). Best-effort — never throws. */
export async function resetDemoData(): Promise<void> {
  try {
    await fetch("/api/demo/reset", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Silently ignore — client-side reset still runs
  }
}
