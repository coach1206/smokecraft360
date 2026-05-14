/**
 * NOVEE OS — Z-Index Token System
 * Prevents z-index wars across the platform.
 */

export const zIndex = {
  base:       0,
  raised:     1,
  dropdown:   10,
  sticky:     20,
  header:     40,
  topBar:     50,
  drawer:     60,
  modal:      70,
  overlay:    80,
  toast:      90,
  debug:      9999,
} as const;
