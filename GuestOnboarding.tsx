import React, { useState, useEffect } from 'react';

interface GuestSession {
  fullName: string;
  preferences: string;
  cigarExperience: string;
  pairingPreference: string;
}

export default function GuestOnboarding() {
  // Load data immediately from localStorage so it never resets on switch
  const [guestData, setGuestData] = useState<GuestSession>(() => {
    const saved = localStorage.getItem('novee_guest_session');
    return saved ? JSON.parse(saved) : {
      fullName: '',
      preferences: '',
      cigarExperience: 'Intermediate',
      pairingPreference: 'Whiskey'
    };
  });

  // Automatically save data every time a field changes
  useEffect(() => {
    localStorage.setItem('novee_guest_session', JSON.stringify(guestData));
  }, [guestData]);

  const handleChange = (key: keyof GuestSession, value: string) => {
    setGuestData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-sans">
      {/* Premium Obsidian Glass & Amber Core Container */}
      <div className="w-full max-w-2xl bg-neutral-900/60 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black">

        {/* Header Block */}
        <div className="mb-8 border-b border-neutral-800 pb-6 text-center">
          <h1 className="text-3xl font-light tracking-widest text-amber-500 uppercase">NOVEE OS</h1>
          <p className="text-xs tracking-widest text-neutral-400 mt-2 uppercase">Guest Profile Onboarding</p>
        </div>

        {/* Form Body */}
        <div className="space-y-6">
          {/* Guest Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Guest Identity</label>
            <input 
              type="text"
              placeholder="Enter full name..."
              value={guestData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-base text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-600"
            />
          </div>

          {/* Cigar Experience Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Ritual Experience Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['Novice', 'Intermediate', 'Connoisseur'].map((level) => (
                <button
                  key={level}
                  onClick={() => handleChange('cigarExperience', level)}
                  className={`py-3 rounded-lg border text-sm font-medium tracking-wide transition-all uppercase ${
                    guestData.cigarExperience === level 
                      ? 'bg-amber-950/40 border-amber-500 text-amber-400 shadow-sm' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sensory Preferences */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Sensory Notes / Profiles</label>
            <textarea 
              rows={3}
              placeholder="E.g., Earthy, sweet, dark chocolate, preferred vitolas..."
              value={guestData.preferences}
              onChange={(e) => handleChange('preferences', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-base text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-600 resize-none"
            />
          </div>
        </div>

        {/* Persistent Alert Banner */}
        <div className="mt-8 flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            SYSTEM CONFIGURATION STABLE