/**
 * MoodControls — preset mood selectors for the Craft Hub.
 *
 * Selecting a preset updates BOTH:
 *  - PreferenceContext (for UI active-state indicator)
 *  - UserProfileContext (so getWeightedScenes() incorporates the new mood immediately)
 */

import { motion } from "framer-motion";
import { usePreferences, PRESET_MODES } from "@/contexts/PreferenceContext";
import { useUserProfile }               from "@/contexts/UserProfileContext";

export default function MoodControls() {
  const { activePresetId, setPreferences } = usePreferences();
  const { updateProfile }                  = useUserProfile();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{
        fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(26,26,27,0.35)", fontWeight: 700, marginRight: 4,
      }}>
        Mood
      </span>

      {PRESET_MODES.map(preset => {
        const active = activePresetId === preset.id;
        return (
          <motion.button
            key={preset.id}
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              // Update UI preference context (active pill highlight)
              setPreferences(preset.preferences, preset.id);
              // Also push into persistent user profile so weighted engine picks it up
              updateProfile({
                mood:      preset.preferences.mood,
                intensity: preset.preferences.intensity,
                setting:   preset.preferences.setting,
              });
            }}
            style={{
              padding: "8px 14px", borderRadius: 999, cursor: "pointer",
              border: active
                ? `1.5px solid ${preset.color}`
                : "1.5px solid rgba(26,26,27,0.14)",
              background: active ? `${preset.color}18` : "rgba(26,26,27,0.06)",
              color: active ? preset.color : "rgba(26,26,27,0.58)",
              fontSize: 11, fontWeight: active ? 700 : 500,
              letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s ease",
              boxShadow: active ? `0 0 12px ${preset.color}30` : "none",
            }}
          >
            <span style={{ fontSize: 13 }}>{preset.icon}</span>
            {preset.label}
          </motion.button>
        );
      })}
    </div>
  );
}
