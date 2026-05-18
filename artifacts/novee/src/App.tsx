import React, { useState, useEffect, createContext, useContext } from 'react';

// ==========================================
// 1. HARDCORE STATE & LOCAL STORAGE PERSISTENCE
// ==========================================
interface GuestProfile {
  name: string;
  phone: string;
  email: string;
  ageRange: string;
  gender: string;
  state: string;
  city: string;
  phase_checkpoint: string;
  running_score: number;
}

const AppStateContext = createContext<{
  profile: GuestProfile;
  setProfile: React.Dispatch<React.SetStateAction<GuestProfile>>;
  currentView: string;
  setCurrentView: (view: string) => void;
  playClick: () => void;
} | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<GuestProfile>(() => {
    const saved = localStorage.getItem('novee_os_active_guest');
    return saved ? JSON.parse(saved) : {
      name: '', phone: '', email: '', ageRange: '', gender: '', state: '', city: '',
      phase_checkpoint: 'cockpit', running_score: 100
    };
  });

  const [currentView, setCurrentView] = useState('cockpit');

  useEffect(() => {
    localStorage.setItem('novee_os_active_guest', JSON.stringify(profile));
  }, [profile]);

  // GLOBAL 3400HZ ACOUSTIC TOUCH PHYSICS
  const playClick = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3400, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.log('Audio tracking deferred');
    }
  };

  return (
    <AppStateContext.Provider value={{ profile, setProfile, currentView, setCurrentView, playClick }}>
      {children}
    </AppStateContext.Provider>
  );
};

// ==========================================
// 2. HARDWARE FIXED-ASPECT VIEWPORT SCALE WRAPPER
// ==========================================
const KioskViewportScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleScaleResize = () => {
      const targetWidth = 1920;
      const currentWidth = window.innerWidth;
      setScale(Math.max(currentWidth / targetWidth, 0.4));
    };
    window.addEventListener('resize', handleScaleResize);
    handleScaleResize();
    return () => window.removeEventListener('resize', handleScaleResize);
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden select-none touch-none">
      <div 
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        className="w-[1920px] h-[1080px] min-w-[1920px] min-h-[1080px] relative bg-gradient-to-b from-[#090b11] to-[#030406] text-white overflow-hidden"
      >
        {/* GLOBAL HTML5 CANVAS BACKGROUND MOTION */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.03),transparent_50%)] pointer-events-none" />
        {children}
      </div>
    </div>
  );
};

// ==========================================
// 3. UNIFIED LANDSCAPE COCKPIT GRID COMPONENTS
// ==========================================
const CraftHubCockpit: React.FC = () => {
  const context = useContext(AppStateContext);
  if (!context) return null;

  // SHORT-CIRCUIT FALLBACK TO ELIMINATE MAP UNDEFINED CRASHES PERMANENTLY
  const fallbackCrafts = [
    { id: 'pourcraft', title: 'POURCRAFT 360', sub: 'Spirits & Mixology Core', desc: 'Distillation proofs, barrel char allocations, and ice expansion physics.' },
    { id: 'beercraft', title: 'BEERCRAFT 360', sub: 'Craft Hops & Fermentation', desc: 'Alpha-acid equations, base roasted malts, and wort density control.' },
    { id: 'winecraft', title: 'WINECRAFT 360', sub: 'Vintages & Sommelier Ledger', desc: 'Vineyard brix sugars, tannin scales, and old-world terroir tracking.' }
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between p-10 relative z-10 font-sans">
      {/* HEADER SECTION WITH DAY ONE 360 */}
      <div className="w-full h-[90px] flex justify-between items-center border-b border-amber-500/10 bg-black/30 backdrop-blur-md px-6 rounded-lg">
        <div className="flex flex-col">
          <span className="text-3xl font-light tracking-[0.25em] font-serif text-white">NOVÈE OS</span>
          <span className="text-xs tracking-[0.4em] text-amber-500/70 uppercase font-mono mt-1">Lounge Hardware Core</span>
        </div>
        <div className="flex items-center gap-4 bg-amber-500/5 px-6 py-3 border border-amber-500/20 rounded-md">
          <span className="text-[11px] tracking-widest text-neutral-400 uppercase font-mono">Ecosystem Sponsor:</span>
          <span className="text-base font-semibold tracking-widest text-amber-500 font-serif">DAY ONE 360</span>
        </div>
      </div>

      {/* 4-PILLAR GEOMETRY DESIGN (NO ACCORDION HOVERS) */}
      <div className="flex-1 w-full flex flex-col gap-8 my-8">
        {/* TOP FLAGSHIP ROW: SMOKECRAFT 360 (FULL WIDTH) */}
        <div 
          onPointerDown={() => { context.playClick(); context.setCurrentView('smokecraft_onboarding'); }}
          className="h-[46%] w-full rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/70 to-amber-950/20 p