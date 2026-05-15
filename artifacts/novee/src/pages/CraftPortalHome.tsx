import { useState } from "react";
import { useLocation } from "wouter";
import { RotatingCraftVisual } from "@/components/RotatingCraftVisual";
import type { CraftType } from "@/lib/craftAssets";

interface CraftCard {
  id:       string;
  title:    string;
  sub:      string;
  tagline:  string;
  color:    string;
  glow:     string;
  route:    string;
  symbol:   string;
  active:   boolean;
}

const CRAFTS: CraftCard[] = [
  {
    id:      "smoke",
    title:   "SmokeCraft 360",
    sub:     "Luxury Cigar Ritual",
    tagline: "Every blend tells a story.",
    color:   "#C4610A",
    glow:    "rgba(196,97,10,0.22)",
    route:   "/smokecraft",
    symbol:  "◈",
    active:  true,
  },
  {
    id:      "pour",
    title:   "PourCraft 360",
    sub:     "Whiskey · Bourbon · Cognac",
    tagline: "The art of the pour, perfected.",
    color:   "#D4AF37",
    glow:    "rgba(212,175,55,0.20)",
    route:   "/pourcraft",
    symbol:  "◉",
    active:  false,
  },
  {
    id:      "beer",
    title:   "BeerCraft 360",
    sub:     "Craft Beer Discovery",
    tagline: "Beyond the pint. Into the craft.",
    color:   "#B87333",
    glow:    "rgba(184,115,51,0.20)",
    route:   "/beercraft",
    symbol:  "⬡",
    active:  false,
  },
  {
    id:      "wine",
    title:   "WineCraft 360",
    sub:     "Sommelier-Guided Wine Ritual",
    tagline: "From terroir to table.",
    color:   "#9B3A4A",
    glow:    "rgba(155,58,74,0.22)",
    route:   "/winecraft",
    symbol:  "◇",
    active:  false,
  },
];

