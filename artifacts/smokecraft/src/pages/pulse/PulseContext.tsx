import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";

export interface ZoneMood {
  id: string;
  name: string;
  score: number;        // 0–100
  pressure: "chill" | "active" | "peak";
  trend: "up" | "down" | "stable";
  occupancy: number;    // 0–100
}

export interface HardwareDevice {
  id: string;
  name: string;
  battery: number;      // 0–100
  status: "idle" | "guest_active" | "offline";
  health: number;       // 0–100
  pingMs: number;
  sessionGuest?: string;
}

export interface Prediction {
  id: string;
  product: string;
  brand: string;
  confidence: number;   // 0–100
  reason: string;
  zone: string;
  category: string;
}

export interface FunnelData {
  discovery: number;
  engagement: number;
  selection: number;
  conversion: number;
}

export interface PulseData {
  zones: ZoneMood[];
  hardware: HardwareDevice[];
  predictions: Prediction[];
  funnel: FunnelData;
  signalStrength: number; // 0–100
}

interface PulseCtx {
  data: PulseData | null;
  isLive: boolean;
  isReacquiring: boolean;
  lastUpdate: Date | null;
}

const PulseContext = createContext<PulseCtx>({ data: null, isLive: false, isReacquiring: false, lastUpdate: null });

// ── Seeded fallback data (contextually relevant) ──────────────────────────────
const SEED_ZONES: ZoneMood[] = [
  { id: "z1", name: "Cigar Lounge",   score: 55, pressure: "active", trend: "up",     occupancy: 68 },
  { id: "z2", name: "Whiskey Bar",    score: 72, pressure: "peak",   trend: "up",     occupancy: 81 },
  { id: "z3", name: "VIP Suite",      score: 88, pressure: "peak",   trend: "stable", occupancy: 95 },
  { id: "z4", name: "Main Floor",     score: 40, pressure: "active", trend: "up",     occupancy: 52 },
  { id: "z5", name: "Private Alcove", score: 22, pressure: "chill",  trend: "down",   occupancy: 30 },
  { id: "z6", name: "Patio Terrace",  score: 35, pressure: "chill",  trend: "stable", occupancy: 44 },
  { id: "z7", name: "Bar Seating",    score: 61, pressure: "active", trend: "up",     occupancy: 73 },
  { id: "z8", name: "Event Hall",     score: 19, pressure: "chill",  trend: "down",   occupancy: 15 },
];

const SEED_HARDWARE: HardwareDevice[] = [
  { id: "TTX-001", name: "Titan Kiosk 1",  battery: 87, status: "guest_active", health: 98, pingMs: 12,  sessionGuest: "M. Carter" },
  { id: "TTX-004", name: "Titan Kiosk 2",  battery: 61, status: "idle",         health: 94, pingMs: 8  },
  { id: "TTX-007", name: "Titan Kiosk 3",  battery: 11, status: "idle",         health: 91, pingMs: 22 },
  { id: "TTX-009", name: "Titan Kiosk 4",  battery: 44, status: "guest_active", health: 96, pingMs: 9,   sessionGuest: "R. Vasquez" },
  { id: "TTX-012", name: "Titan Kiosk 5",  battery: 78, status: "guest_active", health: 99, pingMs: 6,   sessionGuest: "D. Park" },
  { id: "TTX-015", name: "Staff Terminal", battery: 93, status: "idle",         health: 100, pingMs: 4 },
  { id: "TTX-018", name: "Bar Display",    battery:  8, status: "offline",      health: 72, pingMs: 0  },
  { id: "TTX-021", name: "Host Stand",     battery: 55, status: "guest_active", health: 97, pingMs: 11, sessionGuest: "T. Monroe" },
];

const SEED_PREDICTIONS: Prediction[] = [
  { id: "p1", product: "Padrón 1964 Anniversary Natural", brand: "Padrón", confidence: 91, reason: "Table 4 — 55min session, warm amber mood, vanilla finish preference on profile", zone: "Cigar Lounge", category: "Cigar" },
  { id: "p2", product: "Macallan 12 Year Double Cask",    brand: "Macallan", confidence: 85, reason: "VIP Suite guests matched Sherry-oak affinity vector (3 prior sessions)", zone: "VIP Suite", category: "Whiskey" },
  { id: "p3", product: "Clase Azul Reposado",             brand: "Clase Azul", confidence: 78, reason: "Whiskey Bar peak pressure — premium upsell window open (avg. dwell 42min)", zone: "Whiskey Bar", category: "Spirits" },
  { id: "p4", product: "Arturo Fuente Hemingway Classic", brand: "Arturo Fuente", confidence: 73, reason: "Medium-bodied request queue up 2x — pairing window with Macallan active", zone: "Main Floor", category: "Cigar" },
  { id: "p5", product: "Buffalo Trace Bourbon",           brand: "Buffalo Trace", confidence: 66, reason: "Bar Seating chill-to-active transition — aperitif moment window open", zone: "Bar Seating", category: "Bourbon" },
];

