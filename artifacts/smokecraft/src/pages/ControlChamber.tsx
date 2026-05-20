import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNoveeGuest, Phase } from "../contexts/NoveeGuestProfileContext";
import { generateCompetitors, injectToLeaderboard, clearFakeCompetitors } from "../lib/fakeCompetitorEngine";

const GOLD = "#D4AF37";
const GLASS = "rgba(10, 10, 10, 0.85)";

export default function ControlChamber() {
  const { profile, updateProfile, setPhase, resetProfile } = useNoveeGuest();
  const [activeTab, setActiveTab] = useState<"phases" | "modes" | "competitors" | "analytics" | "mentors">("phases");
  const [pin, setPin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");

  const verifyPin = async () => {
    if (pin.length < 4) { setError("ENTER FULL PIN"); return; }
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.tier === "sovereign") {
        setIsAuthorized(true);
        setError("");
      } else {
        setError(data.message || "INVALID FOUNDER PIN");
        setPin("");
      }
    } catch {
      setError("NETWORK ERROR — RETRY");
      setPin("");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-2xl border border-[#D4AF37]/30 bg-black/90 backdrop-blur-xl text-center"
        >
          <div className="mb-8">
            <div className="text-[#D4AF37] text-4xl mb-2">◈</div>
            <h1 className="text-[#D4AF37] font-serif text-2xl tracking-[0.2em]">CONTROL CHAMBER</h1>
            <p className="text-[#D4AF37]/50 text-xs tracking-widest mt-2 uppercase">Founder Access Only</p>
          </div>

          <div className="space-y-4">
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="ENTER PIN"
              className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg py-4 text-center text-[#D4AF37] text-2xl tracking-[0.5em] focus:border-[#D4AF37] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            />
            {error && <p className="text-red-500 text-xs tracking-widest uppercase">{error}</p>}
            <button 
              onClick={verifyPin}
              className="w-full py-4 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] font-bold tracking-[0.2em] rounded-lg hover:bg-[#D4AF37]/20 transition-colors"
            >
              INITIALIZE ACCESS
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black text-[#D4AF37] font-sans flex flex-col overflow-hidden">
      {/* Background Smoke Placeholder */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_#D4AF3711_0%,_transparent_70%)]" />

      {/* Header */}
      <header className="h-20 border-b border-[#D4AF37]/20 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <div className="text-2xl">◈</div>
          <div>
            <h2 className="text-lg font-serif tracking-[0.2em]">OPERATOR DASHBOARD</h2>
            <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">Novee OS // Control Layer v1.0</p>
          </div>
        </div>
        <button 
          onClick={() => setPhase("crafthub")}
          className="px-6 py-2 border border-[#D4AF37]/40 rounded hover:bg-[#D4AF37]/10 tracking-widest text-xs"
        >
          EXIT CHAMBER
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <nav className="w-64 border-r border-[#D4AF37]/20 bg-black/40 flex flex-col gap-2 p-4">
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
              className={`flex items-center gap-4 px-6 py-4 rounded-lg transition-all ${
                activeTab === tab.id 
                ? "bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]" 
                : "text-[#D4AF37]/40 hover:text-[#D4AF37]/70"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-bold tracking-widest uppercase">{tab.label}</span>
            </button>
          ))}
          <div className="mt-auto p-4 border-t border-[#D4AF37]/10">
             <button onClick={resetProfile} className="w-full py-3 text-[10px] tracking-widest border border-red-900/40 text-red-500 hover:bg-red-500/10 rounded uppercase font-bold">Hard Reset System</button>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-black/20">
          <AnimatePresence mode="wait">
            {activeTab === "phases" && (
              <motion.div 
                key="phases"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-3 gap-4">
                  {[
                    "crafthub", "s1_country_select", "s1_soil_calibration", "s1_pilon_game", 
                    "s1_quiz", "s2_terroir", "s3_leafsliders", "s4_vitola", "s4_designstudio", "s4_results"
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPhase(p as Phase)}
                      className={`p-6 border rounded-xl transition-all text-center ${
                        profile.phase === p 
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" 
                        : "border-[#D4AF37]/20 hover:border-[#D4AF37]/50"
                      }`}
                    >
                      <div className="text-[10px] tracking-widest font-bold uppercase">{p.replace(/_/g, " ")}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "modes" && (
              <motion.div 
                key="modes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-6"
              >
                {[
                  { id: "live", label: "LIVE VENUE MODE", sub: "Standard operational flow" },
                  { id: "investor", label: "INVESTOR DEMO", sub: "Premium visuals, guaranteed success" },
                  { id: "qa", label: "QA TESTING", sub: "Unlock all phases, isolate analytics" },
                  { id: "presentation", label: "PRESENTATION", sub: "Auto-advance, cinematic focus" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateProfile({ sessionType: m.id as any })}
                    className={`p-8 border rounded-2xl text-left transition-all ${
                      profile.sessionType === m.id
                      ? "bg-[#D4AF37]/20 border-[#D4AF37]"
                      : "border-[#D4AF37]/10 hover:border-[#D4AF37]/30"
                    }`}
                  >
                    <div className="text-xl font-bold tracking-widest mb-1">{m.label}</div>
                    <div className="text-xs opacity-50 uppercase tracking-wider">{m.sub}</div>
                  </button>
                ))}
              </motion.div>
            )}

            {activeTab === "competitors" && (
              <motion.div key="competitors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="p-8 border border-[#D4AF37]/20 rounded-2xl bg-black/40">
                  <h3 className="text-xl font-bold tracking-widest mb-6">COMPETITOR SIMULATION</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        const comps = generateCompetitors(5, profile.merit);
                        injectToLeaderboard(comps, "venue-1");
                      }}
                      className="px-8 py-4 bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-lg font-bold tracking-widest hover:bg-[#D4AF37]/20"
                    >
                      INJECT 5 COMPETITORS
                    </button>
                    <button 
                      onClick={() => clearFakeCompetitors("venue-1")}
                      className="px-8 py-4 border border-red-900/40 text-red-500 rounded-lg font-bold tracking-widest hover:bg-red-500/10"
                    >
                      CLEAR FAKE DATA
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <div className="p-8 border border-[#D4AF37]/20 rounded-2xl bg-black/40">
                  <h3 className="text-xl font-bold tracking-widest mb-4">SESSION DATA RAW</h3>
                  <pre className="p-4 bg-black rounded border border-[#D4AF37]/10 text-[10px] text-[#D4AF37]/60 overflow-auto max-h-96">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}

            {activeTab === "mentors" && (
              <motion.div key="mentors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-6">
                {[
                  { id: "alejandro", name: "Señor Alejandro", country: "Dominican Republic" },
                  { id: "rosa", name: "Doña Rosa", country: "Nicaragua" },
                  { id: "cortes", name: "Maestro Cortés", country: "Honduras" },
                  { id: "esteban", name: "Don Estéban", country: "Venezuela" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateProfile({ mentor: m.id })}
                    className={`p-8 border rounded-2xl text-left transition-all ${
                      profile.mentor === m.id
                      ? "bg-[#D4AF37]/20 border-[#D4AF37]"
                      : "border-[#D4AF37]/10 hover:border-[#D4AF37]/30"
                    }`}
                  >
                    <div className="text-xl font-bold tracking-widest mb-1 uppercase">{m.name}</div>
                    <div className="text-xs opacity-50 uppercase tracking-wider">{m.country}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-10 border-t border-[#D4AF37]/20 bg-black/80 flex items-center justify-between px-8">
        <div className="flex gap-6 text-[9px] tracking-[0.2em] font-bold opacity-60">
          <span>STATUS: ONLINE</span>
          <span>LATENCY: 12ms</span>
          <span>VENUE: GLOBAL_ALPHA</span>
        </div>
        <div className="text-[9px] tracking-[0.2em] font-bold opacity-40">
          © 2024 PROFOUND INNOVATIONS
        </div>
      </footer>
    </div>
  );
}
