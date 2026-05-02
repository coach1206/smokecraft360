import { getAuthHeaders, getStoredToken } from "./auth";
import { cacheSet, cacheGet } from "./cache";
import { enqueueEvent } from "./eventQueue";
import { DEMO_MODE, DEMO_RECOMMENDATIONS } from "@/config/demo";

export interface RecommendParams {
  category: "cigar" | "alcohol";
  flavorPreferences: string[];
  strength: number;
  mood: string;
  venueId?: string;
}

export type AvailabilityLabel =
  | "Available Now"
  | "Closest Available Match"
  | "Not Available";

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
  trendBoost?: number;
  sponsored?: boolean;
  brandId?: string;
  campaignId?: string;
  /** Cloudinary image URL — may be absent for static / seed products */
  imageUrl?: string;
  /** Venue inventory status — present when venueId sent in request */
  inStock?: boolean;
  quantity?: number;
  availabilityLabel?: AvailabilityLabel;
  /** Set when this is a closest-match substitute for an out-of-stock ideal */
  fallbackFor?: string;
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
  /** Out-of-stock top matches — returned for demand-capture UI */
  outOfStock?:     ProductResult[];
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

// ── Brands & Distributors ─────────────────────────────────────────────────────

export interface Brand {
  id:                   string;
  name:                 string;
  category:             string;
  distributorId:        string | null;
  logoUrl:              string | null;
  website:              string | null;
  contactEmail:         string | null;
  active:               boolean;
  createdAt:            string;
  productCount:         number;
  impressions:          number;
  sponsoredImpressions: number;
}

export interface Distributor {
  id:           string;
  name:         string;
  state:        string | null;
  contactEmail: string | null;
  website:      string | null;
  region:       string | null;
  active:       boolean;
  createdAt:    string;
  brandCount:   number;
}

export interface BrandPerformance {
  brand: Brand;
  products: {
    id:          string;
    name:        string;
    category:    string;
    tier:        string;
    boostLevel:  number;
    sponsored:   boolean;
    impressions: number;
    imageUrl?:   string;
  }[];
  summary: {
    productCount:         number;
    totalImpressions:     number;
    sponsoredImpressions: number;
    boostedCount:         number;
    sponsoredCount:       number;
  };
}

export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch("/api/brands", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch brands");
  return res.json();
}

export async function fetchDistributors(): Promise<Distributor[]> {
  const res = await fetch("/api/distributors", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch distributors");
  return res.json();
}

export async function fetchBrandPerformance(brandId: string): Promise<BrandPerformance> {
  const res = await fetch(`/api/brands/${brandId}/performance`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch brand performance");
  return res.json();
}

export async function createBrand(data: {
  name:          string;
  category:      string;
  distributorId?: string;
  website?:       string;
  contactEmail?:  string;
}): Promise<Brand> {
  const res = await fetch("/api/brands", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create brand");
  }
  return res.json();
}

export async function createDistributor(data: {
  name:          string;
  state?:        string;
  contactEmail?: string;
  website?:      string;
}): Promise<Distributor> {
  const res = await fetch("/api/distributors", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create distributor");
  }
  return res.json();
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id:             string;
  name:           string;
  brandId?:       string | null;
  distributorId?: string | null;
  status:         "draft" | "active" | "paused" | "completed" | "cancelled";
  budgetCents?:   number | null;
  impressionGoal?:number | null;
  startDate?:     string | null;
  endDate?:       string | null;
  notes?:         string | null;
  active:         boolean;
  brandName?:     string | null;
  productCount?:  number;
  createdAt?:     string;
  updatedAt?:     string;
}

export interface CampaignPerformance {
  campaign: {
    id: string; name: string; status: string; active: boolean;
    startDate?: string | null; endDate?: string | null;
    budgetCents?: number | null; impressionGoal?: number | null;
  };
  performance: {
    impressions: number; clicks: number; conversions: number;
    ctr: number; cvr: number; productCount: number;
  };
  pacing: {
    daysTotal: number; daysElapsed: number; daysRemaining: number; pct: number;
    impressionGoalPct: number | null;
  } | null;
  productBreakdown: {
    productId: string; name: string;
    impressions: number; clicks: number; conversions: number;
  }[];
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch("/api/campaigns", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

export async function fetchCampaign(id: string): Promise<Campaign & { products: InventoryItem[] }> {
  const res = await fetch(`/api/campaigns/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch campaign");
  return res.json();
}

export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create campaign");
  }
  return res.json();
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`/api/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to update campaign");
  }
  return res.json();
}

export async function assignCampaignProducts(
  campaignId: string,
  productIds: string[],
  clearExisting = false,
): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ productIds, clearExisting }),
  });
  if (!res.ok) throw new Error("Failed to assign products to campaign");
}

