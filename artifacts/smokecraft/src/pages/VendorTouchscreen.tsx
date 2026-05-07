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

export default function VendorTouchscreen() {
  const [, navigate] = useLocation();
  const { token } = useAuth();
  const { getBackground } = useVenueContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallback = () => {
      setSections([
        { id: "add_product", label: "Add Product", description: "Submit a new product", icon: "product", route: "/pos" },
        { id: "my_products", label: "My Products", description: "View your catalog", icon: "catalog", route: "/pos" },
        { id: "performance", label: "Performance", description: "Track campaigns", icon: "performance", route: "/analytics" },
        { id: "payouts", label: "Payouts", description: "View commissions", icon: "payouts", route: "/analytics" },
        { id: "assets", label: "Brand Assets", description: "Manage brand materials", icon: "assets", route: "/settings" },
        { id: "campaigns", label: "Campaigns", description: "Manage sponsored", icon: "campaigns", route: "/experiences" },
      ]);
      setLoading(false);
    };
    if (!token) { fallback(); return; }
    fetch("/api/touchscreen/vendor-home", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSections(data.sections))
      .catch(fallback)
      .finally(() => setLoading(false));
  }, [token]);

  function handleSelect(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.route && section.route !== "/touch/vendor") {
      navigate(section.route);
    }
  }

  return (
    <BackgroundLayer image={getBackground("vendorTouch")} style={{
        minHeight: "100dvh",
        color: "#1A1A1B",
        padding: "32px 20px env(safe-area-inset-bottom, 20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#D48B00",
              margin: 0,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Vendor Portal
          </h1>
          <p style={{ fontSize: 13, color: "rgba(26,26,27,0.44)", margin: "4px 0 0" }}>
            Products & campaign management
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            minHeight: 44,
            padding: "0 20px",
            background: "rgba(26,26,27,0.06)",
            border: "1px solid rgba(26,26,27,0.10)",
            borderRadius: 12,
            color: "#D48B00",
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          &larr; Back
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(26,26,27,0.30)" }}>Loading...</div>
      ) : (
        <RoleHomeGrid sections={sections} onSelect={handleSelect} />
      )}
    </BackgroundLayer>
  );
}
