/**
 * IdentityEvolutionService — living palate-behavior profile engine.
 *
 * evolveGuestProfile(guestId, sessionData)
 *   Loads current guest_identity_evolution row (or seeds defaults on first visit),
 *   applies two derivation functions, then upserts the result back to the DB.
 *   Also increments guest_profiles.session_count + updates last_seen_at.
 *
 * calculateConfidence(choices)
 *   Returns 0.8 if any choice in the session was Bold or Unfamiliar, else 0.2.
 *   This is blended into the running explorationIndex via EMA:
 *     newIndex = (currentIndex + confidence) / 2
 *   The EMA keeps the score stable over many sessions while still reacting
 *   to individual bursts of exploration.
 *
 * analyzeSpendSensitivity(dwellOnPremium)
 *   Derives a luxuryThresholdScore (0–100) from how the guest behaved on
 *   premium-tier items this session:
 *     - Selected quickly (< 5 s)  → +12 pts per item  (comfortable with premium)
 *     - Selected slowly  (5–15 s) → +5  pts per item  (mild hesitation but converts)
 *     - Viewed > 15 s, no select  → −8  pts per item  (price friction)
 *   Score is blended with the stored score (70 / 30 weighted toward stored history
 *   so a single bad session doesn't erase accumulated confidence).
 *   Clamped to [0, 100].
 */

import { eq, sql }                           from "drizzle-orm";
import {
  db,
  guestIdentityEvolutionTable,
  guestProfilesTable,
  type GuestIdentityEvolution,
  type EvolutionSnapshot,
  type PacingPreference,
  type SocialCluster,
}                                            from "@workspace/db";
import { logger }                            from "../lib/logger";

// ── Input types ───────────────────────────────────────────────────────────────

export interface SessionChoice {
  productId:    string;
  isBold:       boolean;       // guest selected something outside their comfort zone
  isUnfamiliar: boolean;       // product has no prior taste-memory match
  craftType:    string;
  action:       "add" | "skip";
}

export interface PremiumDwellSignal {
  productId:  string;
  dwellMs:    number;
  selected:   boolean;
  price:      number;          // retail price — used for future tiered weighting
}

export interface SessionData {
  choices:        SessionChoice[];
  dwellOnPremium: PremiumDwellSignal[];
  emotionalScore: number;           // 0.0–100.0, supplied by caller (Room Energy / sentiment feed)
  swipeCount:     number;
  avgSwipeMs:     number;           // used for pacing classification
  groupSize?:     number;           // 1 = solo; >1 = social context
}

export interface EvolvedProfile {
  guestId:                   string;
  explorationIndex:          number;
  luxuryThresholdScore:      number;
  lastSessionEmotionalState: number;
  visitCount:                number;
  pacingPreference:          PacingPreference;
  socialBehaviorCluster:     SocialCluster;
  confidenceContrib:         number;
  snapshot:                  EvolutionSnapshot;
}

// ── calculateConfidence ───────────────────────────────────────────────────────

export function calculateConfidence(choices: SessionChoice[]): number {
  const hasBoldMove = choices.some(c => c.isBold || c.isUnfamiliar);
  return hasBoldMove ? 0.8 : 0.2;
}

// ── analyzeSpendSensitivity ───────────────────────────────────────────────────

export function analyzeSpendSensitivity(signals: PremiumDwellSignal[]): number {
  if (signals.length === 0) return 50;  // no premium data this session → neutral

  let delta = 0;
  for (const s of signals) {
    if (s.selected) {
      delta += s.dwellMs < 5_000  ? 12
             : s.dwellMs < 15_000 ? 5
             : 2;                        // selected even after long hesitation → minor positive
    } else {
      delta += s.dwellMs > 15_000 ? -8  // looked long, walked away → price friction
             : s.dwellMs > 5_000  ? -3  // brief look, skipped → mild friction
             : 0;                        // barely glanced, no signal
    }
  }

  // Return the raw session delta — blending against stored score happens in evolve()
  return Math.round(delta);
}

// ── derivePacingPreference ────────────────────────────────────────────────────

function derivePacingPreference(avgSwipeMs: number): PacingPreference {
  // < 3 s per swipe = Aggressive; ≥ 3 s = Leisurely
  return avgSwipeMs < 3_000 ? "Aggressive" : "Leisurely";
}

// ── deriveSocialCluster ───────────────────────────────────────────────────────

