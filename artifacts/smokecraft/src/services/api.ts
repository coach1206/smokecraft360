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

export interface RecommendResponse {
  recommendations: ProductResult[];
  pairings: ProductResult[];
}

export async function fetchRecommendations(params: RecommendParams): Promise<RecommendResponse> {
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }

  return response.json();
}
