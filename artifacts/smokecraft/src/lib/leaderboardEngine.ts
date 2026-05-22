import { DifficultyTier } from "../contexts/NoveeGuestProfileContext";

export interface LeaderboardEntry {
  name: string;
  score: number;
  tier: DifficultyTier;
  timestamp: number;
  venueId: string;
  region: string;
}

export interface SessionScore {
  name: string;
  score: number;
  tier: DifficultyTier;
  venueId: string;
  region: string;
  sessionType: string;
}

const STORAGE_KEY = "smokecraft_leaderboards";

export function submitScore(sessionData: SessionScore): void {
  if (isFakeSession(sessionData.sessionType)) return;

  const entries = getAllEntries();
  const newEntry: LeaderboardEntry = {
    name: sessionData.name,
    score: sessionData.score,
    tier: sessionData.tier,
    timestamp: Date.now(),
    venueId: sessionData.venueId,
    region: sessionData.region,
  };

  entries.push(newEntry);
  saveEntries(entries);
}

export function getVenueLeaderboard(venueId: string): LeaderboardEntry[] {
  detectNightReset();
  return getAllEntries()
    .filter(e => e.venueId === venueId)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function getRegionalLeaderboard(region: string): LeaderboardEntry[] {
  detectNightReset();
  return getAllEntries()
    .filter(e => e.region === region)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function detectNightReset(): void {
  const entries = getAllEntries();
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const freshEntries = entries.filter(e => e.timestamp >= midnight);
  if (freshEntries.length !== entries.length) {
    saveEntries(freshEntries);
  }
}

export function isFakeSession(sessionType: string): boolean {
  return ["demo", "qa", "investor", "presentation"].includes(sessionType);
}

function getAllEntries(): LeaderboardEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: LeaderboardEntry[]): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* storage blocked */ }
}
