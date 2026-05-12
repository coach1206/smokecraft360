import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { BarChart2, TrendingUp, Zap, Star } from "lucide-react";

interface ProductPerf {
  id: string;
  name: string;
  category: string;
  boostLevel: number;
  shown: number;
  added: number;
  conversion: number;
  revenueInfluenced: number;
}

interface Placement {
  id: string;
  placementType: string;
  status: string;
  durationDays: number;
  priceCents: number;
  startDate?: string;
  endDate?: string;
}

const PLACEMENT_COLORS: Record<string, string> = {
  featured:  "#F6A623",
  premium:   "#087BFF",
  sponsored: "#18C98B",
};

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 9, color: VT.sub, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: VT.text }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 5, background: VT.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function VendorPerformance() {
  const [products,   setProducts]   = useState<ProductPerf[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/performance", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setProducts((d as any).products ?? []);
        setPlacements((d as any).placements ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxShown    = Math.max(...products.map((p) => p.shown), 1);
  const maxAdded    = Math.max(...products.map((p) => p.added), 1);
  const activePlacements = placements.filter((p) => p.status === "active");

  return (
    <VendorLayout title="Performance" subtitle="Product visibility, conversion, and placement analytics" breadcrumb="VENDOR PORTAL">
      {/* KPI strip */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        {[
          { label: "APPROVED PRODUCTS", value: products.length, icon: BarChart2, color: VT.accent },
          { label: "ACTIVE PLACEMENTS",  value: activePlacements.length, icon: Zap, color: VT.amber },
          { label: "TOTAL IMPRESSIONS",  value: products.reduce((s, p) => s + p.shown, 0), icon: TrendingUp, color: VT.green },
          { label: "REVENUE INFLUENCE",  value: `$${products.reduce((s, p) => s + p.revenueInfluenced, 0).toFixed(0)}`, icon: Star, color: "#9B72FF" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: VT.card, borderRadius: 12, padding: "20px 18px",
            border: `1px solid ${VT.border}`, flex: 1, minWidth: 140,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize: 8, fontWeight: 700, color: VT.sub, letterSpacing: "0.14em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Product performance table */}
        <div style={{ flex: 2, minWidth: 320 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.18em", marginBottom: 14 }}>
            PRODUCT BREAKDOWN
          </div>

          {loading ? (
            <div style={{ fontSize: 10, color: VT.sub, padding: "40px 0" }}>Loading…</div>
          ) : products.length === 0 ? (
            <div style={{
              background: VT.card, borderRadius: 12, padding: "40px 20px",
              border: `1px solid ${VT.border}`, textAlign: "center",
            }}>
              <BarChart2 size={32} color={VT.border} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: VT.text, marginBottom: 6 }}>No approved products</div>
              <div style={{ fontSize: 9, color: VT.sub }}>Submit products and get them approved to see performance data</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {products.map((p) => (
                <div key={p.id} style={{
                  background: VT.card, borderRadius: 12, padding: "20px",
                  border: `1px solid ${VT.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: VT.text }}>{p.name}</div>
                      <div style={{ fontSize: 9, color: VT.sub, textTransform: "capitalize" }}>{p.category}</div>
                    </div>
                    {p.boostLevel > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: 20,
                        background: "rgba(246,166,35,0.12)", border: "1px solid rgba(246,166,35,0.25)",
                        fontSize: 8, fontWeight: 700, color: VT.amber, letterSpacing: "0.10em",
                      }}>
                        <Zap size={9} /> BOOST {p.boostLevel}
                      </div>
                    )}
                  </div>
                  <MetricBar label="Shown in swipe" value={p.shown} max={maxShown} color={VT.accent} />
                  <MetricBar label="Added to order" value={p.added} max={maxAdded}  color={VT.green} />
                  <div style={{ fontSize: 9, color: VT.sub, marginTop: 8 }}>
                    Conversion: <strong style={{ color: VT.text }}>{p.conversion.toFixed(1)}%</strong>
                    &nbsp;&nbsp;Revenue Influenced: <strong style={{ color: VT.text }}>${p.revenueInfluenced.toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placements panel */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.18em", marginBottom: 14 }}>
            PLACEMENT HISTORY
          </div>

          {placements.length === 0 ? (
            <div style={{
              background: VT.card, borderRadius: 12, padding: "28px 20px",
              border: `1px solid ${VT.border}`, textAlign: "center",
            }}>
              <Zap size={28} color={VT.border} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: VT.text, marginBottom: 6 }}>No placements yet</div>
              <div style={{ fontSize: 9, color: VT.sub, lineHeight: 1.6 }}>
                Purchase featured or sponsored placements to boost product visibility
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {placements.map((pl) => {
                const color = PLACEMENT_COLORS[pl.placementType] ?? VT.accent;
                return (
                  <div key={pl.id} style={{
                    background: VT.card, borderRadius: 10, padding: "16px",
                    border: `1px solid ${VT.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{
                        padding: "4px 12px", borderRadius: 20,
                        background: `${color}14`, border: `1px solid ${color}28`,
                        fontSize: 8, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "capitalize",
                      }}>
                        {pl.placementType}
                      </div>
                      <div style={{
                        fontSize: 8, fontWeight: 700, color: VT.sub,
                        textTransform: "uppercase", letterSpacing: "0.10em",
                      }}>
                        {pl.status}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: VT.sub }}>
                      {pl.durationDays} days · ${(pl.priceCents / 100).toFixed(2)}
                    </div>
                    {pl.startDate && (
                      <div style={{ fontSize: 8, color: VT.faint, marginTop: 4 }}>
                        {new Date(pl.startDate).toLocaleDateString()} — {pl.endDate ? new Date(pl.endDate).toLocaleDateString() : "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
