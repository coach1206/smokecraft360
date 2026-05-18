import React, { useState, useEffect } from 'react';

interface GuestSession {
  fullName: string;
  preferences: string;
  cigarExperience: string;
  pairingPreference: string;
}

export default function GuestOnboarding() {
  // Load data immediately from localStorage so it survives workspace switches
  const [guestData, setGuestData] = useState<GuestSession>(() => {
    const saved = localStorage.getItem('novee_guest_session');
    return saved ? JSON.parse(saved) : {
      fullName: '',
      preferences: '',
      cigarExperience: 'Intermediate',
      pairingPreference: 'Whiskey'
    };
  });

  // Save changes instantly on input
  useEffect(() => {
    localStorage.setItem('novee_guest_session', JSON.stringify(guestData));
  }, [guestData]);

  const handleChange = (key: keyof GuestSession, value: string) => {
    setGuestData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-neutral-100 flex items-center justify-center p-4 font-sans select-none">
      {/* Premium Obsidian Glass Mobile Container */}
      <div className="w-full max-w-md bg-neutral-900/60 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-black flex flex-col justify-between min-h-[80vh]">

        {/* Header Block */}
        <div className="text-center border-b border-neutral-800 pb-4">
          <h1 className="text-2xl font-light tracking-widest text-amber-500 uppercase">NOVEE OS</h1>
          <p className="text-[10px] tracking-widest text-neutral-400 mt-1 uppercase">Guest Activation Portal</p>
        </div>

        {/* Interactive Form Fields */}
        <div className="space-y-5 my-auto py-4">

          {/* Identity Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-mono">Guest Identity</label>
            <input 
              type="text"
              placeholder="Enter full name..."
              value={guestData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700"
            />
          </div>

          {/* Experience Level Matrix */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-mono">Ritual Experience Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Novice', 'Intermediate', 'Connoisseur'].map((level) => (
                <button
                  key={level}
                  onClick={() => handleChange('cigarExperience', level)}
                  className={`py-3 rounded-lg border text-xs font-medium tracking-wide transition-all uppercase ${
                    guestData.cigarExperience === level 
                      ? 'bg-gradient-to-b from-amber-950/40 to-black border-amber-500 text-amber-400 shadow-sm' 
                      : 'bg-black border-neutral-800 text-neutral-500 hover:border-neutral-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sensory Preferences Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-mono">Sensory Preferences</label>
            <textarea 
              rows={3}
              placeholder="E.g., Sweet profile, medium-full body, complex finishes..."
              value={guestData.preferences}
              onChange={(e) => handleChange('preferences', e.target.value)}
              className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700 resize-none"
            />
          </div>

        </div>

        {/* Auto-Save Status Banner */}
        <div className="flex items-center justify-between bg-black/60 border border-neutral-800/80 rounded-lg p-3 text-[10px] font-mono">
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            MATRIX REPLICATION LINK STABLE
          </div>
          <span className="text-amber-500/80 uppercase tracking-widest text-[9px]">Session Cached</span>
        </div>

      </div>
    </div>
  );
}