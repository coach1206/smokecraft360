import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { VendorLayout, VT } from "./VendorLayout";
import { Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  tier: string;
  submissionStatus: string;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

function Section({ title, color, icon: Icon, items, emptyMsg, onEdit }: {
  title: string; color: string; icon: React.ElementType;
  items: Product[]; emptyMsg: string; onEdit?: (p: Product) => void;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.18em" }}>{title}</span>
        <div style={{
          padding: "2px 10px", borderRadius: 20,
          background: `${color}14`, border: `1px solid ${color}28`,
          fontSize: 9, fontWeight: 700, color,
        }}>
          {items.length}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          padding: "24px 20px", background: VT.card, borderRadius: 10,
          border: `1px solid ${VT.border}`, fontSize: 10, color: VT.faint, textAlign: "center",
        }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((p) => (
            <div key={p.id} style={{
              background: VT.card, borderRadius: 10, padding: "18px 20px",
              border: `1px solid ${VT.border}`,
              borderLeft: `3px solid ${color}`,
              boxShadow: "0 2px 10px rgba(8,123,255,0.03)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: VT.text, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: VT.sub, textTransform: "capitalize", marginBottom: p.rejectionReason ? 10 : 0 }}>
                    {p.category} · {p.tier} · Submitted {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  {p.rejectionReason && (
                    <div style={{
                      padding: "10px 14px", background: "rgba(233,75,90,0.06)",
                      border: "1px solid rgba(233,75,90,0.18)", borderRadius: 8,
                      fontSize: 9, color: VT.red, lineHeight: 1.6,
                    }}>
                      <strong>Reason:</strong> {p.rejectionReason}
                    </div>
                  )}
                  {p.reviewedAt && (
                    <div style={{ fontSize: 8, color: VT.faint, marginTop: 8 }}>
                      Reviewed {new Date(p.reviewedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {onEdit && (
                  <button
                    onClick={() => onEdit(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", background: VT.accent, border: "none",
                      borderRadius: 8, color: "#fff", fontSize: 9, fontWeight: 700,
                      cursor: "pointer", fontFamily: VT.mono, letterSpacing: "0.10em",
                      flexShrink: 0,
                    }}
                  >
                    EDIT <ArrowRight size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VendorApprovals() {
  const [, navigate] = useLocation();
  const [pending,  setPending]  = useState<Product[]>([]);
  const [rejected, setRejected] = useState<Product[]>([]);
  const [approved, setApproved] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    fetch("/api/vendor/approvals", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setPending((d as any).pending   ?? []);
        setRejected((d as any).rejected ?? []);
        setApproved((d as any).approved ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <VendorLayout title="Approvals" subtitle="Review queue for your submissions" breadcrumb="VENDOR PORTAL">
        <div style={{ fontSize: 10, color: VT.sub, textAlign: "center", padding: "60px 0" }}>Loading…</div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout title="Approvals" subtitle="Status of all submitted products" breadcrumb="VENDOR PORTAL">
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        {[
          { label: "PENDING",  value: pending.length,  color: VT.amber, icon: Clock },
          { label: "APPROVED", value: approved.length, color: VT.green, icon: CheckCircle },
          { label: "REJECTED", value: rejected.length, color: VT.red,   icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{
            background: VT.card, borderRadius: 12, padding: "18px",
            border: `1px solid ${VT.border}`, flex: 1, minWidth: 140,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${color}12`, border: `1px solid ${color}28`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={15} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 8, color: VT.sub, letterSpacing: "0.14em" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <Section
        title="PENDING REVIEW"
        color={VT.amber}
        icon={Clock}
        items={pending}
        emptyMsg="No products awaiting review"
      />
      <Section
        title="REJECTED — ACTION REQUIRED"
        color={VT.red}
        icon={XCircle}
        items={rejected}
        emptyMsg="No rejected products"
        onEdit={() => navigate("/vendor/products")}
      />
      <Section
        title="APPROVED & LIVE"
        color={VT.green}
        icon={CheckCircle}
        items={approved}
        emptyMsg="No approved products yet"
      />
    </VendorLayout>
  );
}
