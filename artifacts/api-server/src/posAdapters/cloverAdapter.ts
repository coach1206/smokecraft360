/**
 * cloverAdapter — SIMULATED stub adapter.
 *
 * All methods return fixture data. Replace with real Clover REST API calls
 * (https://docs.clover.com/reference) when a Clover API token is provisioned
 * and stored in the CLOVER_API_TOKEN secret.
 *
 * simulated: true — flag consumed by posAdapterFactory to annotate
 * all responses with a "simulated" warning in logs and API responses.
 */
import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";
import { logger } from "../lib/logger";

const SIMULATED_WARN = "[CloverAdapter] returning simulated fixture data — not connected to real Clover POS";

export const cloverAdapter: BasePosAdapter & { simulated: true } = {
  name: "clover",
  displayName: "Clover POS (Simulated)",
  connected: false,
  simulated: true,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    logger.warn(SIMULATED_WARN);
    return [
      { id: "clov-prod-1", name: "Cohiba Behike 52", category: "Cigars", priceCents: 6800, sku: "CLV-COH-001" },
      { id: "clov-prod-2", name: "Blanton's Single Barrel", category: "Spirits", priceCents: 2200, sku: "CLV-BLA-001" },
      { id: "clov-prod-3", name: "Sour Ale 12oz", category: "Beer", priceCents: 800, sku: "CLV-SA-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    logger.warn(SIMULATED_WARN);
    return [
      { productId: "clov-prod-1", productName: "Cohiba Behike 52", quantity: 5, available: true, lastUpdated: new Date().toISOString() },
      { productId: "clov-prod-2", productName: "Blanton's Single Barrel", quantity: 12, available: true, lastUpdated: new Date().toISOString() },
      { productId: "clov-prod-3", productName: "Sour Ale 12oz", quantity: 72, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    logger.warn(SIMULATED_WARN);
    return [
      {
        id: "clov-ord-1", externalId: "CLV-991204",
        items: [
          { productId: "clov-prod-1", name: "Cohiba Behike 52", quantity: 1, priceCents: 6800 },
          { productId: "clov-prod-2", name: "Blanton's Single Barrel", quantity: 2, priceCents: 2200 },
        ],
        totalCents: 11200, status: "completed", createdAt: new Date(Date.now() - 5400000).toISOString(),
      },
    ];
  },

  async pushOrder(_config: PosAdapterConfig, _order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    logger.warn(SIMULATED_WARN);
    return { success: true, externalId: `CLV-SIM-${Date.now()}` };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    logger.warn(SIMULATED_WARN);
    return {
      periodStart, periodEnd,
      totalRevenueCents: 156300,
      orderCount: 22,
      topProducts: [
        { productId: "clov-prod-1", name: "Cohiba Behike 52", unitsSold: 6, revenueCents: 40800 },
        { productId: "clov-prod-2", name: "Blanton's Single Barrel", unitsSold: 10, revenueCents: 22000 },
      ],
    };
  },
};
