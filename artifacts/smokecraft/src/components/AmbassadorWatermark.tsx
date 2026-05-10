/**
 * AmbassadorWatermark — fixed identity mark for all Ambassador views.
 * AUTHORIZED AMBASSADOR: CLARK · SYSTEM: NOVEE OS DEMO MODE
 */

export default function AmbassadorWatermark() {
  return (
    <div
      aria-hidden
      style={{
        position:      "fixed",
        bottom:        10,
        right:         18,
        zIndex:        9000,
        pointerEvents: "none",
        userSelect:    "none",
        textAlign:     "right",
        lineHeight:    1.7,
      }}
    >
      <div style={{
        fontSize:      7,
        fontFamily:    "'JetBrains Mono','Courier New',monospace",
        letterSpacing: "0.20em",
        color:         "rgba(212,175,55,0.28)",
        textTransform: "uppercase",
      }}>
        AUTHORIZED AMBASSADOR: CLARK
      </div>
      <div style={{
        fontSize:      7,
        fontFamily:    "'JetBrains Mono','Courier New',monospace",
        letterSpacing: "0.20em",
        color:         "rgba(212,175,55,0.18)",
        textTransform: "uppercase",
      }}>
        SYSTEM: NOVEE OS DEMO MODE
      </div>
    </div>
  );
}
