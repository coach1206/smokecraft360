import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest, Phase } from "../context/GuestProfileContext";
import { generateCompetitors, injectToLeaderboard, clearFakeCompetitors } from "../lib/fakeCompetitorEngine";

const GOLD = "#D4AF37";

export default function ControlChamber() {
  const { profile, updateProfile, setPhase, resetProfile } = useGuest();
  const [activeTab, setActiveTab] = useState<"phases" | "modes" | "competitors" | "analytics" | "mentors">("phases");
  const [pin, setPin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");

  const verifyPin = async () => {
    if (pin.length < 6) { setError("ENTER 6-DIGIT FOUNDER PIN"); return; }
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && (data.tier === "sovereign" || data.role === "super_admin")) {
        setIsAuthorized(true);
        setError("");
      } else {
        setError(data.error || "INVALID FOUNDER PIN");
        setPin("");
      }
    } catch {
      setError("NETWORK ERROR — RETRY");
      setPin("");
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "black", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ width: "100%", maxWidth: 400, padding: 32, borderRadius: 16, border: `1px solid ${GOLD}4c`, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", textAlign: "center" }}
        >
          <div style={{ marginBottom: 32 }}>
            <div style={{ color: GOLD, fontSize: 32, marginBottom: 8 }}>◈</div>
            <h1 style={{ color: GOLD, fontFamily: "serif", fontSize: 24, letterSpacing: "0.2em" }}>CONTROL CHAMBER</h1>
            <p style={{ color: `${GOLD}80`, fontSize: 10, letterSpacing: "0.3em", marginTop: 8, textTransform: "uppercase" }}>Founder Access Only</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="ENTER PIN"
              style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: `1px solid ${GOLD}33`, borderRadius: 8, padding: 16, textAlign: "center", color: GOLD, fontSize: 24, letterSpacing: "0.5em", outline: "none" }}
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            />
            {error && <p style={{ color: "#ef4444", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{error}</p>}
            <button 
              onClick={verifyPin}
              style={{ width: "100%", padding: 16, background: `${GOLD}1a`, border: `1px solid ${GOLD}66`, color: GOLD, fontWeight: "bold", letterSpacing: "0.2em", borderRadius: 8, cursor: "pointer" }}
            >
              INITIALIZE ACCESS
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "black", color: GOLD, fontFamily: "sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <header style={{ height: 80, borderBottom: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24 }}>◈</div>
          <div>
            <h2 style={{ fontSize: 18, fontFamily: "serif", letterSpacing: "0.2em", margin: 0 }}>OPERATOR DASHBOARD</h2>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", opacity: 0.5, textTransform: "uppercase", margin: 0 }}>Novee OS // Control Layer v1.0</p>
          </div>
        </div>
        <button 
          onClick={() => setPhase("crafthub")}
          style={{ padding: "8px 24px", border: `1px solid ${GOLD}66`, borderRadius: 4, background: "transparent", color: GOLD, cursor: "pointer", letterSpacing: "0.1em", fontSize: 12 }}
        >
          EXIT CHAMBER
        </button>
      </header>

      {/* Main Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 10 }}>
        {/* Sidebar */}
        <nav style={{ width: 256, borderRight: `1px solid ${GOLD}33`, background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
          {[
            { id: "phases", label: "PHASE CONTROL", icon: "⌘" },
            { id: "modes", label: "DEMO MODES", icon: "⎔" },
            { id: "competitors", label: "COMPETITORS", icon: "⌬" },
            { id: "analytics", label: "ANALYTICS", icon: "📊" },
            { id: "mentors", label: "MENTOR OVERRIDE", icon: "◈" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderRadius: 8, transition: "all 0.2s",
                background: activeTab === tab.id ? `${GOLD}33` : "transparent",
                border: activeTab === tab.id ? `1px solid ${GOLD}66` : "1px solid transparent",
                color: activeTab === tab.id ? GOLD : `${GOLD}66`,
                cursor: "pointer", textAlign: "left"
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase" }}>{tab.label}</span>
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: 16, borderTop: `1px solid ${GOLD}1a` }}>
             <button onClick={resetProfile} style={{ width: "100%", padding: 12, fontSize: 10, letterSpacing: "0.1em", border: "1px solid rgba(153,27,27,0.4)", color: "#ef4444", background: "transparent", cursor: "pointer", textTransform: "uppercase", fontWeight: "bold", borderRadius: 4 }}>Hard Reset System</button>
          </div>
        </nav>

        {/* Content Area */}
        <main style={{ flex: 1, overflowY: "auto", padding: 32, background: "rgba(0,0,0,0.2)" }}>
          <AnimatePresence mode="wait">
            {activeTab === "phases" && (
              <motion.div key="phases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  "crafthub", "s1_country_select", "s1_soil_calibration", "s1_pilon_game", 
                  "s1_quiz", "s2_terroir", "s3_leafsliders", "s4_vitola", "s4_designstudio", "s4_results"
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p as Phase)}
                    style={{
                      padding: 24, border: `1px solid ${profile.phase === p ? GOLD : GOLD + "33"}`, borderRadius: 12, background: profile.phase === p ? `${GOLD}33` : "transparent",
                      color: GOLD, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 10, letterSpacing: "0.1em", fontWeight: "bold", textTransform: "uppercase" }}>{p.replace(/_/g, " ")}</div>
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === "modes" && (
              <motion.div key="modes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                {[
                  { id: "live", label: "LIVE VENUE MODE", sub: "Standard operational flow" },
                  { id: "investor", label: "INVESTOR DEMO", sub: "Premium visuals, guaranteed success" },
                  { id: "qa", label: "QA TESTING", sub: "Unlock all phases, isolate analytics" },
                  { id: "presentation", label: "PRESENTATION", sub: "Auto-advance, cinematic focus" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateProfile({ sessionType: m.id as any })}
                    style={{
                      padding: 32, border: `1px solid ${profile.sessionType === m.id ? GOLD : GOLD + "1a"}`, borderRadius: 16, background: profile.sessionType === m.id ? `${GOLD}33` : "transparent",
                      color: GOLD, cursor: "pointer", textAlign: "left", transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.sub}</div>
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === "competitors" && (
              <motion.div key="competitors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ padding: 32, border: `1px solid ${GOLD}33`, borderRadius: 16, background: "rgba(0,0,0,0.4)" }}>
                  <h3 style={{ fontSize: 20, fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 24 }}>COMPETITOR SIMULATION</h3>
                  <div style={{ display: "flex", gap: 16 }}>
                    <button 
                      onClick={() => {
                        const comps = generateCompetitors(5, profile.merit);
                        injectToLeaderboard(comps, "venue-1");
                      }}
                      style={{ padding: "16px 32px", background: `${GOLD}1a`, border: `1px solid ${GOLD}66`, color: GOLD, fontWeight: "bold", letterSpacing: "0.1em", borderRadius: 8, cursor: "pointer" }}
                    >
                      INJECT 5 COMPETITORS
                    </button>
                    <button 
                      onClick={() => clearFakeCompetitors("venue-1")}
                      style={{ padding: "16px 32px", border: "1px solid rgba(153,27,27,0.4)", color: "#ef4444", borderRadius: 8, fontWeight: "bold", letterSpacing: "0.1em", background: "transparent", cursor: "pointer" }}
                    >
                      CLEAR FAKE DATA
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                 <div style={{ padding: 32, border: `1px solid ${GOLD}33`, borderRadius: 16, background: "rgba(0,0,0,0.4)" }}>
                  <h3 style={{ fontSize: 20, fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 16 }}>SESSION DATA RAW</h3>
                  <pre style={{ padding: 16, background: "black", borderRadius: 4, border: `1px solid ${GOLD}1a`, fontSize: 10, color: `${GOLD}99`, overflow: "auto", maxHeight: 384 }}>
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}

            {activeTab === "mentors" && (
              <motion.div key="mentors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                {[
                  { id: "alejandro", name: "Señor Alejandro", country: "Dominican Republic" },
                  { id: "rosa", name: "Doña Rosa", country: "Nicaragua" },
                  { id: "cortes", name: "Maestro Cortés", country: "Honduras" },
                  { id: "esteban", name: "Don Estéban", country: "Venezuela" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateProfile({ mentor: m.id })}
                    style={{
                      padding: 32, border: `1px solid ${profile.mentor === m.id ? GOLD : GOLD + "1a"}`, borderRadius: 16, background: profile.mentor === m.id ? `${GOLD}33` : "transparent",
                      color: GOLD, cursor: "pointer", textAlign: "left", transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>{m.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.country}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer style={{ height: 40, borderTop: `1px solid ${GOLD}33`, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", gap: 24, fontSize: 9, letterSpacing: "0.2em", fontWeight: "bold", opacity: 0.6 }}>
          <span>STATUS: ONLINE</span>
          <span>LATENCY: 12ms</span>
          <span>VENUE: GLOBAL_ALPHA</span>
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.2em", fontWeight: "bold", opacity: 0.4 }}>
          © 2024 PROFOUND INNOVATIONS
        </div>
      </footer>
    </div>
  );
}