function deriveSocialCluster(
  groupSize:    number,
  exploration:  number,
): SocialCluster {
  if (groupSize <= 1)  return exploration >= 0.6 ? "Solo-Focused" : "Observer";
  if (groupSize === 2) return "Peer-Parallel";
  return "Group-Influence";
}

// ── evolveGuestProfile ────────────────────────────────────────────────────────

export async function evolveGuestProfile(
  guestId:     string,
  sessionData: SessionData,
): Promise<EvolvedProfile> {

  // Load existing evolution row (may not exist on first session)
  const [current] = await db
    .select()
    .from(guestIdentityEvolutionTable)
    .where(eq(guestIdentityEvolutionTable.identityId, guestId));

  const prev: Partial<GuestIdentityEvolution> = current ?? {};

  // ── Derivations ────────────────────────────────────────────────────────────

  const confidence     = calculateConfidence(sessionData.choices);
  const currentIndex   = prev.explorationIndex   ?? 0.0;
  const newIndex       = parseFloat(((currentIndex + confidence) / 2).toFixed(4));

  const sessionDelta   = analyzeSpendSensitivity(sessionData.dwellOnPremium);
  const storedLuxury   = prev.luxuryThresholdScore ?? 50;
  // 70% weight on stored history, 30% from this session's delta
  const newLuxury      = Math.max(0, Math.min(100,
    Math.round(storedLuxury * 0.7 + (storedLuxury + sessionDelta) * 0.3),
  ));

  const newVisitCount  = (prev.visitCount ?? 0) + 1;
  const pacing         = derivePacingPreference(sessionData.avgSwipeMs);
  const cluster        = deriveSocialCluster(sessionData.groupSize ?? 1, newIndex);
  const emotionalState = Math.max(0, Math.min(100, sessionData.emotionalScore));

  // ── Evolution snapshot (appended to history, last 20 kept) ───────────────

  const snapshot: EvolutionSnapshot = {
    evolvedAt:            new Date().toISOString(),
    explorationIndex:     newIndex,
    luxuryThresholdScore: newLuxury,
    emotionalState,
    confidenceContrib:    confidence,
    visitCount:           newVisitCount,
  };

  const prevHistory: EvolutionSnapshot[] = Array.isArray(prev.evolutionHistory)
    ? prev.evolutionHistory
    : [];
  const newHistory = [...prevHistory, snapshot].slice(-20);

  // ── Upsert guest_identity_evolution ───────────────────────────────────────

  await db
    .insert(guestIdentityEvolutionTable)
    .values({
      identityId:                guestId,
      explorationIndex:          newIndex,
      luxuryThresholdScore:      newLuxury,
      lastSessionEmotionalState: emotionalState,
      visitCount:                newVisitCount,
      pacingPreference:          pacing,
      socialBehaviorCluster:     cluster,
      evolutionHistory:          newHistory,
      lastEvolvedAt:             new Date(),
    })
    .onConflictDoUpdate({
      target: guestIdentityEvolutionTable.identityId,
      set: {
        explorationIndex:          newIndex,
        luxuryThresholdScore:      newLuxury,
        lastSessionEmotionalState: emotionalState,
        visitCount:                newVisitCount,
        pacingPreference:          pacing,
        socialBehaviorCluster:     cluster,
        evolutionHistory:          newHistory,
        lastEvolvedAt:             new Date(),
      },
    });

  // ── Increment session_count + last_seen_at on guest_profiles ─────────────

  await db
    .update(guestProfilesTable)
    .set({
      sessionCount: sql`${guestProfilesTable.sessionCount} + 1`,
      lastSeenAt:   new Date(),
    })
    .where(eq(guestProfilesTable.id, guestId));

  logger.info(
    {
      guestId, newIndex, newLuxury, confidence,
      pacing, cluster, visitCount: newVisitCount,
    },
    "guest identity evolved",
  );

  return {
    guestId,
    explorationIndex:          newIndex,
    luxuryThresholdScore:      newLuxury,
    lastSessionEmotionalState: emotionalState,
    visitCount:                newVisitCount,
    pacingPreference:          pacing,
    socialBehaviorCluster:     cluster,
    confidenceContrib:         confidence,
    snapshot,
  };
}

// ── getEvolution ──────────────────────────────────────────────────────────────

export async function getEvolution(guestId: string) {
  const [row] = await db
    .select()
    .from(guestIdentityEvolutionTable)
    .where(eq(guestIdentityEvolutionTable.identityId, guestId));

  return row ?? null;
}
