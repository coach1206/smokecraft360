import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "level0" | "level1";

export default function SmokeCraftGateway() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("level0");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("level1"), 1400);
    const t2 = setTimeout(() => navigate("/craft-collection"), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [navigate]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>

      {/* ── LEVEL 0: Profound Innovations LLC — pure black canvas ── */}
      <AnimatePresence>
        {phase === "level0" && (
          <motion.div
            key="level0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "#000000",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(13px, 2.2vw, 20px)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.90)",
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                margin: 0,
                textAlign: "center",
              }}
            >
              Profound Innovations LLC
            </motion.p>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.7, ease: "easeOut" }}
              style={{
                width: 100, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.45), transparent)",
                marginTop: 20,
                transformOrigin: "center",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEVEL 1: NOVEÈ OS terminal frame — 1.2s horizontal slide ── */}
      <AnimatePresence>
        {phase === "level1" && (
          <motion.div
            key="level1"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", inset: 0,
              background: "#000000",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 28,
            }}
          >
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
              width: "60vw", height: "40vh",
              background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Terminal frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{
                border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: 14,
                padding: "clamp(32px, 5vh, 56px) clamp(32px, 6vw, 72px)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                background: "rgba(6,4,2,0.94)",
                textAlign: "center",
                minWidth: "clamp(260px, 38vw, 480px)",
                boxShadow: "0 0 80px rgba(212,175,55,0.06), 0 40px 80px rgba(0,0,0,0.6)",
              }}
            >
              <p style={{
                fontSize: 8, letterSpacing: "0.52em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.38)",
                margin: "0 0 18px",
              }}>
                Profound Innovations
              </p>
              <h1 style={{
                fontFamily: "Georgia, 'Cormorant Garamond', serif",
                fontSize: "clamp(22px, 4vw, 44px)",
                fontWeight: 300,
                color: "#F0E8D4",
                letterSpacing: "0.30em",
                textTransform: "uppercase",
                margin: "0 0 10px",
                lineHeight: 1,
              }}>
                NOVEÈ OS
              </h1>
              <p style={{
                fontSize: 9, letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(212,175,55,0.50)",
                margin: "0 0 28px",
              }}>
                Platform Terminal · Initializing
              </p>

              {/* Loading bar */}
              <div style={{ height: 2, background: "rgba(212,175,55,0.10)", borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #8B6914, #D4AF37, #f5d980)",
                    borderRadius: 2,
                  }}
                />
              </div>

              <p style={{
                fontSize: 8, letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.14)",
                margin: 0,
              }}>
                Loading Craft Collection…
              </p>
            </motion.div>

            {/* Manual entry fallback */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              onClick={() => navigate("/craft-collection")}
              style={{
                background: "none", border: "none",
                color: "rgba(212,175,55,0.38)",
                fontSize: 9, letterSpacing: "0.26em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "8px 16px",
              }}
            >
              Enter Collection →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
