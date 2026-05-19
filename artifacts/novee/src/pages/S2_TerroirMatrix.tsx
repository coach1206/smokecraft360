import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const GREEN = "#3DAA6A";

const HUMIDOR_MATCHES: Record<string, { name: string; origin: string; strength: string }[]> = {
  rich: [
    { name: "Arturo Fuente Opus X", origin: "Dominican Republic", strength: "Full" },
    { name: "Padron 1964 Anniversary", origin: "Nicaragua", strength: "Full-Medium" },
  ],
  balanced: [
    { name: "Davidoff Nicaragua", origin: "Nicaragua", strength: "Medium" },
    { name: "Rocky Patel Vintage 1990", origin: "Honduras", strength: "Medium" },
  ],
  mild: [
    { name: "Macanudo Café", origin: "Jamaica/Dominican", strength: "Mild" },
    { name: "Ashton Classic", origin: "Dominican Republic", strength: "Mild-Medium" },
  ],
};

function getSoilProfile(n: number, k: number, ph: number): keyof typeof HUMIDOR_MATCHES {
  const richness = (n + k) / 2;
  if (richness > 65 && ph < 6.5) return "rich";
  if (richness < 35 || ph > 7.0) return "mild";
  return "balanced";
}

type Step = "sliders" | "results" | "voucher";

