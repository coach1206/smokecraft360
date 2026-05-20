/**
 * inventorySync.ts — Real-time inventory synchronization hook (NOVEE).
 * Mirrors SmokeCraft inventorySync exactly.
 */

import { useState, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import type { InventoryProduct } from "@/lib/eatEngine";

export interface InventorySyncState {
  items:       InventoryProduct[];
  lowStock:    InventoryProduct[];
  byCategory:  Record<string, InventoryProduct[]>;
  loading:     boolean;
  lastUpdated: string | null;
  connected:   boolean;
  error:       string | null;
}

function parseItems(raw: unknown[]): InventoryProduct[] {
  return (raw as Array<Record<string, unknown>>).map(p => {
    const qty = Number(p["qty"] ?? 99);
    const par = Number(p["par"] ?? 12);
    return {
      id:       String(p["id"] ?? ""),
      name:     String(p["name"] ?? ""),
      brand:    p["brand"]    ? String(p["brand"])    : undefined,
      category: String(p["category"] ?? "other"),
      qty, par,
      price:    Number(p["costCents"] ?? 0) / 100,
      origin:   p["origin"]   ? String(p["origin"])   : undefined,
      imageUrl: p["imageUrl"] ? String(p["imageUrl"]) : undefined,
      lowStock: qty < par * 0.25,
    };
  });
}

function byCat(items: InventoryProduct[]): Record<string, InventoryProduct[]> {
  return items.reduce<Record<string, InventoryProduct[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
}

export function useInventorySync(venueId?: string): InventorySyncState {
  const [state, setState] = useState<InventorySyncState>({
    items: [], lowStock: [], byCategory: {}, loading: true, lastUpdated: null, connected: false, error: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchProducts(): Promise<void> {
    try {
      const q   = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
      const res = await fetch(`/api/products${q}`);
      if (!res.ok) { setState(p => ({ ...p, loading: false, error: `HTTP ${res.status}` })); return; }
      const data = await res.json() as unknown[];
      if (Array.isArray(data)) {
        const items = parseItems(data);
        setState(p => ({
          ...p, items, lowStock: items.filter(i => i.lowStock), byCategory: byCat(items),
          loading: false, lastUpdated: new Date().toISOString(), error: null,
        }));
      }
    } catch (err) {
      setState(p => ({ ...p, loading: false, error: err instanceof Error ? err.message : "Fetch failed" }));
    }
  }

  useEffect(() => {
    void fetchProducts();
    timerRef.current = setInterval(() => void fetchProducts(), 60_000);

    const onInvUpdate  = () => void fetchProducts();
    const onConnect    = () => setState(p => ({ ...p, connected: true  }));
    const onDisconnect = () => setState(p => ({ ...p, connected: false }));
    const onOrder = (ev: { venueId?: string; lineItems?: Array<{ name: string; qty: number }> }) => {
      if (venueId && ev.venueId && ev.venueId !== venueId) return;
      setState(prev => {
        const items = prev.items.map(item => {
          const line = ev.lineItems?.find(l => l.name === item.name);
          if (!line) return item;
          const newQty = Math.max(0, item.qty - line.qty);
          return { ...item, qty: newQty, lowStock: newQty < item.par * 0.25 };
        });
        return { ...prev, items, lowStock: items.filter(i => i.lowStock), byCategory: byCat(items) };
      });
    };

    socket.on("inventory_updated", onInvUpdate);
    socket.on("connect",           onConnect);
    socket.on("disconnect",        onDisconnect);
    socket.on("pos:ORDER_PLACED",  onOrder);
    setState(p => ({ ...p, connected: socket.connected }));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off("inventory_updated", onInvUpdate);
      socket.off("connect",           onConnect);
      socket.off("disconnect",        onDisconnect);
      socket.off("pos:ORDER_PLACED",  onOrder);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  return state;
}
