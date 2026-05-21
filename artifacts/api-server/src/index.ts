import http                     from "http";
import app from "./app";
import { logger }               from "./lib/logger";
import { initSocketServer }     from "./lib/socketServer";
import { initInventory }        from "./engine/inventory";
import { loadCampaigns }        from "./services/campaignStore";
import { loadVenueInventory }   from "./services/venueInventoryStore";
import { refreshTrends, scheduleTrendRefresh } from "./services/trendStore";
import { loadBrandPartnerStore }               from "./services/brandPartnerStore";
import { reconcileActiveTournamentScores }     from "./lib/tournamentSync";
import { startTelemetryDigestWorker }          from "./workers/telemetryDigestWorker";
import { startSniperNetwork }                  from "./workers/sniperNetworkWorker";
import { bootKernelProviders }                from "./core/providers/kernelProviderBoot";

// ── Required environment variable guard ───────────────────────────────────────
// Fail fast at startup rather than crashing mid-request or silently misbehaving.

const REQUIRED_ENV: Record<string, string> = {
  PORT:           "Port the server listens on (set automatically by Replit)",
  SESSION_SECRET: "Secret key used to sign JWTs (set as a Replit Secret)",
  DATABASE_URL:   "PostgreSQL connection string (provisioned by Replit)",
};

let envError = false;
for (const [key, description] of Object.entries(REQUIRED_ENV)) {
  if (!process.env[key]) {
    logger.error({ key, description }, `Required environment variable "${key}" is missing`);
    envError = true;
  }
}
if (envError) process.exit(1);

// ── Startup ───────────────────────────────────────────────────────────────────

const port = Number(process.env["PORT"]);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ port: process.env["PORT"] }, "PORT is not a valid number");
  process.exit(1);
}

try {
  logger.info("Initialising inventory from database\u2026");
  await initInventory();
  logger.info("Inventory ready.");
} catch (err) {
  logger.error({ err }, "Failed to initialise inventory — check DATABASE_URL");
  process.exit(1);
}

// Load campaigns after inventory (non-fatal — campaigns are optional)
await loadCampaigns();

// Load brand partner store (non-fatal — partnership engine is optional)
try {
  await loadBrandPartnerStore();
} catch (err) {
  logger.warn({ err }, "Brand partner store load failed — partnership boosts disabled");
}

// Load per-venue inventory cache (non-fatal — falls back to all-available)
try {
  await loadVenueInventory();
} catch (err) {
  logger.warn({ err }, "Venue inventory load failed — treating all products as available");
}

// Seed global trend scores from analytics (non-fatal)
try {
  await refreshTrends();
  scheduleTrendRefresh();
} catch (err) {
  logger.warn({ err }, "Initial trend score load failed — will retry on schedule");
}

