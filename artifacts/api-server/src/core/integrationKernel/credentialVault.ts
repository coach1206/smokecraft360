/**
 * Credential Vault — Phase 4: Encrypted credential storage
 *
 * Wraps AES-256-GCM encryption (existing lib/encryption.ts) with
 * a DB-backed vault for integration provider credentials.
 *
 * NEVER stores raw secrets.
 * All read operations decrypt in-process; keys never leave the server.
 */

import { pool }          from "@workspace/db";
import { encryptField, decryptField, isEncryptionConfigured } from "../../lib/encryption";
import { logger }        from "../../lib/logger";
import type { IntegrationProvider, WebhookConfig, UsageLimits, ProviderCategory, ProviderHealth } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Schema DDL — idempotent, runs once on startup
───────────────────────────────────────────────────────────────────────────── */

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS integration_providers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id              UUID NOT NULL,
    provider_name         TEXT NOT NULL,
    provider_type         TEXT NOT NULL,
    display_name          TEXT NOT NULL DEFAULT '',
    encrypted_credentials TEXT,
    endpoint_url          TEXT,
    region                TEXT,
    webhook_config        JSONB,
    usage_limits          JSONB,
    failover_provider_id  UUID,
    is_primary            BOOLEAN NOT NULL DEFAULT false,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    last_tested_at        TIMESTAMPTZ,
    last_used_at          TIMESTAMPTZ,
    last_health_status    TEXT NOT NULL DEFAULT 'unchecked',
    last_health_checked_at TIMESTAMPTZ,
    error_message         TEXT,
    created_by            UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, provider_name)
  );
  CREATE INDEX IF NOT EXISTS idx_integration_providers_venue
    ON integration_providers (venue_id);
  CREATE INDEX IF NOT EXISTS idx_integration_providers_type
    ON integration_providers (venue_id, provider_type);

  CREATE TABLE IF NOT EXISTS integration_usage (
    id            BIGSERIAL PRIMARY KEY,
    venue_id      UUID NOT NULL,
    provider_id   UUID NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
    bucket_date   DATE NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    token_count   BIGINT NOT NULL DEFAULT 0,
    cost_cents    INT NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, provider_id, bucket_date)
  );
