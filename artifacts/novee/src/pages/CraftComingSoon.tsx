import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { RotatingCraftVisual } from "@/components/RotatingCraftVisual";
import type { CraftType } from "@/lib/craftAssets";

const CRAFT_TYPE_MAP: Record<string, CraftType> = {
  pourcraft: "pour",
  beercraft: "beer",
  winecraft:  "wine",
};

interface CraftConfig {
  id:     string;
  title:  string;
  sub:    string;
  color:  string;
  glow:   string;
  symbol: string;
  lines:  string[];
}

const CONFIGS: Record<string, CraftConfig> = {
  pourcraft: {
    id:     "pourcraft",
    title:  "PourCraft 360",
    sub:    "Whiskey · Bourbon · Cognac · Pairing",
    color:  "#D4AF37",
    glow:   "rgba(212,175,55,0.18)",
    symbol: "◉",
    lines:  ["The art of the pour,", "perfected."],
  },
  beercraft: {
    id:     "beercraft",
    title:  "BeerCraft 360",
    sub:    "Craft Beer Discovery",
    color:  "#B87333",
    glow:   "rgba(184,115,51,0.18)",
    symbol: "⬡",
    lines:  ["Beyond the pint.", "Into the craft."],
  },
  winecraft: {
    id:     "winecraft",
    title:  "WineCraft 360",
    sub:    "Sommelier-Guided Wine Ritual",
    color:  "#9B3A4A",
    glow:   "rgba(155,58,74,0.18)",
    symbol: "◇",
    lines:  ["From terroir", "to table."],
  },
};

interface Props {
  craft: "pourcraft" | "beercraft" | "winecraft";
}

export default function CraftComingSoon({ craft }: Props) {
  const config            = CONFIGS[craft];
  const [, navigate]      = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#060403",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      color: "#F0EDE8",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.8s ease",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;1,300&display=swap');
        @keyframes cs-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cs-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>

      {/* ── Rotating craft visual background ─────────────────────────────── */}
      <RotatingCraftVisual craft={CRAFT_TYPE_MAP[craft]} showLabel staggerOffset={0} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Back */}
      <button
        onClick={() => navigate("/")}
        style={{
          position: "absolute", top: 28, left: 36,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase",
          color: "rgba(240,237,232,0.22)",
          transition: "color 0.2s",
          animation: "cs-fade-up 0.8s 0.4s ease both",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(240,237,232,0.50)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(240,237,232,0.22)")}
      >
        ← Craft Portal
      </button>

      {/* NOVEE wordmark */}
      <div style={{
        position: "absolute", top: 28, right: 36,
        fontSize: 7, letterSpacing: "0.44em",
        color: `${config.color}44`,
        animation: "cs-fade-up 0.8s 0.4s ease both",
      }}>
        NOVEE OS
      </div>

      {/* Content */}
      <div style={{
        textAlign: "center", maxWidth: 480, padding: "0 32px",
        position: "relative", zIndex: 10,
      }}>
        <div style={{
          fontSize: 24, color: `${config.color}55`,
          marginBottom: 32,
          animation: "cs-fade-up 0.8s 0.2s ease both",
        }}>
          {config.symbol}
        </div>

        <p style={{
          fontSize: 8, letterSpacing: "0.42em", textTransform: "uppercase",
          color: `${config.color}70`, marginBottom: 14,
          animation: "cs-fade-up 0.8s 0.3s ease both",
        }}>
          {config.sub}
        </p>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(38px, 7vw, 62px)",
          fontWeight: 200, letterSpacing: "0.10em",
          color: "#F0EDE8", margin: "0 0 28px", lineHeight: 1.05,
          animation: "cs-fade-up 0.9s 0.35s ease both",
        }}>
          {config.title}
        </h1>

        <div style={{
          width: 36, height: 1,
          background: `linear-gradient(90deg, transparent, ${config.color}50, transparent)`,
          margin: "0 auto 28px",
          animation: "cs-fade-up 0.9s 0.45s ease both",
        }} />

        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(15px, 2.4vw, 20px)",
          fontWeight: 300, fontStyle: "italic",
          color: "rgba(240,237,232,0.40)",
          lineHeight: 1.6, margin: "0 0 44px",
          animation: "cs-fade-up 0.9s 0.5s ease both",
        }}>
          {config.lines.map((l, i) => (
            <span key={i}>{l}{i < config.lines.length - 1 && <br />}</span>
          ))}
        </p>

        {/* Status pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 22px",
          border: `1px solid ${config.color}28`,
          background: `${config.color}08`,
          animation: "cs-fade-up 0.9s 0.6s ease both",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: config.color,
            animation: "cs-pulse 2.8s ease-in-out infinite",
          }} />
          <span style={{
            fontSize: 7, letterSpacing: "0.42em", textTransform: "uppercase",
            color: `${config.color}80`,
          }}>
            Portal Activating · NOVEE OS 1.0
          </span>
        </div>
      </div>
    </div>
  );
}
