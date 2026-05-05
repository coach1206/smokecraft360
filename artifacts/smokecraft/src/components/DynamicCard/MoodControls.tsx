/**
 * MoodControls — preset mood selectors for the Craft Hub.
 *
 * Clicking a preset updates the global UserPreferences, causing all four
 * DynamicCards to immediately re-filter their scene arrays to match.
 */

import { motion } from "framer-motion";
import { usePreferences, PRESET_MODES } from "@/contexts/PreferenceContext";

export default function MoodControls() {
  const { activePresetId, setPreferences } = usePreferences();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{
        fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
        color: "rgba(232,224,200,0.35)", fontWeight: 700, marginRight: 4,
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
            onClick={() => setPreferences(preset.preferences, preset.id)}
            style={{
              padding: "8px 14px", borderRadius: 999, cursor: "pointer",
              border: active
                ? `1.5px solid ${preset.color}`
                : "1.5px solid rgba(255,255,255,0.12)",
              background: active ? `${preset.color}18` : "rgba(255,255,255,0.04)",
              color: active ? preset.color : "rgba(232,224,200,0.6)",
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
