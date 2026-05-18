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
  const [currentView, setCurrentView] = useState<'welcome' | 'cockpit'>('cockpit'); // Forced to cockpit to check layout instantly
  const [profile, setProfile] = useState<AppProfile>({
    name: 'JC',
    ageRange: '',
    preferences: '',
    running_score: 92
  });

  const playClick = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      audio.volume = 0.15;
      audio.play();
    } catch (e) {}
  };

  return (
    <AppStateContext.Provider value={{ profile, setProfile, currentView, setCurrentView, playClick }}>
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#05070b',
        padding: '24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>

        {/* Main Canvas Container Container */}
        <div style={{
          width: '100%',
          height: '100%',
          maxWidth: '1600px',
          backgroundColor: '#0a0c10',
          border: '1px solid #1a1a1a',
          borderRadius: '16px',
          padding: '24px',
          boxSizing: 'border-box'
        }}>

          {currentView === 'welcome' ? (
            <GuestOnboarding />
          ) : (
            /* HARDCODED INLINE CSS GRID FOR FORCED SIDE-BY-SIDE PLACEMENT */
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '24px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}>

              {/* Left Column: Interactive Cockpit Console */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid #262626',
                borderRadius: '12px',
                overflow: 'hidden',
                height: '100%'
              }}>
                <MasterBlender />
              </div>

              {/* Right Column: QR Portal Sync Display */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid #262626',
                borderRadius: '12px',
                overflow: 'hidden',
                height: '100%'
              }}>
                <SmokeCraftQR />
              </div>

            </div>
          )}

        </div>
      </div>
    </AppStateContext.Provider>
  );
}