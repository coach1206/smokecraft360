import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const IMG  = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const FLAVOR_NOTES = ["Earthy & Woodsy","Spicy & Peppery","Sweet & Creamy","Citrus & Floral","Nutty & Roasted","Bold & Full-Bodied","Smooth & Mild"];
const EXP_LEVELS   = ["First-Time Smoker","Casual Enthusiast","Regular Smoker","Experienced Connoisseur","Master Aficionado"];

const FEATURE_ICONS = [
  { icon: "❧", label: "DISCOVER",   sub: "Understand the leaf" },
  { icon: "▦", label: "EXPERIENCE", sub: "Explore premium blends" },
  { icon: "◉", label: "PROGRESS",   sub: "Track your journey" },
];

const STEPS = [
  { n: 1, label: "DISCOVER",   body: "Explore premium flavor, body, aroma, and structure" },
  { n: 2, label: "ANALYZE",    body: "Understand flavor transitions, depth, and blend notes" },
  { n: 3, label: "CRAFT",      body: "Build your blend profile through guided selections" },
  { n: 4, label: "EXPERIENCE", body: "Score your blends and refine your last palate" },
];

function FieldInput({ label, value, onChange, type = "text", maxLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.20)",
        borderRadius: 6, overflow: "hidden",
      }}>
        <input
          type={type}
          placeholder={label}
          value={value}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: "16px 18px",
            background: "transparent", border: "none", outline: "none",
            color: "#F0E8D4", fontSize: 18, fontFamily: "'Inter',sans-serif",
            letterSpacing: "0.04em",
          }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <motion.button type="button" onPointerDown={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 18px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.20)",
          borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif",
          color: value ? "#F0E8D4" : "rgba(240,232,212,0.30)", fontSize: 17, textAlign: "left",
        }}>
        <span>{value || label}</span>
        <span style={{ fontSize: 13, color: "rgba(212,175,55,0.50)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s" }}>▼</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "rgba(10,8,4,0.98)", border: "1px solid rgba(212,175,55,0.24)", borderRadius: 8, overflow: "hidden", backdropFilter: "blur(20px)" }}>
            {options.map(opt => (
              <motion.button key={opt} type="button"
                onPointerDown={() => { onChange(opt); setOpen(false); }}
                whileTap={{ background: "rgba(212,175,55,0.14)" }}
                style={{ width: "100%", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: value === opt ? GOLD : "rgba(240,232,212,0.60)", fontSize: 17, fontFamily: "'Inter',sans-serif", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {opt}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReentryGate() {
  const { updateProfile, setPhase, resetProfile } = useGuest();
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [phone4,       setPhone4]       = useState("");
  const [age,          setAge]          = useState("");
  const [flavorNotes,  setFlavorNotes]  = useState("");
  const [expLevel,     setExpLevel]     = useState("");
  const [error,        setError]        = useState(false);

  function handleContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      hapticError();
      setError(true);
      setTimeout(() => setError(false), 900);
      return;
    }
    hapticMilestone();
    resetProfile();
    updateProfile({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone4:    phone4.trim(),
      age:       age ? Number(age) : undefined,
    });
    setPhase("s1_demo");
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ══════════ LEFT — CIGAR PHOTO + INFO ══════════ */}
      <div style={{ flex: "0 0 46%", position: "relative", overflow: "hidden" }}>
        {/* Background photo */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.30) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "linear-gradient(0deg, rgba(2,1,0,0.94) 0%, transparent 100%)" }} />

        {/* BACK button */}
        <motion.button type="button" onPointerDown={() => setPhase("crafthub")} whileTap={{ scale: 0.96 }}
          style={{
            position: "absolute", top: 24, left: 28, zIndex: 10,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8,
            color: "#F0E8D4", fontSize: 16, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "10px 20px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'Inter',sans-serif",
          }}>
          <span>←</span> <span>BACK</span>
        </motion.button>

        {/* Status top-right */}
        <div style={{ position: "absolute", top: 28, right: 28, display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.26em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Table Kiosk · Active</span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
        </div>

        {/* Bottom content */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.70, ease: [0.22,1,0.36,1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 40px 44px", zIndex: 5 }}>
          {/* Session label */}
          <div style={{ fontSize: 12, letterSpacing: "0.40em", color: `${GOLD}88`, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
            Session 1 of 4 · Step 1 of 1
          </div>
          {/* Title */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 46, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.05, marginBottom: 2 }}>
            Welcome to
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 52, fontWeight: 700, color: GOLD, lineHeight: 1.0, marginBottom: 20, textShadow: `0 0 40px ${GOLD}44` }}>
            the Blend
          </div>
          {/* Gold divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ height: 1, width: 40, background: `linear-gradient(90deg, transparent, ${GOLD}77)` }} />
            <span style={{ fontSize: 12, color: GOLD, opacity: 0.60 }}>❧</span>
            <div style={{ height: 1, width: 80, background: `linear-gradient(90deg, ${GOLD}44, transparent)` }} />
          </div>
          {/* Description */}
          <p style={{ fontSize: 18, color: "rgba(240,232,212,0.50)", lineHeight: 1.60, margin: "0 0 28px", fontWeight: 300 }}>
            Register to begin your personal 4-session cigar science journey. Your progress and scores will be saved to your profile.
          </p>
          {/* Feature icons */}
          <div style={{ display: "flex", gap: 28 }}>
            {FEATURE_ICONS.map(f => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: `1.5px solid ${GOLD}44`, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: GOLD }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "center" }}>{f.label}</div>
                <div style={{ fontSize: 12, color: "rgba(240,232,212,0.36)", textAlign: "center", lineHeight: 1.40 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ══════════ RIGHT — PROFILE FORM PANEL ══════════ */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        background: "rgba(6,4,1,0.96)",
        borderLeft: "1px solid rgba(212,175,55,0.12)",
        overflowY: "auto",
      }}>
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, ease: [0.22,1,0.36,1] }}
          style={{ padding: "40px 40px 48px", display: "flex", flexDirection: "column", minHeight: "100%" }}>

          {/* YOUR PROFILE header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.46em", color: `${GOLD}88`, textTransform: "uppercase", fontWeight: 800, marginBottom: 0 }}>
              Your Profile
            </div>
            <div style={{ height: 1, background: `linear-gradient(90deg, ${GOLD}44, transparent)`, marginTop: 10 }} />
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: "14px 18px", background: "rgba(180,40,40,0.16)", border: "1px solid rgba(200,50,50,0.30)", borderRadius: 6, color: "#FF8080", fontSize: 16, marginBottom: 18 }}>
                First name and last name are required to continue.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <FieldInput label="First Name" value={firstName} onChange={setFirstName} />
            <FieldInput label="Last Name"  value={lastName}  onChange={setLastName}  />
          </div>
          {/* Phone */}
          <div style={{ marginBottom: 14 }}>
            <FieldInput label="Last 4 Digits (Phone)" value={phone4} onChange={v => setPhone4(v.replace(/\D/g,"").slice(0,4))} type="tel" maxLength={4} />
          </div>
          {/* Age */}
          <div style={{ marginBottom: 24 }}>
            <FieldInput label="Age" value={age} onChange={v => setAge(v.replace(/\D/g,"").slice(0,3))} type="tel" />
          </div>

          {/* Optional section */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.36em", color: "rgba(212,175,55,0.50)", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
              Optional (Improves Recommendations)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SelectField label="Preferred Flavor Notes" options={FLAVOR_NOTES} value={flavorNotes} onChange={setFlavorNotes} />
              <SelectField label="Experience Level"       options={EXP_LEVELS}   value={expLevel}     onChange={setExpLevel}     />
            </div>
          </div>

          {/* CONTINUE CTA */}
          <motion.button type="button" onPointerDown={handleContinue} whileTap={{ scale: 0.97 }}
            style={{
              width: "100%", padding: "22px 32px", marginBottom: 32,
              background: `linear-gradient(135deg, ${GOLD} 0%, #B8900A 100%)`,
              border: "none", borderRadius: 6, cursor: "pointer",
              fontSize: 18, fontWeight: 800, color: "#0A0600",
              letterSpacing: "0.22em", textTransform: "uppercase",
              fontFamily: "'Inter',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              boxShadow: `0 8px 40px rgba(212,175,55,0.35), 0 2px 0 rgba(255,255,255,0.12) inset`,
            }}>
            CONTINUE <span style={{ fontSize: 20 }}>→</span>
          </motion.button>

          {/* WHAT TO EXPECT */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.40em", color: "rgba(240,232,212,0.30)", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>
              What to Expect
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "rgba(212,175,55,0.10)", border: `1.5px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: GOLD }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", lineHeight: 1.50 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div style={{ marginTop: "auto", padding: "20px 24px", background: "rgba(212,175,55,0.05)", border: `1px solid ${GOLD}22`, borderLeft: `3px solid ${GOLD}55`, borderRadius: "0 8px 8px 0" }}>
            <span style={{ fontSize: 28, color: `${GOLD}55`, fontFamily: "Georgia,serif", lineHeight: 1 }}>"</span>
            <p style={{ fontSize: 18, color: "rgba(240,232,212,0.55)", lineHeight: 1.60, margin: "-10px 0 8px", fontStyle: "italic" }}>
              The journey to mastery begins with understanding the leaf.
            </p>
            <div style={{ fontSize: 13, color: `${GOLD}66`, letterSpacing: "0.18em", textTransform: "uppercase" }}>— SmokeCraft 360</div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
