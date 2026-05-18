import React, { useState, createContext, useContext } from 'react';
import GuestOnboarding from './GuestOnboarding';
import MasterBlender from './MasterBlender';
import SmokeCraftQR from './SmokeCraftQR';

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
  // Hardcoded to 'cockpit' to skip the dashboard and load the screens immediately
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
        alignItems: 'center',
        overflow: 'hidden'
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
            /* EXACT SIDE-BY-SIDE GRID SPLIT BYPASSING TAILWIND COMPILATION ISSUES */
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.8fr 1.2fr',
              gap: '24px',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{
                backgroundColor: 'rgba(5, 7, 11, 0.6)',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                overflow: 'hidden',
                height: '100%'
              }}>
                <MasterBlender />
              </div>
              <div style={{
                backgroundColor: 'rgba(5, 7, 11, 0.6)',
                border: '1px solid #1e293b',
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