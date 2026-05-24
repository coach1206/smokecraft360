import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { CheatCodeEngine } from "@/components/CheatCodeEngine";
import { playClick, playHologram } from "@/hooks/useAudio";
import { hapticClick, hapticMilestone, hapticPulse } from "@/hooks/useHaptic";
import { submitScore, getVenueLeaderboard, getRegionalLeaderboard } from "@/lib/leaderboardEngine";
import { calcDifficultyTier } from "@/lib/xpEngine";

const GOLD = "#D4AF37";

const RANK_DATA = {
  beginner: { label: "Beginner", color: "#A0A0A0", icon: "◈" },
  apprentice: { label: "Apprentice", color: "#4A90E2", icon: "◈◈" },
  blender: { label: "Blender", color: "#50E3C2", icon: "◈◈◈" },
  master: { label: "Master Blender", color: "#D4AF37", icon: "◈◈◈◈" },
  architect: { label: "Grand Architect", color: "#FFD700", icon: "◈◈◈◈◈" },
};

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

type Step = "vitola" | "designstudio" | "golden_box" | "results";

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
    setStep("golden_box");
  }

  const finalPoints = profile.points;
  const currentTier = calcDifficultyTier(profile.merit);
  const selectedVitola = VITOLAS.find(v => v.id === vitola);
  const selectedGrain  = WOOD_GRAINS.find(g => g.id === woodGrain);

  useEffect(() => {
    if (step === "golden_box") {
      playHologram();
      hapticPulse();
      const timer = setTimeout(() => {
        submitScore({
          name: `${profile.firstName} ${profile.lastName}`.trim() || "Anonymous",
          score: profile.points,
          tier: currentTier,
          venueId: "default_venue",
          region: "Global",
          sessionType: profile.sessionType
        });
        setStep("results");
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, profile, currentTier]);

  const venueLeaderboard = useMemo(() => getVenueLeaderboard("default_venue"), [step]);
  const regionalLeaderboard = useMemo(() => getRegionalLeaderboard("Global"), [step]);

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "#000000",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* S4 — Cut / Design cinematic background */}
      <img src={`${import.meta.env.BASE_URL}images/cigar1.png`} alt="" aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 50%", opacity: 0.22, pointerEvents: "none" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.60) 40%, rgba(0,0,0,0.90) 100%)", pointerEvents: "none" }} />
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
        padding: step === "results" ? "80px 48px 48px" : "100px 48px 48px",
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
                      <div style={{ fontSize: 32, color: active ? GOLD : "rgba(255,255,255,0.30)", marginBottom: 10, fontWeight: 700 }}>{c.glyph}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: active ? GOLD : "#F0E8D4", marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontSize: 16, color: "rgba(240,232,212,0.45)" }}>{c.desc}</div>
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
                    <p style={{ fontSize: 14, letterSpacing: "0.24em", color: `${GOLD}90`, textTransform: "uppercase", fontWeight: 800, margin: "0 0 14px" }}>
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
                              border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
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
                            <div style={{ fontSize: 18, color: active ? GOLD : "rgba(240,232,212,0.55)", fontWeight: active ? 700 : 400 }}>
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
                          <div style={{ fontSize: 24, fontWeight: 700, color: t.val ? t.color : "#F0E8D4", transition: "color 0.2s" }}>{t.label}</div>
                          <div style={{ fontSize: 18, color: "rgba(240,232,212,0.42)", marginTop: 4 }}>{t.sub}</div>
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

                {/* Preview column — cigar photo + cedar box preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, width: 260 }}>
                {/* ── Nicaraguan Maduro Cigar — obsidian glass mat ── */}
                <div style={{
                  width: "100%", borderRadius: 16,
                  background: "linear-gradient(160deg, rgba(10,6,2,0.92) 0%, rgba(6,3,1,0.98) 100%)",
                  border: "1px solid rgba(212,139,0,0.30)",
                  boxShadow: "0 0 40px rgba(212,139,0,0.08), inset 0 1px 0 rgba(212,139,0,0.12)",
                  position: "relative", overflow: "hidden",
                  padding: "5px 5px 0",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.7), transparent)", pointerEvents: "none" }} />
                  <div style={{ width: "100%", aspectRatio: "16/7", borderRadius: 12, overflow: "hidden", position: "relative" }}>
                    <img
                      src="https://images.unsplash.com/photo-1589831377283-33cb1cc6bd5d?auto=format&fit=crop&w=600&q=85"
                      alt="Nicaraguan Maduro hand-rolled cigar"
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", display: "block" }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,2,0,0.08) 0%, transparent 40%, rgba(4,2,0,0.72) 100%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: 8, left: 12, display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 7, letterSpacing: "0.30em", color: "rgba(212,139,0,0.65)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase", fontWeight: 700 }}>YOUR RESERVE · SIGNATURE BLEND</span>
                      <span style={{ fontSize: 12, fontWeight: 300, color: "rgba(230,210,175,0.92)", fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.10em" }}>Nicaraguan Maduro · Hand-Rolled</span>
                    </div>
                  </div>
                </div>

                {/* Live box preview — cedar box photo */}
                <div style={{
                  width: "100%",
                  position: "relative",
                  border: `1.5px solid ${goldFoil ? GOLD + "88" : GOLD + "33"}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: goldFoil
                    ? `0 0 50px rgba(212,175,55,0.45), 0 10px 40px rgba(0,0,0,0.70)`
                    : "0 8px 36px rgba(0,0,0,0.60)",
                  transition: "box-shadow 0.45s, border-color 0.45s",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  {/* Cedar box background photo */}
                  <img
                    src={`${import.meta.env.BASE_URL}images/cedar_box.png`}
                    alt="Cedar Humidor Box"
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "cover", objectPosition: "center",
                      zIndex: 0,
                    }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Dark overlay tinted with selected wood color */}
                  <div style={{
                    position: "absolute", inset: 0, zIndex: 1,
                    background: woodGrain
                      ? `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, ${WOOD_GRAINS.find(g=>g.id===woodGrain)!.color}CC 100%)`
                      : "rgba(0,0,0,0.72)",
                    transition: "background 0.45s",
                  }} />
                  {/* Gold foil shimmer */}
                  {goldFoil && (
                    <div style={{
                      position: "absolute", inset: 0, zIndex: 2,
                      background: "linear-gradient(135deg, rgba(212,175,55,0.30) 0%, transparent 50%, rgba(212,175,55,0.20) 100%)",
                      pointerEvents: "none",
                    }} />
                  )}

                  {/* Box lid content */}
                  <div style={{
                    position: "relative", zIndex: 3,
                    padding: "24px 18px 18px",
                    borderBottom: `1px solid ${GOLD}33`,
                    textAlign: "center",
                  }}>
                    <div style={{
                      fontSize: 11, letterSpacing: "0.38em", textTransform: "uppercase",
                      color: goldFoil ? GOLD : "rgba(240,232,212,0.50)", fontWeight: 800, marginBottom: 8,
                      transition: "color 0.3s", fontFamily: "'Inter', sans-serif",
                    }}>
                      NOVEE 360
                    </div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 26, fontWeight: 400,
                      color: goldFoil ? "#F0E8D4" : "rgba(240,232,212,0.70)",
                      transition: "color 0.3s", lineHeight: 1.1,
                    }}>
                      {profile.firstName || "Your Name"}
                    </div>
                  </div>

                  {/* Box body */}
                  <div style={{ flex: 1, padding: "16px", position: "relative", zIndex: 3, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        height: 20, borderRadius: 10,
                        background: `rgba(212,175,55,${0.10 + i * 0.05})`,
                        border: `1px solid rgba(212,175,55,${0.18 + i * 0.05})`,
                      }} />
                    ))}

                    <AnimatePresence>
                      {stamp && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
                          animate={{ opacity: 1, scale: 1, rotate: -8 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          style={{ marginTop: 10, padding: "8px 12px", border: `2px solid ${GOLD}99`, borderRadius: 6, textAlign: "center" }}
                        >
                          <div style={{ fontSize: 12, letterSpacing: "0.22em", color: `${GOLD}CC`, fontWeight: 800, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
                            Ronnie Felder
                          </div>
                          <div style={{ fontSize: 10, color: `${GOLD}77`, letterSpacing: "0.16em", fontFamily: "'Inter',sans-serif" }}>
                            Master Blender
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vitola band */}
                  {selectedVitola && (
                    <div style={{
                      background: "rgba(0,0,0,0.70)", padding: "14px 18px",
                      textAlign: "center", borderTop: `1px solid ${GOLD}33`,
                      position: "relative", zIndex: 3,
                    }}>
                      <div style={{ fontSize: 14, letterSpacing: "0.22em", color: `${GOLD}AA`, textTransform: "uppercase", fontWeight: 800, fontFamily: "'Inter',sans-serif" }}>
                        {selectedVitola.label}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(240,232,212,0.40)", marginTop: 4, fontFamily: "'Inter',sans-serif" }}>
                        {selectedVitola.dims} · {selectedVitola.temp}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>{/* end preview column */}

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
                CRAFT YOUR LEGACY →
              </motion.button>
            </motion.div>
          )}

          {/* ── Golden Box Reveal Cinematic ── */}
          {step === "golden_box" && (
            <motion.div
              key="golden_box"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle, #1A100A 0%, #000 100%)",
                zIndex: 100,
              }}
            >
              <motion.div
                initial={{ y: 300, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{ position: "relative" }}
              >
                {/* Spotlight effect */}
                <div style={{
                  position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
                  width: 400, height: 600,
                  background: "radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.2) 0%, transparent 70%)",
                  pointerEvents: "none", zIndex: 0
                }} />
                
                <motion.div
                  animate={{ 
                    boxShadow: ["0 0 20px rgba(212,175,55,0.3)", "0 0 60px rgba(212,175,55,0.6)", "0 0 20px rgba(212,175,55,0.3)"]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    width: 320, height: 440,
                    background: woodGrain ? WOOD_GRAINS.find(g=>g.id===woodGrain)?.color : "#2A1810",
                    border: `2px solid ${GOLD}`,
                    borderRadius: 20,
                    position: "relative",
                    zIndex: 1,
                    overflow: "hidden",
                    display: "flex", flexDirection: "column"
                  }}
                >
                  <div style={{ padding: "30px 20px", borderBottom: `1px solid ${GOLD}44`, textAlign: "center" }}>
                    <div style={{ fontSize: 12, letterSpacing: "0.4em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>NOVEE 360</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: "#F0E8D4", marginTop: 10 }}>{profile.firstName}</div>
                  </div>
                  <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 15 }}>
                     <div style={{ fontSize: 14, color: `${GOLD}88`, textTransform: "uppercase", letterSpacing: "0.1em" }}>Master Composition</div>
                     <div style={{ color: "#F0E8D4", fontSize: 18 }}>{profile.blendCountry1} & {profile.blendCountry2}</div>
                     <div style={{ color: "rgba(240,232,212,0.6)", fontSize: 14 }}>{selectedVitola?.label} · {selectedVitola?.dims}</div>
                     <div style={{ color: "rgba(240,232,212,0.6)", fontSize: 14 }}>{capCut?.toUpperCase()} CUT</div>
                  </div>
                  <div style={{ padding: "20px", borderTop: `1px solid ${GOLD}44`, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{RANK_DATA[currentTier].label}</div>
                  </div>
                </motion.div>

                {/* Particle explosion placeholder (Visual cue) */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2], opacity: [0, 1, 0] }}
                  transition={{ duration: 1, delay: 0.5 }}
                  style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    width: 200, height: 200, borderRadius: "50%",
                    background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
                    zIndex: 2
                  }}
                />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 48, color: "#F0E8D4", marginTop: 40,
                  letterSpacing: "0.1em"
                }}
              >
                THE LEGACY REVEALED
              </motion.h1>
            </motion.div>
          )}

          {/* ── Results + Leaderboard ── */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              style={{ width: "100%", maxWidth: 1000, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ 
                  background: "rgba(255,255,255,0.03)", 
                  border: "1px solid rgba(255,255,255,0.08)", 
                  borderRadius: 20, 
                  padding: 32,
                  textAlign: "center"
                }}>
                  <p style={{ fontSize: 12, letterSpacing: "0.4em", color: GOLD, textTransform: "uppercase", fontWeight: 800, margin: "0 0 20px" }}>
                    CRAFT ACHIEVED
                  </p>
                  
                  <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
                     <div style={{ fontSize: 80, fontWeight: 900, color: "#FFF", lineHeight: 1 }}>{finalPoints}</div>
                     <div style={{ fontSize: 14, color: GOLD, fontWeight: 700, letterSpacing: "0.2em", marginTop: 4 }}>TOTAL MERIT</div>
                  </div>

                  <div style={{ 
                    marginTop: 20, 
                    padding: "15px 30px", 
                    background: `rgba(${currentTier === "beginner" ? "160,160,160" : "212,175,55"}, 0.1)`,
                    border: `1px solid ${RANK_DATA[currentTier].color}44`,
                    borderRadius: 50,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    <span style={{ fontSize: 24, color: RANK_DATA[currentTier].color }}>{RANK_DATA[currentTier].icon}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#F0E8D4", textTransform: "uppercase" }}>{RANK_DATA[currentTier].label}</span>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
                  <h3 style={{ fontSize: 14, color: GOLD, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 20 }}>Session Progress</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {profile.pairingHistory.map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "rgba(240,232,212,0.6)", fontSize: 14 }}>
                        <span>{h.cigar} + {h.drink || "No drink"}</span>
                        <span style={{ color: GOLD }}>+{h.xp} XP</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(240,232,212,0.6)", fontSize: 14 }}>
                      <span>Design Score</span>
                      <span style={{ color: GOLD }}>+{designScore} XP</span>
                    </div>
                  </div>
                </div>

                {currentTier === "master" || currentTier === "architect" ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPhase("executive_command")}
                    style={{
                      padding: "20px",
                      background: "linear-gradient(135deg, #1A100A 0%, #000 100%)",
                      border: `1.5px solid ${GOLD}`,
                      borderRadius: 12,
                      color: GOLD,
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      cursor: "pointer"
                    }}
                  >
                    ACCESS ELITE VAULT →
                  </motion.button>
                ) : null}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Leaderboards */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, flex: 1 }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, color: GOLD, textTransform: "uppercase", letterSpacing: "0.2em" }}>Venue Top 10</h3>
                      <span style={{ fontSize: 10, color: "rgba(240,232,212,0.3)" }}>RESETS DAILY</span>
                   </div>
                   
                   <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {venueLeaderboard.length > 0 ? venueLeaderboard.map((e, i) => (
                        <div key={i} style={{ 
                          display: "flex", alignItems: "center", gap: 12, 
                          padding: "12px 16px", 
                          background: i === 0 ? `rgba(212,175,55,0.1)` : "rgba(255,255,255,0.02)",
                          borderRadius: 8,
                          border: i === 0 ? `1px solid ${GOLD}44` : "1px solid transparent"
                        }}>
                           <span style={{ width: 20, color: i === 0 ? GOLD : "rgba(240,232,212,0.3)", fontWeight: 800 }}>{i+1}</span>
                           <span style={{ flex: 1, color: "#F0E8D4", fontWeight: 500 }}>{e.name}</span>
                           <span style={{ color: GOLD, fontWeight: 800 }}>{e.score}</span>
                        </div>
                      )) : (
                        <div style={{ textAlign: "center", color: "rgba(240,232,212,0.2)", padding: 40 }}>No scores yet today</div>
                      )}
                   </div>
                </div>

                {venueLeaderboard.length > 0 && (
                   <div style={{ 
                     background: `linear-gradient(135deg, ${GOLD}22 0%, transparent 100%)`,
                     border: `1px solid ${GOLD}44`,
                     borderRadius: 20,
                     padding: 24,
                     position: "relative",
                     overflow: "hidden"
                   }}>
                      <div style={{ fontSize: 10, color: GOLD, fontWeight: 900, letterSpacing: "0.2em", marginBottom: 12 }}>LOUNGE CHAMPION</div>
                      <div style={{ fontSize: 24, color: "#F0E8D4", fontFamily: "'Cormorant Garamond', serif" }}>{venueLeaderboard[0].name}</div>
                      <div style={{ fontSize: 14, color: GOLD, marginTop: 4 }}>{RANK_DATA[venueLeaderboard[0].tier].label}</div>
                      
                      <div style={{ 
                        position: "absolute", right: -20, bottom: -20, 
                        fontSize: 100, color: `${GOLD}11`, fontWeight: 900 
                      }}>#1</div>
                   </div>
                )}
                
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase("crafthub")}
                  style={{
                    padding: "20px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "rgba(240,232,212,0.6)",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    cursor: "pointer"
                  }}
                >
                  RETURN TO HUB
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <CheatCodeEngine />
    </div>
  );
}
