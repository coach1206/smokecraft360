import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Device {
  id: string;
  name: string;
  type: "kiosk" | "tablet" | "mobile";
  status: "online" | "offline";
  battery: number;
  role: "pos" | "kiosk" | "demo";
  lastHeartbeat: string;
  locked: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "owner" | "manager" | "staff";
  status: "active" | "inactive";
  pin: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  productIds: string[];
  lastOrder: string;
  rating: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

export interface HourlyRevenue {
  hour: string;
  amount: number;
}

export type PosOperatingMode = "overlay" | "hybrid" | "full_pos";

export const POS_MODE_INFO: Record<PosOperatingMode, { label: string; description: string; color: string }> = {
  overlay: {
    label: "Overlay",
    description: "Works alongside your existing POS. SmokeCraft handles recommendations, loyalty, and analytics while your current system processes transactions.",
    color: "#5b8def",
  },
  hybrid: {
    label: "Hybrid",
    description: "Syncs inventory and orders with your external POS (Toast, Square, Clover, Lightspeed). Both systems stay in sync automatically.",
    color: "#f59e0b",
  },
  full_pos: {
    label: "Full POS",
    description: "Craft Command Center is your primary point-of-sale. Complete transaction processing, inventory, and reporting in one system.",
    color: "#34d399",
  },
};

export interface CommandCenterState {
  devices: Device[];
  staff: StaffMember[];
  vendors: Vendor[];
  auditLog: AuditEntry[];
  hourlyRevenue: HourlyRevenue[];
  systemStatus: "operational" | "degraded" | "critical";
  activeGuests: number;
  posMode: PosOperatingMode;
  setPosMode: (mode: PosOperatingMode) => void;
  toggleDeviceLock: (deviceId: string) => void;
  forceRefreshDevice: (deviceId: string) => void;
  setDeviceRole: (deviceId: string, role: Device["role"]) => void;
  addAuditEntry: (action: string, details: string, user?: string) => void;
  requestRestock: (vendorId: string, productName: string) => void;
  switchStaffStatus: (staffId: string) => void;
}

const INITIAL_DEVICES: Device[] = [
  { id: "dev-1", name: "Main Bar Kiosk", type: "kiosk", status: "online", battery: 100, role: "pos", lastHeartbeat: new Date().toISOString(), locked: false },
  { id: "dev-2", name: "Lounge Tablet #1", type: "tablet", status: "online", battery: 78, role: "kiosk", lastHeartbeat: new Date().toISOString(), locked: false },
  { id: "dev-3", name: "Lounge Tablet #2", type: "tablet", status: "online", battery: 45, role: "kiosk", lastHeartbeat: new Date().toISOString(), locked: false },
  { id: "dev-4", name: "Demo iPad", type: "tablet", status: "offline", battery: 12, role: "demo", lastHeartbeat: new Date(Date.now() - 3600000).toISOString(), locked: true },
  { id: "dev-5", name: "Manager Phone", type: "mobile", status: "online", battery: 92, role: "pos", lastHeartbeat: new Date().toISOString(), locked: false },
  { id: "dev-6", name: "Patio Kiosk", type: "kiosk", status: "online", battery: 100, role: "pos", lastHeartbeat: new Date().toISOString(), locked: false },
];

const INITIAL_STAFF: StaffMember[] = [
  { id: "staff-1", name: "Jordan Mitchell", role: "owner", status: "active", pin: "1111" },
  { id: "staff-2", name: "Alex Rivera", role: "manager", status: "active", pin: "2222" },
  { id: "staff-3", name: "Casey Thompson", role: "staff", status: "active", pin: "3333" },
  { id: "staff-4", name: "Morgan Blake", role: "staff", status: "inactive", pin: "4444" },
  { id: "staff-5", name: "Taylor Chen", role: "staff", status: "active", pin: "5555" },
];

const INITIAL_VENDORS: Vendor[] = [
  { id: "ven-1", name: "Arturo Fuente International", contact: "orders@arturo.com", productIds: ["cig-1"], lastOrder: "2026-04-28", rating: 4.8 },
  { id: "ven-2", name: "Premium Spirits Direct", contact: "supply@premiumspirits.com", productIds: ["spr-1", "spr-2", "spr-3", "spr-4"], lastOrder: "2026-05-01", rating: 4.5 },
  { id: "ven-3", name: "Craft Beer Distributors", contact: "hello@craftbeerdist.com", productIds: ["beer-1", "beer-2", "beer-3", "beer-4"], lastOrder: "2026-04-30", rating: 4.7 },
  { id: "ven-4", name: "Padron & Co. Imports", contact: "sales@padron.com", productIds: ["cig-2", "cig-3", "cig-4"], lastOrder: "2026-05-02", rating: 4.9 },
  { id: "ven-5", name: "Artisan Kitchen Supply", contact: "orders@artisankitchen.co", productIds: ["food-1", "food-2", "food-3", "food-4"], lastOrder: "2026-05-03", rating: 4.6 },
];

const INITIAL_REVENUE: HourlyRevenue[] = [
  { hour: "10am", amount: 120 }, { hour: "11am", amount: 280 },
  { hour: "12pm", amount: 450 }, { hour: "1pm", amount: 380 },
  { hour: "2pm", amount: 310 }, { hour: "3pm", amount: 520 },
  { hour: "4pm", amount: 680 }, { hour: "5pm", amount: 890 },
  { hour: "6pm", amount: 1240 }, { hour: "7pm", amount: 1580 },
  { hour: "8pm", amount: 1420 }, { hour: "9pm", amount: 960 },
];

const INITIAL_AUDIT: AuditEntry[] = [
  { id: "a1", action: "system.boot", user: "System", timestamp: new Date(Date.now() - 7200000).toISOString(), details: "System initialized" },
  { id: "a2", action: "user.login", user: "Jordan Mitchell", timestamp: new Date(Date.now() - 3600000).toISOString(), details: "Owner login via PIN" },
  { id: "a3", action: "device.refresh", user: "Alex Rivera", timestamp: new Date(Date.now() - 1800000).toISOString(), details: "Force refresh on Lounge Tablet #1" },
  { id: "a4", action: "order.complete", user: "Casey Thompson", timestamp: new Date(Date.now() - 900000).toISOString(), details: "Order ORD-X7F completed ($84.00)" },
  { id: "a5", action: "inventory.alert", user: "System", timestamp: new Date(Date.now() - 300000).toISOString(), details: "Cohiba Behike 52 low stock (5 remaining)" },
];

const CCContext = createContext<CommandCenterState | null>(null);

export function useCommandCenter(): CommandCenterState {
  const ctx = useContext(CCContext);
  if (!ctx) throw new Error("useCommandCenter must be inside CommandCenterProvider");
  return ctx;
}

function loadPosMode(): PosOperatingMode {
  try {
    const stored = localStorage.getItem("smokecraft_pos_mode");
    if (stored === "overlay" || stored === "hybrid" || stored === "full_pos") return stored;
  } catch {}
  return "overlay";
}

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(() => INITIAL_DEVICES.map(d => ({ ...d })));
  const [staff, setStaff] = useState<StaffMember[]>(() => INITIAL_STAFF.map(s => ({ ...s })));
  const [vendors] = useState<Vendor[]>(() => INITIAL_VENDORS.map(v => ({ ...v })));
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => [...INITIAL_AUDIT]);
  const [hourlyRevenue] = useState<HourlyRevenue[]>(INITIAL_REVENUE);
  const [posMode, setPosModeRaw] = useState<PosOperatingMode>(loadPosMode);
  const systemStatus: "operational" | "degraded" | "critical" = devices.filter(d => d.status === "offline").length >= 3 ? "critical" : devices.some(d => d.status === "offline") ? "degraded" : "operational";
  const activeGuests = 12;

  const addAuditEntry = useCallback((action: string, details: string, user = "System") => {
    setAuditLog(prev => [{
      id: `a-${Date.now()}`,
      action, user, details,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 50));
  }, []);

  const setPosMode = useCallback((mode: PosOperatingMode) => {
    setPosModeRaw(mode);
    try { localStorage.setItem("smokecraft_pos_mode", mode); } catch {}
    addAuditEntry("settings.pos_mode", `POS mode changed to ${POS_MODE_INFO[mode].label}`);
  }, [addAuditEntry]);

  const toggleDeviceLock = useCallback((deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, locked: !d.locked } : d));
    const dev = devices.find(d => d.id === deviceId);
    if (dev) addAuditEntry("device.lock", `${dev.locked ? "Unlocked" : "Locked"} ${dev.name}`);
  }, [devices, addAuditEntry]);

  const forceRefreshDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, lastHeartbeat: new Date().toISOString() } : d));
    const dev = devices.find(d => d.id === deviceId);
    if (dev) addAuditEntry("device.refresh", `Force refresh on ${dev.name}`);
  }, [devices, addAuditEntry]);

  const setDeviceRole = useCallback((deviceId: string, role: Device["role"]) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, role } : d));
    const dev = devices.find(d => d.id === deviceId);
    if (dev) addAuditEntry("device.role", `Changed ${dev.name} role to ${role}`);
  }, [devices, addAuditEntry]);

  const requestRestock = useCallback((vendorId: string, productName: string) => {
    const ven = vendors.find(v => v.id === vendorId);
    if (ven) addAuditEntry("vendor.restock", `Restock request sent to ${ven.name} for ${productName}`);
  }, [vendors, addAuditEntry]);

  const switchStaffStatus = useCallback((staffId: string) => {
    setStaff(prev => prev.map(s =>
      s.id === staffId ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s
    ));
    const s = staff.find(x => x.id === staffId);
    if (s) addAuditEntry("staff.status", `${s.name} set to ${s.status === "active" ? "inactive" : "active"}`);
  }, [staff, addAuditEntry]);

  return (
    <CCContext.Provider value={{
      devices, staff, vendors, auditLog, hourlyRevenue,
      systemStatus, activeGuests, posMode, setPosMode,
      toggleDeviceLock, forceRefreshDevice, setDeviceRole,
      addAuditEntry, requestRestock, switchStaffStatus,
    }}>
      {children}
    </CCContext.Provider>
  );
}
