import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";

export const squareAdapter: BasePosAdapter = {
  name: "square",
  displayName: "Square POS",
  connected: false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    return [
      { id: "sq-prod-1", name: "Padron 1926 Serie", category: "Cigars", priceCents: 3200, sku: "SQ-PAD-001" },
      { id: "sq-prod-2", name: "Clase Azul Reposado", category: "Spirits", priceCents: 4500, sku: "SQ-CAZ-001" },
      { id: "sq-prod-3", name: "Belgian Tripel", category: "Beer", priceCents: 1100, sku: "SQ-BT-001" },
      { id: "sq-prod-4", name: "Smoked Salmon Platter", category: "Food", priceCents: 1800, sku: "SQ-SSP-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    return [
      { productId: "sq-prod-1", productName: "Padron 1926 Serie", quantity: 15, available: true, lastUpdated: new Date().toISOString() },
      { productId: "sq-prod-2", productName: "Clase Azul Reposado", quantity: 4, available: true, lastUpdated: new Date().toISOString() },
      { productId: "sq-prod-3", productName: "Belgian Tripel", quantity: 36, available: true, lastUpdated: new Date().toISOString() },
      { productId: "sq-prod-4", productName: "Smoked Salmon Platter", quantity: 6, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    return [
      {
        id: "sq-ord-1", externalId: "SQ-4A82F",
        items: [{ productId: "sq-prod-1", name: "Padron 1926 Serie", quantity: 1, priceCents: 3200 }],
        totalCents: 3200, status: "completed", createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  },

  async pushOrder(_config: PosAdapterConfig, _order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    return { success: true, externalId: `SQ-${Date.now().toString(36).toUpperCase()}` };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    return {
      periodStart, periodEnd,
      totalRevenueCents: 198700,
      orderCount: 31,
      topProducts: [
        { productId: "sq-prod-2", name: "Clase Azul Reposado", unitsSold: 8, revenueCents: 36000 },
        { productId: "sq-prod-1", name: "Padron 1926 Serie", unitsSold: 14, revenueCents: 44800 },
      ],
    };
  },
};
