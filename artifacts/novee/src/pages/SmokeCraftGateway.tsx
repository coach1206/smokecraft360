import { useEffect, useState } from "react";

export default function SmokeCraftGateway() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const target = "/craft-hub?skip_splash=1";
    // Try immediate replace first
    try { window.location.replace(target); } catch { /* fall through to button */ }

    // Countdown fallback
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(iv);
          window.location.href = target;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      background:     "#080604",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            28,
      fontFamily:     "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      <div style={{
        width:        48,
        height:       48,
        border:       "2px solid rgba(212,175,55,0.15)",
        borderTop:    "2px solid #D4AF37",
        borderRadius: "50%",
        animation:    "spin 0.9s linear infinite",
      }} />

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily:    "Georgia, serif",
          fontSize:      22,
          fontWeight:    700,
          color:         "#F0E8D4",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom:  8,
        }}>
          NOVEE OS
        </div>
        <div style={{
          fontSize:      11,
          color:         "rgba(212,175,55,0.6)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          animation:     "pulse 1.6s ease-in-out infinite",
        }}>
          Launching SmokeCraft{countdown > 0 ? ` in ${countdown}…` : ""}
        </div>
      </div>

      <a
        href="/craft-hub?skip_splash=1"
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           8,
          padding:       "12px 28px",
          background:    "rgba(212,139,0,0.12)",
          border:        "1px solid rgba(212,175,55,0.55)",
          borderRadius:  8,
          color:         "#D4AF37",
          fontSize:      12,
          fontWeight:    700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textDecoration: "none",
          cursor:        "pointer",
        }}
      >
        Enter SmokeCraft →
      </a>
    </div>
  );
}
