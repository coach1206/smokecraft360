import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { CigarHero } from "@/components/CigarHero";

const GOLD = "#D4AF37";
const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

export function ReentryGate() {
  const { updateProfile, setPhase, resetProfile } = useGuest();
  const [lastName, setLastName] = useState("");
  const [pin,      setPin]      = useState("");
  const [error,    setError]    = useState(false);

  function beginNew() {
    resetProfile();
    hapticMilestone();
    setPhase("s1_demo");
  }

  function returnGuest() {
    if (lastName.trim() && pin.trim().length === 4) {
      hapticMilestone();
      updateProfile({ lastName: lastName.trim(), phone4: pin.trim() });
      setPhase("s1_demo");
    } else {
      hapticError();
      setError(true);
      setTimeout(() => setError(false), 900);
    }
  }

  return (
    <div style={{
      position:            "fixed",
      inset:               0,
      display:             "grid",
      gridTemplateColumns: "1fr 1fr",
      overflow:            "hidden",
    }}>

      {/* ═══════════ LEFT — FULL-BLEED CIGAR PHOTO PANEL ═══════════ */}
      <div style={{ position: "relative", overflow: "hidden" }}>

        {/* PRIMARY: AI cigar photo — full bleed background */}
        <img
          src={IMG("cigar_hero.png")}
          alt=""
          style={{
            position:       "absolute",
            inset:          0,
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center 30%",
          }}
        />

        {/* Deep dark gradient overlay — keeps photo visible but anchors text */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: `
            linear-gradient(180deg,
              rgba(4,2,0,0.52) 0%,
              rgba(4,2,0,0.48) 35%,
              rgba(4,2,0,0.78) 65%,
              rgba(2,1,0,0.96) 100%
            )
          `,
        }} />

        {/* Warm amber corona from the ember — top right */}
        <div style={{
          position:   "absolute",
          top:        "-5%", right: "-5%",
          width:      "60%", height: "55%",
          background: "radial-gradient(ellipse at 70% 20%, rgba(255,120,20,0.18) 0%, rgba(212,140,30,0.10) 35%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Gold top rim */}
        <div style={{
          position:  "absolute",
          top: 0, left: 0, right: 0,
          height:    3,
          background: `linear-gradient(90deg, ${GOLD}EE, ${GOLD}88 60%, transparent 100%)`,
          boxShadow: `0 0 32px 4px rgba(212,175,55,0.28)`,
          zIndex:    6,
        }} />

        {/* Gold left rim */}
        <div style={{
          position:   "absolute",
          top: 0, left: 0, bottom: 0,
          width:      3,
          background: `linear-gradient(180deg, ${GOLD}DD 0%, ${GOLD}55 55%, transparent 100%)`,
          boxShadow:  `4px 0 24px rgba(212,175,55,0.18)`,
        }} />

        {/* Gold right divider */}
        <div style={{
          position:   "absolute",
          top: 0, right: 0, bottom: 0,
          width:      1,
          background: `linear-gradient(180deg, transparent, ${GOLD}55 35%, ${GOLD}44 65%, transparent)`,
        }} />

        {/* ── Wordmark — anchored bottom-left ── */}
        <div style={{
          position:      "absolute",
          bottom:        0,
          left:          0,
          right:         0,
          padding:       "0 56px 52px",
        }}>
          {/* Gradient fade above text */}
          <div style={{
            position:   "absolute",
            bottom:     "100%",
            left:       0,
            right:      0,
            height:     120,
            background: "linear-gradient(0deg, rgba(5,3,1,0.90) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />

          <div style={{
            fontSize:      11,
            letterSpacing: "0.65em",
            textTransform: "uppercase",
            fontWeight:    800,
            color:         `${GOLD}80`,
            marginBottom:  20,
            fontFamily:    "'Inter', sans-serif",
          }}>
            SmokeCraft 360
          </div>

          <h1 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(72px, 9.5vw, 130px)",
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 20px",
            letterSpacing: "0.03em",
            lineHeight:    0.92,
            textShadow:    `0 0 80px rgba(212,175,55,0.22), 0 4px 60px rgba(0,0,0,0.95)`,
          }}>
            The<br />Lounge
          </h1>

          <div style={{
            width:      110,
            height:     2,
            background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            boxShadow:  `0 0 16px ${GOLD}66`,
            marginBottom: 20,
          }} />

          <p style={{
            fontSize:   20,
            color:      "rgba(240,232,212,0.42)",
            lineHeight: 1.60,
            margin:     0,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
          }}>
            A 4-session luxury cigar science journey.<br />
            Build your blend, earn your rank.
          </p>

          {/* Unit badge */}
          <div style={{
            marginTop:     28,
            fontSize:      10,
            letterSpacing: "0.45em",
            color:         `${GOLD}44`,
            fontFamily:    "'Inter', sans-serif",
            textTransform: "uppercase",
          }}>
            KIOSK UNIT · SC360-01
          </div>
        </div>

        {/* Gold divider right edge */}
        <div style={{
          position:   "absolute",
          top:        0,
          right:      0,
          bottom:     0,
          width:      1,
          background: `linear-gradient(180deg, transparent, ${GOLD}44 30%, ${GOLD}55 55%, ${GOLD}33 80%, transparent)`,
        }} />
      </div>

      {/* ═══════════ RIGHT — ACTION PANEL ═══════════ */}
      <div style={{
        position:       "relative",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
        padding:        "64px 64px",
        background:     "rgba(8,5,2,0.92)",
        overflow:       "hidden",
      }}>

        {/* Subtle texture */}
        <div style={{
          position:   "absolute",
          inset:      0,
          opacity:    0.025,
          backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.7) 1px, transparent 2px, transparent 14px)",
          pointerEvents: "none",
        }} />

        {/* Gold top rim right panel */}
        <div style={{
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     3,
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 50%, ${GOLD}CC 100%)`,
          boxShadow:  `0 0 28px 3px rgba(212,175,55,0.22)`,
          zIndex:     6,
        }} />

        {/* Status badge top-right */}
        <div style={{
          position:   "absolute",
          top:        18,
          right:      28,
          display:    "flex",
          alignItems: "center",
          gap:        8,
          fontSize:   10,
          letterSpacing: "0.35em",
          color:      "rgba(255,255,255,0.22)",
          fontFamily: "'Inter', sans-serif",
          textTransform: "uppercase",
        }}>
          TABLE KIOSK · ACTIVE
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 10px #32B45A" }} />
        </div>

        {/* ── FIRST VISIT ── */}
        <div style={{ marginBottom: 52 }}>
          <div style={{
            fontSize:      11,
            letterSpacing: "0.55em",
            textTransform: "uppercase",
            fontWeight:    800,
            color:         `${GOLD}77`,
            marginBottom:  18,
            fontFamily:    "'Inter', sans-serif",
          }}>
            First Visit
          </div>

          <h2 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(42px, 5vw, 64px)",
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 14px",
            letterSpacing: "0.03em",
            lineHeight:    1.05,
          }}>
            Begin Your Journey
          </h2>

          <p style={{
            fontSize:   20,
            color:      "rgba(240,232,212,0.38)",
            margin:     "0 0 28px",
            lineHeight: 1.55,
            fontFamily: "'Inter', sans-serif",
          }}>
            New session — 4 stages, fully tracked,<br />with live scoring on the room display.
          </p>

          <motion.button
            type="button"
            onPointerDown={beginNew}
            whileTap={{ scale: 0.97 }}
            style={{
              width:         "100%",
              padding:       "26px 32px",
              background:    `linear-gradient(135deg, ${GOLD}EE, #B8900A)`,
              border:        "none",
              borderRadius:  4,
              cursor:        "pointer",
              fontFamily:    "'Inter', sans-serif",
              fontSize:      18,
              fontWeight:    800,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color:         "#0A0700",
              boxShadow:     `0 8px 48px rgba(212,175,55,0.40), 0 2px 0 rgba(255,255,255,0.12) inset`,
            }}
          >
            BEGIN NEW SESSION
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{
            fontSize:      10,
            letterSpacing: "0.45em",
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.22)",
            fontFamily:    "'Inter', sans-serif",
          }}>
            Returning Guest
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* ── RETURNING GUEST ── */}
        <div>
          <h2 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(36px, 4vw, 52px)",
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 24px",
            letterSpacing: "0.03em",
          }}>
            Resume Session
          </h2>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginBottom: 16,
                  padding:      "14px 20px",
                  background:   "rgba(180,40,40,0.18)",
                  border:       "1px solid rgba(200,50,50,0.35)",
                  borderRadius: 4,
                  fontSize:     16,
                  color:        "#FF8080",
                  fontFamily:   "'Inter', sans-serif",
                }}
              >
                Last name + 4-digit code required to resume.
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {[
              { ph: "LAST NAME", val: lastName, fn: setLastName, type: "text" },
              { ph: "LAST 4 DIGITS", val: pin, fn: (v: string) => setPin(v.replace(/\D/,"").slice(0,4)), type: "tel" },
            ].map(({ ph, val, fn, type }) => (
              <input
                key={ph}
                type={type}
                placeholder={ph}
                value={val}
                onChange={e => fn(e.target.value)}
                style={{
                  width:         "100%",
                  padding:       "22px 24px",
                  background:    "rgba(255,255,255,0.05)",
                  border:        "1px solid rgba(212,175,55,0.18)",
                  borderRadius:  4,
                  fontFamily:    "'Inter', sans-serif",
                  fontSize:      22,
                  fontWeight:    600,
                  color:         "#F0E8D4",
                  letterSpacing: "0.12em",
                  outline:       "none",
                  boxSizing:     "border-box",
                }}
              />
            ))}
          </div>

          <motion.button
            type="button"
            onPointerDown={returnGuest}
            whileTap={{ scale: 0.97 }}
            style={{
              width:         "100%",
              padding:       "22px 32px",
              background:    "transparent",
              border:        `1px solid ${GOLD}66`,
              borderRadius:  4,
              cursor:        "pointer",
              fontFamily:    "'Inter', sans-serif",
              fontSize:      16,
              fontWeight:    700,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color:         GOLD,
            }}
          >
            RETURN TO MY SESSION →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
