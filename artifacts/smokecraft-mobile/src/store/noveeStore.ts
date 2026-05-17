import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";

export type ModuleType =
  | "CraftHub"
  | "SmokeCraft"
  | "PourCraft"
  | "BeerCraft"
  | "VapeCraft"
  | "StaffCockpit";

export type DeviceMode = "GUEST_TABLET" | "STAFF_COCKPIT" | "KIOSK" | "ADMIN";
export type AmbiProfile =
  | "SILK_SMOKE"
  | "AMBER_GLOW"
  | "MIDNIGHT_LOUNGE"
  | "VIP_GOLD";

interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

interface NoveeState {
  currentModule: ModuleType;
  deviceMode: DeviceMode;
  isOnline: boolean;
  ambiProfile: AmbiProfile;
  activeSessionId: string | null;
  syncQueue: OfflineAction[];
  osShellVisible: boolean;
  bootComplete: boolean;

  setModule: (module: ModuleType) => void;
  setDeviceMode: (mode: DeviceMode) => void;
  setOnlineStatus: (status: boolean) => void;
  setAmbiProfile: (profile: AmbiProfile) => void;
  setOsShellVisible: (v: boolean) => void;
  setBootComplete: (v: boolean) => void;
  queueOfflineAction: (type: string, payload: unknown) => void;
  processSyncQueue: () => Promise<void>;
  triggerHeartbeat: () => void;
}

export const useNoveeStore = create<NoveeState>((set, get) => ({
  currentModule: "CraftHub",
  deviceMode: "GUEST_TABLET",
  isOnline: true,
  ambiProfile: "SILK_SMOKE",
  activeSessionId: null,
  syncQueue: [],
  osShellVisible: false,
  bootComplete: Platform.OS === "web",

  setModule: (module) => set({ currentModule: module }),
  setDeviceMode: (mode) => set({ deviceMode: mode }),
  setOnlineStatus: (status) => {
    set({ isOnline: status });
    if (status) get().processSyncQueue();
  },
  setAmbiProfile: (profile) => set({ ambiProfile: profile }),
  setOsShellVisible: (v) => set({ osShellVisible: v }),
  setBootComplete: (v) => set({ bootComplete: v }),

  queueOfflineAction: (type, payload) => {
    const newAction: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      payload,
      timestamp: Date.now(),
    };
    set((state) => ({ syncQueue: [...state.syncQueue, newAction] }));
    AsyncStorage.setItem("novee_sync_queue", JSON.stringify(get().syncQueue));
  },

  processSyncQueue: async () => {
    const { syncQueue, isOnline } = get();
    if (!isOnline || syncQueue.length === 0) return;
    for (const action of syncQueue) {
      try {
        console.log(`[NOVEE] Syncing ${action.type}...`);
      } catch {
        return;
      }
    }
    set({ syncQueue: [] });
    await AsyncStorage.removeItem("novee_sync_queue");
  },

  triggerHeartbeat: () => {
    const telemetry = {
      deviceId: "NV-DEVICE-77X",
      mode: get().deviceMode,
      activeSession: get().activeSessionId,
      timestamp: Date.now(),
    };
    console.log("[NOVEE] Heartbeat:", telemetry);
  },
}));
