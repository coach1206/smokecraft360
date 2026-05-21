/**
 * POSOrchestrator — Phase 2: Provider Abstraction
 *
 * Routes POS operations through the existing providerFailover mechanism.
 * Business logic never imports provider-specific adapters directly.
 */

import { logger }            from "../../lib/logger";
import { getActiveProvider } from "../../integrations/resilience/providerFailover";

type POSProvider = "toast" | "square" | "clover" | "lightspeed" | "offline_mode";

export interface POSCreateOrderOptions {
  venueId: string;
  primary: POSProvider;
  orderId: string;
}

export const POSOrchestrator = {
  /** Returns the currently active POS provider for a venue, respecting failover. */
  getActiveProvider(venueId: string, primary: POSProvider): string {
    return getActiveProvider(primary, venueId);
  },

  /** Logs a routing decision — actual dispatch is handled by the existing adapter layer. */
  logRouting(venueId: string, primary: POSProvider): void {
    const active = getActiveProvider(primary, venueId);
    if (active !== primary) {
      logger.warn({ venueId, primary, active }, "POSOrchestrator: failover active");
    } else {
      logger.info({ venueId, provider: active }, "POSOrchestrator: routing to primary");
    }
  },
};