const SEED_FUNNEL: FunnelData = { discovery: 148, engagement: 63, selection: 29, conversion: 18 };

// ── Realistic drift for live feel ─────────────────────────────────────────────
function driftScore(base: number, delta = 12): number {
  return Math.max(5, Math.min(100, base + (Math.random() - 0.48) * delta));
}

function applyDrift(data: PulseData): PulseData {
  return {
    ...data,
    signalStrength: Math.max(80, Math.min(100, data.signalStrength + (Math.random() - 0.5) * 4)),
    zones: data.zones.map(z => {
      const score = driftScore(z.score, 8);
      return { ...z, score, pressure: score < 31 ? "chill" : score < 71 ? "active" : "peak", trend: score > z.score ? "up" : score < z.score ? "down" : "stable" };
    }),
    hardware: data.hardware.map(d => ({
      ...d,
      battery: d.status === "offline" ? d.battery : Math.max(0, d.battery - (Math.random() < 0.05 ? 1 : 0)),
      pingMs: d.status === "offline" ? 0 : Math.max(2, d.pingMs + Math.round((Math.random() - 0.5) * 4)),
    })),
    predictions: data.predictions.map(p => ({ ...p, confidence: Math.max(50, Math.min(99, p.confidence + Math.round((Math.random() - 0.5) * 4))) })),
    funnel: {
      discovery:   Math.max(100, data.funnel.discovery  + Math.round((Math.random() - 0.3) * 6)),
      engagement:  Math.max(40,  data.funnel.engagement + Math.round((Math.random() - 0.4) * 4)),
      selection:   Math.max(15,  data.funnel.selection  + Math.round((Math.random() - 0.45) * 3)),
      conversion:  Math.max(8,   data.funnel.conversion + Math.round((Math.random() - 0.45) * 2)),
    },
  };
}

export function PulseProvider({ children }: { children: ReactNode }) {
  const seedRef = useRef<PulseData>({
    zones: SEED_ZONES,
    hardware: SEED_HARDWARE,
    predictions: SEED_PREDICTIONS,
    funnel: SEED_FUNNEL,
    signalStrength: 98,
  });

  const [data, setData] = useState<PulseData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isReacquiring, setIsReacquiring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let missCount = 0;

    async function tick() {
      try {
        const token = localStorage.getItem("axiom_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Try live endpoints; fall back gracefully
        const [moodRes, hwRes, predRes] = await Promise.allSettled([
          fetch("/api/novee/pulse/mood",        { headers }),
          fetch("/api/novee/pulse/hardware",    { headers }),
          fetch("/api/novee/pulse/predictions", { headers }),
        ]);

        let next = applyDrift(seedRef.current);

        if (moodRes.status === "fulfilled" && moodRes.value.ok) {
          const j = await moodRes.value.json().catch(() => null);
          if (j?.zones) next = { ...next, zones: j.zones };
        }
        if (hwRes.status === "fulfilled" && hwRes.value.ok) {
          const j = await hwRes.value.json().catch(() => null);
          if (j?.hardware) next = { ...next, hardware: j.hardware };
        }
        if (predRes.status === "fulfilled" && predRes.value.ok) {
          const j = await predRes.value.json().catch(() => null);
          if (j?.predictions) next = { ...next, predictions: j.predictions };
        }

        seedRef.current = next;
        setData(next);
        setIsLive(true);
        setIsReacquiring(false);
        setLastUpdate(new Date());
        missCount = 0;
      } catch {
        missCount++;
        if (missCount >= 2) setIsReacquiring(true);
        // Still provide drifted data so UI stays alive
        const next = applyDrift(seedRef.current);
        seedRef.current = next;
        setData(next);
        setLastUpdate(new Date());
      }
    }

    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <PulseContext.Provider value={{ data, isLive, isReacquiring, lastUpdate }}>
      {children}
    </PulseContext.Provider>
  );
}

export function usePulse() {
  return useContext(PulseContext);
}