// ── Kernel bootstrap — create tables if missing + seed built-in modules ───────
// Runs the 0006_kernel_foundation migration inline so the tables self-provision
// on any fresh environment. All statements are IF NOT EXISTS / ON CONFLICT safe.
try {
  const { db }              = await import("@workspace/db");
  const { sql: drizzleSql } = await import("drizzle-orm");

  // 1. Ensure enums exist (DO $$ … END $$ is idempotent)
  await db.execute(drizzleSql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_module_status') THEN
        CREATE TYPE kernel_module_status AS ENUM ('active', 'inactive', 'suspended');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_craft_type') THEN
        CREATE TYPE kernel_craft_type AS ENUM ('smoke', 'pour', 'brew', 'vape', 'none');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_mode') THEN
        CREATE TYPE kernel_mode AS ENUM ('sovereign', 'essential');
      END IF;
    END $$
  `);

  // 2. Ensure tables exist
  await db.execute(drizzleSql`
    CREATE TABLE IF NOT EXISTS kernel_modules (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      craft_type    kernel_craft_type NOT NULL DEFAULT 'none',
      slug          TEXT NOT NULL UNIQUE,
      status        kernel_module_status NOT NULL DEFAULT 'active',
      description   TEXT,
      launch_url    TEXT,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(drizzleSql`
    CREATE TABLE IF NOT EXISTS kernel_mode_config (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id   UUID NOT NULL UNIQUE,
      mode       kernel_mode NOT NULL DEFAULT 'sovereign',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID
    )
  `);
  await db.execute(drizzleSql`
    CREATE TABLE IF NOT EXISTS kernel_mode_audit_log (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id         UUID NOT NULL,
      old_mode         kernel_mode,
      new_mode         kernel_mode NOT NULL,
      changed_by       UUID,
      changed_by_name  TEXT,
      changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(drizzleSql`
    CREATE INDEX IF NOT EXISTS kernel_mode_audit_log_venue_idx
      ON kernel_mode_audit_log (venue_id, changed_at DESC)
  `);
  await db.execute(drizzleSql`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_id   UUID,
      venue_id    UUID,
      event_type  TEXT NOT NULL,
      payload     JSONB DEFAULT '{}',
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(drizzleSql`
    CREATE INDEX IF NOT EXISTS telemetry_events_type_idx     ON telemetry_events (event_type)
  `);
  await db.execute(drizzleSql`
    CREATE INDEX IF NOT EXISTS telemetry_events_occurred_idx ON telemetry_events (occurred_at)
  `);

  // 3. Seed craft modules (idempotent)
  await db.execute(drizzleSql`
    INSERT INTO kernel_modules (name, craft_type, slug, status, description, launch_url)
    VALUES
      ('Craft: Smoke', 'smoke', 'craft-smoke', 'active',
       'SmokeCraft — luxury cigar recommendation and experience engine', '/'),
      ('Craft: Pour',  'pour',  'craft-pour',  'active',
       'PourCraft — spirits and cocktail recommendation engine', '/pourcraft'),
      ('Craft: Brew',  'brew',  'craft-brew',  'active',
       'BrewCraft — beer and ale recommendation engine', '/brewcraft'),
      ('Craft: Vape',  'vape',  'craft-vape',  'active',
       'VapeCraft — vaporizer flavor recommendation engine', '/vapecraft')
    ON CONFLICT (slug) DO NOTHING
  `);
  logger.info("Kernel bootstrap complete (tables + seed)");
} catch (err) {
  logger.warn({ err }, "Kernel bootstrap failed — /api/kernel may be unavailable");
}

// ── Integration Kernel provider boot — seeds OpenAI, Stripe, ElevenLabs ──────
// Non-fatal: missing env vars are silently skipped; missing DATA_ENCRYPTION_KEY
// registers providers without encrypted credentials (runtime key resolution
// falls back to env vars so existing routes continue to work).
try {
  await bootKernelProviders();
} catch (err) {
  logger.warn({ err }, "kernelProviderBoot: failed — live provider routing degraded to env vars");
}

// ── Integration Kernel schema boot — ALL tables provisioned at startup ────────
// Ensures vault, metrics, devices, webhooks, tenants, audit, and global-controls
// tables are ready before the first HTTP request — not lazily on first route hit.
// Each ensure function is IF NOT EXISTS safe and idempotent.
try {
  const {
    ensureVaultSchema,
    ensureMetricsSchema,
    ensureDeviceSchema,
    ensureWebhookSchema,
    ensureTenantSchema,
    ensureAuditSchema,
    ensureGlobalControlsSchema,
    wireMetricsToEventBus,
  } = await import("./core/integrationKernel");
  await Promise.all([
    ensureVaultSchema(),
    ensureMetricsSchema(),
    ensureDeviceSchema(),
    ensureWebhookSchema(),
    ensureTenantSchema(),
    ensureAuditSchema(),
    ensureGlobalControlsSchema(),
  ]);
  wireMetricsToEventBus();
  logger.info("Integration Kernel: all schemas provisioned at startup");
} catch (err) {
  logger.warn({ err }, "Integration Kernel schema boot: one or more tables may be unavailable");
}

// ── Universal POS Integration Layer — provision tables if missing ─────────────
// All 10 POS/EEIS tables are IF NOT EXISTS safe (idempotent on every restart).
try {
  const { db: posDb }       = await import("@workspace/db");
  const { sql: posSql }     = await import("drizzle-orm");

  // pos_connections — one row per venue × POS system
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_connections (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id     UUID NOT NULL,
      provider     TEXT NOT NULL,
      display_name TEXT NOT NULL,
      merchant_id  TEXT,
      location_id  TEXT,
      webhook_url  TEXT,
      is_default   BOOLEAN NOT NULL DEFAULT FALSE,
      status       TEXT NOT NULL DEFAULT 'pending_auth',
      last_sync_at TIMESTAMPTZ,
      created_by   UUID,
      meta         JSONB NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_connections_venue_idx ON pos_connections (venue_id)
  `);

  // pos_tokens — AES-256-GCM encrypted credential vault
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_tokens (
      id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id            UUID NOT NULL,
      venue_id                 UUID NOT NULL,
      provider                 TEXT NOT NULL,
      encrypted_access_token   TEXT NOT NULL,
      encrypted_refresh_token  TEXT,
      encrypted_api_secret     TEXT,
      token_type               TEXT NOT NULL DEFAULT 'Bearer',
      scopes                   TEXT,
      expires_at               TIMESTAMPTZ,
      is_revoked               BOOLEAN NOT NULL DEFAULT FALSE,
      last_refreshed_at        TIMESTAMPTZ,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_tokens_connection_idx ON pos_tokens (connection_id, venue_id)
  `);

  // pos_menu_mappings — EEIS product ↔ POS item ID mappings
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_menu_mappings (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id       UUID NOT NULL,
      connection_id  UUID NOT NULL,
      provider       TEXT NOT NULL,
      eeis_prod_id   TEXT NOT NULL,
      eeis_name      TEXT NOT NULL,
      pos_prod_id    TEXT NOT NULL,
      pos_name       TEXT NOT NULL,
      pos_category   TEXT,
      pos_price_cents INTEGER,
      sku            TEXT,
      is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      mapped_by      UUID,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_menu_mappings_venue_idx ON pos_menu_mappings (venue_id, eeis_prod_id)
  `);

  // pos_inventory_cache — live inventory from POS (30-min TTL)
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_inventory_cache (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID NOT NULL,
      venue_id      UUID NOT NULL,
      provider      TEXT NOT NULL,
      product_id    TEXT NOT NULL,
      product_name  TEXT NOT NULL,
      quantity      INTEGER NOT NULL DEFAULT 0,
      available     BOOLEAN NOT NULL DEFAULT TRUE,
      price_cents   INTEGER,
      sku           TEXT,
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_inventory_cache_venue_idx ON pos_inventory_cache (venue_id, product_id)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_inventory_cache_expires_idx ON pos_inventory_cache (expires_at)
  `);

  // pos_sync_logs — every inventory/catalog sync attempt
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_sync_logs (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id  UUID NOT NULL,
      venue_id       UUID NOT NULL,
      provider       TEXT NOT NULL,
      sync_type      TEXT NOT NULL,
      status         TEXT NOT NULL,
      item_count     INTEGER NOT NULL DEFAULT 0,
      duration_ms    INTEGER,
      error_message  TEXT,
      triggered_by   TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_sync_logs_connection_idx ON pos_sync_logs (connection_id)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_sync_logs_venue_idx ON pos_sync_logs (venue_id)
  `);

  // pos_webhook_events — dedup + audit trail for all incoming POS webhooks
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_webhook_events (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id     UUID,
      venue_id          UUID,
      provider          TEXT NOT NULL,
      event_type        TEXT NOT NULL,
      external_event_id TEXT,
      status            TEXT NOT NULL DEFAULT 'pending',
      signature_valid   BOOLEAN NOT NULL DEFAULT FALSE,
      raw_payload       JSONB NOT NULL DEFAULT '{}',
      error_message     TEXT,
      idempotency_key   TEXT,
      processed_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE UNIQUE INDEX IF NOT EXISTS pos_webhook_events_idempotency_idx
      ON pos_webhook_events (idempotency_key)
      WHERE idempotency_key IS NOT NULL
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_webhook_events_venue_idx ON pos_webhook_events (venue_id)
  `);

  // pos_retry_queue — exponential-backoff retry for failed POS operations
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_retry_queue (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id    UUID NOT NULL,
      venue_id         UUID NOT NULL,
      provider         TEXT NOT NULL,
      operation        TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      payload          JSONB NOT NULL DEFAULT '{}',
      attempt_count    INTEGER NOT NULL DEFAULT 0,
      max_attempts     INTEGER NOT NULL DEFAULT 5,
      last_attempt_at  TIMESTAMPTZ,
      last_error       TEXT,
      next_retry_at    TIMESTAMPTZ,
      resolved_at      TIMESTAMPTZ,
      idempotency_key  TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_retry_queue_due_idx
      ON pos_retry_queue (status, next_retry_at)
      WHERE status = 'pending'
  `);

  // pos_health_logs — 5-min connectivity probes for health dashboard
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS pos_health_logs (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id     UUID NOT NULL,
      venue_id          UUID NOT NULL,
      provider          TEXT NOT NULL,
      check_type        TEXT NOT NULL,
      result            TEXT NOT NULL,
      response_ms       INTEGER,
      error_message     TEXT,
      token_expires_at  TIMESTAMPTZ,
      is_token_expired  BOOLEAN NOT NULL DEFAULT FALSE,
      consecutive_fails INTEGER NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_health_logs_connection_idx ON pos_health_logs (connection_id)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS pos_health_logs_created_idx ON pos_health_logs (created_at DESC)
  `);

  // device_heartbeats — kiosk / tablet liveness pings
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS device_heartbeats (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id   TEXT NOT NULL,
      venue_id    UUID NOT NULL,
      device_type TEXT NOT NULL DEFAULT 'kiosk',
      status      TEXT NOT NULL DEFAULT 'online',
      app_version TEXT,
      ip_address  TEXT,
      meta        JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS device_heartbeats_device_idx ON device_heartbeats (device_id, created_at DESC)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS device_heartbeats_venue_idx ON device_heartbeats (venue_id)
  `);

  // eeis_order_events — append-only audit trail for all EEIS order lifecycle events
  await posDb.execute(posSql`
    CREATE TABLE IF NOT EXISTS eeis_order_events (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id          TEXT NOT NULL,
      venue_id          UUID NOT NULL,
      user_id           UUID,
      guest_profile_id  UUID,
      session_id        UUID,
      event_type        TEXT NOT NULL,
      provider          TEXT,
      external_order_id TEXT,
      total_cents       INTEGER NOT NULL DEFAULT 0,
      item_count        INTEGER NOT NULL DEFAULT 0,
      idempotency_key   TEXT,
      error_message     TEXT,
      meta              JSONB NOT NULL DEFAULT '{}',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS eeis_order_events_order_idx ON eeis_order_events (order_id)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS eeis_order_events_venue_idx ON eeis_order_events (venue_id, created_at DESC)
  `);
  await posDb.execute(posSql`
    CREATE INDEX IF NOT EXISTS eeis_order_events_user_idx ON eeis_order_events (user_id)
      WHERE user_id IS NOT NULL
  `);

  logger.info("Universal POS Integration Layer: all 10 tables provisioned");
} catch (err) {
  logger.warn({ err }, "POS table provisioning failed — POS integration layer may be unavailable");
}

// ── Autonomous Intelligence Layer — table provisioning ───────────────────────
try {
  const { pool: iPool } = await import("@workspace/db");
  const intelligenceTables = `
    CREATE TABLE IF NOT EXISTS ai_behavior_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT,
      behavior_type TEXT NOT NULL,
      context JSONB NOT NULL DEFAULT '{}',
      outcome TEXT,
      weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ai_behavior_memory_venue_idx ON ai_behavior_memory (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS guest_preference_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT NOT NULL,
      craft_affinity JSONB NOT NULL DEFAULT '{}',
      flavor_vectors JSONB NOT NULL DEFAULT '{}',
      mood_history JSONB NOT NULL DEFAULT '[]',
      visit_count INT NOT NULL DEFAULT 0,
      last_seen TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (venue_id, guest_id)
    );

    CREATE TABLE IF NOT EXISTS venue_behavior_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL UNIQUE,
      peak_hours JSONB NOT NULL DEFAULT '[]',
      avg_session_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
      conversion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      craft_distribution JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orchestration_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID,
      name TEXT NOT NULL,
      condition JSONB NOT NULL,
      action JSONB NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orchestration_rules_venue_idx ON orchestration_rules (venue_id, is_active);

    CREATE TABLE IF NOT EXISTS orchestration_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      trigger TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
      executed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orchestration_decisions_venue_idx ON orchestration_decisions (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS orchestration_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      decision_id UUID,
      action_type TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      result TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orchestration_audit_venue_idx ON orchestration_audit_logs (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ambient_scene_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      scene TEXT NOT NULL,
      trigger TEXT,
      duration_ms INT,
      guest_reaction DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ambient_scene_history_venue_idx ON ambient_scene_history (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS predictive_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT,
      score_type TEXT NOT NULL,
      score DOUBLE PRECISION NOT NULL,
      factors JSONB NOT NULL DEFAULT '{}',
      valid_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS predictive_scores_venue_idx ON predictive_scores (venue_id, score_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS venue_intelligence_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      engagement_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      social_energy DOUBLE PRECISION NOT NULL DEFAULT 0,
      inventory_health DOUBLE PRECISION NOT NULL DEFAULT 0,
      active_guests INT NOT NULL DEFAULT 0,
      active_sessions INT NOT NULL DEFAULT 0,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      window_end TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      period TEXT NOT NULL DEFAULT '5m',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS venue_intelligence_scores_venue_idx ON venue_intelligence_scores (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS automation_guardrails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID,
      rule_name TEXT NOT NULL UNIQUE,
      max_actions_per_hour INT NOT NULL DEFAULT 10,
      cooldown_ms INT NOT NULL DEFAULT 60000,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venue_context_state (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL UNIQUE,
      active_guests INT NOT NULL DEFAULT 0,
      vip_count INT NOT NULL DEFAULT 0,
      engagement_level DOUBLE PRECISION NOT NULL DEFAULT 0,
      social_energy DOUBLE PRECISION NOT NULL DEFAULT 0,
      mood_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      operational_load DOUBLE PRECISION NOT NULL DEFAULT 0,
      inventory_pressure DOUBLE PRECISION NOT NULL DEFAULT 0,
      revenue_momentum DOUBLE PRECISION NOT NULL DEFAULT 0,
      ambient_scene TEXT,
      traffic_trend TEXT NOT NULL DEFAULT 'steady',
      anomaly_detected BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venue_digital_twins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL UNIQUE,
      version INT NOT NULL DEFAULT 1,
      environmental_state JSONB NOT NULL DEFAULT '{}',
      guest_map JSONB NOT NULL DEFAULT '{}',
      flow_nodes JSONB NOT NULL DEFAULT '[]',
      last_updated_at BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venue_state_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      twin_version INT NOT NULL,
      snapshot JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS venue_state_snapshots_venue_idx ON venue_state_snapshots (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS environmental_effectiveness (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      scene TEXT NOT NULL,
      effect_type TEXT NOT NULL,
      before_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      after_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      delta DOUBLE PRECISION NOT NULL DEFAULT 0,
      measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS environmental_effectiveness_venue_idx ON environmental_effectiveness (venue_id, measured_at DESC);

    CREATE TABLE IF NOT EXISTS behavioral_momentum (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      momentum_type TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL DEFAULT 0,
      UNIQUE (venue_id, momentum_type),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS predictive_context_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT,
      context_type TEXT NOT NULL,
      score DOUBLE PRECISION NOT NULL,
      reasoning TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS predictive_context_scores_venue_idx ON predictive_context_scores (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS engagement_score_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT,
      score DOUBLE PRECISION NOT NULL,
      factors JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS engagement_score_history_venue_idx ON engagement_score_history (venue_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS environmental_context (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL UNIQUE,
      lighting_level DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      music_tempo TEXT NOT NULL DEFAULT 'moderate',
      ambient_temperature DOUBLE PRECISION,
      crowd_density DOUBLE PRECISION NOT NULL DEFAULT 0,
      scent_profile TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guest_context_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      guest_id TEXT NOT NULL,
      session_id UUID,
      intent TEXT,
      mood TEXT,
      engagement DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      craft_focus TEXT,
      is_vip BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}',
      UNIQUE (venue_id, guest_id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS guest_context_profiles_venue_idx ON guest_context_profiles (venue_id, updated_at DESC);
  `;

  for (const stmt of intelligenceTables.split(";").map(s => s.trim()).filter(Boolean)) {
    await iPool.query(stmt);
  }
  logger.info("Autonomous Intelligence Layer: all tables provisioned");
} catch (err) {
  logger.warn({ err }, "Intelligence table provisioning failed — intelligence layer may be unavailable");
}

// ── Contextual Cognition Layer — extended table provisioning ──────────────────
try {
  const { pool: cPool } = await import("@workspace/db");
  const cognitionTables = `
    CREATE TABLE IF NOT EXISTS staff_context_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      staff_id UUID NOT NULL,
      role TEXT NOT NULL DEFAULT 'server',
      zone TEXT,
      shift_start_at TIMESTAMPTZ,
      shift_end_at TIMESTAMPTZ,
      active_guests INT NOT NULL DEFAULT 0,
      interaction_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      upsell_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      satisfaction_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      recommendations INT NOT NULL DEFAULT 0,
      conversions INT NOT NULL DEFAULT 0,
      is_on_floor BOOLEAN NOT NULL DEFAULT FALSE,
      energy_level DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      context_metadata JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (venue_id, staff_id)
    );
    CREATE INDEX IF NOT EXISTS scp_venue_idx ON staff_context_profiles (venue_id);
    CREATE INDEX IF NOT EXISTS scp_zone_idx ON staff_context_profiles (venue_id, zone);

    CREATE TABLE IF NOT EXISTS social_engagement_state (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      group_id TEXT,
      group_size INT NOT NULL DEFAULT 1,
      social_energy DOUBLE PRECISION NOT NULL DEFAULT 0,
      conversation_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      shared_orders INT NOT NULL DEFAULT 0,
      viral_moment_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      cluster_type TEXT NOT NULL DEFAULT 'solo',
      dominant_craft TEXT,
      peak_moment_at TIMESTAMPTZ,
      engagement_arc JSONB NOT NULL DEFAULT '[]',
      metadata JSONB NOT NULL DEFAULT '{}',
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ses_venue_idx ON social_engagement_state (venue_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS ses_group_idx ON social_engagement_state (venue_id, group_id);

    CREATE TABLE IF NOT EXISTS temporal_behavior_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      pattern_type TEXT NOT NULL DEFAULT 'hourly',
      hour_of_day INT,
      day_of_week INT,
      week_of_year INT,
      avg_engagement DOUBLE PRECISION NOT NULL DEFAULT 0,
      avg_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
      avg_guest_count DOUBLE PRECISION NOT NULL DEFAULT 0,
      peak_craft TEXT,
      conversion_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      sample_count INT NOT NULL DEFAULT 0,
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
      features JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (venue_id, pattern_type, hour_of_day, day_of_week)
    );
    CREATE INDEX IF NOT EXISTS tbp_venue_idx ON temporal_behavior_patterns (venue_id, pattern_type);

    CREATE TABLE IF NOT EXISTS operational_awareness_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      staff_readiness DOUBLE PRECISION NOT NULL DEFAULT 0,
      guest_satisfaction DOUBLE PRECISION NOT NULL DEFAULT 0,
      inventory_health DOUBLE PRECISION NOT NULL DEFAULT 0,
      social_momentum DOUBLE PRECISION NOT NULL DEFAULT 0,
      temporal_alignment DOUBLE PRECISION NOT NULL DEFAULT 0,
      environmental_fit DOUBLE PRECISION NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'low',
      active_alerts INT NOT NULL DEFAULT 0,
      recommendations JSONB NOT NULL DEFAULT '[]',
      factors JSONB NOT NULL DEFAULT '{}',
      period TEXT NOT NULL DEFAULT '5m',
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS oas_venue_idx ON operational_awareness_scores (venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS oas_risk_idx ON operational_awareness_scores (venue_id, risk_level);

    CREATE TABLE IF NOT EXISTS adaptive_optimization_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      optimization_type TEXT NOT NULL,
      trigger TEXT NOT NULL,
      before_state JSONB NOT NULL DEFAULT '{}',
      after_state JSONB NOT NULL DEFAULT '{}',
      delta_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
      applied BOOLEAN NOT NULL DEFAULT FALSE,
      rolled_back BOOLEAN NOT NULL DEFAULT FALSE,
      outcome TEXT,
      outcome_score DOUBLE PRECISION,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS aol_venue_idx ON adaptive_optimization_logs (venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS aol_type_idx ON adaptive_optimization_logs (venue_id, optimization_type);

    CREATE TABLE IF NOT EXISTS contextual_orchestration_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      event_type TEXT NOT NULL,
      source_system TEXT NOT NULL DEFAULT 'eeis',
      context_snapshot JSONB NOT NULL DEFAULT '{}',
      trigger TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
      priority INT NOT NULL DEFAULT 0,
      actions JSONB NOT NULL DEFAULT '[]',
      executed BOOLEAN NOT NULL DEFAULT FALSE,
      executed_at TIMESTAMPTZ,
      result TEXT,
      replay_key TEXT,
      idempotency_key TEXT UNIQUE,
      ttl_ms INT NOT NULL DEFAULT 300000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS coe_venue_idx ON contextual_orchestration_events (venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS coe_type_idx ON contextual_orchestration_events (venue_id, event_type);
    CREATE INDEX IF NOT EXISTS coe_replay_idx ON contextual_orchestration_events (replay_key);

    CREATE TABLE IF NOT EXISTS orchestration_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      session_id UUID,
      guest_id TEXT,
      event_type TEXT NOT NULL,
      craft_type TEXT,
      payload JSONB NOT NULL DEFAULT '{}',
      score DOUBLE PRECISION,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS oe_venue_idx ON orchestration_events (venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS oe_session_idx ON orchestration_events (session_id);
    CREATE INDEX IF NOT EXISTS oe_type_idx ON orchestration_events (event_type);
    CREATE INDEX IF NOT EXISTS oe_craft_idx ON orchestration_events (craft_type);
    CREATE INDEX IF NOT EXISTS oe_guest_idx ON orchestration_events (guest_id);

    CREATE TABLE IF NOT EXISTS environmental_states (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      scene_id TEXT NOT NULL,
      scene_name TEXT NOT NULL,
      lighting_preset TEXT NOT NULL DEFAULT 'warm',
      music_genre TEXT,
      music_tempo TEXT NOT NULL DEFAULT 'moderate',
      music_volume DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      scent_profile TEXT,
      temperature DOUBLE PRECISION,
      crowd_density DOUBLE PRECISION NOT NULL DEFAULT 0,
      mood_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      atmosphere_index DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      triggered_by TEXT NOT NULL DEFAULT 'system',
      effectiveness_score DOUBLE PRECISION,
      metadata JSONB NOT NULL DEFAULT '{}',
      activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deactivated_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS es_venue_idx ON environmental_states (venue_id, activated_at DESC);
    CREATE INDEX IF NOT EXISTS es_active_idx ON environmental_states (venue_id, is_active);

    CREATE TABLE IF NOT EXISTS engagement_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'venue',
      score_type TEXT NOT NULL DEFAULT 'composite',
      overall_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      interaction_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      retention_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      social_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      craft_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      velocity_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
      factors JSONB NOT NULL DEFAULT '{}',
      window_minutes DOUBLE PRECISION NOT NULL DEFAULT 5,
      period TEXT NOT NULL DEFAULT '5m',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS egs_venue_idx ON engagement_scores (venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS egs_entity_idx ON engagement_scores (entity_id, entity_type);
  `;

  for (const stmt of cognitionTables.split(";").map(s => s.trim()).filter(Boolean)) {
    await cPool.query(stmt);
  }
  logger.info("Contextual Cognition Layer: all 9 extended tables provisioned");
} catch (err) {
  logger.warn({ err }, "Cognition table provisioning failed — extended cognition layer may be unavailable");
}

// ── Intelligence supplemental tables ─────────────────────────────────────────
// orchestrator_events, supply_chain_entries, supply_verification_ledger,
// neural_ingestion_events — defined as Drizzle schemas but need inline provision.
try {
  const { pool: iSupPool } = await import("@workspace/db");
  const intelligenceSupplemental = `
    CREATE TABLE IF NOT EXISTS orchestrator_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID,
      venue_id UUID,
      craft_type TEXT NOT NULL DEFAULT 'smoke',
      mood TEXT NOT NULL DEFAULT 'focused',
      pacing TEXT NOT NULL DEFAULT 'balanced',
      confidence INTEGER NOT NULL DEFAULT 40,
      premium_intent INTEGER NOT NULL DEFAULT 30,
      social_energy INTEGER NOT NULL DEFAULT 40,
      recommendation_pressure INTEGER NOT NULL DEFAULT 50,
      atmosphere_intensity INTEGER NOT NULL DEFAULT 65,
      venue_mode TEXT,
      session_depth INTEGER NOT NULL DEFAULT 0,
      avg_swipe_ms INTEGER NOT NULL DEFAULT 1500,
      skip_ratio NUMERIC(4,3) NOT NULL DEFAULT 0.5,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orc_evt_venue_idx    ON orchestrator_events (venue_id);
    CREATE INDEX IF NOT EXISTS orc_evt_session_idx  ON orchestrator_events (session_id);
    CREATE INDEX IF NOT EXISTS orc_evt_created_idx  ON orchestrator_events (created_at DESC);

    CREATE TABLE IF NOT EXISTS supply_chain_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id VARCHAR(64) NOT NULL,
      sku VARCHAR(128) NOT NULL,
      name VARCHAR(255) NOT NULL,
      on_hand INTEGER NOT NULL DEFAULT 0,
      allocated INTEGER NOT NULL DEFAULT 0,
      reorder_threshold INTEGER NOT NULL DEFAULT 10,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS venue_sku_idx ON supply_chain_entries (venue_id, sku);

    CREATE TABLE IF NOT EXISTS supply_verification_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id UUID NOT NULL REFERENCES supply_chain_entries(id),
      venue_id VARCHAR(64) NOT NULL,
      mutation_type VARCHAR(32) NOT NULL,
      quantity_delta INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      broadcasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS svl_venue_idx ON supply_verification_ledger (venue_id, broadcasted_at DESC);

    CREATE TABLE IF NOT EXISTS neural_ingestion_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID,
      session_id TEXT,
      guest_id TEXT,
      device_id TEXT,
      event_type TEXT NOT NULL,
      raw_payload JSONB,
      dwell_ms REAL,
      hesitation_ms REAL,
      interaction_x REAL,
      interaction_y REAL,
      axiom_processed TEXT NOT NULL DEFAULT 'pending',
      ingestion_phase TEXT NOT NULL DEFAULT 'shadow',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS nie_venue_idx   ON neural_ingestion_events (venue_id);
    CREATE INDEX IF NOT EXISTS nie_session_idx ON neural_ingestion_events (session_id);
    CREATE INDEX IF NOT EXISTS nie_type_idx    ON neural_ingestion_events (event_type);
    CREATE INDEX IF NOT EXISTS nie_phase_idx   ON neural_ingestion_events (axiom_processed);
  `;
  for (const stmt of intelligenceSupplemental.split(";").map(s => s.trim()).filter(Boolean)) {
    await iSupPool.query(stmt);
  }
  logger.info("Intelligence supplemental tables: orchestrator_events, supply_chain_entries, supply_verification_ledger, neural_ingestion_events provisioned");
} catch (err) {
  logger.warn({ err }, "Intelligence supplemental table provisioning failed — supply/orchestrator/neural routes may be unavailable");
}

// ── Users table migration — add telemetry_digest_opt_out if missing ───────────
try {
  const { db: migDb } = await import("@workspace/db");
  const { sql: mSql } = await import("drizzle-orm");
  await migDb.execute(mSql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS telemetry_digest_opt_out BOOLEAN NOT NULL DEFAULT FALSE
  `);
  logger.info("Users migration: telemetry_digest_opt_out column ensured");
} catch (err) {
  logger.warn({ err }, "Users migration for telemetry_digest_opt_out failed — opt-out column may be missing");
}

// Reconcile active tournament scores on startup (non-fatal).
// Recovers any scores lost due to in-flight syncs interrupted by the restart.
// Runs synchronously before the HTTP server binds so the first request sees
// correct ranks. For very large tournaments this adds latency to startup —
// track durationMs in the log to detect if batching becomes necessary.
try {
  const reconcileStart = Date.now();
  await reconcileActiveTournamentScores();
  logger.info({ durationMs: Date.now() - reconcileStart }, "Tournament score reconciliation complete");
} catch (err) {
  logger.warn({ err }, "Tournament score reconciliation failed — leaderboards may be stale");
}

// ── HTTP server + Socket.io ────────────────────────────────────────────────────
// Upgrade from app.listen() → http.createServer() so Socket.io can share
// the same port as the REST API. The Socket.io server mounts at
// /api/socket.io — routed correctly through Replit's shared proxy.

const httpServer = http.createServer(app);
initSocketServer(httpServer);

// Register intelligence & ops WebSocket rooms on top of existing socket server
const { registerIntelligenceRooms } = await import("./realtime/websocketRooms");
const { getIO } = await import("./lib/socketServer");
registerIntelligenceRooms(getIO());

// Developer remote protocol — /developer namespace (JWT-gated)
const { initDeveloperNamespace } = await import("./socket/developerNamespace");
initDeveloperNamespace(getIO());

// Initialize transport-abstracted event bus (postgres by default, redis-swappable)
const { initEventBus } = await import("./realtime/transport/eventBus");
await initEventBus();

// Keep legacy pgPubSub alive for backward-compat with existing legacy subscribers
const { pgPubSub } = await import("./realtime/pgPubSub");
await pgPubSub.init();

// Wire Founder Intelligence WebSocket stream (requires Socket.io to be ready)
const { FounderIntelligenceStream } = await import("./services/founderIntelligenceStream");
FounderIntelligenceStream.init();

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening (HTTP + Socket.io)");
  startTelemetryDigestWorker();
  void startSniperNetwork();
});
