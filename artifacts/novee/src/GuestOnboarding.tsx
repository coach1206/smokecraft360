import { useState } from 'react';
import { useAppState } from './App';

const GOLD = '#d4af37';
const steps = [
  { key: 'name',        label: 'What should we call you?',         placeholder: 'First name…',           type: 'text'   },
  { key: 'ageRange',    label: 'Your age range',                    placeholder: '',                       type: 'select' },
  { key: 'preferences', label: 'Describe your ideal experience',    placeholder: 'Bold, smooth, smoky…',  type: 'text'   },
];
const ageOptions = ['21–30', '31–40', '41–50', '51–60', '60+'];

export default function GuestOnboarding() {
  const { profile, setProfile, setCurrentView, playClick } = useAppState();
  const [step, setStep] = useState(0);
  const [value, setValue] = useState('');

  const current = steps[step];

  function handleNext() {
    if (!value.trim()) return;
    playClick();
    setProfile(prev => ({ ...prev, [current.key]: value.trim() }));
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setValue('');
    } else {
      setCurrentView('cockpit');
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 40, padding: 32, boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 32, color: GOLD }}>✦</span>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
          fontWeight: 300, letterSpacing: '0.08em',
          color: '#fff', margin: 0, textAlign: 'center',
        }}>
          {current.label}
        </p>
        <p style={{ fontSize: 11, color: '#555', margin: 0, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Step {step + 1} of {steps.length}
        </p>
      </div>

      {current.type === 'select' ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {ageOptions.map(opt => (
            <button
              key={opt}
              onClick={() => { playClick(); setValue(opt); }}
              style={{
                padding: '14px 24px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${value === opt ? GOLD : '#333'}`,
                background: value === opt ? `${GOLD}18` : 'transparent',
                color: value === opt ? GOLD : '#888',
                fontSize: 14, fontFamily: 'inherit', minHeight: 52, minWidth: 80,
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          placeholder={current.placeholder}
          style={{
            width: '100%', maxWidth: 420, padding: '16px 20px',
            background: '#111', border: `1px solid #333`,
            borderRadius: 10, color: '#fff', fontSize: 16,
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}

      <button
        onClick={handleNext}
        disabled={!value.trim()}
        style={{
          padding: '16px 48px', borderRadius: 10, cursor: value.trim() ? 'pointer' : 'not-allowed',
          border: `1px solid ${GOLD}`, background: value.trim() ? `${GOLD}22` : 'transparent',
          color: value.trim() ? GOLD : '#444', fontSize: 13,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: 'inherit', minHeight: 56, transition: 'all 0.15s',
        }}
      >
        {step < steps.length - 1 ? 'Continue' : 'Enter Experience'}
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i <= step ? GOLD : '#333', transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}
