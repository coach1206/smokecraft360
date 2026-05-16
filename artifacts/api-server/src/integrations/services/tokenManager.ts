/**
 * tokenManager — Encrypted merchant credential vault.
 *
 * Stores OAuth tokens and API secrets in AES-256-GCM encrypted columns.
 * Handles token expiry detection, automatic refresh scheduling, and
 * revocation. Every read decrypts on the fly; every write encrypts.
 *
 * Multi-tenant: all ops are scoped by (connectionId, venueId).
 */

import { eq, and } from "drizzle-orm";
import { db, posTokensTable } from "@workspace/db";
import { tryEncrypt, tryDecrypt } from "../../lib/encryption";
import { logger } from "../../lib/logger";
import type { TokenResponse } from "../adapters/base.adapter";

export interface StoredCredentials {
  accessToken:    string;
  refreshToken?:  string;
  apiSecret?:     string;
  expiresAt?:     Date;
  isExpired:      boolean;
  expiresInMs?:   number;
}

export const tokenManager = {

  async store(params: {
    connectionId:   string;
    venueId:        string;
    provider:       string;
    accessToken:    string;
    refreshToken?:  string;
    apiSecret?:     string;
    tokenType?:     string;
    scopes?:        string;
    expiresIn?:     number;
  }): Promise<void> {
    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 1000)
      : undefined;

    const encAccess   = tryEncrypt(params.accessToken);
    const encRefresh  = params.refreshToken  ? tryEncrypt(params.refreshToken)  : null;
    const encSecret   = params.apiSecret     ? tryEncrypt(params.apiSecret)     : null;

    const existing = await db.select({ id: posTokensTable.id })
      .from(posTokensTable)
      .where(and(
        eq(posTokensTable.connectionId, params.connectionId),
        eq(posTokensTable.venueId,      params.venueId),
      ))
      .limit(1);

    if (existing[0]) {
      await db.update(posTokensTable)
        .set({
          encryptedAccessToken:  encAccess,
          encryptedRefreshToken: encRefresh,
          encryptedApiSecret:    encSecret,
          tokenType:             params.tokenType ?? "Bearer",
          scopes:                params.scopes ?? null,
          expiresAt:             expiresAt ?? null,
          isRevoked:             false,
          updatedAt:             new Date(),
        })
        .where(eq(posTokensTable.id, existing[0].id));
    } else {
      await db.insert(posTokensTable).values({
        connectionId:          params.connectionId,
        venueId:               params.venueId,
        provider:              params.provider,
        encryptedAccessToken:  encAccess,
        encryptedRefreshToken: encRefresh,
        encryptedApiSecret:    encSecret,
        tokenType:             params.tokenType ?? "Bearer",
        scopes:                params.scopes ?? null,
        expiresAt:             expiresAt ?? null,
        isRevoked:             false,
      });
    }
    logger.info({ connectionId: params.connectionId, provider: params.provider }, "Token stored");
  },

  async get(connectionId: string, venueId: string): Promise<StoredCredentials | null> {
    const rows = await db.select().from(posTokensTable)
      .where(and(
        eq(posTokensTable.connectionId, connectionId),
        eq(posTokensTable.venueId,      venueId),
        eq(posTokensTable.isRevoked,    false),
      ))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const now         = Date.now();
    const expiresAt   = row.expiresAt ?? undefined;
    const expiresInMs = expiresAt ? expiresAt.getTime() - now : undefined;
    const isExpired   = expiresAt ? expiresAt.getTime() < now : false;

    return {
      accessToken:   tryDecrypt(row.encryptedAccessToken),
      refreshToken:  row.encryptedRefreshToken ? tryDecrypt(row.encryptedRefreshToken) : undefined,
      apiSecret:     row.encryptedApiSecret    ? tryDecrypt(row.encryptedApiSecret)    : undefined,
      expiresAt,
      isExpired,
      expiresInMs,
    };
  },

  async revoke(connectionId: string, venueId: string): Promise<void> {
    await db.update(posTokensTable)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(and(
        eq(posTokensTable.connectionId, connectionId),
        eq(posTokensTable.venueId,      venueId),
      ));
    logger.info({ connectionId, venueId }, "Token revoked");
  },

  async storeRefreshed(connectionId: string, venueId: string, provider: string, result: TokenResponse): Promise<void> {
    await tokenManager.store({
      connectionId, venueId, provider,
      accessToken:   result.accessToken,
      refreshToken:  result.refreshToken,
      tokenType:     result.tokenType,
      scopes:        result.scopes,
      expiresIn:     result.expiresIn,
    });
    await db.update(posTokensTable)
      .set({ lastRefreshedAt: new Date() })
      .where(and(
        eq(posTokensTable.connectionId, connectionId),
        eq(posTokensTable.venueId,      venueId),
      ));
  },

  isNearExpiry(creds: StoredCredentials, thresholdMs = 5 * 60 * 1000): boolean {
    if (!creds.expiresAt) return false;
    return creds.expiresAt.getTime() - Date.now() < thresholdMs;
  },
};
