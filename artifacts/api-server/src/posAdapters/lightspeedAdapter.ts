import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";

export const lightspeedAdapter: BasePosAdapter = {
  name: "lightspeed",
  displayName: "Lightspeed POS",
  connected: false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    return [
      { id: "ls-prod-1", name: "My Father Le Bijou 1922", category: "Cigars", priceCents: 2800, sku: "LS-MF-001" },
      { id: "ls-prod-2", name: "Hibiki Harmony", category: "Spirits", priceCents: 3500, sku: "LS-HH-001" },
      { id: "ls-prod-3", name: "Barrel-Aged Stout", category: "Beer", priceCents: 1400, sku: "LS-BAS-001" },
      { id: "ls-prod-4", name: "Truffle Fries", category: "Food", priceCents: 1200, sku: "LS-TF-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    return [
      { productId: "ls-prod-1", productName: "My Father Le Bijou 1922", quantity: 20, available: true, lastUpdated: new Date().toISOString() },
      { productId: "ls-prod-2", productName: "Hibiki Harmony", quantity: 6, available: true, lastUpdated: new Date().toISOString() },
      { productId: "ls-prod-3", productName: "Barrel-Aged Stout", quantity: 24, available: true, lastUpdated: new Date().toISOString() },
      { productId: "ls-prod-4", productName: "Truffle Fries", quantity: 15, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    return [
      {
        id: "ls-ord-1", externalId: "LS-20260504-001",
        items: [
          { productId: "ls-prod-2", name: "Hibiki Harmony", quantity: 1, priceCents: 3500 },
          { productId: "ls-prod-4", name: "Truffle Fries", quantity: 1, priceCents: 1200 },
        ],
        totalCents: 4700, status: "completed", createdAt: new Date(Date.now() - 2700000).toISOString(),
      },
    ];
  },

  async pushOrder(_config: PosAdapterConfig, _order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    return { success: true, externalId: `LS-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 999).toString().padStart(3, "0")}` };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    return {
      periodStart, periodEnd,
      totalRevenueCents: 221400,
      orderCount: 38,
      topProducts: [
        { productId: "ls-prod-1", name: "My Father Le Bijou 1922", unitsSold: 16, revenueCents: 44800 },
        { productId: "ls-prod-2", name: "Hibiki Harmony", unitsSold: 9, revenueCents: 31500 },
        { productId: "ls-prod-3", name: "Barrel-Aged Stout", unitsSold: 22, revenueCents: 30800 },
      ],
    };
  },
};
