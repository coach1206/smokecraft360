export interface PosProduct {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  sku?: string;
}

export interface PosInventoryItem {
  productId: string;
  productName: string;
  quantity: number;
  available: boolean;
  lastUpdated: string;
}

export interface PosOrder {
  id: string;
  externalId: string;
  items: { productId: string; name: string; quantity: number; priceCents: number }[];
  totalCents: number;
  status: string;
  createdAt: string;
}

export interface PosSalesReport {
  periodStart: string;
  periodEnd: string;
  totalRevenueCents: number;
  orderCount: number;
  topProducts: { productId: string; name: string; unitsSold: number; revenueCents: number }[];
}

export interface PosAdapterConfig {
  adapterName: string;
  venueId: string;
  apiKey?: string;
  locationId?: string;
  webhookUrl?: string;
}

export interface BasePosAdapter {
  readonly name: string;
  readonly displayName: string;
  connected: boolean;

  syncProducts(config: PosAdapterConfig): Promise<PosProduct[]>;
  syncInventory(config: PosAdapterConfig): Promise<PosInventoryItem[]>;
  syncOrders(config: PosAdapterConfig): Promise<PosOrder[]>;
  pushOrder(config: PosAdapterConfig, order: PosOrder): Promise<{ success: boolean; externalId?: string; error?: string }>;
  pullReports(config: PosAdapterConfig, periodStart: string, periodEnd: string): Promise<PosSalesReport>;
}
