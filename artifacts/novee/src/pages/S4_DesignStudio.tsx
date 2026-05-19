import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { CheatCodeEngine } from "@/components/CheatCodeEngine";
import { playClick } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

const VITOLAS = [
  { id: "robusto",   label: "Robusto",   dims: "5″ × 50",  temp: "820°F", desc: "Classic short smoke, intense draw" },
  { id: "toro",      label: "Toro",      dims: "6″ × 52",  temp: "780°F", desc: "Balanced medium body, full finish" },
  { id: "churchill", label: "Churchill", dims: "7″ × 47",  temp: "740°F", desc: "Long cool smoke, refined complexity" },
  { id: "figurado",  label: "Figurado",  dims: "6.5″ × 54", temp: "760°F", desc: "Tapered cap for concentrated draw" },
];

const CAP_CUTS = [
  { id: "straight", label: "Straight Cut",  glyph: "═",  desc: "Clean, open draw" },
  { id: "vcut",     label: "V-Cut",         glyph: "V",  desc: "Concentrated flavor channel" },
  { id: "punch",    label: "Punch Cut",     glyph: "○",  desc: "Tight draw, premium tactile" },
];

const WOOD_GRAINS = [
  { id: "dark_walnut",   label: "Dark Walnut",    color: "#3D2010" },
  { id: "ebony",         label: "Ebony",          color: "#1A100A" },
  { id: "rosewood",      label: "Rosewood",       color: "#6B2A22" },
  { id: "cedar",         label: "Aged Cedar",     color: "#8B5E3C" },
  { id: "mahogany",      label: "Mahogany",       color: "#4E1C0E" },
  { id: "maple_burl",    label: "Maple Burl",     color: "#C89A60" },
];

type Step = "vitola" | "designstudio" | "results";

