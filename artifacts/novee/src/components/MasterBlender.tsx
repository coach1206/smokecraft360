import { useState } from 'react';
import { useAppState } from '../App';

const GOLD = '#d4af37';

const CRAFT_TILES = [
  { id: 'smoke', label: 'Smoke',  emoji: '🍂', color: '#c0651a' },
  { id: 'pour',  label: 'Pour',   emoji: '🥃', color: '#8b5e3c' },
  { id: 'brew',  label: 'Brew',   emoji: '🍺', color: '#d4a012' },
  { id: 'vape',  label: 'Vape',   emoji: '💨', color: '#4a7fa5' },
];

const MOOD_OPTIONS = ['Celebratory', 'Relaxed', 'Social', 'Contemplative', 'Bold'];

export default function MasterBlender() {
  const { profile, setCurrentView, playClick } = useAppState();
  const [activeCraft, setActiveCraft] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  function handleReset() {
    playClick();
    setCurrentView('welcome');
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      padding: 24, boxSizing: 'border-box', gap: 20,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
            color: '#fff', margin: 0, fontWeight: 300, letterSpacing: '0.06em',
          }}>
            Welcome, {profile.name}
          </p>
          <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Score {profile.running_score} · Craft Cockpit
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px', borderRadius: 7, cursor: 'pointer',
            border: '1px solid #333', background: 'transparent',
            color: '#666', fontSize: 11, fontFamily: 'inherit',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Reset Ritual
        </button>
      </div>

      {/* Craft selector */}
      <div>
        <p style={{ fontSize: 10, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Select Craft
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CRAFT_TILES.map(craft => (
            <button
              key={craft.id}
              onClick={() => { playClick(); setActiveCraft(craft.id); }}
              style={{
                padding: '18px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${activeCraft === craft.id ? craft.color : '#222'}`,
                background: activeCraft === craft.id ? `${craft.color}18` : '#0d0f12',
                color: activeCraft === craft.id ? '#fff' : '#666',
                fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                minHeight: 60, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22 }}>{craft.emoji}</span>
              <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>
                {craft.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood selector */}
      <div>
        <p style={{ fontSize: 10, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Mood
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MOOD_OPTIONS.map(m => (
            <button
              key={m}
              onClick={() => { playClick(); setMood(m); }}
              style={{
                padding: '10px 16px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${mood === m ? GOLD : '#262626'}`,
                background: mood === m ? `${GOLD}18` : 'transparent',
                color: mood === m ? GOLD : '#555', fontSize: 12,
                fontFamily: 'inherit', minHeight: 40, transition: 'all 0.15s',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: 'auto' }}>
        <button
          disabled={!activeCraft || !mood}
          style={{
            width: '100%', padding: '18px', borderRadius: 10, cursor: activeCraft && mood ? 'pointer' : 'not-allowed',
            border: `1px solid ${activeCraft && mood ? GOLD : '#1a1a1a'}`,
            background: activeCraft && mood ? `${GOLD}18` : 'transparent',
            color: activeCraft && mood ? GOLD : '#333', fontSize: 12,
            fontFamily: 'inherit', letterSpacing: '0.15em', textTransform: 'uppercase',
            minHeight: 56, transition: 'all 0.15s',
          }}
        >
          {activeCraft && mood ? `Begin ${CRAFT_TILES.find(c => c.id === activeCraft)?.label} · ${mood}` : 'Select Craft & Mood'}
        </button>
      </div>
    </div>
  );
}
