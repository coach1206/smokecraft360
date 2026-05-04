import type { BasePosAdapter, PosAdapterConfig, PosProduct, PosInventoryItem, PosOrder, PosSalesReport } from "./baseAdapter";

export const manualImportAdapter: BasePosAdapter = {
  name: "manual_import",
  displayName: "Manual Import (CSV/Excel)",
  connected: false,

  async syncProducts(_config: PosAdapterConfig): Promise<PosProduct[]> {
    return [
      { id: "man-prod-1", name: "House Blend Cigar", category: "Cigars", priceCents: 1500, sku: "MAN-HBC-001" },
      { id: "man-prod-2", name: "Well Bourbon", category: "Spirits", priceCents: 1000, sku: "MAN-WB-001" },
      { id: "man-prod-3", name: "Draft Lager", category: "Beer", priceCents: 600, sku: "MAN-DL-001" },
    ];
  },

  async syncInventory(_config: PosAdapterConfig): Promise<PosInventoryItem[]> {
    return [
      { productId: "man-prod-1", productName: "House Blend Cigar", quantity: 50, available: true, lastUpdated: new Date().toISOString() },
      { productId: "man-prod-2", productName: "Well Bourbon", quantity: 30, available: true, lastUpdated: new Date().toISOString() },
      { productId: "man-prod-3", productName: "Draft Lager", quantity: 96, available: true, lastUpdated: new Date().toISOString() },
    ];
  },

  async syncOrders(_config: PosAdapterConfig): Promise<PosOrder[]> {
    return [
      {
        id: "man-ord-1", externalId: "IMPORT-BATCH-001",
        items: [
          { productId: "man-prod-1", name: "House Blend Cigar", quantity: 5, priceCents: 1500 },
          { productId: "man-prod-3", name: "Draft Lager", quantity: 10, priceCents: 600 },
        ],
        totalCents: 13500, status: "imported", createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  },

  async pushOrder(_config: PosAdapterConfig, _order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }> {
    return { success: false, error: "Manual import adapter does not support pushing orders. Export to CSV instead." };
  },

  async pullReports(_config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport> {
    return {
      periodStart, periodEnd,
      totalRevenueCents: 89200,
      orderCount: 15,
      topProducts: [
        { productId: "man-prod-1", name: "House Blend Cigar", unitsSold: 25, revenueCents: 37500 },
        { productId: "man-prod-3", name: "Draft Lager", unitsSold: 40, revenueCents: 24000 },
      ],
    };
  },
};
