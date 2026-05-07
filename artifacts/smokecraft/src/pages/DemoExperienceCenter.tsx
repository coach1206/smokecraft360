import { useState } from "react";
import { useLocation } from "wouter";
import { hasSignedDemoNda } from "@/components/Demo/DemoNdaModal";
import { useVenueContext } from "@/contexts/VenueContext";
import { ExperienceCenterGrid } from "@/components/Touchscreen";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const ROUTE_MAP: Record<string, string> = {
  smokecraft: "/smokecraft",
  pourcraft: "/pourcraft",
  brewcraft: "/brewcraft",
  vapecraft: "/vapecraft",
  investor: "/demo",
};

export default function DemoExperienceCenter() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();
  const [ndaSigned] = useState(() => hasSignedDemoNda());

  if (!ndaSigned) {
    queueMicrotask(() => navigate("/demo"));
    return null;
  }

  function handleSelect(id: string) {
    const route = ROUTE_MAP[id];
    if (route) navigate(route);
  }

  return (
    <BackgroundLayer image={getBackground("demoCenter")} blur={2} style={{
        minHeight: "100dvh",
        color: "#e8e0c8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px env(safe-area-inset-bottom, 20px)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "rgba(212,139,0,0.6)",
            marginBottom: 8,
          }}
        >
          Profound Innovations
        </div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: "#D48B00",
            margin: "0 0 8px",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.03em",
          }}
        >
          Experience Center
        </h1>
        <p style={{ fontSize: 14, color: "rgba(232,224,200,0.5)", margin: 0, maxWidth: 420 }}>
          Explore each craft experience. Tap a card to begin.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          marginTop: 20,
        }}
      >
        <ExperienceCenterGrid onSelect={handleSelect} ndaSigned={ndaSigned} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button
          type="button"
          onClick={() => navigate("/touch")}
          style={{
            minHeight: 72,
            padding: "0 28px",
            background: "rgba(26,26,27,0.06)",
            border: "1px solid rgba(26,26,27,0.10)",
            borderRadius: 14,
            color: "rgba(232,224,200,0.5)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </BackgroundLayer>
  );
}
