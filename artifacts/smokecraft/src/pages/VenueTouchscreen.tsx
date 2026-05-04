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

export default function VenueTouchscreen() {
  const [, navigate] = useLocation();
  const { user, token } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/touchscreen/venue-home", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSections(data.sections))
      .catch(() => {
        setSections([
          { id: "experience", label: "Start Experience", description: "Begin a customer journey", icon: "experience", route: "/intro" },
          { id: "orders", label: "Today's Orders", description: "View and manage orders", icon: "orders", route: "/touch/venue" },
          { id: "inventory", label: "Inventory", description: "Check stock levels", icon: "inventory", route: "/touch/venue" },
          { id: "rewards", label: "Rewards", description: "Manage loyalty", icon: "rewards", route: "/touch/venue" },
          { id: "campaigns", label: "Campaigns", description: "Active promotions", icon: "campaigns", route: "/touch/venue" },
        ]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function handleSelect(sectionId: string) {
    if (sectionId === "experience") {
      navigate("/intro");
    }
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
            Venue Operations
          </h1>
          <p style={{ fontSize: 13, color: "rgba(232,224,200,0.45)", margin: "4px 0 0" }}>
            {user?.name ? `Welcome, ${user.name}` : "Manage your venue"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/touch")}
          style={{
            minHeight: 72,
            padding: "0 24px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            color: "rgba(232,224,200,0.6)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Home
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
