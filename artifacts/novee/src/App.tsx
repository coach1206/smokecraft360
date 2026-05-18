import React, { useState, useEffect, createContext, useContext } from 'react';
import MasterBlender from './MasterBlender';

// ==========================================
// 1. STATE MANAGEMENT & LOCAL STORAGE SETUP
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

interface AppStateContextType {
  profile: GuestProfile;
  setProfile: React.Dispatch<React.SetStateAction<GuestProfile>>;
  currentView: string;
  setCurrentView: (view: string) => void;
  playClick: () => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
};

interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<GuestProfile>(() => {
    const saved = localStorage.getItem('novee_os_active_guest');
    return saved ? JSON.parse(saved) : {
      name: '',
      phone: '',
      email: '',
      ageRange: '',
      gender: '',
      state: '',
      city: '',
      phase_checkpoint: 'cockpit',
      running_score: 180
    };
  });

  const [currentView, setCurrentView] = useState('cockpit');

  useEffect(() => {
    localStorage.setItem('novee_os_active_guest', JSON.stringify(profile));
  }, [profile]);

  const playClick = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      // Audio fail-safe
    }
  };

  return (
    <AppStateContext.Provider value={{ profile, setProfile, currentView, setCurrentView, playClick }}>
      {children}
    </AppStateContext.Provider>
  );
};

// ==========================================
// 2. HARDWARE FIXED-ASPECT VIEWPORT SCALER
// ==========================================
interface KioskViewportScalerProps {
  children: React.ReactNode;
}

const KioskViewportScaler: React.FC<KioskViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleScaleResize = () => {
      setScale(Math.max(window.innerWidth / 1920, 0.4));
    };
    window.addEventListener('resize', handleScaleResize);
    handleScaleResize();
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
// 3. UNIFIED LANDSCAPE COCKPIT MAIN CORE
// ==========================================
const CockpitLayoutCore: React.FC = () => {
  const { currentView } = useAppState();

  return (
    <KioskViewportScaler>
      {currentView === 'cockpit' ? <MasterBlender /> : (
        <div className="flex items-center justify-center h-full">
          <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase">Secondary Workspace View Idle</p>
        </div>
      )}
    </KioskViewportScaler>
  );
};

export default function App() {
  return (
    <AppStateProvider>
      <CockpitLayoutCore />
    </AppStateProvider>
  );
}