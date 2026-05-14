import { useLocation } from "wouter";
import {
  Package, Image as ImageIcon, BarChart2, Building2,
  CheckCircle, MessageSquare, Home, ShoppingBag,
  LogOut, ChevronRight,
} from "lucide-react";

export const VT = {
  bg:      "#F4F7FB",
  sidebar: "#0C1624",
  card:    "#FFFFFF",
  accent:  "#087BFF",
  text:    "#0B1E34",
  sub:     "rgba(11,30,52,0.52)",
  faint:   "rgba(11,30,52,0.30)",
  border:  "rgba(34,126,255,0.15)",
  green:   "#18C98B",
  amber:   "#F6A623",
  red:     "#E94B5A",
  mono:    "'JetBrains Mono','Courier New',monospace",
  serif:   "'Cormorant Garamond','Georgia',serif",
};

const NAV = [
  { path: "/vendor/dashboard",    label: "OVERVIEW",     icon: Home },
  { path: "/vendor/products",     label: "PRODUCTS",     icon: Package },
  { path: "/vendor/media",        label: "MEDIA",        icon: ImageIcon },
  { path: "/vendor/inventory",    label: "INVENTORY",    icon: ShoppingBag },
  { path: "/vendor/venues",       label: "VENUES",       icon: Building2 },
  { path: "/vendor/performance",  label: "PERFORMANCE",  icon: BarChart2 },
  { path: "/vendor/approvals",    label: "APPROVALS",    icon: CheckCircle },
  { path: "/vendor/messages",     label: "MESSAGES",     icon: MessageSquare },
];

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumb?: string;
}

export function VendorLayout({ children, title, subtitle, breadcrumb }: Props) {
  const [loc, navigate] = useLocation();
  const role = typeof localStorage !== "undefined" ? localStorage.getItem("axiom_role") : null;

  if (role && role !== "brand_partner" && role !== "super_admin") {
    return (
      <div style={{
        minHeight: "100dvh", background: VT.bg, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: VT.mono,
      }}>
        <div style={{
          textAlign: "center", padding: "48px 40px", background: VT.card,
          borderRadius: 16, border: `1px solid ${VT.border}`, maxWidth: 400,
          boxShadow: "0 8px 40px rgba(8,123,255,0.06)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(233,75,90,0.10)", border: "1.5px solid rgba(233,75,90,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <span style={{ fontSize: 22 }}>🔒</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: VT.text, marginBottom: 8 }}>
            Vendor Access Required
          </div>
          <div style={{ fontSize: 10, color: VT.sub, marginBottom: 28, lineHeight: 1.7 }}>
            This portal is restricted to approved brand partners.<br />
            Contact your account manager for access.
          </div>
          <button
            onClick={() => navigate("/gate")}
            style={{
              padding: "11px 28px", background: VT.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 10, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.14em",
            }}
          >
            RETURN TO GATE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", fontFamily: VT.mono }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 216, background: VT.sidebar, display: "flex",
        flexDirection: "column", flexShrink: 0, position: "sticky",
        top: 0, height: "100dvh", overflowY: "auto",
      }}>
        {/* Logo strip */}
        <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: VT.accent, letterSpacing: "0.26em" }}>
            EEIE VENDOR PORTAL
          </div>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.20em", marginTop: 3 }}>
            BRAND PARTNER ACCESS
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {NAV.map((item) => {
            const active = loc === item.path || loc.startsWith(item.path + "/");
            const Icon   = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                  background: active ? "rgba(8,123,255,0.16)" : "transparent",
                  border: active ? "1px solid rgba(8,123,255,0.32)" : "1px solid transparent",
                  color: active ? "#087BFF" : "rgba(255,255,255,0.45)",
                  cursor: "pointer", textAlign: "left", fontSize: 9, fontWeight: active ? 700 : 400,
                  letterSpacing: "0.14em", transition: "all 0.14s",
                }}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.20)", marginBottom: 10, letterSpacing: "0.12em" }}>
            NOVEE OS — VENDOR LAYER
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("axiom_token");
              localStorage.removeItem("axiom_role");
              navigate("/gate");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", color: "rgba(255,255,255,0.30)",
              fontSize: 9, cursor: "pointer", letterSpacing: "0.12em", padding: 0,
            }}
          >
            <LogOut size={11} /> SIGN OUT
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: VT.bg, minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          padding: "0 32px", height: 64, borderBottom: `1px solid ${VT.border}`,
          background: VT.card, display: "flex", alignItems: "center", gap: 16,
          position: "sticky", top: 0, zIndex: 10,
          boxShadow: "0 1px 12px rgba(8,123,255,0.05)",
        }}>
          {breadcrumb && (
            <>
              <span style={{ fontSize: 9, color: VT.faint }}>{breadcrumb}</span>
              <ChevronRight size={10} color={VT.faint} />
            </>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: VT.text, lineHeight: 1.2 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 9, color: VT.sub, marginTop: 1 }}>{subtitle}</div>}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", background: "rgba(24,201,139,0.08)",
              border: "1px solid rgba(24,201,139,0.25)", borderRadius: 20,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: VT.green }} />
              <span style={{ fontSize: 8, color: VT.green, fontWeight: 700, letterSpacing: "0.14em" }}>
                PORTAL ACTIVE
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto", minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
