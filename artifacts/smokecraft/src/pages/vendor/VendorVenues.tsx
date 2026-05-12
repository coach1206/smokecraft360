import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { Building2, Package } from "lucide-react";

interface Venue { venueId: string; productCount: number; totalStock: number; }
interface Product { id: string; name: string; submissionStatus: string; }

export default function VendorVenues() {
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/venues", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setVenues((d as any).venues ?? []);
        setProducts((d as any).products ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <VendorLayout title="Venues" subtitle="Venues currently stocking your approved products" breadcrumb="VENDOR PORTAL">
      {/* Summary */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <div style={{
          background: VT.card, borderRadius: 12, padding: "20px 18px",
          border: `1px solid ${VT.border}`, flex: 1, minWidth: 160,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Building2 size={13} color={VT.accent} />
            <span style={{ fontSize: 8, fontWeight: 700, color: VT.sub, letterSpacing: "0.14em" }}>PARTNER VENUES</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: VT.text }}>{venues.length}</div>
        </div>
        <div style={{
          background: VT.card, borderRadius: 12, padding: "20px 18px",
          border: `1px solid ${VT.border}`, flex: 1, minWidth: 160,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Package size={13} color={VT.green} />
            <span style={{ fontSize: 8, fontWeight: 700, color: VT.sub, letterSpacing: "0.14em" }}>LIVE PRODUCTS</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: VT.green }}>{products.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 10, color: VT.sub, textAlign: "center", padding: "60px 0" }}>Loading venues…</div>
      ) : venues.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: VT.card, borderRadius: 12, border: `1px solid ${VT.border}`,
        }}>
          <Building2 size={36} color={VT.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: VT.text, marginBottom: 8 }}>No venues yet</div>
          <div style={{ fontSize: 10, color: VT.sub, maxWidth: 300, margin: "0 auto" }}>
            Once your products are approved and venue managers stock them, venues will appear here
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {venues.map((v) => (
            <div
              key={v.venueId}
              style={{
                background: VT.card, borderRadius: 12, padding: "20px",
                border: `1px solid ${VT.border}`,
                boxShadow: "0 2px 14px rgba(8,123,255,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: "rgba(8,123,255,0.08)", border: `1px solid ${VT.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Building2 size={16} color={VT.accent} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: VT.text }}>Venue</div>
                  <div style={{ fontSize: 8, color: VT.faint, letterSpacing: "0.10em" }}>
                    {v.venueId.slice(0, 8).toUpperCase()}…
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: VT.accent }}>{v.productCount}</div>
                  <div style={{ fontSize: 8, color: VT.sub, letterSpacing: "0.10em" }}>PRODUCTS</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: VT.text }}>{v.totalStock}</div>
                  <div style={{ fontSize: 8, color: VT.sub, letterSpacing: "0.10em" }}>TOTAL STOCK</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active products list */}
      {products.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.18em", marginBottom: 14 }}>
            ACTIVE PRODUCTS ON PLATFORM
          </div>
          <div style={{
            background: VT.card, borderRadius: 12,
            border: `1px solid ${VT.border}`, overflow: "hidden",
          }}>
            {products.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px",
                  borderBottom: i < products.length - 1 ? `1px solid ${VT.border}` : "none",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "rgba(8,123,255,0.06)", border: `1px solid ${VT.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Package size={12} color={VT.accent} />
                </div>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: VT.text }}>{p.name}</div>
                <div style={{
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(24,201,139,0.10)", border: "1px solid rgba(24,201,139,0.25)",
                  fontSize: 8, fontWeight: 700, color: VT.green, letterSpacing: "0.12em",
                }}>
                  LIVE
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
