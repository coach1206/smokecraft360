import { useState } from "react";
import { motion } from "framer-motion";

const GOLD = "#D4AF37";

export function NoveeLeafBlendPanel() {
  const [seco, setSeco] = useState(35);
  const [viso, setViso] = useState(45);
  const ligero = Math.max(0, 100 - seco - viso);

  function handleSeco(v: number) { setSeco(Math.min(v, 100 - viso)); }
  function handleViso(v: number) { setViso(Math.min(v, 100 - seco)); }

  const SLIDERS = [
    { id: "seco",   label: "Seco",   sub: "Air-cured · Light Combustion",    val: seco,   set: handleSeco, auto: false },
    { id: "viso",   label: "Viso",   sub: "Sun-grown · Aromatic Expression", val: viso,   set: handleViso, auto: false },
    { id: "ligero", label: "Ligero", sub: "Shade-grown · Full Intensity",     val: ligero, set: () => {},   auto: true  },
  ] as const;

  const cigarFoot = Math.round(120 + seco  * 0.55);
  const cigarMid  = Math.round(90  + viso  * 0.38);

  return (
    <div style={{
      width:        "100%",
      maxWidth:     560,
      padding:      "36px 32px",
      background:   "rgba(212,175,55,0.03)",
      border:       `1px solid rgba(212,175,55,0.18)`,
      borderRadius: 18,
    }}>
      {/* Header */}
      <p style={{
        fontSize:      10,
        letterSpacing: "0.28em",
        color:         `${GOLD}88`,
        textTransform: "uppercase",
        margin:        "0 0 6px",
        fontWeight:    700,
        fontFamily:    "'Inter', sans-serif",
      }}>
        SmokeCraft 360 · Master Blender
      </p>
      <h1 style={{
        fontFamily:    "'Cormorant Garamond', Georgia, serif",
        fontSize:      "clamp(24px, 4vw, 36px)",
        fontWeight:    300,
        color:         "#F0E8D4",
        letterSpacing: "0.06em",
        margin:        "0 0 28px",
        lineHeight:    1.2,
      }}>
        Leaf Composition · Blend Architecture
      </h1>

      {/* Three gold-handle sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 28 }}>
        {SLIDERS.map(sl => (
          <div key={sl.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div>
                <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, letterSpacing: "0.09em", fontFamily: "'Inter', sans-serif" }}>
                  {sl.label}
                </span>
                <span style={{
                  color:         "rgba(240,232,212,0.36)",
                  fontSize:      10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginLeft:    10,
                  fontFamily:    "'Inter', sans-serif",
                }}>
                  {sl.sub}
                </span>
              </div>
              <motion.span
                key={sl.val}
                initial={{ scale: 1.22, color: GOLD }}
                animate={{ scale: 1 }}
                style={{ color: sl.auto ? "rgba(212,175,55,0.40)" : GOLD, fontSize: 20, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}
              >
                {sl.val}%
              </motion.span>
            </div>

            <div style={{ position: "relative", height: 46, display: "flex", alignItems: "center" }}>
              <div style={{
                position: "absolute", left: 0, right: 0, height: 5,
                background: "rgba(255,255,255,0.08)", borderRadius: 3,
              }} />
              <div style={{
                position:     "absolute",
                left:         0,
                width:        `${sl.val}%`,
                height:       5,
                background:   sl.auto ? "rgba(212,175,55,0.22)" : `linear-gradient(90deg, ${GOLD}55, ${GOLD})`,
                borderRadius: 3,
                transition:   "width 0.10s",
                boxShadow:    sl.auto ? "none" : `0 0 10px ${GOLD}50`,
              }} />
              <input
                type="range" min={0} max={100} value={sl.val}
                disabled={sl.auto}
                onChange={e => sl.set(Number(e.target.value))}
                style={{
                  position:    "absolute",
                  left:        0,
                  right:       0,
                  width:       "100%",
                  height:      46,
                  opacity:     0,
                  zIndex:      3,
                  cursor:      sl.auto ? "not-allowed" : "pointer",
                  margin:      0,
                  padding:     0,
                  touchAction: "none",
                }}
              />
              <motion.div
                animate={{ left: `calc(${sl.val}% - 12px)` }}
                transition={{ type: "spring", stiffness: 440, damping: 30 }}
                style={{
                  position:      "absolute",
                  width:         24,
                  height:        24,
                  borderRadius:  "50%",
                  background:    sl.auto
                    ? "#282828"
                    : `radial-gradient(circle at 33% 30%, #f8e87a, ${GOLD} 55%, #a87820)`,
                  border:        `2.5px solid ${sl.auto ? "#404040" : GOLD}`,
                  boxShadow:     sl.auto ? "none" : `0 0 16px ${GOLD}88, 0 2px 8px rgba(0,0,0,0.60)`,
                  pointerEvents: "none",
                  top:           "50%",
                  transform:     "translateY(-50%)",
                  zIndex:        2,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CSS Cigar cross-section */}
      <div style={{
        position:     "relative",
        height:       54,
        borderRadius: 27,
        overflow:     "hidden",
        background:   `linear-gradient(90deg,
          rgba(${cigarFoot},${Math.round(cigarFoot * 0.62)},38,0.94) 0%,
          rgba(${cigarMid},${Math.round(cigarMid * 0.58)},22,0.96) ${seco}%,
          rgba(34,18,6,0.98) ${seco + viso}%,
          rgba(14,7,2,1.00) 100%)`,
        border:    `1px solid ${GOLD}38`,
        boxShadow: `0 0 26px rgba(212,175,55,0.14), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.40)`,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 38%, rgba(0,0,0,0.20) 100%)",
          borderRadius: "inherit", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 52,
          background: "radial-gradient(ellipse at 22% 50%, rgba(212,175,55,0.60) 0%, rgba(148,104,32,0.92) 55%, rgba(60,34,8,0.99) 100%)",
          borderRadius: "27px 0 0 27px",
        }} />
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 34,
          background: "radial-gradient(ellipse at 78% 50%, rgba(40,20,5,0.94) 0%, rgba(16,8,2,0.99) 100%)",
          borderRadius: "0 27px 27px 0",
          borderLeft: `1px solid ${GOLD}22`,
        }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
          <span style={{
            position: "absolute", left: `${Math.max(seco / 2, 6)}%`,
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase", pointerEvents: "none",
            fontFamily: "'Inter', sans-serif",
          }}>Seco</span>
          <span style={{
            position: "absolute", left: `${Math.min(seco + viso / 2, 88)}%`,
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.42)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase", pointerEvents: "none",
            fontFamily: "'Inter', sans-serif",
          }}>Viso</span>
          <span style={{
            position: "absolute", right: "5%",
            color: "rgba(255,255,255,0.30)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase", pointerEvents: "none",
            fontFamily: "'Inter', sans-serif",
          }}>Ligero</span>
        </div>
        <div style={{
          position: "absolute", inset: "0 52px 0 52px", top: "50%", height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}18, transparent)`,
          pointerEvents: "none",
        }} />
      </div>

      <p style={{
        textAlign:     "center",
        fontSize:      9,
        letterSpacing: "0.22em",
        color:         "rgba(212,175,55,0.28)",
        textTransform: "uppercase",
        margin:        "10px 0 0",
        fontFamily:    "'Inter', sans-serif",
      }}>
        Blend Cross-Section · Live Preview
      </p>
    </div>
  );
}
