import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";

interface Product { id: string; name: string; category: string; }
interface InventoryRow {
  id: string; venueId: string; productId: string;
  quantity: number; available: boolean; priceCents?: number; premiumTier: number;
}
interface Combined extends InventoryRow { productName: string; category: string; }

function StockBar({ qty, max }: { qty: number; max: number }) {
  const pct = max > 0 ? Math.min((qty / max) * 100, 100) : 0;
  const color = qty === 0 ? VT.red : qty < 5 ? VT.amber : VT.green;
  return (
    <div style={{ width: "100%", height: 4, background: VT.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s" }} />
    </div>
  );
}

export default function VendorInventory() {
  const [rows, setRows]       = useState<Combined[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/inventory", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const products: Product[]     = (d as any).products ?? [];
        const inventory: InventoryRow[] = (d as any).inventory ?? [];
        const map = new Map(products.map((p) => [p.id, p]));
        setRows(
          inventory.map((row) => ({
            ...row,
            productName: map.get(row.productId)?.name ?? row.productId,
            category:    map.get(row.productId)?.category ?? "—",
          })),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const maxQty = Math.max(...rows.map((r) => r.quantity), 1);
  const totalStock = rows.reduce((s, r) => s + r.quantity, 0);
  const outOfStock = rows.filter((r) => r.quantity === 0).length;
  const lowStock   = rows.filter((r) => r.quantity > 0 && r.quantity < 5).length;

  return (
    <VendorLayout title="Inventory" subtitle="Stock levels for your approved products across venues" breadcrumb="VENDOR PORTAL">
      {/* Summary cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        {[
          { label: "TOTAL STOCK",  value: totalStock, icon: ShoppingBag, color: VT.accent },
          { label: "OUT OF STOCK", value: outOfStock,  icon: TrendingDown, color: VT.red },
          { label: "LOW STOCK",    value: lowStock,    icon: TrendingUp,  color: VT.amber },
          { label: "VENUE SLOTS",  value: rows.length, icon: ShoppingBag, color: VT.green },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: VT.card, borderRadius: 12, padding: "20px 18px",
            border: `1px solid ${VT.border}`, flex: 1, minWidth: 140,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize: 8, fontWeight: 700, color: VT.sub, letterSpacing: "0.14em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 10, color: VT.sub, textAlign: "center", padding: "60px 0" }}>Loading inventory…</div>
      ) : rows.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: VT.card, borderRadius: 12, border: `1px solid ${VT.border}`,
        }}>
          <ShoppingBag size={36} color={VT.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: VT.text, marginBottom: 8 }}>No inventory data yet</div>
          <div style={{ fontSize: 10, color: VT.sub }}>
            Once your products are approved and stocked by venues, inventory will appear here
          </div>
        </div>
      ) : (
        <div style={{
          background: VT.card, borderRadius: 12,
          border: `1px solid ${VT.border}`, overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 80px 120px 80px 80px",
            padding: "12px 20px",
            background: "rgba(34,126,255,0.04)",
            borderBottom: `1px solid ${VT.border}`,
          }}>
            {["PRODUCT", "CATEGORY", "TIER", "STOCK", "PRICE", "STATUS"].map((h) => (
              <div key={h} style={{ fontSize: 8, fontWeight: 700, color: VT.faint, letterSpacing: "0.14em" }}>{h}</div>
            ))}
          </div>

          {rows.map((row, i) => {
            const stockColor = row.quantity === 0 ? VT.red : row.quantity < 5 ? VT.amber : VT.green;
            return (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 80px 120px 80px 80px",
                  padding: "16px 20px", alignItems: "center",
                  borderBottom: i < rows.length - 1 ? `1px solid ${VT.border}` : "none",
                  transition: "background 0.12s",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: VT.text }}>{row.productName}</div>
                <div style={{ fontSize: 10, color: VT.sub, textTransform: "capitalize" }}>{row.category}</div>
                <div style={{ fontSize: 10, color: VT.sub }}>{row.premiumTier}/5</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stockColor }}>{row.quantity}</span>
                    <span style={{ fontSize: 8, color: VT.faint }}>units</span>
                  </div>
                  <StockBar qty={row.quantity} max={maxQty} />
                </div>
                <div style={{ fontSize: 11, color: VT.text }}>
                  {row.priceCents ? `$${(row.priceCents / 100).toFixed(2)}` : "—"}
                </div>
                <div style={{
                  display: "inline-flex", padding: "4px 10px", borderRadius: 20,
                  background: row.available ? "rgba(24,201,139,0.10)" : "rgba(233,75,90,0.10)",
                  border: `1px solid ${row.available ? "rgba(24,201,139,0.25)" : "rgba(233,75,90,0.25)"}`,
                  fontSize: 8, fontWeight: 700,
                  color: row.available ? VT.green : VT.red, letterSpacing: "0.10em",
                }}>
                  {row.available ? "AVAIL" : "UNAVAIL"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </VendorLayout>
  );
}
