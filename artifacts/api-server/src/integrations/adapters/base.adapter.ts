/**
 * base.adapter — Enhanced POS adapter contract for the universal integration layer.
 *
 * Extends the original posAdapters/baseAdapter contract with:
 *   - Universal schema types (UniversalOrder, UniversalInventoryItem, UniversalMenuItem)
 *   - OAuth support (authorizeUrl, exchangeCode, refreshToken)
 *   - Webhook signature verification per-provider
 *   - Menu catalog sync
 *   - Adapter capabilities declaration
 */

import type { UniversalOrder }          from "../schemas/universalOrder";
import type { UniversalInventoryItem }  from "../schemas/universalInventory";
import type { UniversalMenuItem }       from "../schemas/universalMenu";

export type PosProvider = "clover" | "toast" | "square" | "lightspeed" | "shopify" | "ncr" | "micros" | "manual_import";

export interface AdapterCredentials {
  accessToken?:   string;
  refreshToken?:  string;
  apiSecret?:     string;
  merchantId?:    string;
  locationId?:    string;
  clientId?:      string;
  clientSecret?:  string;
  webhookSecret?: string;
}

export interface AdapterCapabilities {
  supportsOAuth:         boolean;
  supportsWebhooks:      boolean;
  supportsMenuSync:      boolean;
  supportsInventorySync: boolean;
  supportsOrderPush:     boolean;
  supportsRefunds:       boolean;
  requiresLocationId:    boolean;
}

export interface PushOrderResult {
  success:         boolean;
  externalOrderId?: string;
  provider:        string;
  error?:          string;
  rawResponse?:    unknown;
}

export interface TokenResponse {
  accessToken:    string;
  refreshToken?:  string;
  expiresIn?:     number;
  tokenType?:     string;
  scopes?:        string;
}

export interface UniversalPosAdapter {
  readonly provider:     PosProvider;
  readonly displayName:  string;
  readonly capabilities: AdapterCapabilities;

  syncInventory(creds: AdapterCredentials, venueId: string): Promise<UniversalInventoryItem[]>;
  syncMenuCatalog(creds: AdapterCredentials, venueId: string): Promise<UniversalMenuItem[]>;
  pushOrder(creds: AdapterCredentials, order: UniversalOrder): Promise<PushOrderResult>;
  syncOrders(creds: AdapterCredentials, since?: Date): Promise<UniversalOrder[]>;

  getAuthorizationUrl?(clientId: string, redirectUri: string, state: string): string;
  exchangeCode?(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<TokenResponse>;
  refreshToken?(creds: AdapterCredentials): Promise<TokenResponse>;

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean;
}
