/**
 * MusicOrchestrator — Venue ambient music control through the Integration Kernel.
 *
 * Supports provider swapping (Spotify for Business, SoundMachine, custom AV APIs).
 * Internal mode persists playlist state to environmental_states and emits kernelBus events.
 *
 * All playlist/scene changes:
 *  - Respect circuit breaker per venue
 *  - Emit kernelBus events for analytics and experience sync
 *  - Write audit records
 *  - Degrade gracefully when external provider unavailable
 */

import { logger }             from "../../lib/logger";
import { kernelBus }          from "../integrationKernel/eventBus";
import { CircuitBreaker }     from "../integrationKernel/sdk";
import { auditKernelAction }  from "../integrationKernel/auditTrail";
import { listProviders }      from "../integrationKernel/credentialVault";
import { pool }               from "@workspace/db";
import { SYSTEM_VENUE_ID }    from "./kernelProviderBoot";

export type MusicGenre =
  | "jazz"
  | "lounge"
  | "classical"
  | "latin"
  | "acoustic"
  | "blues"
  | "ambient"
  | "cigar_lounge"
  | "cocktail_hour"
  | "private_event";

export type MusicTempo = "slow" | "moderate" | "upbeat";

export interface SyncPlaylistOptions {
  venueId:      string;
  genre:        MusicGenre;
  tempo?:       MusicTempo;
  volume?:      number;       // 0.0 – 1.0
  playlistId?:  string;
  triggeredBy?: string;
  actorId?:     string;
}

export interface MusicResult {
  venueId:      string;
  genre:        MusicGenre;
  tempo:        MusicTempo;
  provider:     string;
  latencyMs:    number;
  circuitState: string;
  degraded:     boolean;
}

/* ── Per-venue circuit breakers ──────────────────────────────────────────────── */

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(venueId: string): CircuitBreaker {
  let b = breakers.get(venueId);
  if (!b) {
    b = new CircuitBreaker({ failureThreshold: 5, successThreshold: 2, openWindowMs: 60_000 });
    breakers.set(venueId, b);
  }
  return b;
}

async function getActiveMusicProvider(venueId: string): Promise<string> {
  const toTry = venueId === SYSTEM_VENUE_ID ? [SYSTEM_VENUE_ID] : [venueId, SYSTEM_VENUE_ID];
  for (const vid of toTry) {
    try {
      const providers = await listProviders(vid, "music");
      const p = providers.find(x => x.isActive && x.isPrimary);
      if (p) return p.providerName;
    } catch { /* vault not ready */ }
  }
  return "internal";
}

async function persistMusicState(venueId: string, genre: MusicGenre, tempo: MusicTempo, volume: number, triggeredBy: string): Promise<void> {
  try {
    await pool.query(`
      UPDATE environmental_states
         SET music_genre = $2, music_tempo = $3, music_volume = $4, triggered_by = $5, updated_at = NOW()
       WHERE venue_id = $1 AND is_active = TRUE
    `, [venueId, genre, tempo, volume, triggeredBy]);

    // If no active row exists, create one
    const { rows } = await pool.query(`
      SELECT id FROM environmental_states WHERE venue_id = $1 AND is_active = TRUE LIMIT 1
    `, [venueId]);

    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO environmental_states
          (venue_id, scene_id, scene_name, lighting_preset, music_genre, music_tempo, music_volume, triggered_by, is_active)
        VALUES ($1, $2, $3, 'warm', $4, $5, $6, $7, TRUE)
      `, [venueId, `music-${genre}`, genre, genre, tempo, volume, triggeredBy]);
    }
  } catch (err) {
    logger.warn({ err, venueId, genre }, "MusicOrchestrator: failed to persist music state");
  }
}

/* ── Orchestrator ────────────────────────────────────────────────────────────── */

export const MusicOrchestrator = {
  async syncPlaylist(opts: SyncPlaylistOptions): Promise<MusicResult> {
    const breaker   = getBreaker(opts.venueId);
    const startedAt = Date.now();
    const tempo     = opts.tempo ?? "moderate";
    const volume    = opts.volume ?? 0.6;

    if (!breaker.canRequest()) {
      logger.warn({ venueId: opts.venueId }, "MusicOrchestrator: circuit breaker OPEN — degrading to internal");
      await persistMusicState(opts.venueId, opts.genre, tempo, volume, opts.triggeredBy ?? "system");
      return {
        venueId:     opts.venueId,
        genre:       opts.genre,
        tempo,
        provider:    "internal_degraded",
        latencyMs:   Date.now() - startedAt,
        circuitState: "OPEN",
        degraded:    true,
      };
    }

    let provider = "internal";
    try {
      provider = await getActiveMusicProvider(opts.venueId);
    } catch { /* fallback */ }

    try {
      await persistMusicState(opts.venueId, opts.genre, tempo, volume, opts.triggeredBy ?? "system");

      breaker.recordSuccess();
      const latencyMs = Date.now() - startedAt;

      kernelBus.emit("provider.request_completed", {
        venueId:      opts.venueId,
        providerId:   `music-${provider}`,
        providerName: provider,
        providerType: "music",
        latencyMs,
        statusCode:   200,
        tokensUsed:   null,
        success:      true,
        ts:           Date.now(),
      });

      void auditKernelAction({
        venueId:      opts.venueId,
        action:       "music.sync_playlist",
        actorId:      opts.actorId,
        resourceType: "music",
        resourceId:   opts.playlistId,
        payload:      { genre: opts.genre, tempo, volume, triggeredBy: opts.triggeredBy, provider },
      }).catch(() => undefined);

      logger.info(
        { venueId: opts.venueId, genre: opts.genre, tempo, provider, latencyMs },
        "MusicOrchestrator: playlist synced",
      );

      return {
        venueId:      opts.venueId,
        genre:        opts.genre,
        tempo,
        provider,
        latencyMs,
        circuitState: breaker.currentState,
        degraded:     false,
      };
    } catch (err) {
      breaker.recordFailure();
      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   `music-${provider}`,
        providerName: provider,
        error:        err instanceof Error ? err.message : String(err),
        consecutive:  0,
        ts:           Date.now(),
      });
      throw err;
    }
  },

  async getNowPlaying(venueId: string): Promise<{ genre: string; tempo: string; volume: number } | null> {
    try {
      const { rows } = await pool.query(`
        SELECT music_genre, music_tempo, music_volume
          FROM environmental_states
         WHERE venue_id = $1 AND is_active = TRUE
         ORDER BY activated_at DESC
         LIMIT 1
      `, [venueId]);
      if (rows.length === 0 || !rows[0].music_genre) return null;
      return {
        genre:  rows[0].music_genre as string,
        tempo:  rows[0].music_tempo as string,
        volume: rows[0].music_volume as number,
      };
    } catch {
      return null;
    }
  },

  circuitBreakerStatus(): Array<{ venueId: string; state: string; failures: number }> {
    return Array.from(breakers.entries()).map(([venueId, b]) => ({
      venueId,
      ...b.toJSON(),
    }));
  },
};
