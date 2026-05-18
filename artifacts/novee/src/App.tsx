import React, { useState, useEffect, createContext, useContext } from 'react';
import MasterBlender from './MasterBlender';

// ==========================================
// 1. STATE MANAGEMENT & LOCAL STORAGE STORAGE DATA LOOP
// ==========================================
interface GuestProfile {
  name: string; phone: string; email: string; ageRange: string; gender: string; state: string; city: string; phase_checkpoint: string; running_score: number;
}

const AppStateContext = createContext<{
  profile: GuestProfile; setProfile: React.Dispatch<React.SetStateAction<GuestProfile>>; currentView: string; setCurrentView: (view: string) => void; playClick: () => void;
} | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<GuestProfile>(() => {
    const saved = localStorage.getItem('novee_os_active_guest');
    return saved ? JSON.parse(saved) : { name: '', phone: '', email: '', ageRange: '', gender: '', state: '', city: '', phase_checkpoint: 'cockpit', running_score: 100 };
  });
  const [currentView, setCurrentView] = useState('cockpit');
  useEffect(() => { localStorage.setItem('novee_os_active_guest', JSON.stringify(profile)); }, [profile]);

  const playClick = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(3400, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.08);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  return <AppStateContext.Provider value={{ profile, setProfile, currentView, setCurrentView, playClick }}>{children}</AppStateContext.Provider>;
};

// ==========================================
// 2. HARDWARE FIXED-ASPECT VIEWPORT SCALER
// ==========================================
const KioskViewportScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const handleScaleResize = () => { setScale(Math.max(window.innerWidth / 1920, 0.4)); };
    window.addEventListener('resize', handleScaleResize); handleScaleResize();
    return () => window.removeEventListener('resize', handleScaleResize);
  }, []);
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden select-none touch-none">
      <div 
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }} 
        className="w-[1920px] h-[1080px] min-w-[1920px] min-h-[1080px] relative bg-[#05070b] text-white overflow-hidden flex flex-col p-6 box-border justify-between"
      >
        {children}
      </div>
    </div>
  );
};

// ==========================================
// 3. UNIFIED LANDSCAPE COCKPIT MASTER DESIGN
// ==========================================
const CraftHubCockpit: React.FC = () => {
  const context = useContext(AppStateContext); if (!context) return null;
  return (
    <>
      {/* HEADER */}
      <div className="w-full h-[70px] flex justify-between items-center border-b border-amber-500/10 bg-black/40 px-6 rounded-lg box-border">
        <div className="flex flex-col"><span className="text-xl font-light tracking-[0.25em] font-serif text-white">NOVÈE OS</span><span className="text-[9px] tracking-[0.4em] text-amber-500/60 uppercase font-mono mt-0.5">Lounge Hardware Core</span></div>
        <div className="flex items-center gap-3 bg-amber-500/5 px-4 py-1.5 border border-amber-500/20 rounded-md"><span className="text-[9px] tracking-widest text-neutral-400 uppercase font-mono">Sponsor:</span><span className="text-xs font-semibold tracking-widest text-amber-500 font-serif">DAY ONE 360</span></div>
      </div>

      {/* MATRIX DISPLAY PANELS */}
      <div className="w-full h-[820px] flex flex-col gap-5 my-4 box-border">
        {/* SMOKECRAFT 360 FULL SCREEN WIDTH COMPONENT */}
        <div onPointerDown={() => { context.playClick(); context.setCurrentView('smokecraft_onboarding'); }} className="h-[380px] w-full rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/10 via-black/80 to-amber-950/10 p-6 flex flex-col justify-between items-start cursor-pointer box-border shadow-xl">
          <div><span className="text-[9px] tracking-[0.3em] text-amber-500/80 font-semibold uppercase block mb-1 font-mono">Pillar 01 // Heritage Ritual</span><h1 className="text-3xl font-normal tracking-wider font-serif text-white">SMOKECRAFT 360</h1><p className="text-xs text-neutral-400 mt-1 max-w-xl font-light leading-relaxed">Configure premium seed lineages, calibrate soil terroir mineral compositions, and track vertical leaf morphology.</p></div>
          <button className="h-[42px] px-6 bg-amber-500 text-black text-[10px] font-bold tracking-[0.25em] uppercase rounded font-mono shadow-md">◈ TAP TO INITIALIZE MASTERCLASS</button>
        </div>

        {/* TRIPLE SIDE-BY-SIDE PANELS */}
        <div className="w-full h-[420px] flex gap-5 box-border">
          {[
            { id: 'pourcraft', title: 'POURCRAFT 360', sub: 'Spirits & Mixology Core', desc: 'Distillation proofs, barrel char allocations, and ice expansion physics.' },
            { id: 'beercraft', title: 'BEERCRAFT 360', sub: 'Craft Hops & Fermentation', desc: 'Alpha-acid equations, base roasted malts, and wort density control.' },
            { id: 'winecraft', title: 'WINECRAFT 360', sub: 'Vintages & Sommelier Ledger', desc: 'Vineyard brix sugars, tannin scales, and old-world terroir tracking.' }
          ].map((craft) => (
            <div key={craft.id} onPointerDown={() => { context.playClick(); context.setCurrentView(`${craft.id}_active`); }} className="flex-1 h-full rounded-xl border border-neutral-900 bg-black/50 p-5 flex flex-col justify-between items-start cursor-pointer box-border">
              <div><span className="text-[9px] tracking-[0.2em] text-amber-500/50 font-medium uppercase block mb-1 font-mono">{craft.sub}</span><h2 className="text-lg font-normal tracking-wide font-serif text-white">{craft.title}</h2><p className="text-xs text-neutral-400 mt-1 font-light leading-relaxed">{craft.desc}</p></div>
              <div className="w-full"><div className="text-[8px] tracking-widest text-neutral-600 mb-2 font-mono uppercase">System Active</div><button className="w-full h-[38px] border border-neutral-800 bg-neutral-900/40 text-[9px] font-bold tracking-[0.2em] text-neutral-300 uppercase rounded font-mono">INITIALIZE PLATFORM</button></div>
            </div>
          ))}
        </div>
      </div>

      {/* TICKER DISPLAY TRACKER */}
      <div className="w-full h-[45px] bg-black border border-neutral-900 rounded-lg flex items-center overflow-hidden px-4 box-border">
        <div className="flex gap-20 text-sm font-semibold tracking-wider text-amber-500/90 font-mono animate-pulse">
          <span>THE GOLDEN BOX RULES: BASE VISUAL ACCURACY GRANTS +5 XP ◈ ERRORS TRIGGER MENTOR INTERVENTIONS (-2 PTS)</span>
          <span>VALET SPEND MULTIPLIERS: SPEND $50-$99 (+10 XP) ◈ SPEND $100-$199 (+25 XP) ◈ SPEND $200+ (+60 XP ELITE STATUS)</span>
        </div>
      </div>
    </>
  );
};

