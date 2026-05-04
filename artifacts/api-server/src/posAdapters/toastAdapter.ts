import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";

export const toastAdapter: BasePosAdapter = {
  name: "toast",
  displayName: "Toast POS",
  connected: false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    return [
      { id: "toast-prod-1", name: "Arturo Fuente Opus X", category: "Cigars", priceCents: 4500, sku: "AF-OPX-001" },
      { id: "toast-prod-2", name: "Macallan 18yr Single Malt", category: "Spirits", priceCents: 2800, sku: "MAC-18-001" },
      { id: "toast-prod-3", name: "Hazy IPA Pint", category: "Beer", priceCents: 900, sku: "HIPA-001" },
      { id: "toast-prod-4", name: "Charcuterie Board", category: "Food", priceCents: 2200, sku: "CHAR-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    return [
      { productId: "toast-prod-1", productName: "Arturo Fuente Opus X", quantity: 24, available: true, lastUpdated: new Date().toISOString() },
      { productId: "toast-prod-2", productName: "Macallan 18yr Single Malt", quantity: 8, available: true, lastUpdated: new Date().toISOString() },
      { productId: "toast-prod-3", productName: "Hazy IPA Pint", quantity: 48, available: true, lastUpdated: new Date().toISOString() },
      { productId: "toast-prod-4", productName: "Charcuterie Board", quantity: 3, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    return [
      {
        id: "toast-ord-1", externalId: "TOAST-78291",
        items: [{ productId: "toast-prod-1", name: "Arturo Fuente Opus X", quantity: 2, priceCents: 4500 }],
        totalCents: 9000, status: "completed", createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "toast-ord-2", externalId: "TOAST-78292",
        items: [
          { productId: "toast-prod-2", name: "Macallan 18yr Single Malt", quantity: 1, priceCents: 2800 },
          { productId: "toast-prod-4", name: "Charcuterie Board", quantity: 1, priceCents: 2200 },
        ],
        totalCents: 5000, status: "completed", createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  },

  async pushOrder(_config: PosAdapterConfig, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    return { success: true, externalId: `TOAST-${Date.now()}` };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    return {
      periodStart, periodEnd,
      totalRevenueCents: 284500,
      orderCount: 47,
      topProducts: [
        { productId: "toast-prod-1", name: "Arturo Fuente Opus X", unitsSold: 18, revenueCents: 81000 },
        { productId: "toast-prod-2", name: "Macallan 18yr Single Malt", unitsSold: 12, revenueCents: 33600 },
        { productId: "toast-prod-3", name: "Hazy IPA Pint", unitsSold: 34, revenueCents: 30600 },
      ],
    };
  },
};
