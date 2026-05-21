/**
 * Offline Kernel Cache — client-side resilience store.
 *
 * Fetches the integration kernel offline bundle once per day and caches it
 * in localStorage. All accessor functions fall back gracefully to an empty
 * result when the cache is cold or the network is unavailable.
 *
 * TTL: 24 hours (86 400 seconds), matching server Cache-Control.
 */

const CACHE_KEY     = "novee_offline_bundle_v1";
const TTL_MS        = 86_400_000; // 24 h

interface KnowledgeChunk {
  id: string; domain: string; subdomain: string;
  title: string; content: string; keywords: string[]; roleRelevance: string[];
}
interface SopEntry {
  id: string; title: string; category: string; steps: string[]; roles: string[];
}
interface PairingGuide {
  id: string; craft: string; name: string; profile: string;
  pairings: string[]; avoidances: string[];
}
interface EmergencyDoc {
  id: string; title: string; severity: string; content: string;
}
interface OfflineBundle {
  version: string; generatedAt: string; ttlSeconds: number;
  training: KnowledgeChunk[]; sops: SopEntry[];
  pairingGuides: PairingGuide[]; emergencyDocs: EmergencyDoc[];
}
interface CacheEntry {
  bundle:     OfflineBundle;
  cachedAt:   number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch { return null; }
}

function writeCache(bundle: OfflineBundle): void {
  try {
    const entry: CacheEntry = { bundle, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* storage full — skip */ }
}

let _fetchPromise: Promise<OfflineBundle | null> | null = null;

/** Fetch bundle from server (deduplicated, non-blocking). */
export async function warmOfflineCache(): Promise<OfflineBundle | null> {
  const cached = readCache();
  if (cached) return cached.bundle;

  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const token = localStorage.getItem("axiom_token") ?? "";
      const res   = await fetch("/api/integration-kernel/offline-bundle", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const bundle = await res.json() as OfflineBundle;
      writeCache(bundle);
      return bundle;
    } catch { return null; }
    finally   { _fetchPromise = null; }
  })();

  return _fetchPromise;
}

function getBundle(): OfflineBundle | null {
  return readCache()?.bundle ?? null;
}

/** SOPs, optionally filtered by category. */
export function getCachedSOPs(category?: string): SopEntry[] {
  const b = getBundle();
  if (!b) return [];
  return category ? b.sops.filter(s => s.category === category) : b.sops;
}

/** Pairing guides, optionally filtered by craft. */
export function getCachedPairingGuides(craft?: string): PairingGuide[] {
  const b = getBundle();
  if (!b) return [];
  return craft ? b.pairingGuides.filter(g => g.craft === craft) : b.pairingGuides;
}

/** Emergency docs, optionally filtered by severity. */
export function getCachedEmergencyDocs(severity?: string): EmergencyDoc[] {
  const b = getBundle();
  if (!b) return [];
  return severity ? b.emergencyDocs.filter(d => d.severity === severity) : b.emergencyDocs;
}

/** Knowledge base training chunks, optionally filtered by domain. */
export function getCachedTraining(domain?: string): KnowledgeChunk[] {
  const b = getBundle();
  if (!b) return [];
  return domain ? b.training.filter(c => c.domain === domain) : b.training;
}

/** Is there a valid, non-expired cache entry? */
export function isOfflineCacheWarm(): boolean {
  return readCache() !== null;
}

/** Force-expire the cache (e.g. after a version bump). */
export function clearOfflineCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
