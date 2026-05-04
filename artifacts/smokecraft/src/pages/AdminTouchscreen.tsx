import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useVenueContext } from "@/contexts/VenueContext";
import { RoleHomeGrid } from "@/components/Touchscreen";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

interface Section {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
}

export default function AdminTouchscreen() {
  const [, navigate] = useLocation();
  const { token } = useAuth();
  const { getBackground } = useVenueContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallback = () => {
      setSections([
        { id: "live_venues", label: "Live Venues", description: "Monitor active venues", icon: "venues", route: "/analytics" },
        { id: "revenue", label: "Revenue Flow", description: "Real-time revenue metrics", icon: "revenue", route: "/analytics" },
        { id: "campaigns", label: "Campaign Control", description: "Manage campaigns", icon: "campaigns", route: "/experiences" },
        { id: "alerts", label: "System Alerts", description: "View system notifications", icon: "alerts", route: "/settings" },
        { id: "devices", label: "Device Control", description: "Manage devices", icon: "devices", route: "/devices" },
        { id: "partners", label: "Brand Partners", description: "Vendor management", icon: "partners", route: "/vendors" },
        { id: "fraud", label: "Fraud Review", description: "Risk detection", icon: "fraud", route: "/analytics" },
        { id: "demo", label: "Demo Mode", description: "Launch demo", icon: "demo", route: "/demo" },
      ]);
      setLoading(false);
    };
    if (!token) { fallback(); return; }
    fetch("/api/touchscreen/admin-home", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSections(data.sections))
      .catch(fallback)
      .finally(() => setLoading(false));
  }, [token]);

  function handleSelect(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.route && section.route !== "/touch/admin") {
      navigate(section.route);
    }
  }

  return (
    <BackgroundLayer image={getBackground("adminTouch")} style={{
        minHeight: "100dvh",
        color: "#e8e0c8",
        padding: "32px 20px env(safe-area-inset-bottom, 20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#d4af37",
              margin: 0,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Admin Console
          </h1>
          <p style={{ fontSize: 13, color: "rgba(232,224,200,0.45)", margin: "4px 0 0" }}>
            System-wide control center
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            minHeight: 44,
            padding: "0 20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            color: "#d4af37",
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          &larr; Back
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(232,224,200,0.3)" }}>Loading...</div>
      ) : (
        <RoleHomeGrid sections={sections} onSelect={handleSelect} />
      )}
    </BackgroundLayer>
  );
}
