import React from 'react';
import { useAppState } from './App';

export default function GuestOnboarding() {
  const { profile, setProfile, setCurrentView, playClick } = useAppState();

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = () => {
    if (!profile.name.trim()) return alert('Please input identity authentication marker.');
    playClick();
    setCurrentView('cockpit'); // Routes immediately to Step 4: Leaf Morphology & Sliders
  };

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col justify-center space-y-8 animate-fadeIn">
      <div className="border-b border-neutral-800 pb-4 text-center">
        <h2 className="text-3xl font-extralight tracking-widest text-amber-500 uppercase">IDENTITY CONFIGURATION</h2>
        <p className="text-[10px] tracking-widest text-neutral-500 uppercase font-mono mt-1">Calibrating Environmental Analytics</p>
      </div>

      <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 space-y-6 backdrop-blur-md">

        {/* Guest Name input field */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-medium">Guest Identity / Full Name</label>
          <input 
            type="text"
            placeholder="Authenticate name string..."
            value={profile.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-4 text-base text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700 font-mono"
          />
        </div>

        {/* Age Parameters Selection matrix */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-medium">Demographic Parameter Bracket</label>
          <div className="grid grid-cols-3 gap-4">
            {['21-29', '30-45', '46+'].map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => handleInputChange('ageRange', age)}
                className={`py-3 rounded-lg border text-sm font-mono tracking-wider transition-all ${
                  profile.ageRange === age 
                    ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold shadow-md' 
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                {age} YRS
              </button>
            ))}
          </div>
        </div>

        {/* Sensory Objectives Note entries */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-medium">Sensory Objectives / System Notes</label>
          <textarea 
            rows={3}
            placeholder="Log specific flavor constraints or sensory requirements..."
            value={profile.preferences}
            onChange={(e) => handleInputChange('preferences', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-base text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700 resize-none font-sans"
          />
        </div>

      </div>

      <div className="flex justify-between items-center bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-[11px] font-mono">
        <span className="text-neutral-500 uppercase tracking-widest">Session Encryption Stable</span>
        <button 
          onClick={handleComplete}
          className="px-8 py-3 bg-amber-500 text-black font-bold tracking-widest uppercase rounded-sm hover:bg-amber-600 transition-all text-xs"
        >
          Initialize Blender Cockpit →
        </button>
      </div>
    </div>
  );
}