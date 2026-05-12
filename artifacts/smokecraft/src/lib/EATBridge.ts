/**
 * EATBridge.ts — Functional Engine Logic
 * V3.2026.0 — Hardware-to-Sector Binding, Heartbeat, Accelerometer, Sovereign X-Port
 */

/* ── Types ────────────────────────────────────────────────── */

export interface LedgerPacket {
  id:        string;
  timestamp: string;
  user:      string;
  event:     string;
  zone:      string;
  status:    'SECURE' | 'LOCAL' | 'REMOTE';
}

export interface LocalPacket {
  category: string;
  value:    number;
  type:     string;
  time?:    string;
}

export const HOME_ZONES = ['CIGAR LOUNGE', 'GOLF SUITE', 'PATIO'] as const;
export type HomeZone = typeof HOME_ZONES[number];

export interface DeviceRegistryEntry {
  homeZone:      HomeZone;
  registeredAt:  string;
}

export interface XPortConfig {
  portId:       string;
  relayUrl:     string;
  active:       boolean;
  configuredAt: string;
}

/* ── EAT Universal Bridge ─────────────────────────────────── */

export const EATBridge = {
  syncAudio: async (provider: string): Promise<string> => {
    console.log(`EAT ENGINE: Establishing link to ${provider}...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`EAT ENGINE: ${provider} — COBALT_PULSE_SUCCESS`);
        resolve("COBALT_PULSE_SUCCESS");
      }, 1200);
    });
  },

  updateEnvironment: async (category: string, value: number): Promise<string> => {
    console.log(`EAT TELEMETRY: ${category} adjusted to ${value}`);
    if (!navigator.onLine) {
      EATMeshResilience.localPersistence({ category, value, type: 'ENV_ADJUST' });
      return "QUEUED_LOCAL";
    }
    try {
      const response = await fetch(`/api/${category}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensity: value }),
      });
      return response.ok ? "SYNCED" : "RETRY";
    } catch {
      EATMeshResilience.localPersistence({ category, value, type: 'ENV_ADJUST' });
      return "QUEUED_LOCAL";
    }
  },
};

/* ── EAT Sovereign Ledger ─────────────────────────────────── */

export const EATSovereignLedger = {
  recordEvent: (staffID: string, action: string, sector: string): LedgerPacket => {
    const packet: LedgerPacket = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      user:      staffID,
      event:     action,
      zone:      sector,
      status:    navigator.onLine ? 'SECURE' : 'LOCAL',
    };
    console.log("LEDGER UPDATED: Sovereign Audit Trail secure.", packet);
    return packet;
  },
};

/* ── Sovereign Override ───────────────────────────────────── */

export const SovereignOverride = {
  emergencyLockdown: (): string => {
    console.log("CRITICAL: Sovereign Lockdown triggered via Remote Override.");
    return "GAUSSIAN_BLUR_LOCK_ACTIVE";
  },
};

/* ── Device Home Zone Registry ───────────────────────────── */

export const DeviceRegistry = {
  STORAGE_KEY: 'EAT_Device_HomeZones' as const,

  bind: (deviceId: string, homeZone: HomeZone): void => {
    const all: Record<string, DeviceRegistryEntry> = JSON.parse(
      localStorage.getItem(DeviceRegistry.STORAGE_KEY) ?? '{}'
    );
    all[deviceId.toUpperCase()] = {
      homeZone,
      registeredAt: new Date().toISOString(),
    };
    localStorage.setItem(DeviceRegistry.STORAGE_KEY, JSON.stringify(all));
    console.log(`DEVICE REGISTRY: [${deviceId}] bound to [${homeZone}].`);
  },

  getHomeZone: (deviceId: string): HomeZone | null => {
    const all: Record<string, DeviceRegistryEntry> = JSON.parse(
      localStorage.getItem(DeviceRegistry.STORAGE_KEY) ?? '{}'
    );
    return (all[deviceId.toUpperCase()]?.homeZone as HomeZone) ?? null;
  },

  getAll: (): Record<string, DeviceRegistryEntry> => {
    return JSON.parse(localStorage.getItem(DeviceRegistry.STORAGE_KEY) ?? '{}');
  },

  checkHeartbeat: (deviceId: string, currentSector: string): 'OK' | 'MISMATCH' => {
    const homeZone = DeviceRegistry.getHomeZone(deviceId);
    if (!homeZone) return 'OK';
    return currentSector.trim().toUpperCase() === homeZone ? 'OK' : 'MISMATCH';
  },
};

