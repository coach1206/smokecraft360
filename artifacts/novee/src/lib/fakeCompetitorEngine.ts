import { DifficultyTier } from "../context/GuestProfileContext";

export interface FakeCompetitor {
  id: string;
  name: string;
  merit: number;
  rank: DifficultyTier;
  avatar?: string;
}

const CIGAR_NAMES = [
  "Arturo", "Padrón", "Davidoff", "Cohiba", "Montecristo", "Romeo", "Julieta", "Partagás", "Hoyo", "Punch",
  "Bolivar", "Trinidad", "Quintero", "Vegueros", "Cuaba", "San Cristobal", "Diplomáticos", "Saint Luis Rey",
  "Rafael González", "El Rey del Mundo", "Juan López", "Flor de Cano", "Cabañas", "Gispert", "Belinda",
  "Troya", "Stateline", "Guantanamera", "Alejandro", "Rosa", "Cortés", "Estéban", "Blanco", "Negro",
  "Oro", "Plata", "Bronce", "Rubí", "Esmeralda", "Zafiro", "Diamante", "Perla", "Ámbar", "Obsidiana",
  "Humo", "Ceniza", "Fuego", "Tierra", "Viento", "Mar"
];

export function generateCompetitors(count: number, playerMerit: number): FakeCompetitor[] {
  const competitors: FakeCompetitor[] = [];
  
  for (let i = 0; i < count; i++) {
    const name = CIGAR_NAMES[Math.floor(Math.random() * CIGAR_NAMES.length)] + " " + (i + 1);
    const merit = Math.round(playerMerit + (Math.random() * 20) - 5);
    
    competitors.push({
      id: `fake-${i}-${Date.now()}`,
      name,
      merit: Math.max(0, merit),
      rank: calcRank(merit)
    });
  }
  
  return competitors;
}

function calcRank(merit: number): DifficultyTier {
  if (merit >= 100) return "architect";
  if (merit >= 75) return "master";
  if (merit >= 50) return "blender";
  if (merit >= 25) return "apprentice";
  return "beginner";
}

const STORAGE_KEY_PREFIX = "novee_fake_competitors_";

export function injectToLeaderboard(competitors: FakeCompetitor[], venueId: string): void {
  const key = STORAGE_KEY_PREFIX + venueId;
  let existing: FakeCompetitor[] = [];
  try {
    const existingRaw = sessionStorage.getItem(key);
    if (existingRaw) existing = JSON.parse(existingRaw);
  } catch {}
  const combined = [...existing, ...competitors];
  try { sessionStorage.setItem(key, JSON.stringify(combined)); } catch { /* storage blocked */ }
}

export function clearFakeCompetitors(venueId: string): void {
  try { sessionStorage.removeItem(STORAGE_KEY_PREFIX + venueId); } catch { /* storage blocked */ }
}
