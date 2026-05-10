/**
 * SovereignWatermark — Identity Footer
 * Applied globally to all admin/sovereign views.
 * "AUTHORITY: SOVEREIGN // 360 ENTERPRISES SERVICES LLC"
 */

export default function SovereignWatermark() {
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
        fontSize:        7,
        fontFamily:      "'JetBrains Mono','Courier New',monospace",
        letterSpacing:   "0.20em",
        color:           "rgba(212,175,55,0.22)",
        textTransform:   "uppercase",
      }}>
        AUTHORITY: SOVEREIGN // 360 ENTERPRISES SERVICES LLC
      </div>
    </div>
  );
}
