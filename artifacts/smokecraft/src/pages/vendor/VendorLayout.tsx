import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Image as ImageIcon, BarChart2, Building2,
  CheckCircle, MessageSquare, Home, ShoppingBag,
  LogOut, ChevronRight,
} from "lucide-react";

// ── Design tokens — Obsidian / Warm Honey Amber (matches SmokeCraft + NOVEE OS) ──
export const VT = {
  bg:      "#0D0D0E",
  sidebar: "#111112",
  card:    "rgba(26,26,27,0.88)",
  cardSolid: "#1A1A1B",
  accent:  "#C4610A",
  accentGold: "#D48B00",
  text:    "#F5EDD8",
  sub:     "rgba(245,237,216,0.50)",
  faint:   "rgba(245,237,216,0.25)",
  border:  "rgba(196,97,10,0.18)",
  borderHover: "rgba(212,139,0,0.45)",
  green:   "#4ade80",
  amber:   "#D48B00",
  red:     "#ef5350",
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
        position: "relative",
      }}>
        {/* Ambient depth gradient */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,97,10,0.07) 0%, transparent 60%)",
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            textAlign: "center", padding: "48px 40px",
            background: VT.card,
            borderRadius: 16, border: `1px solid ${VT.border}`, maxWidth: 400,
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(239,83,80,0.10)", border: "1.5px solid rgba(239,83,80,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <span style={{ fontSize: 22 }}>🔒</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: VT.text, marginBottom: 8, fontFamily: VT.serif, letterSpacing: "0.1em" }}>
            Vendor Access Required
          </div>
          <div style={{ fontSize: 10, color: VT.sub, marginBottom: 28, lineHeight: 1.7 }}>
            This portal is restricted to approved brand partners.<br />
            Contact your account manager for access.
          </div>
          <motion.button
            onClick={() => navigate("/gate")}
            whileHover={{ scale: 1.03, boxShadow: "0 0 0 1.5px rgba(212,139,0,0.55)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "11px 28px", background: VT.accent, color: VT.text,
              border: "none", borderRadius: 8, fontSize: 10, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.14em",
            }}
          >
            RETURN TO GATE
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", fontFamily: VT.mono, background: VT.bg, position: "relative" }}>

      {/* Ambient depth behind everything */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: [
            "radial-gradient(ellipse 100% 45% at 50% 0%, rgba(196,97,10,0.07) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 30% at 85% 80%, rgba(212,139,0,0.04) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      {/* ── Sidebar ── */}
      <motion.aside
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 216, background: VT.sidebar, display: "flex",
          flexDirection: "column", flexShrink: 0, position: "sticky",
          top: 0, height: "100dvh", overflowY: "auto", zIndex: 10,
          borderRight: `1px solid ${VT.border}`,
        }}
      >
        {/* Logo strip */}
        <div style={{ padding: "22px 18px 18px", borderBottom: `1px solid ${VT.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: VT.accent, letterSpacing: "0.26em" }}>
            EEIE VENDOR PORTAL
          </div>
          <div style={{ fontSize: 7, color: VT.faint, letterSpacing: "0.20em", marginTop: 3 }}>
            BRAND PARTNER ACCESS
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {NAV.map((item, i) => {
            const active = loc === item.path || loc.startsWith(item.path + "/");
            const Icon   = item.icon;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{
                  background: active ? undefined : "rgba(196,97,10,0.08)",
                  color: active ? undefined : VT.text,
                  transition: { duration: 0.12 },
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                  background: active ? "rgba(196,97,10,0.15)" : "transparent",
                  border: active ? `1px solid rgba(196,97,10,0.35)` : "1px solid transparent",
                  color: active ? VT.accentGold : VT.sub,
                  cursor: "pointer", textAlign: "left", fontSize: 9,
                  fontWeight: active ? 700 : 400,
                  letterSpacing: "0.14em",
                }}
              >
                <Icon size={13} />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="vendor-nav-active"
                    style={{
                      marginLeft: "auto", width: 4, height: 4,
                      borderRadius: "50%", background: VT.accentGold,
                      boxShadow: "0 0 6px rgba(212,139,0,0.8)",
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 16px", borderTop: `1px solid ${VT.border}` }}>
          <div style={{ fontSize: 8, color: VT.faint, marginBottom: 10, letterSpacing: "0.12em" }}>
            NOVEE OS — VENDOR LAYER
          </div>
          <motion.button
            onClick={() => {
              localStorage.removeItem("axiom_token");
              localStorage.removeItem("axiom_role");
              navigate("/gate");
            }}
            whileHover={{ color: VT.sub }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", color: VT.faint,
              fontSize: 9, cursor: "pointer", letterSpacing: "0.12em", padding: 0,
            }}
          >
            <LogOut size={11} /> SIGN OUT
          </motion.button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            padding: "0 32px", height: 64, borderBottom: `1px solid ${VT.border}`,
            background: "rgba(17,17,18,0.92)", backdropFilter: "blur(16px)",
            display: "flex", alignItems: "center", gap: 16,
            position: "sticky", top: 0, zIndex: 10,
          }}
        >
          {breadcrumb && (
            <>
              <span style={{ fontSize: 9, color: VT.faint }}>{breadcrumb}</span>
              <ChevronRight size={10} color={VT.faint as string} />
            </>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: VT.text, lineHeight: 1.2, fontFamily: VT.serif, letterSpacing: "0.08em" }}>
              {title}
            </div>
            {subtitle && <div style={{ fontSize: 9, color: VT.sub, marginTop: 1, letterSpacing: "0.06em" }}>{subtitle}</div>}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", background: "rgba(74,222,128,0.07)",
              border: "1px solid rgba(74,222,128,0.22)", borderRadius: 20,
            }}>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: VT.green }}
              />
              <span style={{ fontSize: 8, color: VT.green, fontWeight: 700, letterSpacing: "0.14em" }}>
                PORTAL ACTIVE
              </span>
            </div>
          </div>
        </motion.header>

        {/* Content — staggered entrance */}
        <AnimatePresence mode="wait">
          <motion.main
            key={loc}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            style={{ flex: 1, padding: "32px", overflowY: "auto", minHeight: 0 }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
