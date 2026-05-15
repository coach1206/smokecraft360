import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { RotatingCraftVisual } from "@/components/RotatingCraftVisual";

const LEDGER_KEY = "NOVEE_EAT_RITUAL_LEDGER";

function hasSavedSession(): boolean {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && parsed.absoluteStep >= 2 && parsed.status !== "COMPLETE";
  } catch {
    return false;
  }
}

interface EmberParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function generateEmbers(count: number): EmberParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    drift: (Math.random() - 0.5) * 60,
  }));
}

const EMBERS = generateEmbers(28);

export default function SmokeCraftGateway() {
  const [, navigate]          = useLocation();
  const [hasSession, setHasSession] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);
  const [entered, setEntered]       = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasSession(hasSavedSession());
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleEnterRitual() {
    window.location.href = "/";
  }

  function handleContinueSession() {
    if (hasSavedSession()) {
      window.location.href = "/";
    } else {
      setSessionMsg("No active session found. Begin a new ritual.");
      setTimeout(() => setSessionMsg(null), 3200);
    }
  }

  function handleGoldenBox() {
    window.location.href = "/?challenge=golden_box";
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0,
        background: "#060504",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        color: "#F0EDE8",
        opacity: entered ? 1 : 0,
        transition: "opacity 0.9s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,200;0,300;1,300&family=Inter:wght@300;400&display=swap');

        @keyframes smoke-rise {
          0%   { transform: translateY(0) scaleX(1) rotate(0deg); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 0.18; }
          100% { transform: translateY(-110vh) scaleX(1.6) rotate(6deg); opacity: 0; }
        }
        @keyframes ember-rise {
          0%   { transform: translate(0, 0); opacity: 0; }
          5%   { opacity: 0.85; }
          80%  { opacity: 0.5; }
          100% { transform: translate(var(--drift), -95vh); opacity: 0; }
        }
        @keyframes sc-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sc-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sc-pulse-dot {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 6px #C4610A; }
          50%       { opacity: 1;   box-shadow: 0 0 14px #C4610A; }
        }
        .sc-btn {
          transition: background 0.28s, border-color 0.28s, color 0.28s, transform 0.22s;
        }
        .sc-btn:hover {
          transform: translateY(-2px);
        }
        .sc-btn-primary:hover {
          background: rgba(196,97,10,0.14) !important;
          border-color: rgba(196,97,10,0.65) !important;
          color: rgba(240,237,232,0.95) !important;
        }
        .sc-btn-secondary:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(240,237,232,0.28) !important;
          color: rgba(240,237,232,0.80) !important;
        }
        .sc-back:hover {
          color: rgba(240,237,232,0.55) !important;
        }
      `}</style>

      {/* ── Rotating cinematic background ─────────────────────────────────── */}
      <RotatingCraftVisual craft="smoke" showLabel staggerOffset={0} />

      {/* ── Smoke wisps ──────────────────────────────────────────────────── */}
      {[
        { x: "10%",  w: 300, h: 500, dur: 14, delay: 0,   color: "rgba(160,140,120,0.12)" },
        { x: "28%",  w: 200, h: 400, dur: 18, delay: 2.5, color: "rgba(140,120,100,0.09)" },
        { x: "50%",  w: 360, h: 600, dur: 16, delay: 1,   color: "rgba(170,150,130,0.10)" },
        { x: "68%",  w: 220, h: 420, dur: 20, delay: 4,   color: "rgba(150,130,110,0.08)" },
        { x: "84%",  w: 280, h: 480, dur: 15, delay: 0.8, color: "rgba(160,140,120,0.11)" },
        { x: "38%",  w: 180, h: 360, dur: 22, delay: 6,   color: "rgba(130,110,90,0.07)"  },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: -60, left: s.x,
          width: s.w, height: s.h,
          background: `radial-gradient(ellipse, ${s.color} 0%, transparent 70%)`,
          filter: "blur(48px)",
          animation: `smoke-rise ${s.dur}s ${s.delay}s ease-in-out infinite`,
          transformOrigin: "bottom center",
          pointerEvents: "none",
        }} />
      ))}

      {/* ── Ember particles ──────────────────────────────────────────────── */}
      {EMBERS.map(e => (
        <div key={e.id} style={{
          position: "absolute",
          bottom: 0,
          left: `${e.x}%`,
          width: e.size, height: e.size,
          borderRadius: "50%",
          background: `radial-gradient(circle, #D47A20 0%, #C4610A 60%, transparent 100%)`,
          boxShadow: "0 0 4px rgba(196,97,10,0.6)",
          animation: `ember-rise ${e.duration}s ${e.delay}s ease-out infinite`,
          "--drift": `${e.drift}px`,
          pointerEvents: "none",
        } as React.CSSProperties} />
      ))}

      {/* ── Vignette edges ───────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(4,3,2,0.85) 100%)",
      }} />

      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <button
        className="sc-back"
        onClick={() => navigate("/")}
        style={{
          position: "absolute", top: 28, left: 36,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 8, letterSpacing: "0.38em", textTransform: "uppercase",
          color: "rgba(240,237,232,0.25)",
          display: "flex", alignItems: "center", gap: 8,
          transition: "color 0.2s",
          animation: "sc-fade-in 1.2s 0.5s ease both",
          zIndex: 20,
        }}
      >
        ← Craft Portal
      </button>

      {/* ── NOVEE wordmark ───────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 28, right: 36,
        fontSize: 7, letterSpacing: "0.44em", textTransform: "uppercase",
        color: "rgba(212,175,55,0.32)",
        animation: "sc-fade-in 1.2s 0.5s ease both",
        zIndex: 20,
      }}>
        NOVEE OS
      </div>

      {/* ── Center content ───────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 10,
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 0,
        maxWidth: 560, padding: "0 32px",
      }}>
        {/* Craft symbol */}
        <div style={{
          fontSize: 18, color: "rgba(196,97,10,0.55)",
          marginBottom: 28,
          animation: "sc-fade-up 0.9s 0.3s ease both",
          letterSpacing: "0.3em",
        }}>
          ◈
        </div>

        {/* Main title */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(48px, 9vw, 82px)",
          fontWeight: 200, letterSpacing: "0.12em",
          color: "#F0EDE8", margin: 0, lineHeight: 1,
          textTransform: "uppercase",
          animation: "sc-fade-up 1.0s 0.4s ease both",
        }}>
          SmokeCraft
          <span style={{ display: "block", fontSize: "0.48em", letterSpacing: "0.32em", color: "rgba(196,97,10,0.80)", fontWeight: 300, marginTop: 4 }}>
            360
          </span>
        </h1>

        {/* Rule */}
        <div style={{
          width: 48, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(196,97,10,0.45), transparent)",
          margin: "28px auto",
          animation: "sc-fade-in 1.0s 0.7s ease both",
        }} />

        {/* Tagline */}
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(14px, 2.2vw, 18px)",
          fontWeight: 300, fontStyle: "italic",
          color: "rgba(240,237,232,0.48)",
          letterSpacing: "0.08em", lineHeight: 1.6,
          margin: "0 0 52px",
          animation: "sc-fade-up 1.0s 0.8s ease both",
        }}>
          Every blend tells a story.
        </p>

        {/* Session message */}
        {sessionMsg && (
          <p style={{
            fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase",
            color: "rgba(196,97,10,0.75)", marginBottom: 18,
            animation: "sc-fade-in 0.4s ease both",
          }}>
            {sessionMsg}
          </p>
        )}

        {/* ── Buttons ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          width: "100%", maxWidth: 320,
          animation: "sc-fade-up 1.0s 1.0s ease both",
        }}>

          {/* Enter Ritual — primary */}
          <button
            className="sc-btn sc-btn-primary"
            onClick={handleEnterRitual}
            style={{
              background: "rgba(196,97,10,0.08)",
              border: "1px solid rgba(196,97,10,0.42)",
              color: "rgba(240,237,232,0.82)",
              fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
              padding: "16px 28px", cursor: "pointer",
              width: "100%",
              fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Begin Experience</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>→</span>
          </button>

          {/* Continue Session */}
          <button
            className="sc-btn sc-btn-secondary"
            onClick={handleContinueSession}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(240,237,232,0.12)",
              color: hasSession ? "rgba(240,237,232,0.65)" : "rgba(240,237,232,0.32)",
              fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
              padding: "16px 28px", cursor: "pointer",
              width: "100%",
              fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Continue Session</span>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: hasSession ? "#C4610A" : "rgba(255,255,255,0.15)",
              boxShadow: hasSession ? "0 0 8px rgba(196,97,10,0.6)" : "none",
              animation: hasSession ? "sc-pulse-dot 2s ease-in-out infinite" : "none",
              flexShrink: 0,
            }} />
          </button>

          {/* Golden Box Challenge */}
          <button
            className="sc-btn sc-btn-secondary"
            onClick={handleGoldenBox}
            style={{
              background: "rgba(212,175,55,0.03)",
              border: "1px solid rgba(212,175,55,0.14)",
              color: "rgba(212,175,55,0.42)",
              fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase",
              padding: "16px 28px", cursor: "pointer",
              width: "100%",
              fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Golden Box Challenge</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>◇</span>
          </button>
        </div>

        {/* Sub-caption */}
        <p style={{
          fontSize: 7, letterSpacing: "0.36em", textTransform: "uppercase",
          color: "rgba(240,237,232,0.16)", marginTop: 40,
          animation: "sc-fade-in 1.2s 1.4s ease both",
        }}>
          Step 2 through 13 · E.A.T. Ritual Protocol · NOVEE OS 1.0
        </p>
      </div>
    </div>
  );
}