export function S2_TerroirMatrix() {
  const { profile, updateProfile, setPhase, addPoints } = useGuest();

  const [step, setStep]   = useState<Step>("sliders");
  const [soilN, setSoilN] = useState(profile.soilN);
  const [soilK, setSoilK] = useState(profile.soilK);
  const [soilPH, setSoilPH] = useState(profile.soilPH);

  const profileKey = getSoilProfile(soilN, soilK, soilPH);
  const matches = HUMIDOR_MATCHES[profileKey];

  function touch() { playClick(); hapticClick(); }

  function handleAnalyze() {
    touch();
    updateProfile({ soilN, soilK, soilPH });
    addPoints(25);
    setStep("results");
  }

  function handleContinue() {
    touch();
    setStep("voucher");
  }

  function handleUnlockS3() {
    touch();
    hapticMilestone();
    setPhase("s3_spiritquiz");
  }

  const SLIDERS = [
    {
      label: "Nitrogen",
      sub: "Leaf Growth Catalyst",
      val: soilN,
      set: setSoilN,
      color: GREEN,
      min: 10, max: 90,
      unit: "mg/kg",
    },
    {
      label: "Potassium",
      sub: "Combustion Control",
      val: soilK,
      set: setSoilK,
      color: "#4A90D9",
      min: 10, max: 90,
      unit: "mg/kg",
    },
    {
      label: "pH Balance",
      sub: "Soil Acidity Index",
      val: soilPH,
      set: setSoilPH,
      color: "#C8762A",
      min: 4, max: 8,
      unit: "pH",
      step: 0.1,
    },
  ];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      <BackButton />

      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1000,
        height: 320,
        background: "radial-gradient(ellipse at 50% 0%, rgba(61,170,106,0.10) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 48px 48px",
        overflowY: "auto",
      }}>
        <AnimatePresence mode="wait">

          {/* ── Soil Sliders ── */}
          {step === "sliders" && (
            <motion.div
              key="sliders"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GREEN}99`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 2 · Terroir Matrix
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
                letterSpacing: "0.05em",
              }}>
                Soil Chemistry Lab
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 36px" }}>
                Dial your soil profile to reveal your humidor match.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 28, marginBottom: 36 }}>
                {SLIDERS.map(sl => (
                  <div key={sl.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                      <div>
                        <span style={{ color: sl.color, fontSize: 16, fontWeight: 700, letterSpacing: "0.08em" }}>{sl.label}</span>
                        <span style={{ color: "rgba(240,232,212,0.32)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginLeft: 10 }}>
                          {sl.sub}
                        </span>
                      </div>
                      <motion.span
                        key={sl.val}
                        initial={{ scale: 1.18 }}
                        animate={{ scale: 1 }}
                        style={{ color: sl.color, fontSize: 22, fontWeight: 800 }}
                      >
                        {sl.label === "pH Balance" ? sl.val.toFixed(1) : sl.val} {sl.unit}
                      </motion.span>
                    </div>

                    <div style={{ position: "relative", height: 48, display: "flex", alignItems: "center" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }} />
                      <div style={{
                        position: "absolute",
                        left: 0,
                        width: `${((sl.val - sl.min) / (sl.max - sl.min)) * 100}%`,
                        height: 6,
                        background: `linear-gradient(90deg, ${sl.color}55, ${sl.color})`,
                        borderRadius: 3,
                        boxShadow: `0 0 10px ${sl.color}55`,
                        transition: "width 0.08s",
                      }} />
                      <input
                        type="range"
                        min={sl.min}
                        max={sl.max}
                        step={sl.step ?? 1}
                        value={sl.val}
                        onChange={e => sl.set(Number(e.target.value))}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          width: "100%",
                          height: 48,
                          opacity: 0,
                          zIndex: 3,
                          cursor: "pointer",
                          margin: 0,
                          padding: 0,
                          touchAction: "none",
                        }}
                      />
                      <motion.div
                        animate={{ left: `calc(${((sl.val - sl.min) / (sl.max - sl.min)) * 100}% - 14px)` }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        style={{
                          position: "absolute",
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, #fff9, ${sl.color} 55%, #4A2800)`,
                          border: `2.5px solid ${sl.color}`,
                          boxShadow: `0 0 18px ${sl.color}88, 0 2px 8px rgba(0,0,0,0.60)`,
                          pointerEvents: "none",
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                type="button"
                onPointerDown={handleAnalyze}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: `linear-gradient(135deg, ${GREEN} 0%, #1E7A44 100%)`,
                  border: "none",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 0 32px rgba(61,170,106,0.28)`,
                }}
              >
                ANALYZE TERROIR PROFILE →
              </motion.button>
            </motion.div>
          )}

          {/* ── Humidor Match ── */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 720 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GREEN}99`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 2 · Humidor Match
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
                letterSpacing: "0.05em",
              }}>
                Your Soil Profile · {profileKey.charAt(0).toUpperCase() + profileKey.slice(1)}
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 32px" }}>
                Live inventory match from tonight's physical humidor.
              </p>

              {/* Soil summary bar */}
              <div style={{
                display: "flex",
                gap: 12,
                marginBottom: 28,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "18px 22px",
              }}>
                {[
                  { label: "Nitrogen", val: soilN, color: GREEN, unit: "mg" },
                  { label: "Potassium", val: soilK, color: "#4A90D9", unit: "mg" },
                  { label: "pH", val: soilPH.toFixed(1), color: "#C8762A", unit: "" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}{s.unit}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.16em", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                {matches.map((m, i) => (
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: "rgba(61,170,106,0.06)",
                      border: "1.5px solid rgba(61,170,106,0.30)",
                      borderRadius: 14,
                      padding: "22px 26px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0E8D4", marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", letterSpacing: "0.10em" }}>
                        {m.origin} · {m.strength} Strength
                      </div>
                    </div>
                    <div style={{
                      background: "rgba(61,170,106,0.14)",
                      border: `1px solid ${GREEN}55`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      color: GREEN,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}>
                      IN STOCK
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                type="button"
                onPointerDown={handleContinue}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
                  border: "none",
                  borderRadius: 12,
                  color: "#0A0604",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                CLAIM SESSION VOUCHER →
              </motion.button>
            </motion.div>
          )}

          {/* ── Voucher Lock ── */}
          {step === "voucher" && (
            <motion.div
              key="voucher"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 600, textAlign: "center" }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>🍽</div>
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 2 · Complete
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 16px",
              }}>
                Premium Appetizer Voucher
              </h2>

              <div style={{
                background: "rgba(212,175,55,0.08)",
                border: `2px dashed ${GOLD}55`,
                borderRadius: 16,
                padding: "32px",
                margin: "0 0 32px",
              }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, letterSpacing: "0.24em", marginBottom: 8 }}>
                  SMKTERR-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </div>
                <p style={{ color: "rgba(240,232,212,0.55)", fontSize: 18 }}>
                  Present to your server for a complimentary premium appetizer
                </p>
              </div>

              <motion.button
                type="button"
                onPointerDown={handleUnlockS3}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
                  border: "none",
                  borderRadius: 12,
                  color: "#0A0604",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: `0 0 36px rgba(212,175,55,0.28)`,
                }}
              >
                BEGIN SESSION 3 →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
