/**
 * PersonalityClassifierService — Phase 1: Venue DNA Profiles.
 *
 * Classifies a venue's behavioral trait vector into a named personality type.
 * Uses a nearest-centroid approach — no external ML dependency needed.
 * Personality types define the emotional identity of each venue deployment.
 */

type PersonalityType =
  | "sophisticated_lounge"
  | "high_energy_social"
  | "vip_centric"
  | "relaxed_premium"
  | "sensory_exploration"
  | "hybrid";

interface Centroid {
  type:   PersonalityType;
  vector: number[];
}

// energy | luxury | social | exploration | conversion
const CENTROIDS: Centroid[] = [
  { type: "sophisticated_lounge", vector: [35, 85, 40, 60, 70] },
  { type: "high_energy_social",   vector: [90, 45, 90, 50, 65] },
  { type: "vip_centric",          vector: [55, 95, 30, 40, 90] },
  { type: "relaxed_premium",      vector: [30, 70, 50, 55, 55] },
  { type: "sensory_exploration",  vector: [60, 65, 55, 95, 60] },
];

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - (b[i] ?? 50), 2), 0));
}

export class PersonalityClassifierService {

  static classify(traitVector: number[]): PersonalityType {
    let bestType: PersonalityType = "hybrid";
    let bestDist = Infinity;

    for (const centroid of CENTROIDS) {
      const dist = euclidean(traitVector, centroid.vector);
      if (dist < bestDist) {
        bestDist = dist;
        bestType = centroid.type;
      }
    }

    if (bestDist > 30) return "hybrid";
    return bestType;
  }

  static generateSignature(traitVector: number[]): string {
    return traitVector.map(v => Math.round(v).toString(16).padStart(2, "0")).join("-");
  }

  static describePersonality(type: PersonalityType): {
    label:       string;
    description: string;
    atmosphere:  string;
    pacing:      string;
    color:       string;
  } {
    const profiles: Record<PersonalityType, ReturnType<typeof PersonalityClassifierService.describePersonality>> = {
      sophisticated_lounge: {
        label:       "Sophisticated Lounge",
        description: "A refined atmosphere where every interaction is deliberate and unhurried. Guests arrive to explore, not rush.",
        atmosphere:  "subdued amber, deep wood, aged leather",
        pacing:      "slow, intentional",
        color:       "#C4A96D",
      },
      high_energy_social: {
        label:       "High-Energy Social",
        description: "A vibrant, dynamic space where energy is infectious and social discovery drives engagement.",
        atmosphere:  "bright, kinetic, crowd-forward",
        pacing:      "fast, stimulating",
        color:       "#E8623A",
      },
      vip_centric: {
        label:       "VIP-Centric",
        description: "Exclusivity is the product. Every element communicates that this guest is exceptional.",
        atmosphere:  "deep midnight, champagne, obsidian silence",
        pacing:      "measured, exclusive",
        color:       "#D4AF37",
      },
      relaxed_premium: {
        label:       "Relaxed Premium",
        description: "Premium without pressure. A comfortable, trust-building environment for leisurely discovery.",
        atmosphere:  "warm cream, soft lighting, easy conversation",
        pacing:      "unhurried, warm",
        color:       "#8A7560",
      },
      sensory_exploration: {
        label:       "Sensory Exploration",
        description: "Multi-craft curiosity drives the room. Guests are here to learn, discover, and be surprised.",
        atmosphere:  "layered scents, varied textures, curiosity rewarded",
        pacing:      "exploratory, curious",
        color:       "#4A8FA8",
      },
      hybrid: {
        label:       "Hybrid Intelligence",
        description: "A blended personality still finding its identity. The DNA is accumulating.",
        atmosphere:  "adaptive, transitional",
        pacing:      "variable",
        color:       "#6B5E4E",
      },
    };

    return profiles[type] ?? profiles.hybrid;
  }

  static getEvolutionLabel(stage: string): string {
    const labels: Record<string, string> = {
      seed:        "Neural Seed",
      emerging:    "Personality Emerging",
      established: "DNA Established",
      evolved:     "Living Intelligence",
    };
    return labels[stage] ?? "Unknown";
  }
}