// ==========================================
// 4. WIDESCREEN REGISTRATION COCKPIT GATE
// ==========================================
const GuestOnboardingForm: React.FC = () => {
  const context = useContext(AppStateContext); if (!context) return null;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 box-border">
      <div className="w-full max-w-[1720px] h-[820px] rounded-2xl border border-amber-500/20 bg-black/70 p-10 shadow-2xl box-border flex flex-col justify-between">
        <div className="text-center"><span className="text-xs tracking-[0.4em] text-amber-500 uppercase font-mono block mb-1">Registration Gate</span><h2 className="text-3xl font-light tracking-wide font-serif text-white">ROUNDTABLE PROFILE SETUP</h2></div>

        <div className="grid grid-cols-2 gap-6 my-auto px-10">
          {['name', 'phone', 'email', 'state', 'city'].map((f) => (
            <div key={f} className="flex flex-col gap-2">
              <label className="text-[11px] tracking-widest text-neutral-400 uppercase font-mono">{f}</label>
              <input type="text" value={(context.profile as any)[f]} onChange={(e) => context.setProfile(p => ({ ...p, [f]: e.target.value }))} className="h-[54px] bg-neutral-900/60 border border-neutral-800 rounded px-4 text-white text-base focus:border-amber-500/50 outline-none transition-colors" />
            </div>
          ))}
        </div>

        <div className="w-full flex gap-6 px-10">
          <button onPointerDown={() => { context.playClick(); context.setCurrentView('cockpit'); }} className="flex-1 h-[54px] border border-neutral-700 bg-neutral-900/40 text-xs font-bold tracking-widest uppercase rounded text-neutral-300">◀ BACK TO MASTER PORTFOLIO</button>
          <button onPointerDown={() => { context.playClick(); if (context.profile.name && context.profile.phone) { context.setCurrentView('smokecraft_experience'); } else { alert('Required fields missing.'); } }} className="flex-1 h-[54px] bg-amber-500 text-black text-xs font-bold tracking-widest uppercase rounded shadow-lg">CONFIRM PROFILE & BEGIN JOURNEY ▶</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. JOURNEY CONNECTOR FLOW FOR SMOKECRAFT
// ==========================================
const StandardActiveFlowStub: React.FC<{ name: string }> = ({ name }) => {
  const context = useContext(AppStateContext); if (!context) return null;

  if (name.includes("smokecraft")) {
    return (
      <div className="w-full h-full relative">
        <MasterBlender />
        <button 
          onPointerDown={() => { context.playClick(); context.setCurrentView('cockpit'); }} 
          className="absolute top-6 left-6 h-[42px] px-6 border border-amber-500/30 bg-black/80 text-amber-500 text-xs tracking-widest font-bold uppercase rounded z-50 font-mono"
        >
          ◀ RETURN TO COCKPIT
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center box-border">
      <h2 className="text-3xl font-serif text-white uppercase tracking-wider">{name} VIEW</h2>
      <button onPointerDown={() => { context.playClick(); context.setCurrentView('cockpit'); }} className="h-[42px] px-6 border border-amber-500/30 text-amber-500 text-xs tracking-widest font-bold uppercase rounded mt-6 font-mono">◀ RETURN</button>
    </div>
  );
};

// ==========================================
// MAIN EXPORT ENTRY
// ==========================================
export default function App() {
  return (
    <AppStateProvider>
      <KioskViewportScaler>
        <AppStateContext.Consumer>
          {context => {
            if (!context) return null;
            if (context.currentView === 'cockpit') return <CraftHubCockpit />;
            if (context.currentView === 'smokecraft_onboarding') return <GuestOnboardingForm />;
            return <StandardActiveFlowStub name={context.currentView} />;
          }}
        </AppStateContext.Consumer>
      </KioskViewportScaler>
    </AppStateProvider>
  );
}