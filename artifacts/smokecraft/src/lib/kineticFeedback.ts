/**
 * KineticFeedback — Ritual Response Bridge
 * Titan V · 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Links the physical guest gesture (card drag) to the room environment:
 *   - dispatchRitualEvent  → fires efe:ritual_event + SSE telemetry on ADD swipe
 *   - checkMentorWarning   → detects 3-archetype conflict in tag history
 *   - edgeHaptic           → proportional vibration as card approaches commit zone
 *
 * All effects are fire-and-forget / non-blocking.
 */

// ── Ritual scene map — tag → physical room state ──────────────────────────────

export interface RitualScene {
  tag:      string;
  lighting: string;
  audio:    string;
  hex:      string;
  label:    string;
}

const SCENE_MAP: Record<string, Omit<RitualScene, "tag">> = {
  earthy:        { lighting: "deep_moss_green",   audio: "low_frequency_bass",  hex: "#2D5016", label: "MOSS FIELD"      },
  spiced:        { lighting: "burnt_ochre",        audio: "crackling_fire",       hex: "#8B4513", label: "EMBER WOOD"      },
  cedar:         { lighting: "forest_amber",       audio: "woodwind_layers",      hex: "#8B6914", label: "FOREST AMBER"    },
  smoky:         { lighting: "obsidian_cloud",     audio: "low_frequency_bass",   hex: "#3A3030", label: "OBSIDIAN CLOUD"  },
  bold:          { lighting: "titan_gold",         audio: "ritual_pulse",         hex: "#D48B00", label: "TITAN GOLD"      },
  spicy:         { lighting: "burnt_ochre",        audio: "crackling_fire",       hex: "#8B3A00", label: "SPICE FIRE"      },
  peat:          { lighting: "deep_smoke",         audio: "low_frequency_bass",   hex: "#5C4A2A", label: "PEAT SMOKE"      },
  floral:        { lighting: "rose_dawn",          audio: "woodwind_layers",      hex: "#7A4A6B", label: "ROSE DAWN"       },
  fruity:        { lighting: "citrus_burst",       audio: "crackling_fire",       hex: "#B86A00", label: "CITRUS BURST"    },
  smooth:        { lighting: "warm_amber",         audio: "meditative",           hex: "#8B6914", label: "WARM AMBER"      },
  rich:          { lighting: "velvet_ember",       audio: "ritual_pulse",         hex: "#6B2A00", label: "VELVET EMBER"    },
  "dark roast":  { lighting: "obsidian_cloud",     audio: "low_frequency_bass",   hex: "#2A1A0A", label: "DARK ROAST"      },
  oaky:          { lighting: "forest_amber",       audio: "woodwind_layers",      hex: "#7A5A14", label: "OAK GROVE"       },
  vanilla:       { lighting: "warm_amber",         audio: "meditative",           hex: "#C8A050", label: "VANILLA SMOKE"   },
  caramel:       { lighting: "warm_amber",         audio: "meditative",           hex: "#9B6A14", label: "CARAMEL DRAFT"   },
};

export function resolveScene(tags: string[]): RitualScene | null {
  for (const tag of tags.map(t => t.toLowerCase())) {
    const entry = SCENE_MAP[tag];
    if (entry) return { tag, ...entry };
  }
  return null;
}

// ── Infrastructure trigger — fires efe:ritual_event + SSE telemetry ───────────

const BASE = (() => {
  try { return (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL?.replace(/\/$/, "") ?? ""; }
  catch { return ""; }
})();

export function dispatchRitualEvent(tags: string[], craftType: string): void {
  const scene = resolveScene(tags);

  // 1. In-process event bus — drives RitualSceneOverlay + EmberHeartbeat color
  try {
    window.dispatchEvent(new CustomEvent("efe:ritual_event", {
      detail: { tags, craftType, scene, timestamp: Date.now() },
    }));
  } catch { /* ignore */ }

  // 2. SSE telemetry bridge — non-blocking fire-and-forget
  const token = (() => { try { return localStorage.getItem("auth_token"); } catch { return null; } })();
  fetch(`${BASE}/api/telemetry/ritual-event`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tags, craftType, scene }),
  }).catch(() => {});
}

// ── Mentor Warning — 3-archetype conflict detector ────────────────────────────
// Bold/Heavy + Delicate + Earthy/Dark = fractured legacy

const ARCHETYPES: { name: string; tags: string[] }[] = [
  { name: "bold-heavy",  tags: ["bold", "heavy", "robust", "spicy", "rich"]          },
  { name: "delicate",    tags: ["delicate", "light", "mild", "floral", "crisp"]       },
  { name: "earthy-dark", tags: ["earthy", "peat", "smoky", "dense cloud", "dark roast"] },
];

export function checkMentorWarning(tagHistory: string[]): boolean {
  const lower = new Set(tagHistory.map(t => t.toLowerCase()));
  const matched = ARCHETYPES.filter(a => a.tags.some(t => lower.has(t)));
  return matched.length >= 3;
}

// ── Edge haptics — intensity proportional to proximity to commit zone ─────────
// x = raw drag offset (positive = right, negative = left)
// Commit fires at ±85–300px, so scale intensity across that range.

export function edgeHaptic(x: number): void {
  try {
    if (!("vibrate" in navigator)) return;
    const abs       = Math.abs(x);
    if (abs < 40) return;                              // dead zone — no noise
    const ratio     = Math.min((abs - 40) / 260, 1);  // 0 → 1 over 40–300px
    const intensity = Math.round(4 + ratio * 26);     // 4ms → 30ms
    navigator.vibrate([intensity]);
  } catch { /* ignore */ }
}
