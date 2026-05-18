import React, { useState, createContext, useContext } from 'react';
import GuestOnboarding from './components/GuestOnboarding';
import MasterBlender from './components/MasterBlender';
import SmokeCraftQR from './components/SmokeCraftQR';

// Creating the context state safely
const AppStateContext = createContext<any>(null);

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    return {
      profile: { name: 'JC', running_score: 92 },
      currentView: 'cockpit',
      setCurrentView: () => {},
      playClick: () => {}
    };
  }
  return context;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'cockpit'>('cockpit');
  const [profile, setProfile] = useState({
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
            /* SIDE-BY-SIDE INTERFACE HOUSING MATRIX */
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