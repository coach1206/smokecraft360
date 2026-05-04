import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";

export const cloverAdapter: BasePosAdapter = {
  name: "clover",
  displayName: "Clover POS",
  connected: false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    return [
      { id: "clov-prod-1", name: "Cohiba Behike 52", category: "Cigars", priceCents: 6800, sku: "CLV-COH-001" },
      { id: "clov-prod-2", name: "Blanton's Single Barrel", category: "Spirits", priceCents: 2200, sku: "CLV-BLA-001" },
      { id: "clov-prod-3", name: "Sour Ale 12oz", category: "Beer", priceCents: 800, sku: "CLV-SA-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    return [
      { productId: "clov-prod-1", productName: "Cohiba Behike 52", quantity: 5, available: true, lastUpdated: new Date().toISOString() },
      { productId: "clov-prod-2", productName: "Blanton's Single Barrel", quantity: 12, available: true, lastUpdated: new Date().toISOString() },
      { productId: "clov-prod-3", productName: "Sour Ale 12oz", quantity: 72, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
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
    return { success: true, externalId: `CLV-${Date.now()}` };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
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