`;

let schemaReady = false;

export async function ensureVaultSchema(): Promise<void> {
  if (schemaReady) return;
  try {
    await pool.query(CREATE_TABLE);
    schemaReady = true;
    logger.info("credentialVault: schema ready");
  } catch (err) {
    logger.error({ err }, "credentialVault: schema init failed");
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Credential pack — what gets encrypted into the vault
───────────────────────────────────────────────────────────────────────────── */

export interface CredentialPack {
  apiKey?:       string;
  apiSecret?:    string;
  webhookSecret?: string;
  oauthToken?:   string;
  oauthRefresh?: string;
  customHeaders?: Record<string, string>;
  extra?:        Record<string, string>;
}

function packCredentials(creds: CredentialPack): string {
  if (!isEncryptionConfigured()) {
    throw new Error("credentialVault: DATA_ENCRYPTION_KEY not configured — refusing to store credentials");
  }
  return encryptField(JSON.stringify(creds));
}

function unpackCredentials(encrypted: string | null): CredentialPack {
  if (!encrypted) return {};
  try {
    return JSON.parse(decryptField(encrypted)) as CredentialPack;
  } catch {
    logger.warn("credentialVault: failed to decrypt credentials");
    return {};
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CRUD
───────────────────────────────────────────────────────────────────────────── */

export interface UpsertProviderInput {
  venueId:             string;
  providerName:        string;
  providerType:        ProviderCategory;
  displayName?:        string;
  credentials?:        CredentialPack;
  endpointUrl?:        string | null;
  region?:             string | null;
  webhookConfig?:      WebhookConfig | null;
  usageLimits?:        UsageLimits | null;
  failoverProviderId?: string | null;
  isPrimary?:          boolean;
  isActive?:           boolean;
  createdBy?:          string | null;
}

export async function upsertProvider(input: UpsertProviderInput): Promise<IntegrationProvider> {
  await ensureVaultSchema();

  const encCreds = input.credentials && Object.keys(input.credentials).length > 0
    ? packCredentials(input.credentials)
    : null;

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO integration_providers
       (venue_id, provider_name, provider_type, display_name, encrypted_credentials,
        endpoint_url, region, webhook_config, usage_limits, failover_provider_id,
        is_primary, is_active, created_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
     ON CONFLICT (venue_id, provider_name) DO UPDATE SET
       provider_type        = EXCLUDED.provider_type,
       display_name         = EXCLUDED.display_name,
       encrypted_credentials = COALESCE(EXCLUDED.encrypted_credentials, integration_providers.encrypted_credentials),
       endpoint_url         = EXCLUDED.endpoint_url,
       region               = EXCLUDED.region,
       webhook_config       = EXCLUDED.webhook_config,
       usage_limits         = EXCLUDED.usage_limits,
       failover_provider_id = EXCLUDED.failover_provider_id,
       is_primary           = EXCLUDED.is_primary,
       is_active            = EXCLUDED.is_active,
       updated_at           = NOW()
     RETURNING *`,
    [
      input.venueId, input.providerName, input.providerType,
      input.displayName ?? input.providerName,
      encCreds, input.endpointUrl ?? null, input.region ?? null,
      input.webhookConfig ? JSON.stringify(input.webhookConfig) : null,
      input.usageLimits  ? JSON.stringify(input.usageLimits)  : null,
      input.failoverProviderId ?? null,
      input.isPrimary ?? false, input.isActive ?? true,
      input.createdBy ?? null,
    ],
  );

  return rowToProvider(rows[0]!);
}

export async function listProviders(venueId: string, type?: ProviderCategory): Promise<IntegrationProvider[]> {
  await ensureVaultSchema();
  const { rows } = type
    ? await pool.query<Record<string, unknown>>(
        `SELECT * FROM integration_providers WHERE venue_id=$1 AND provider_type=$2 ORDER BY is_primary DESC, provider_name ASC`,
        [venueId, type],
      )
    : await pool.query<Record<string, unknown>>(
        `SELECT * FROM integration_providers WHERE venue_id=$1 ORDER BY provider_type, is_primary DESC, provider_name ASC`,
        [venueId],
      );
  return rows.map(rowToProvider);
}

export async function getProviderById(id: string, venueId: string): Promise<IntegrationProvider | null> {
  await ensureVaultSchema();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM integration_providers WHERE id=$1 AND venue_id=$2 LIMIT 1`,
    [id, venueId],
  );
  return rows[0] ? rowToProvider(rows[0]) : null;
}

export async function readCredentials(id: string, venueId: string): Promise<CredentialPack> {
  await ensureVaultSchema();
  const { rows } = await pool.query<{ encrypted_credentials: string | null }>(
    `SELECT encrypted_credentials FROM integration_providers WHERE id=$1 AND venue_id=$2 LIMIT 1`,
    [id, venueId],
  );
  if (!rows[0]) throw new Error("Provider not found");
  return unpackCredentials(rows[0].encrypted_credentials);
}

export async function updateHealthStatus(
  id:       string,
  venueId:  string,
  status:   ProviderHealth,
  errorMsg: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE integration_providers
     SET last_health_status=$3, last_health_checked_at=NOW(), error_message=$4, updated_at=NOW()
     WHERE id=$1 AND venue_id=$2`,
    [id, venueId, status, errorMsg],
  );
}