export async function fetchCampaignPerformance(id: string): Promise<CampaignPerformance> {
  const res = await fetch(`/api/campaigns/${id}/performance`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch campaign performance");
  return res.json();
}

// ── Brand Insights ────────────────────────────────────────────────────────────

export interface InsightsProduct {
  productId:  string;
  name:       string;
  category:   string;
  tier?:      string;
  boostLevel?: number;
  sponsored?:  boolean;
  count:      number;
}

export interface InsightsTrending {
  productId:   string;
  name:        string;
  category:    string;
  tier?:       string;
  recentCount: number;
  priorCount:  number;
  velocity:    number;
}

export interface InsightsBrandPerf {
  brandId:    string;
  name:       string;
  category:   string;
  shown:      number;
  selected:   number;
  ordered:    number;
  selectRate: number;
  orderRate:  number;
}

export interface InsightsProductPerf {
  productId:      string;
  name:           string;
  category:       string;
  tier?:          string;
  views:          number;
  swipeLeft:      number;
  swipeRight:     number;
  selected:       number;
  ordered:        number;
  recommendations: number;
  conversionRate: number;
}

export interface InsightsData {
  filters: { venueId: string | null; category: string; timeRange: string };
  conversionFunnel: {
    sessions:   number;
    selected:   number;
    ordered:    number;
    selectRate: number;
    orderRate:  number;
  };
  topSelected:    InsightsProduct[];
  topSkipped:     InsightsProduct[];
  topRightSwiped: InsightsProduct[];
  topPairings:    InsightsProduct[];
  topFood:        InsightsProduct[];
  flavorTrends:   { flavor: string; count: number }[];
  brandPerformance:   InsightsBrandPerf[];
  productPerformance: InsightsProductPerf[];
  trending:    InsightsTrending[];
  timeSeries:  { day: string; count: number }[];
}

export async function fetchInsights(params: {
  venueId?:  string;
  category?: string;
  timeRange?: string;
}): Promise<InsightsData> {
  const qs = new URLSearchParams();
  if (params.venueId)   qs.set("venueId",   params.venueId);
  if (params.category)  qs.set("category",  params.category);
  if (params.timeRange) qs.set("timeRange", params.timeRange);

  const res = await fetch(`/api/analytics/insights?${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch insights");
  }
  return res.json();
}

// ── Demand events ─────────────────────────────────────────────────────────────

export type DemandEventType = "view" | "selection" | "oos_request" | "order" | "blend_use" | "search";

export interface DemandEventParams {
  productId:    string;
  productName?: string;
  category?:    string;
  flavorNotes?: string[];
  eventType:    DemandEventType;
  venueId?:     string;
  sessionId?:   string;
}

/** Fire-and-forget — captures a demand signal. Never blocks the UI. */
export function captureDemandEvent(params: DemandEventParams): void {
  fetch("/api/demand/events", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(params),
  }).catch(() => { /* fire-and-forget */ });
}

// ── Demand requests ───────────────────────────────────────────────────────────

export interface DemandRequestParams {
  productId:   string;
  productName?: string;
  category?:   string;
  venueId?:    string;
  sessionId?:  string;
}

/** Fire-and-forget — logs an out-of-stock demand request. Never blocks the UI. */
export function createDemandRequest(params: DemandRequestParams): void {
  fetch("/api/demand", {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(params),
  }).catch(() => { /* fire-and-forget */ });
}

// ── Venue Intelligence ────────────────────────────────────────────────────────

export interface IntelligenceProduct {
  productId:  string;
  name:       string;
  category:   string;
  orderCount?: number;
  viewCount?:  number;
  trendScore:  number;
  inStock?:    boolean;
}

export interface IntelligenceLowStock {
  productId: string;
  name:      string;
  quantity:  number;
  category:  string;
}

export interface IntelligenceDemandItem {
  productId:    string;
  productName:  string;
  category:     string;
  requestCount: number;
  trendScore:   number;
}

export interface IntelligenceRestockSuggestion {
  productId:   string;
  productName: string;
  category:    string;
  reason:      string;
  urgency:     "high" | "medium" | "low";
}

export interface VenueIntelligence {
  venueId:            string;
  generatedAt:        string;
  topSellers:         IntelligenceProduct[];
  topViewed:          IntelligenceProduct[];
  lowStock:           IntelligenceLowStock[];
  outOfStock:         { productId: string; name: string; category: string }[];
  highDemandMissing:  IntelligenceDemandItem[];
  trendingFlavors:    { flavor: string; count: number }[];
  trendingCategories: { category: string; count: number }[];
  restockSuggestions: IntelligenceRestockSuggestion[];
}

export async function fetchVenueIntelligence(venueId: string): Promise<VenueIntelligence> {
  const res = await fetch(`/api/venues/${venueId}/intelligence`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch venue intelligence");
  }
  return res.json();
}

// ── Demand Proof ─────────────────────────────────────────────────────────────

export interface DemandScoreItem {
  productId:   string;
  productName: string;
  category:    string;
  score:       number;
  selections:  number;
  oosRequests: number;
  orders:      number;
  blendUses:   number;
  trendScore:  number;
  inStock:     boolean;
}

export interface DemandProof {
  generatedAt: string;
  venueId:     string | null;
  summary: {
    totalDemandSignals:     number;
    totalOrders:            number;
    conversionRate:         number;
    missedSalesCount:       number;
    uniqueProductsDemanded: number;
  };
  topDemandedCigars:   DemandScoreItem[];
  topDemandedAlcohol:  DemandScoreItem[];
  allProducts:         DemandScoreItem[];
  missedSales:         DemandScoreItem[];
  trendingFlavors:     { flavor: string; count: number }[];
  categoryDistribution: { cigar: number; alcohol: number };
  insightStatements:   string[];
}

export interface DemandOpportunity {
  productId:     string;
  productName:   string;
  category:      string;
  totalRequests: number;
  venuesMissing: number;
  urgency:       "high" | "medium" | "low";
  statement:     string;
}

export interface DemandOpportunitiesResponse {
  generatedAt:        string;
  opportunities:      DemandOpportunity[];
  totalOpportunities: number;
}

export async function fetchDemandProof(venueId?: string): Promise<DemandProof> {
  const qs  = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
  const res = await fetch(`/api/demand/proof${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch demand proof");
  }
  return res.json();
}

export async function fetchDemandOpportunities(): Promise<DemandOpportunitiesResponse> {
  const res = await fetch("/api/demand/opportunities", { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch opportunities");
  }
  return res.json();
}

// ── Demand Insights (Customer Demand) ────────────────────────────────────────

export interface DemandInsightProduct {
  productId:   string;
  productName: string;
  category:    string;
  views:       number;
  selections:  number;
  oosRequests: number;
  orders:      number;
  blendUses:   number;
  score:       number;
  trendScore:  number;
}

export interface MissingDemandItem {
  productId:       string;
  productName:     string;
  category:        string;
  requestCount:    number;
  lastRequestedAt: string;
  trendScore:      number;
}

export interface DemandInsights {
  generatedAt:          string;
  venueId:              string | null;
  topRequestedProducts: DemandInsightProduct[];
  topMissingProducts:   MissingDemandItem[];
  topFlavors:           { flavor: string; count: number }[];
  topCategories:        { category: string; count: number; percent: number }[];
  insightStatements:    string[];
}

export async function fetchDemandInsights(venueId?: string): Promise<DemandInsights> {
  const qs  = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
  const res = await fetch(`/api/demand/insights${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch demand insights");
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
