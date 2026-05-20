import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useNoveeHaptic";

const GOLD   = "#C9A84C";
const GOLD2  = "#D4AF37";
const IMG    = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const FLAVOR_NOTES = ["Earthy & Woodsy","Spicy & Peppery","Sweet & Creamy","Citrus & Floral","Nutty & Roasted","Bold & Full-Bodied","Smooth & Mild"];
const EXP_LEVELS   = ["First-Time Smoker","Casual Enthusiast","Regular Smoker","Experienced Connoisseur","Master Aficionado"];
const AGE_OPTS     = Array.from({ length: 63 }, (_, i) => String(i + 18));

/* ── SVG Icons ─────────────────────────────────────────────── */
const IconLeaf = ({ size = 18, color = GOLD }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 4 13C4 9 9 4 12 2c3 2 8 7 8 11a7 7 0 0 1-7 7z"/>
    <path d="M12 2c0 6-4 10-4 10"/>
  </svg>
);
const IconPerson = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/><path d="M5.5 21a9 9 0 0 1 13 0"/>
  </svg>
);
const IconHash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);
const IconCalendar = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconCompass = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);
const IconShield = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconSearch = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconCraft = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconTrophy = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 17 16 21"/>
    <path d="M6 3h12l-2 9a5 5 0 0 1-8 0L6 3z"/>
    <path d="M6 7H3a1 1 0 0 0 0 2c0 2.5 1.5 4.5 3 5"/><path d="M18 7h3a1 1 0 0 1 0 2c0 2.5-1.5 4.5-3 5"/>
  </svg>
);

const STEPS = [
  { n: 1, label: "DISCOVER",   body: "Explore premium flavor, body, aroma, and structure",     icon: <IconLeaf size={22} /> },
  { n: 2, label: "ANALYZE",    body: "Understand flavor transitions, depth, and blend notes",   icon: <IconSearch size={22} /> },
  { n: 3, label: "CRAFT",      body: "Build your blend profile through guided selections",      icon: <IconCraft size={22} /> },
  { n: 4, label: "EXPERIENCE", body: "Score your blends and refine your last palate",           icon: <IconTrophy size={22} /> },
];

/* ── Field card component ───────────────────────────────────── */
function FieldCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(201,168,76,0.18)",
      borderRadius: 10,
      display: "flex",
      alignItems: "stretch",
      overflow: "hidden",
      minHeight: 72,
    }}>
      <div style={{
        width: 52, flexShrink: 0,
        background: "rgba(201,168,76,0.07)",
        borderRight: "1px solid rgba(201,168,76,0.13)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: `${GOLD}99` }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function TextInput({ placeholder, value, onChange, type = "text", maxLength }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "transparent", border: "none", outline: "none",
        color: "#E8DECA", fontSize: 17, fontWeight: 400,
        fontFamily: "'Inter',sans-serif",
        width: "100%", padding: 0,
      }}
    />
  );
}

