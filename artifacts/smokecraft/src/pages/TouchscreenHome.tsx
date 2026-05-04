import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { TouchCard } from "@/components/Touchscreen";

const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/touch/admin",
  venue_owner: "/touch/venue",
  manager: "/touch/venue",
  staff: "/touch/venue",
  vendor: "/touch/vendor",
  brand_partner: "/touch/vendor",
};

export default function TouchscreenHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  const tiles = [
    { id: "admin", label: "Admin Console", description: "System-wide control", roles: ["super_admin"], route: "/touch/admin", variant: "gold" as const },
    { id: "venue", label: "Venue Operations", description: "Manage your venue", roles: ["venue_owner", "manager", "staff"], route: "/touch/venue", variant: "gold" as const },
    { id: "vendor", label: "Vendor Portal", description: "Products & campaigns", roles: ["vendor", "brand_partner"], route: "/touch/vendor", variant: "gold" as const },
    { id: "experience", label: "Start Experience", description: "Begin a guided session", roles: ["*"], route: "/intro", variant: "default" as const },
    { id: "demo", label: "Demo & Investor", description: "Showcase the platform", roles: ["*"], route: "/experience-center", variant: "glass" as const },
  ];

  const visible = tiles.filter(
    (t) => t.roles.includes("*") || (role && t.roles.includes(role)),
  );

  if (role && ROLE_ROUTES[role]) {
    queueMicrotask(() => navigate(ROLE_ROUTES[role]));
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #0c0a07 0%, #080604 100%)",
        color: "#e8e0c8",
        padding: "40px 20px env(safe-area-inset-bottom, 20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#d4af37",
            margin: "0 0 8px",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.03em",
          }}
        >
          SmokeCraft 360
        </h1>
        <p style={{ fontSize: 14, color: "rgba(232,224,200,0.55)", margin: 0 }}>
          Select your interface
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {visible.map((t) => (
          <TouchCard
            key={t.id}
            label={t.label}
            description={t.description}
            variant={t.variant}
            size="large"
            onClick={() => navigate(t.route)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          marginTop: 32,
          minHeight: 72,
          padding: "0 32px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          color: "rgba(232,224,200,0.5)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Back to Home
      </button>
    </div>
  );
}