export default function CraftPortalHome() {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#070605",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      color: "#F0EDE8",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Inter:wght@300;400&display=swap');

        @keyframes nv-grain {
          0%, 100% { transform: translate(0, 0); }
          25%       { transform: translate(-1px, 1px); }
          50%       { transform: translate(1px, -1px); }
          75%       { transform: translate(-1px, -1px); }
        }
        @keyframes nv-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nv-pulse-border {
          0%, 100% { opacity: 0.32; }
          50%       { opacity: 0.68; }
        }
        .craft-card {
          transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.38s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .craft-card:hover {
          transform: translateY(-4px) scale(1.012);
        }
      `}</style>

      {/* Ambient grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        opacity: 0.6,
      }} />

      {/* Ambient radial glow — center bottom */}
      <div style={{
        position: "fixed", bottom: -200, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(196,97,10,0.07) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "28px 40px 0",
        position: "relative", zIndex: 10,
        animation: "nv-fade-up 0.8s ease both",
      }}>
        <div>
          <p style={{
            fontSize: 8, letterSpacing: "0.52em", textTransform: "uppercase",
            color: "rgba(212,175,55,0.50)", marginBottom: 4,
            fontFamily: "'Inter', sans-serif",
          }}>
            Profound Innovations
          </p>
          <h1 style={{
            fontSize: 15, letterSpacing: "0.32em", textTransform: "uppercase",
            fontWeight: 300, color: "rgba(240,237,232,0.92)",
            fontFamily: "'Inter', sans-serif",
          }}>
            NOVEE OS
          </h1>
        </div>

        <button
          onClick={() => navigate("/sovereign")}
          style={{
            background: "none", border: "1px solid rgba(240,237,232,0.10)",
            color: "rgba(240,237,232,0.30)", fontSize: 7,
            letterSpacing: "0.36em", textTransform: "uppercase",
            padding: "7px 16px", cursor: "pointer",
            transition: "border-color 0.2s, color 0.2s",
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(240,237,232,0.28)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,237,232,0.55)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(240,237,232,0.10)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,237,232,0.30)";
          }}
        >
          Sovereign Access
        </button>
      </header>

      {/* ── Hero headline ──────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center", padding: "64px 40px 52px",
        position: "relative", zIndex: 10,
        animation: "nv-fade-up 0.9s 0.1s ease both",
      }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(36px, 5vw, 58px)",
          fontWeight: 300, letterSpacing: "0.08em",
          color: "#F0EDE8", margin: "0 0 14px",
          lineHeight: 1.1,
        }}>
          Choose Your Ritual
        </h2>
        <p style={{
          fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(240,237,232,0.28)", fontWeight: 300,
        }}>
          Four crafts · One sovereign experience
        </p>
      </div>

      {/* ── Craft Portal Grid ──────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 2,
        padding: "0 40px 60px",
        maxWidth: 1200, margin: "0 auto", width: "100%",
        position: "relative", zIndex: 10,
      }}>
        {CRAFTS.map((craft, i) => (
          <div
            key={craft.id}
            className="craft-card"
            onClick={() => navigate(craft.route)}
            style={{
              position: "relative",
              overflow: "hidden",
              background: "transparent",
              border: `1px solid ${hovered === craft.id ? craft.color + "44" : "rgba(255,255,255,0.07)"}`,
              cursor: "pointer",
              padding: "48px 36px 40px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              minHeight: 300,
              animation: `nv-fade-up 0.7s ${0.15 + i * 0.08}s ease both`,
              boxShadow: hovered === craft.id
                ? `0 0 40px ${craft.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                : "inset 0 1px 0 rgba(255,255,255,0.03)",
              transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
            }}
            onMouseEnter={() => setHovered(craft.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Rotating background visual — staggered per card */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.48, overflow: "hidden", pointerEvents: "none" }}>
              <RotatingCraftVisual craft={craft.id as CraftType} staggerOffset={i} showLabel={false} />
            </div>

            {/* Corner symbol */}
            <div style={{
              fontSize: 22,
              color: hovered === craft.id ? craft.color : "rgba(255,255,255,0.15)",
              transition: "color 0.3s",
              marginBottom: 32,
              lineHeight: 1,
            }}>
              {craft.symbol}
            </div>

            {/* Text block */}
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase",
                color: hovered === craft.id ? craft.color : "rgba(255,255,255,0.25)",
                marginBottom: 12, transition: "color 0.3s",
              }}>
                {craft.sub}
              </p>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 28, fontWeight: 300, letterSpacing: "0.06em",
                color: "#F0EDE8", margin: "0 0 14px", lineHeight: 1.1,
              }}>
                {craft.title}
              </h3>
              <p style={{
                fontSize: 11, color: "rgba(240,237,232,0.35)",
                letterSpacing: "0.04em", lineHeight: 1.7,
              }}>
                {craft.tagline}
              </p>
            </div>

            {/* CTA */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 36,
              paddingTop: 20,
              borderTop: `1px solid ${hovered === craft.id ? craft.color + "28" : "rgba(255,255,255,0.05)"}`,
              transition: "border-color 0.3s",
            }}>
              <span style={{
                fontSize: 8, letterSpacing: "0.42em", textTransform: "uppercase",
                color: hovered === craft.id ? craft.color : "rgba(255,255,255,0.22)",
                transition: "color 0.3s",
              }}>
                {craft.active ? "Enter Portal" : "Launching Soon"}
              </span>
              <span style={{
                fontSize: 14,
                color: hovered === craft.id ? craft.color : "rgba(255,255,255,0.18)",
                transition: "color 0.3s, transform 0.3s",
                transform: hovered === craft.id ? "translateX(4px)" : "translateX(0)",
                display: "inline-block",
              }}>
                →
              </span>
            </div>

            {/* Active indicator */}
            {craft.active && (
              <div style={{
                position: "absolute", top: 20, right: 20,
                width: 6, height: 6, borderRadius: "50%",
                background: craft.color,
                boxShadow: `0 0 8px ${craft.color}`,
                animation: "nv-pulse-border 2.4s ease-in-out infinite",
              }} />
            )}
          </div>
        ))}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: "center", padding: "0 40px 28px",
        position: "relative", zIndex: 10,
        animation: "nv-fade-up 1.0s 0.5s ease both",
      }}>
        <p style={{
          fontSize: 7, letterSpacing: "0.38em", textTransform: "uppercase",
          color: "rgba(240,237,232,0.14)",
        }}>
          NOVEE OS 1.0 — Sovereign Edition · Profound Innovations LLC · 360 Enterprise Services
        </p>
      </footer>
    </div>
  );
}