function SelectInput({ placeholder, options, value, onChange }: {
  placeholder: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "transparent", border: "none", outline: "none",
          color: value ? "#E8DECA" : "rgba(232,222,202,0.35)",
          fontSize: 17, fontFamily: "'Inter',sans-serif",
          width: "100%", appearance: "none", WebkitAppearance: "none",
          cursor: "pointer", padding: 0,
        }}
      >
        <option value="" style={{ background: "#100D07", color: "rgba(232,222,202,0.4)" }}>{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: "#100D07", color: "#E8DECA" }}>{o}</option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: `${GOLD}88`, fontSize: 13, pointerEvents: "none" }}>▾</span>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function ReentryGate() {
  const { updateProfile, setPhase, resetProfile } = useNoveeGuest();
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [phone4,      setPhone4]      = useState("");
  const [age,         setAge]         = useState("");
  const [flavorNotes, setFlavorNotes] = useState("");
  const [expLevel,    setExpLevel]    = useState("");
  const [error,       setError]       = useState(false);

  function handleContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      hapticError(); setError(true);
      setTimeout(() => setError(false), 1000);
      return;
    }
    hapticMilestone();
    resetProfile();
    updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone4: phone4.trim(), age: age ? Number(age) : undefined });
    setPhase("s1_demo");
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#080602", fontFamily: "'Inter',-apple-system,sans-serif", overflow: "hidden" }}>

      {/* ── TOP BAR ── */}
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: "1px solid rgba(201,168,76,0.10)", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconLeaf size={22} color={GOLD2} />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD2 }}>
            SMOKECRAFT 360
          </span>
          <span style={{ fontSize: 14, color: `${GOLD2}55`, letterSpacing: "0.10em" }}>·</span>
          <span style={{ fontSize: 13, letterSpacing: "0.20em", color: `${GOLD2}88`, textTransform: "uppercase", fontWeight: 600 }}>
            KIOSK EDITION
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.24em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>TABLE KIOSK · ACTIVE</span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A88" }} />
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{ width: "38%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
          {/* Photo */}
          <img src={IMG("cigar_hero.png")} alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          {/* Dark gradient overlays */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.80) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "65%", background: "linear-gradient(0deg, rgba(5,3,1,0.98) 0%, rgba(5,3,1,0.60) 50%, transparent 100%)" }} />

          {/* BACK */}
          <motion.button type="button" onPointerDown={() => setPhase("crafthub")} whileTap={{ scale: 0.95 }}
            style={{
              position: "absolute", top: 20, left: 20, zIndex: 10,
              background: "rgba(15,10,4,0.75)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8,
              color: "#F0E8D4", fontSize: 15, fontWeight: 700,
              letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "10px 22px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}>
            <span style={{ fontSize: 16 }}>←</span> BACK
          </motion.button>

          {/* Bottom text */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 32px 28px", zIndex: 5 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.44em", color: `${GOLD2}AA`, textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>
              GUEST REGISTRATION
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 68, fontWeight: 300, color: "#F5EDD8", lineHeight: 0.95, marginBottom: 0 }}>
              Your
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 68, fontWeight: 700, color: GOLD2, lineHeight: 1.0, marginBottom: 14, textShadow: `0 0 60px ${GOLD2}44` }}>
              Profile
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <IconLeaf size={16} color={GOLD2} />
            </div>
            <p style={{ fontSize: 15, color: "rgba(240,232,212,0.48)", lineHeight: 1.65, margin: "0 0 24px", fontWeight: 300, maxWidth: 280 }}>
              Create your profile to begin your 4-session cigar science journey. Your progress and scores will be saved to your profile.
            </p>
            {/* Quote card */}
            <div style={{
              background: "rgba(10,7,2,0.72)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10,
              padding: "14px 18px",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <IconShield size={18} />
              </div>
              <div>
                <div style={{ fontStyle: "italic", color: GOLD2, fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                  Your journey. Your palate. Your legacy.
                </div>
                <div style={{ color: "rgba(240,232,212,0.50)", fontSize: 13, fontWeight: 400 }}>
                  4 sessions. Countless discoveries.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div style={{
          flex: 1,
          background: "#0A0702",
          borderLeft: "1px solid rgba(201,168,76,0.10)",
          overflowY: "auto",
          padding: "32px 40px 40px",
          display: "flex", flexDirection: "column",
        }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }}
            style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                background: "rgba(201,168,76,0.10)",
                border: `1.5px solid ${GOLD2}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconLeaf size={22} color={GOLD2} />
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.42em", color: `${GOLD2}88`, textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>
                  GUEST REGISTRATION
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 42, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.0, marginBottom: 4 }}>
                  Your Profile
                </div>
                <div style={{ fontSize: 15, color: "rgba(240,232,212,0.38)", fontWeight: 300 }}>
                  Let's get to know you.
                </div>
              </div>
            </div>

            {/* Gold divider */}
            <div style={{ height: 1, background: `linear-gradient(90deg, ${GOLD2}55, transparent)`, marginBottom: 24 }} />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ padding: "12px 16px", background: "rgba(180,40,40,0.14)", border: "1px solid rgba(200,50,50,0.28)", borderRadius: 8, color: "#FF8080", fontSize: 15, marginBottom: 16 }}>
                  First name and last name are required.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Row 1 — Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <FieldCard icon={<IconPerson />} label="FIRST NAME">
                <TextInput placeholder="Enter first name" value={firstName} onChange={setFirstName} />
              </FieldCard>
              <FieldCard icon={<IconPerson />} label="LAST NAME">
                <TextInput placeholder="Enter last name" value={lastName} onChange={setLastName} />
              </FieldCard>
            </div>

            {/* Row 2 — Phone + Age */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <FieldCard icon={<IconHash />} label="LAST 4 DIGITS (PHONE)">
                <TextInput placeholder="Enter last 4 digits" value={phone4} onChange={v => setPhone4(v.replace(/\D/g,"").slice(0,4))} type="tel" maxLength={4} />
              </FieldCard>
              <FieldCard icon={<IconCalendar />} label="AGE">
                <SelectInput placeholder="Select your age" options={AGE_OPTS} value={age} onChange={setAge} />
              </FieldCard>
            </div>

            {/* Optional divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.14)" }} />
              <div style={{ fontSize: 11, letterSpacing: "0.30em", color: `${GOLD2}77`, textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                OPTIONAL — IMPROVES RECOMMENDATIONS
                <span style={{ fontSize: 14, color: GOLD2 }}>✦</span>
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.14)" }} />
            </div>

            {/* Row 3 — Optional */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <FieldCard icon={<IconCompass />} label="PREFERRED FLAVOR NOTES">
                <SelectInput placeholder="Select your notes" options={FLAVOR_NOTES} value={flavorNotes} onChange={setFlavorNotes} />
              </FieldCard>
              <FieldCard icon={<IconShield />} label="EXPERIENCE LEVEL">
                <SelectInput placeholder="Select your level" options={EXP_LEVELS} value={expLevel} onChange={setExpLevel} />
              </FieldCard>
            </div>

            {/* CONTINUE */}
            <motion.button type="button" onPointerDown={handleContinue} whileTap={{ scale: 0.98 }}
              style={{
                width: "100%", padding: "22px 32px", marginBottom: 28,
                background: `linear-gradient(135deg, ${GOLD2} 0%, #A87C00 100%)`,
                border: "none", borderRadius: 8, cursor: "pointer",
                fontSize: 18, fontWeight: 800, color: "#0A0600",
                letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
                boxShadow: `0 8px 48px rgba(212,175,55,0.35)`,
              }}>
              CONTINUE <span style={{ fontSize: 22 }}>→</span>
            </motion.button>

            {/* WHAT TO EXPECT */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.14)" }} />
              <div style={{ fontSize: 11, letterSpacing: "0.30em", color: `${GOLD2}77`, textTransform: "uppercase", fontWeight: 700 }}>
                WHAT TO EXPECT
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.14)" }} />
            </div>

            {/* 4-step grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(201,168,76,0.12)",
                  borderRadius: 10, padding: "16px 14px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  textAlign: "center",
                }}>
                  <div style={{ position: "relative", alignSelf: "flex-start" }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "rgba(201,168,76,0.08)",
                      border: `1.5px solid ${GOLD2}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.icon}
                    </div>
                    <div style={{
                      position: "absolute", top: -6, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: GOLD2, color: "#0A0600",
                      fontSize: 11, fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.n}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: GOLD2, textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.38)", lineHeight: 1.55 }}>
                    {s.body}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