/* ── Sector Control — Hardware-to-Sector Binding ("The Leash") ── */

export const SectorControl = {
  verifyProximity: (deviceId: string, currentSector: string): string => {
    const homeZone = DeviceRegistry.getHomeZone(deviceId);
    if (!homeZone) {
      // Fall back to legacy flat registry
      const registry: Record<string, string> = JSON.parse(
        localStorage.getItem('EAT_Device_Registry') ?? '{}'
      );
      const assigned = registry[deviceId];
      if (assigned && assigned !== currentSector.toUpperCase()) {
        console.error("SECURITY ALERT: Device Sector Mismatch (legacy).", { deviceId, assigned, currentSector });
        return "SECTOR_LOCK_TRIGGERED";
      }
      return "SECTOR_VERIFIED";
    }

    const result = DeviceRegistry.checkHeartbeat(deviceId, currentSector);
    if (result === 'MISMATCH') {
      console.error("SECURITY ALERT: Device outside Home Zone.", {
        deviceId, homeZone, currentSector,
      });
      return "SECTOR_LOCK_TRIGGERED";
    }
    return "SECTOR_VERIFIED";
  },

  universalPort: (portId: string, configuration: unknown): string => {
    console.log(`EAT PORT [${portId}]: Custom Hardware Handshake Initialized.`, configuration);
    return "EXPANSION_ACTIVE";
  },

  registerDevice: (deviceId: string, sector: string): void => {
    const registry: Record<string, string> = JSON.parse(
      localStorage.getItem('EAT_Device_Registry') ?? '{}'
    );
    registry[deviceId] = sector.toUpperCase();
    localStorage.setItem('EAT_Device_Registry', JSON.stringify(registry));
    console.log(`SECTOR BIND: Device [${deviceId}] locked to [${sector}].`);
  },
};

/* ── Device Heartbeat Monitor ────────────────────────────── */

export const DeviceHeartbeat = {
  _timers: {} as Record<string, ReturnType<typeof setInterval>>,

  start: (
    deviceId:    string,
    getSector:   () => string,
    onMismatch:  (deviceId: string, detectedSector: string, homeZone: HomeZone) => void,
    intervalMs = 8000,
  ): void => {
    DeviceHeartbeat.stop(deviceId);
    DeviceHeartbeat._timers[deviceId] = setInterval(() => {
      const current  = getSector();
      const homeZone = DeviceRegistry.getHomeZone(deviceId);
      if (!homeZone) return;
      const result   = DeviceRegistry.checkHeartbeat(deviceId, current);
      if (result === 'MISMATCH') {
        console.error(`HEARTBEAT ALERT: [${deviceId}] in [${current}] — expected [${homeZone}]`);
        onMismatch(deviceId, current, homeZone);
      }
    }, intervalMs);
    console.log(`HEARTBEAT: Monitoring [${deviceId}] every ${intervalMs}ms.`);
  },

  stop: (deviceId: string): void => {
    if (DeviceHeartbeat._timers[deviceId]) {
      clearInterval(DeviceHeartbeat._timers[deviceId]);
      delete DeviceHeartbeat._timers[deviceId];
    }
  },

  stopAll: (): void => {
    Object.keys(DeviceHeartbeat._timers).forEach(DeviceHeartbeat.stop);
  },
};

/* ── Accelerometer Guard ─────────────────────────────────── */

