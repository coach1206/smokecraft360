import React, { useState, createContext, useContext } from 'react';
import GuestOnboarding from './GuestOnboarding';
import MasterBlender from './MasterBlender';
import SmokeCraftQR from './SmokeCraftQR';

interface AppProfile {
  name: string;
  ageRange: string;
  preferences: string;
  running_score: number;
}

interface AppStateContextType {
  profile: AppProfile;
  setProfile: React.Dispatch<React.SetStateAction<AppProfile>>;
  currentView: 'welcome' | 'cockpit';
  setCurrentView: (view: 'welcome' | 'cockpit') => void;
  playClick: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'cockpit'>('welcome');
  const [profile, setProfile] = useState<AppProfile>({
    name: '',
    ageRange: '',
    preferences: '',
    running_score: 92
  });

  const playClick = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      audio.volume = 0.15;
      audio.play();
    } catch (e) {
      // Audio fallback
    }
  };

  return (
    <AppStateContext.Provider value={{ profile, setProfile, currentView, setCurrentView, playClick }}>
      <div className="w-screen h-screen bg-[#05070b] overflow-hidden p-6 flex flex-col justify-between">

        {/* Dynamic Desktop/Tablet Workspace Viewport */}
        <div className="w-full h-full max-w-[1600px] mx-auto bg-[#0a0c10]/80 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl p-6 flex flex-col justify-between">

          {currentView === 'welcome' ? (
            <div className="w-full h-full flex flex-col justify-center items-center">
              <GuestOnboarding />
            </div>
          ) : (
            /* FIXED GRID: This perfectly aligns MasterBlender and SmokeCraftQR side-by-side */
            <div className="w-full h-full grid grid-cols-12 gap-6 items-stretch">

              {/* Left Side Cockpit Interface Panel (8 cols wide) */}
              <div className="col-span-8 bg-neutral-950/40 border border-neutral-900 rounded-xl overflow-hidden">
                <MasterBlender />
              </div>

              {/* Right Side Synchronized QR Device Portal (4 cols wide) */}
              <div className="col-span-4 bg-neutral-950/40 border border-neutral-900 rounded-xl overflow-hidden">
                <SmokeCraftQR />
              </div>

            </div>
          )}

        </div>

      </div>
    </AppStateContext.Provider>
  );
}
