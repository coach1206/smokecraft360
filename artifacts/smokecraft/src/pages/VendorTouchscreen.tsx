import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { RoleHomeGrid } from "@/components/Touchscreen";

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
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallback = () => {
      setSections([
        { id: "add_product", label: "Add Product", description: "Submit a new product", icon: "product", route: "/touch/vendor" },
        { id: "my_products", label: "My Products", description: "View your catalog", icon: "catalog", route: "/touch/vendor" },
        { id: "performance", label: "Performance", description: "Track campaigns", icon: "performance", route: "/touch/vendor" },
        { id: "payouts", label: "Payouts", description: "View commissions", icon: "payouts", route: "/touch/vendor" },
        { id: "campaigns", label: "Campaigns", description: "Manage sponsored", icon: "campaigns", route: "/touch/vendor" },
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

  function handleSelect(_sectionId: string) {
    // placeholder
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #0c0a07 0%, #080604 100%)",
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
            Vendor Portal
          </h1>
          <p style={{ fontSize: 13, color: "rgba(232,224,200,0.45)", margin: "4px 0 0" }}>
            Products & campaign management
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
    </div>
  );
}
