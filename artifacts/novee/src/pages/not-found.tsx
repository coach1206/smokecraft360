export default function NotFound() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0D0D0E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "rgba(196,97,10,0.6)", fontFamily: "monospace" }}>NOVEE OS</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#F5EDD8" }}>404</div>
      <div style={{ fontSize: 13, color: "rgba(245,237,216,0.4)" }}>Route not found in kernel namespace</div>
    </div>
  );
}
