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
}

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
  };
}