export async function markLastUsed(id: string): Promise<void> {
  await pool.query(
    `UPDATE integration_providers SET last_used_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [id],
  );
}

export async function markTested(id: string, venueId: string): Promise<void> {
  await pool.query(
    `UPDATE integration_providers SET last_tested_at=NOW(), updated_at=NOW() WHERE id=$1 AND venue_id=$2`,
    [id, venueId],
  );
}

export async function deleteProvider(id: string, venueId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM integration_providers WHERE id=$1 AND venue_id=$2`,
    [id, venueId],
  );
  return (rowCount ?? 0) > 0;
}

export async function setPrimary(id: string, venueId: string, type: ProviderCategory): Promise<void> {
  await pool.query(
    `UPDATE integration_providers SET is_primary=false, updated_at=NOW()
     WHERE venue_id=$1 AND provider_type=$2`,
    [venueId, type],
  );
  await pool.query(
    `UPDATE integration_providers SET is_primary=true, updated_at=NOW()
     WHERE id=$1 AND venue_id=$2`,
    [id, venueId],
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Usage metering
───────────────────────────────────────────────────────────────────────────── */

export async function recordUsage(
  venueId:    string,
  providerId: string,
  tokens:     number,
  costCents:  number,
): Promise<void> {
  const bucket = new Date().toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO integration_usage (venue_id, provider_id, bucket_date, request_count, token_count, cost_cents)
     VALUES ($1,$2,$3,1,$4,$5)
     ON CONFLICT (venue_id, provider_id, bucket_date) DO UPDATE SET
       request_count = integration_usage.request_count + 1,
       token_count   = integration_usage.token_count   + EXCLUDED.token_count,
       cost_cents    = integration_usage.cost_cents    + EXCLUDED.cost_cents,
       updated_at    = NOW()`,
    [venueId, providerId, bucket, tokens, costCents],
  );
}

export async function getUsage(venueId: string, days = 30): Promise<{
  providerId: string; bucketDate: string; requestCount: number; tokenCount: number; costCents: number;
}[]> {
  const { rows } = await pool.query(
    `SELECT provider_id as "providerId", bucket_date::text as "bucketDate",
            request_count as "requestCount", token_count as "tokenCount", cost_cents as "costCents"
     FROM integration_usage
     WHERE venue_id=$1 AND bucket_date >= NOW() - INTERVAL '${days} days'
     ORDER BY bucket_date DESC, cost_cents DESC`,
    [venueId],
  );
  return rows as { providerId: string; bucketDate: string; requestCount: number; tokenCount: number; costCents: number; }[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   Row mapper
───────────────────────────────────────────────────────────────────────────── */

function rowToProvider(row: Record<string, unknown>): IntegrationProvider {
  return {
    id:                  row["id"] as string,
    venueId:             row["venue_id"] as string,
    providerName:        row["provider_name"] as string,
    providerType:        row["provider_type"] as ProviderCategory,
    displayName:         (row["display_name"] as string) ?? "",
    endpointUrl:         (row["endpoint_url"] as string | null) ?? null,
    region:              (row["region"] as string | null) ?? null,
    webhookConfig:       (row["webhook_config"] as WebhookConfig | null) ?? null,
    usageLimits:         (row["usage_limits"] as UsageLimits | null) ?? null,
    failoverProviderId:  (row["failover_provider_id"] as string | null) ?? null,
    isPrimary:           (row["is_primary"] as boolean) ?? false,
    isActive:            (row["is_active"] as boolean) ?? true,
    lastTestedAt:        row["last_tested_at"] ? new Date(row["last_tested_at"] as string) : null,
    lastUsedAt:          row["last_used_at"]   ? new Date(row["last_used_at"]   as string) : null,
    lastHealthStatus:    (row["last_health_status"] as ProviderHealth) ?? "unchecked",
    lastHealthCheckedAt: row["last_health_checked_at"] ? new Date(row["last_health_checked_at"] as string) : null,
    errorMessage:        (row["error_message"] as string | null) ?? null,
    createdBy:           (row["created_by"]   as string | null) ?? null,
    createdAt:           new Date(row["created_at"] as string),
    updatedAt:           new Date(row["updated_at"] as string),
  };
}
