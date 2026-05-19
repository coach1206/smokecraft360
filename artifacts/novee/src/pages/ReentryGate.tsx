import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { CigarHero } from "@/components/CigarHero";

const GOLD = "#D4AF37";

export function ReentryGate() {
  const { profile, setPhase } = useGuest();
  const [lastName, setLastName] = useState("");
  const [phone4,   setPhone4]   = useState("");
  const [error,    setError]    = useState("");
  const [shake,    setShake]    = useState(false);

  function handleNew()    { setPhase("s1_demo"); }
  function handleReturn() {
    const ok =
      profile.lastName.trim().length > 0 &&
      lastName.trim().toLowerCase() === profile.lastName.trim().toLowerCase() &&
      phone4.trim() === profile.phone4.trim();
    if (ok) {
      hapticMilestone();
      setPhase(profile.phase === "reentry" ? "s1_demo" : profile.phase);
    } else {
      hapticError();
      setError("Credentials not recognized.");
      setShake(true);
      setTimeout(() => setShake(false), 650);
    }
  }

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      display:    "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'Inter', sans-serif",
      overflow:   "hidden",
    }}>

      {/* ════════════ LEFT — Full-bleed brand panel ════════════ */}
      <div style={{
        position:      "relative",
        display:       "flex",
        flexDirection: "column",
        overflow:      "hidden",
        borderRight:   `1px solid rgba(212,175,55,0.18)`,
      }}>
        {/* Deep obsidian base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(165deg, #110C04 0%, #070502 55%, #0A0703 100%)",
        }} />

        {/* Brushed horizontal titanium grain */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.032,
          backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.7) 1px, transparent 2px, transparent 14px)",
        }} />

        {/* Gold top rim */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${GOLD}EE 0%, ${GOLD}66 70%, transparent 100%)`,
          boxShadow: `0 0 28px 4px rgba(212,175,55,0.28)`,
          zIndex: 6,
        }} />

        {/* ── CIGAR HERO — upper 52% ── */}
        <div style={{
          position: "relative",
          flex: "0 0 52%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "32px 36px 8px",
        }}>
          {/* Ember ambient light from foot (right side) */}
          <div style={{
            position: "absolute",
            top: "25%", right: "-4%",
            width: "50%", height: "60%",
            background: "radial-gradient(ellipse at 72% 50%, rgba(255,110,20,0.26) 0%, rgba(255,50,0,0.08) 45%, transparent 72%)",
            pointerEvents: "none",
          }} />
          {/* Cool gold counter-light from left */}
          <div style={{
            position: "absolute",
            top: "15%", left: "-4%",
            width: "38%", height: "70%",
            background: "radial-gradient(ellipse at 18% 50%, rgba(212,175,55,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          {/* Floor reflection fade */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0, height: "30%",
            background: "linear-gradient(0deg, rgba(212,175,55,0.07) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />
          <CigarHero wrapperTone="corojo" />
        </div>

        {/* ── Wordmark — lower 48% ── */}
        <div style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 64px 56px",
          zIndex: 2,
        }}>
          {/* Vignette bridge */}
          <div style={{
            position: "absolute", top: "-56px", left: 0, right: 0, height: 72,
            background: "linear-gradient(180deg, transparent, rgba(7,5,2,0.72))",
            pointerEvents: "none",
          }} />
          <div style={{
            fontSize:      11,
            letterSpacing: "0.60em",
            textTransform: "uppercase",
            fontWeight:    800,
            color:         `${GOLD}70`,
            marginBottom:  22,
          }}>
            SmokeCraft 360
          </div>

          <h1 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(68px, 9vw, 120px)",
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 28px",
            letterSpacing: "0.04em",
            lineHeight:    0.94,
            textShadow:    `0 0 100px rgba(212,175,55,0.20), 0 4px 60px rgba(0,0,0,0.90)`,
          }}>
            The<br />Lounge
          </h1>

          {/* Gold rule */}
          <div style={{
            width:      100,
            height:     2,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            boxShadow:  `0 0 14px ${GOLD}55`,
            marginBottom: 24,
          }} />

          <p style={{
            fontSize:   18,
            color:      "rgba(240,232,212,0.36)",
            lineHeight: 1.65,
            margin:     0,
            maxWidth:   400,
          }}>
            A 4-session luxury cigar science journey. Build your blend, earn your rank, and claim your place on tonight's wall display.
          </p>
        </div>

        {/* Kiosk ID bottom-left */}
        <div style={{
          position:   "absolute",
          bottom:     20, left: 72,
          fontSize:   9,
          letterSpacing: "0.40em",
          color:      "rgba(255,255,255,0.14)",
          textTransform: "uppercase",
          fontWeight: 700,
          zIndex:     2,
        }}>
          KIOSK UNIT · SC360-01
        </div>
      </div>

      {/* ════════════ RIGHT — Action panel ════════════ */}
      <div style={{
        position:       "relative",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
        padding:        "72px 64px",
        background:     "rgba(255,255,255,0.016)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        overflow:       "hidden",
      }}>
        {/* Right panel inner depth gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(212,175,55,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }} />

        {/* Gold top rim — right panel */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${GOLD}55 0%, ${GOLD}CC 100%)`,
          boxShadow: `0 0 24px 4px rgba(212,175,55,0.22)`,
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 480, width: "100%" }}>

          {/* ── New Session ── */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.52em", textTransform: "uppercase",
              fontWeight: 800, color: `${GOLD}66`, marginBottom: 14,
            }}>
              First Visit
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 46, fontWeight: 300, color: "#F0E8D4",
              margin: "0 0 8px", letterSpacing: "0.04em", lineHeight: 1.05,
            }}>
              Begin Your Journey
            </h2>
            <p style={{ color: "rgba(240,232,212,0.35)", fontSize: 17, margin: "0 0 28px", lineHeight: 1.55 }}>
              New session — 4 stages, fully tracked, with live scoring on the room display.
            </p>

            <motion.button type="button" onPointerDown={handleNew} whileTap={{ scale: 0.97 }}
              style={{
                width:         "100%",
                padding:       "26px",
                background:    `linear-gradient(135deg, ${GOLD} 0%, #BF9800 52%, #9A7A14 100%)`,
                border:        "none",
                borderRadius:  14,
                color:         "#060400",
                fontSize:      20,
                fontWeight:    900,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                cursor:        "pointer",
                fontFamily:    "'Inter', sans-serif",
                boxShadow:     `0 0 56px rgba(212,175,55,0.32), 0 10px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.24)`,
                position:      "relative",
                overflow:      "hidden",
              }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "52%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, transparent 100%)",
                borderRadius: "14px 14px 0 0",
              }} />
              BEGIN NEW SESSION
            </motion.button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.36em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontWeight: 700 }}>
              RETURNING GUEST
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* ── Return ── */}
          <div style={{ marginBottom: 14 }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 36, fontWeight: 300, color: "#F0E8D4",
              margin: "0 0 22px", letterSpacing: "0.04em", lineHeight: 1.05,
            }}>
              Resume Session
            </h2>

            <motion.div
              animate={shake ? { x: [-12, 12, -9, 9, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.44 }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {[
                { val: lastName, set: setLastName, ph: "LAST NAME",    extra: {} },
                { val: phone4, set: (v: string) => setPhone4(v.replace(/\D/g,"").slice(0,4)), ph: "LAST 4 DIGITS", extra: { letterSpacing: "0.32em" }, max: 4 },
              ].map(f => (
                <input key={f.ph} type="text" value={f.val}
                  onChange={e => { f.set(e.target.value); setError(""); }}
                  maxLength={(f as { max?: number }).max}
                  placeholder={f.ph}
                  style={{
                    padding:      "22px 24px",
                    background:   "rgba(255,255,255,0.042)",
                    border:       `1.5px solid ${error ? "rgba(200,50,42,0.60)" : "rgba(212,175,55,0.22)"}`,
                    borderRadius: 13,
                    color:        "#F0E8D4",
                    fontSize:     24,
                    fontWeight:   700,
                    fontFamily:   "'Inter', sans-serif",
                    outline:      "none",
                    boxShadow:    "inset 0 2px 8px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04)",
                    transition:   "border-color 0.22s",
                    width:        "100%",
                    boxSizing:    "border-box",
                    ...f.extra,
                  }}
                />
              ))}

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ color: "#C8322A", fontSize: 14, margin: "0", letterSpacing: "0.04em" }}>
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button type="button" onPointerDown={handleReturn} whileTap={{ scale: 0.97 }}
                style={{
                  marginTop:     4,
                  padding:       "22px",
                  background:    "rgba(212,175,55,0.06)",
                  border:        `1.5px solid rgba(212,175,55,0.35)`,
                  borderRadius:  13,
                  color:         GOLD,
                  fontSize:      18,
                  fontWeight:    800,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  cursor:        "pointer",
                  fontFamily:    "'Inter', sans-serif",
                  boxShadow:     "inset 0 1px 0 rgba(255,255,255,0.06)",
                  width:         "100%",
                }}>
                RETURN TO MY SESSION →
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom hardware bar */}
      <div style={{
        position:   "fixed",
        bottom:     0, left: 0, right: 0,
        height:     2,
        background: `linear-gradient(90deg, ${GOLD}CC 50%, ${GOLD}55 100%)`,
        zIndex:     50,
      }} />
    </div>
  );
}
