import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { VendorLayout, VT } from "./VendorLayout";
import {
  Package, Image as ImageIcon, Building2, CheckCircle,
  TrendingUp, Clock, XCircle, ArrowRight,
} from "lucide-react";

interface Profile {
  companyName: string;
  status: string;
}
interface Stats {
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalMedia: number;
  activePlacements: number;
  venueCount: number;
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: VT.card, borderRadius: 12, padding: "22px 20px",
      border: `1px solid ${VT.border}`, flex: 1, minWidth: 160,
      boxShadow: "0 2px 16px rgba(8,123,255,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: `${color ?? VT.accent}18`,
          border: `1px solid ${color ?? VT.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={color ?? VT.accent} />
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, color: VT.sub, letterSpacing: "0.16em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? VT.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: VT.faint, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ label, desc, path }: { label: string; desc: string; path: string }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "16px 18px", background: VT.card,
        border: `1px solid ${VT.border}`, borderRadius: 10, cursor: "pointer",
        marginBottom: 10, textAlign: "left",
        boxShadow: "0 2px 10px rgba(8,123,255,0.03)",
        transition: "border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: VT.text, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 9, color: VT.sub }}>{desc}</div>
      </div>
      <ArrowRight size={14} color={VT.accent} />
    </button>
  );
}

export default function VendorDashboard() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("axiom_token");
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/vendor/profile", { headers: h }).then((r) => r.json()),
      fetch("/api/vendor/products", { headers: h }).then((r) => r.json()),
      fetch("/api/vendor/venues",   { headers: h }).then((r) => r.json()),
      fetch("/api/vendor/media",    { headers: h }).then((r) => r.json()),
    ])
      .then(([p, pr, v, m]) => {
        if (!(p as any).profile) { navigate("/vendor/onboarding"); return; }
        setProfile((p as any).profile);

        const prods: any[] = (pr as any).products ?? [];
        setStats({
          totalProducts:    prods.length,
          pendingProducts:  prods.filter((x) => x.submissionStatus === "pending").length,
          approvedProducts: prods.filter((x) => x.submissionStatus === "approved").length,
          rejectedProducts: prods.filter((x) => x.submissionStatus === "rejected").length,
          totalMedia:       ((m as any).assets ?? []).length,
          activePlacements: 0,
          venueCount:       ((v as any).venues ?? []).length,
        });
      })
      .catch(() => navigate("/vendor/onboarding"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const isFounderPreview = (localStorage.getItem("axiom_role") === "super_admin");

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: VT.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 10, color: VT.sub, letterSpacing: "0.18em" }}>LOADING…</div>
      </div>
    );
  }

  const statusColor = profile?.status === "approved" ? VT.green : profile?.status === "suspended" ? VT.red : VT.amber;

  return (
    <VendorLayout
      title={profile?.companyName ?? "Vendor Dashboard"}
      subtitle="Brand Partner Command Center"
    >
      {/* Founder Preview Banner */}
      {isFounderPreview && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
          background: "rgba(8,123,255,0.10)", border: "1px solid rgba(8,123,255,0.35)",
          borderRadius: 8, marginBottom: 20,
        }}>
          <div style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 8, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            background: "#087BFF", color: "#fff",
          }}>
            FOUNDER PREVIEW MODE
          </div>
          <span style={{ fontSize: 11, color: VT.sub, letterSpacing: "0.05em" }}>
            Viewing vendor portal as founder — this is a demo vendor view. Live vendor data loads on brand_partner login.
          </span>
        </div>
      )}
      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
        background: VT.card, borderRadius: 10, border: `1px solid ${VT.border}`,
        marginBottom: 28, boxShadow: "0 2px 12px rgba(8,123,255,0.03)",
      }}>
        <div style={{
          padding: "5px 14px", borderRadius: 20,
          background: `${statusColor}14`, border: `1px solid ${statusColor}30`,
          fontSize: 9, fontWeight: 700, color: statusColor, letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          {profile?.status ?? "pending"}
        </div>
        <div style={{ fontSize: 10, color: VT.sub }}>
          {profile?.status === "approved"
            ? "Your account is approved. Products are visible to venue partners."
            : profile?.status === "in_review"
            ? "Your account is under review. An admin will respond within 48 hours."
            : "Your application is pending review. Products cannot be listed yet."}
        </div>
      </div>

      {/* KPI row */}
      {stats && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
          <KpiCard icon={Package} label="TOTAL PRODUCTS" value={stats.totalProducts} sub={`${stats.approvedProducts} approved`} />
          <KpiCard icon={Clock}   label="PENDING REVIEW" value={stats.pendingProducts} sub="awaiting admin" color={VT.amber} />
          <KpiCard icon={CheckCircle} label="APPROVED" value={stats.approvedProducts} sub="live on platform" color={VT.green} />
          <KpiCard icon={XCircle} label="REJECTED" value={stats.rejectedProducts} sub="action required" color={VT.red} />
          <KpiCard icon={Building2}  label="VENUES" value={stats.venueCount} sub="stocking your products" />
          <KpiCard icon={ImageIcon}  label="MEDIA ASSETS" value={stats.totalMedia} sub="uploaded" />
        </div>
      )}

      {/* Two-column lower section */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Quick actions */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.18em", marginBottom: 14 }}>
            QUICK ACTIONS
          </div>
          <QuickAction label="Submit a Product"      desc="Add a new product to your catalog for approval" path="/vendor/products" />
          <QuickAction label="Upload Media"          desc="Add images for your products or brand"          path="/vendor/media" />
          <QuickAction label="Check Approval Status" desc="View pending and rejected submissions"          path="/vendor/approvals" />
          <QuickAction label="View Performance"      desc="See how your products are performing"           path="/vendor/performance" />
          <QuickAction label="Boost a Product"       desc="Purchase featured or sponsored placement"       path="/vendor/performance" />
        </div>

        {/* Info panel */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.sub, letterSpacing: "0.18em", marginBottom: 14 }}>
            VENDOR GUIDELINES
          </div>
          <div style={{
            background: VT.card, borderRadius: 12, padding: "22px 20px",
            border: `1px solid ${VT.border}`,
          }}>
            {[
              ["Product Submissions", "All products are reviewed within 2–3 business days. Rejected items include feedback."],
              ["Media Requirements", "Images must be min 800×800px, JPEG or PNG, under 5MB. Cloudinary transforms automatically."],
              ["Inventory Visibility", "Approved products become visible to venue partners for stocking decisions."],
              ["Placements & Boosts", "Purchase featured or sponsored slots to increase product visibility on swipe experiences."],
            ].map(([title, body]) => (
              <div key={title} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${VT.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: VT.text, marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 9, color: VT.sub, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
            <div style={{ fontSize: 9, color: VT.faint }}>Questions? Contact your account manager via Messages.</div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