export function S4_DesignStudio() {
  const { profile, updateProfile, setPhase, addPoints } = useGuest();

  const [step, setStep]         = useState<Step>("vitola");
  const [vitola, setVitola]     = useState<string | null>(profile.vitola);
  const [capCut, setCapCut]     = useState<string | null>(profile.capCut);
  const [woodGrain, setWoodGrain] = useState<string | null>(profile.woodGrain);
  const [goldFoil, setGoldFoil] = useState(profile.goldFoil);
  const [stamp, setStamp]       = useState(false);
  const [designScore, setDesignScore] = useState(0);

  function touch() { playClick(); hapticClick(); }

  function handleVitolaDone() {
    if (!vitola || !capCut) return;
    touch();
    updateProfile({ vitola, capCut });
    addPoints(20);
    setStep("designstudio");
  }

  function handleDesignDone() {
    if (!woodGrain) return;
    touch();

    let ds = 50;
    if (woodGrain === "ebony" || woodGrain === "dark_walnut") ds += 15;
    if (goldFoil) ds += 20;
    if (stamp) ds += 15;
    setDesignScore(ds);

    updateProfile({ woodGrain, goldFoil });
    addPoints(ds);
    hapticMilestone();
    setStep("results");
  }

  const finalPoints = profile.points;
  const selectedVitola = VITOLAS.find(v => v.id === vitola);
  const selectedGrain  = WOOD_GRAINS.find(g => g.id === woodGrain);

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
        width: 1100,
        height: 360,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.13) 0%, transparent 70%)",
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

          {/* ── Vitola + Cap Cut ── */}
          {step === "vitola" && (
            <motion.div
              key="vitola"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 860 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 4 · Vitola Architecture
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 46px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
              }}>
                Choose Your Vitola
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 28px" }}>
                Shape determines aerodynamic smoke temperature and draw resistance.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
                {VITOLAS.map(v => {
                  const active = vitola === v.id;
                  return (
                    <motion.button
                      key={v.id}
                      type="button"
                      onPointerDown={() => { touch(); setVitola(v.id); }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background: active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                        border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 14,
                        padding: "22px 14px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: active ? `0 0 28px rgba(212,175,55,0.18)` : "none",
                        transition: "all 0.22s",
                      }}
                    >
                      {/* Cigar shape SVG */}
                      <svg width="36" height="80" viewBox="0 0 36 80" style={{ margin: "0 auto 12px", display: "block" }}>
                        <rect x="4" y={v.id === "figurado" ? 8 : 2} width="28" height={v.id === "figurado" ? 70 : 76}
                          rx={v.id === "figurado" ? 14 : 6}
                          fill={active ? `rgba(212,175,55,0.25)` : "rgba(255,255,255,0.07)"}
                          stroke={active ? GOLD : "rgba(255,255,255,0.15)"}
                          strokeWidth="1.5" />
                        {v.id === "figurado" && (
                          <ellipse cx="18" cy="8" rx="9" ry="6" fill={active ? `rgba(212,175,55,0.40)` : "rgba(255,255,255,0.12)"} />
                        )}
                      </svg>
                      <div style={{ fontSize: 17, fontWeight: 700, color: active ? GOLD : "#F0E8D4", marginBottom: 4, transition: "color 0.2s" }}>
                        {v.label}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(240,232,212,0.36)", marginBottom: 6 }}>{v.dims}</div>
                      <div style={{
                        display: "inline-block",
                        background: active ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${active ? GOLD + "44" : "transparent"}`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        color: active ? GOLD : "rgba(240,232,212,0.30)",
                        fontWeight: 700,
                        letterSpacing: "0.10em",
                        transition: "all 0.2s",
                      }}>
                        {v.temp}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(240,232,212,0.28)", marginTop: 8, lineHeight: 1.4 }}>{v.desc}</div>
                    </motion.button>
                  );
                })}
              </div>

              <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 18, margin: "0 0 16px", fontWeight: 600 }}>Cap Cutting Mechanics</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
                {CAP_CUTS.map(c => {
                  const active = capCut === c.id;
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      onPointerDown={() => { touch(); setCapCut(c.id); }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        background: active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)",
                        border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "18px 14px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'Inter', sans-serif",
                        transition: "all 0.22s",
                      }}
                    >
                      <div style={{ fontSize: 28, color: active ? GOLD : "rgba(255,255,255,0.25)", marginBottom: 8, fontWeight: 700 }}>{c.glyph}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: active ? GOLD : "#F0E8D4", marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(240,232,212,0.36)" }}>{c.desc}</div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                type="button"
                onPointerDown={handleVitolaDone}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "22px",
                  background: vitola && capCut ? `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)` : "rgba(255,255,255,0.06)",
                  border: vitola && capCut ? "none" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  color: vitola && capCut ? "#0A0604" : "rgba(255,255,255,0.28)",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: vitola && capCut ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                ENTER DESIGN STUDIO →
              </motion.button>
            </motion.div>
          )}

          {/* ── Bespoke Design Studio ── */}
          {step === "designstudio" && (
            <motion.div
              key="designstudio"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 900 }}
            >
              <p style={{ fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 10px" }}>
                Session 4 · Bespoke Box & Band Challenge
              </p>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(26px, 3.6vw, 44px)",
                fontWeight: 300,
                color: "#F0E8D4",
                margin: "0 0 8px",
              }}>
                Design Your Signature Box
              </h2>
              <p style={{ color: "rgba(240,232,212,0.40)", fontSize: 18, margin: "0 0 28px" }}>
                Each decision adds aesthetic synergy points to your final score.
              </p>

              <div style={{ display: "flex", gap: 24 }}>
                {/* Controls */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Wood Grain */}
                  <div>
                    <p style={{ fontSize: 12, letterSpacing: "0.24em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
                      Wood Grain Texture
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {WOOD_GRAINS.map(g => {
                        const active = woodGrain === g.id;
                        return (
                          <motion.button
                            key={g.id}
                            type="button"
                            onPointerDown={() => { touch(); setWoodGrain(g.id); }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              background: active ? g.color : "rgba(255,255,255,0.03)",
                              border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.10)",
                              borderRadius: 10,
                              padding: "14px 10px",
                              cursor: "pointer",
                              fontFamily: "'Inter', sans-serif",
                              transition: "all 0.22s",
                              textAlign: "center",
                            }}
                          >
                            <div style={{
                              width: "100%",
                              height: 28,
                              borderRadius: 6,
                              background: g.color,
                              marginBottom: 6,
                              border: "1px solid rgba(255,255,255,0.12)",
                              boxShadow: active ? `0 0 12px ${GOLD}55` : "none",
                            }} />
                            <div style={{ fontSize: 12, color: active ? GOLD : "rgba(240,232,212,0.50)", fontWeight: active ? 700 : 400 }}>
                              {g.label}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Gold Foil Embossing", sub: "+20 pts", val: goldFoil, set: setGoldFoil, color: GOLD },
                      { label: "Ronnie Felder Signature Stamp", sub: "+15 pts", val: stamp, set: setStamp, color: "#C8762A" },
                    ].map(t => (
                      <motion.button
                        key={t.label}
                        type="button"
                        onPointerDown={() => { touch(); t.set(!t.val); }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 20px",
                          background: t.val ? `rgba(${t.color === GOLD ? "212,175,55" : "200,118,42"},0.10)` : "rgba(255,255,255,0.03)",
                          border: t.val ? `1.5px solid ${t.color}66` : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                          transition: "all 0.22s",
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 17, fontWeight: 600, color: t.val ? t.color : "#F0E8D4", transition: "color 0.2s" }}>{t.label}</div>
                          <div style={{ fontSize: 12, color: "rgba(240,232,212,0.36)", marginTop: 2 }}>{t.sub}</div>
                        </div>
                        <div style={{
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          background: t.val ? t.color : "rgba(255,255,255,0.12)",
                          position: "relative",
                          transition: "background 0.22s",
                          flexShrink: 0,
                        }}>
                          <motion.div
                            animate={{ left: t.val ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 32 }}
                            style={{
                              position: "absolute",
                              top: 2,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#fff",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.30)",
                            }}
                          />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Live box preview */}
                <div style={{
                  width: 240,
                  flexShrink: 0,
                  background: woodGrain ? WOOD_GRAINS.find(g => g.id === woodGrain)!.color : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${GOLD}33`,
                  borderRadius: 16,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: goldFoil ? `0 0 40px rgba(212,175,55,0.35), 0 8px 32px rgba(0,0,0,0.60)` : "0 8px 32px rgba(0,0,0,0.50)",
                  transition: "all 0.4s",
                }}>
                  {/* Box lid */}
                  <div style={{
                    background: goldFoil
                      ? `linear-gradient(135deg, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0.10) 50%, rgba(212,175,55,0.28) 100%)`
                      : "rgba(255,255,255,0.06)",
                    padding: "22px 18px 18px",
                    borderBottom: `1px solid ${GOLD}22`,
                    textAlign: "center",
                    transition: "all 0.4s",
                  }}>
                    <div style={{
                      fontSize: 12,
                      letterSpacing: "0.36em",
                      textTransform: "uppercase",
                      color: goldFoil ? GOLD : "rgba(240,232,212,0.40)",
                      fontWeight: 700,
                      marginBottom: 6,
                      transition: "color 0.3s",
                    }}>
                      SmokeCraft 360
                    </div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 22,
                      fontWeight: 400,
                      color: goldFoil ? "#F0E8D4" : "rgba(240,232,212,0.60)",
                      transition: "color 0.3s",
                    }}>
                      {profile.firstName || "Your Name"}
                    </div>
                  </div>

                  {/* Box body */}
                  <div style={{ flex: 1, padding: "18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Cigar silhouettes */}
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        height: 18,
                        borderRadius: 9,
                        background: `rgba(212,175,55,${0.08 + i * 0.04})`,
                        border: `1px solid rgba(212,175,55,${0.12 + i * 0.04})`,
                      }} />
                    ))}

                    {/* Stamp */}
                    <AnimatePresence>
                      {stamp && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
                          animate={{ opacity: 1, scale: 1, rotate: -8 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          style={{
                            marginTop: 8,
                            padding: "6px 10px",
                            border: `2px solid ${GOLD}88`,
                            borderRadius: 6,
                            textAlign: "center",
                            transform: "rotate(-8deg)",
                          }}
                        >
                          <div style={{ fontSize: 9, letterSpacing: "0.20em", color: `${GOLD}88`, fontWeight: 800, textTransform: "uppercase" }}>
                            Ronnie Felder
                          </div>
                          <div style={{ fontSize: 7, color: `${GOLD}55`, letterSpacing: "0.14em" }}>
                            Master Blender
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vitola band */}
                  {selectedVitola && (
                    <div style={{
                      background: "rgba(0,0,0,0.55)",
                      padding: "12px 18px",
                      textAlign: "center",
                      borderTop: `1px solid ${GOLD}22`,
                    }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.20em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700 }}>
                        {selectedVitola.label}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(240,232,212,0.32)", marginTop: 2 }}>
                        {selectedVitola.dims} · {selectedVitola.temp}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                type="button"
                onPointerDown={handleDesignDone}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 28,
                  width: "100%",
                  padding: "22px",
                  background: woodGrain ? `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)` : "rgba(255,255,255,0.06)",
                  border: woodGrain ? "none" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  color: woodGrain ? "#0A0604" : "rgba(255,255,255,0.28)",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: woodGrain ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                FINALIZE & PUSH TO LEADERBOARD →
              </motion.button>
            </motion.div>
          )}

          {/* ── Results / Score Push ── */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", maxWidth: 760, textAlign: "center" }}
            >
              {/* Glow burst */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [1, 1.15, 1], opacity: [0, 0.35, 0.18] }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  width: 600,
                  height: 600,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${GOLD}44 0%, transparent 70%)`,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🏆</div>
                <p style={{ fontSize: 10, letterSpacing: "0.42em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 14px" }}>
                  Session Complete · Score Pushed to Wall Display
                </p>
                <h1 style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(36px, 5vw, 64px)",
                  fontWeight: 300,
                  color: GOLD,
                  margin: "0 0 8px",
                  letterSpacing: "0.04em",
                }}>
                  {finalPoints} PTS
                </h1>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 28,
                  fontWeight: 300,
                  color: "#F0E8D4",
                  margin: "0 0 36px",
                }}>
                  {profile.firstName} · Table Experience Complete
                </p>

                {/* Score breakdown */}
                <div style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginBottom: 36,
                  flexWrap: "wrap",
                }}>
                  {[
                    { label: "Journey XP",    val: finalPoints, color: GOLD    },
                    { label: "Design Synergy", val: designScore, color: "#4A90D9" },
                    { label: "Penalties",      val: `-${profile.penalties}`, color: "#C8322A" },
                    { label: "Multiplier",     val: `×${profile.multiplier}`, color: "#32B45A" },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 12,
                      padding: "16px 24px",
                      minWidth: 130,
                    }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "rgba(240,232,212,0.40)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Receipt print simulation */}
                <div style={{
                  background: "rgba(212,175,55,0.06)",
                  border: `1px dashed ${GOLD}44`,
                  borderRadius: 12,
                  padding: "20px 28px",
                  marginBottom: 28,
                  textAlign: "left",
                }}>
                  <p style={{ fontSize: 12, letterSpacing: "0.24em", color: `${GOLD}80`, textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                    Hardware Receipt Token
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.12em", margin: 0 }}>
                    SC360-{profile.firstName.toUpperCase().slice(0, 3)}-
                    {Math.random().toString(36).substring(2, 7).toUpperCase()}
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(240,232,212,0.36)", margin: "6px 0 0" }}>
                    Present to server · Valid tonight only
                  </p>
                </div>

                {/* Cheat codes at results */}
                <CheatCodeEngine />

                <motion.button
                  type="button"
                  onPointerDown={() => { touch(); setPhase("reentry"); }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    marginTop: 24,
                    width: "100%",
                    padding: "20px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    color: "rgba(240,232,212,0.55)",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  START NEW SESSION
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
