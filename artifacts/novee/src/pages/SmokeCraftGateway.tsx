import { useEffect } from "react";
import { motion } from "framer-motion";

const GOLD = "#d4af37";

export default function SmokeCraftGateway() {
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.assign("/master-blender");
    }, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,176,0,0.08) 0%, transparent 70%), #000000",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            28,
        fontFamily:     "'Inter', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}
      >
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 38, color: GOLD, lineHeight: 1 }}
        >
          ✦
        </motion.span>

        <div
          style={{
            fontFamily:           "'Cormorant Garamond', serif",
            fontSize:             "clamp(2rem, 5.5vw, 3rem)",
            fontWeight:           300,
            letterSpacing:        "0.1em",
            textTransform:        "uppercase",
            background:           "linear-gradient(180deg, #ffffff 0%, #dfba73 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
          }}
        >
          SmokeCraft 360
        </div>

        <p
          style={{
            fontSize:      "clamp(9px, 1.4vw, 11px)",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color:         `${GOLD}70`,
            margin:        0,
          }}
        >
          Entering the Blending Chamber
        </p>

        <div
          style={{
            width:        200,
            height:       1,
            background:   `${GOLD}18`,
            borderRadius: 1,
            overflow:     "hidden",
            marginTop:    6,
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.7, ease: "easeInOut" }}
            style={{
              height:          "100%",
              background:      GOLD,
              transformOrigin: "left",
              borderRadius:    1,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
