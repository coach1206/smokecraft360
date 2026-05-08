/**
 * useSonicDNA — Phase 2: Sonic DNA hook.
 *
 * Fetches and caches a venue's Sonic DNA profile.
 * Triggers acoustic emission and Web Audio API ambient layers
 * when the venue's DNA changes.
 *
 * Returns the DNA profile and helpers to trigger craft-specific audio.
 */

import { useEffect, useState, useCallback } from "react";

interface SonicDNA {
  venueId:         string;
  dominantProfile: string;
  bpm:             number;
  baseFrequencyHz: number;
  ambientLayers:   string[];
  craftMapping:    Record<string, string>;
  updatedAt:       string;
}

interface UseSonicDNAResult {
  dna:         SonicDNA | null;
  loading:     boolean;
  emitCraft:   (craftType: string) => void;
  emitHeartbeat: () => void;
  loadDNA:     () => Promise<void>;
}

export function useSonicDNA(venueId: string | undefined): UseSonicDNAResult {
  const [dna,     setDna]     = useState<SonicDNA | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDNA = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sonic-dna/${venueId}/load`, { method: "POST" });
      if (res.ok) setDna(await res.json() as SonicDNA);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [venueId]);

  useEffect(() => {
    if (venueId) loadDNA();
  }, [venueId, loadDNA]);

  const emitCraft = useCallback((craftType: string) => {
    if (!venueId) return;
    fetch(`/api/acoustic/craft/${craftType}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ venueId }),
    }).catch(() => {});
  }, [venueId]);

  const emitHeartbeat = useCallback(() => {
    if (!venueId) return;
    fetch(`/api/acoustic/heartbeat/${venueId}`, { method: "POST" }).catch(() => {});
  }, [venueId]);

  return { dna, loading, emitCraft, emitHeartbeat, loadDNA };
}