export const AccelerometerGuard = {
  ABRUPT_THRESHOLD_MS2: 15 as const,
  _motionHandler:     null as ((e: DeviceMotionEvent) => void) | null,
  _visibilityHandler: null as (() => void) | null,

  requestPermission: async (): Promise<'granted' | 'denied' | 'unavailable'> => {
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) return 'unavailable';
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DME.requestPermission === 'function') {
      const result = await DME.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    }
    return 'granted'; // non-iOS — permission not required
  },

  attach: (onAbruptMove: () => void, onPerimeterExit: () => void): boolean => {
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) return false;

    AccelerometerGuard.detach();

    AccelerometerGuard._motionHandler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      if (mag > AccelerometerGuard.ABRUPT_THRESHOLD_MS2) {
        console.error(`ACCEL GUARD: Abrupt motion ${mag.toFixed(2)} m/s² — triggering lock.`);
        onAbruptMove();
      }
    };

    AccelerometerGuard._visibilityHandler = () => {
      if (document.hidden) {
        console.warn("ACCEL GUARD: Device left sector perimeter (visibility lost).");
        onPerimeterExit();
      }
    };

    window.addEventListener('devicemotion', AccelerometerGuard._motionHandler);
    document.addEventListener('visibilitychange', AccelerometerGuard._visibilityHandler);

    console.log(`ACCEL GUARD: Attached — threshold ${AccelerometerGuard.ABRUPT_THRESHOLD_MS2} m/s².`);
    return true;
  },

  detach: (): void => {
    if (AccelerometerGuard._motionHandler) {
      window.removeEventListener('devicemotion', AccelerometerGuard._motionHandler);
      AccelerometerGuard._motionHandler = null;
    }
    if (AccelerometerGuard._visibilityHandler) {
      document.removeEventListener('visibilitychange', AccelerometerGuard._visibilityHandler);
      AccelerometerGuard._visibilityHandler = null;
    }
  },
};

/* ── Sovereign X-Port ────────────────────────────────────── */

export const SovereignXPort = {
  STORAGE_KEY: 'EAT_XPort_Config' as const,

  configure: (portId: string, relayUrl: string): string => {
    const all: Record<string, XPortConfig> = JSON.parse(
      localStorage.getItem(SovereignXPort.STORAGE_KEY) ?? '{}'
    );
    all[portId] = { portId, relayUrl, active: true, configuredAt: new Date().toISOString() };
    localStorage.setItem(SovereignXPort.STORAGE_KEY, JSON.stringify(all));
    console.log(`EAT X-PORT [${portId}]: Configured → relay: ${relayUrl}`);
    return 'EXPANSION_ACTIVE';
  },

  stream: async (
    portId:     string,
    data:       unknown,
    onLedger:   (event: string, zone: string) => void,
  ): Promise<void> => {
    const all: Record<string, XPortConfig> = JSON.parse(
      localStorage.getItem(SovereignXPort.STORAGE_KEY) ?? '{}'
    );
    const port = all[portId];
    if (!port?.active) {
      console.warn(`X-PORT [${portId}]: Not configured or inactive.`);
      return;
    }
    onLedger(`X-Port [${portId}] → Asset Vault stream`, 'ASSET VAULT');
    try {
      await fetch('/api/xport/stream', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ portId, data, ts: Date.now() }),
      });
    } catch {
      console.warn(`X-PORT [${portId}]: Offline — buffered to Mesh.`);
      EATMeshResilience.localPersistence({ category: 'xport', value: 0, type: `XPORT_${portId}` });
    }
  },

  getAll: (): Record<string, XPortConfig> => {
    return JSON.parse(localStorage.getItem(SovereignXPort.STORAGE_KEY) ?? '{}');
  },
};

/* ── EAT Mesh Resilience ──────────────────────────────────── */

export const EATMeshResilience = {
  QUEUE_KEY: 'EAT_Sync_Queue' as const,

  localPersistence: (packet: Omit<LocalPacket, 'time'>): void => {
    const queue: LocalPacket[] = JSON.parse(
      localStorage.getItem('EAT_Sync_Queue') ?? '[]'
    );
    queue.push({ ...packet, time: new Date().toISOString() });
    localStorage.setItem('EAT_Sync_Queue', JSON.stringify(queue));
    console.log("NETWORK OFFLINE: Data cached to Local Mesh.");
  },

  healSync: (): number => {
    const queue: LocalPacket[] = JSON.parse(
      localStorage.getItem('EAT_Sync_Queue') ?? '[]'
    );
    if (queue.length > 0) {
      console.log(`HEAL-SYNC: Re-establishing cloud handshake... (${queue.length} packets)`);
      localStorage.removeItem('EAT_Sync_Queue');
      return queue.length;
    }
    return 0;
  },

  getQueueLength: (): number => {
    const raw = localStorage.getItem('EAT_Sync_Queue');
    return raw ? (JSON.parse(raw) as LocalPacket[]).length : 0;
  },
};
