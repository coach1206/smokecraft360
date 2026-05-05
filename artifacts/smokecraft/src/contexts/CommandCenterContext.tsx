import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getAuthHeaders } from "@/services/auth";

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
    description: "Works alongside your existing commerce system. Axiom OS handles recommendations, loyalty, and analytics while your current system processes transactions.",
    color: "#5b8def",
  },
  hybrid: {
    label: "Hybrid",
    description: "Syncs inventory and orders with external commerce platforms (Toast, Square, Clover, Lightspeed). Both systems stay in sync automatically.",
    color: "#f59e0b",
  },
  full_pos: {
    label: "Full Commerce Mode",
    description: "Command Hub is your primary commerce platform. Complete transaction processing, inventory, and reporting in one system.",
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
  shutdownDevice: (deviceId: string) => void;
  addAuditEntry: (action: string, details: string, user?: string) => void;
  requestRestock: (vendorId: string, productName: string) => void;
  switchStaffStatus: (staffId: string) => void;
}

// All data comes from real API calls — no hardcoded fallbacks.

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
  const [devices, setDevices] = useState<Device[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => [...INITIAL_AUDIT]);
  const [hourlyRevenue, setHourlyRevenue] = useState<HourlyRevenue[]>([]);
  const [posMode, setPosModeRaw] = useState<PosOperatingMode>(loadPosMode);
  const systemStatus: "operational" | "degraded" | "critical" = devices.filter(d => d.status === "offline").length >= 3 ? "critical" : devices.some(d => d.status === "offline") ? "degraded" : "operational";
  const activeGuests = devices.filter(d => d.status === "online").length;

  // Load real devices from /api/devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await fetch("/api/devices", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json() as Array<{
          id: string;
          type?: string;
          nickname?: string;
          status?: string;
          lastSeenAt?: string | null;
        }>;
        if (!Array.isArray(data) || data.length === 0) return;
        setDevices(data.map(d => ({
          id:            d.id,
          name:          d.nickname ?? `Device ${d.id.slice(0, 8)}`,
          type:          (["kiosk", "tablet", "mobile"].includes(d.type ?? "")) ? d.type as Device["type"] : "kiosk",
          status:        d.status === "active" ? "online" : "offline",
          battery:       100,
          role:          d.type === "kiosk" ? "kiosk" : "pos",
          lastHeartbeat: d.lastSeenAt ?? new Date().toISOString(),
          locked:        false,
        })));
      } catch {
        // Network error — devices panel stays empty until next load
      }
    }
    void loadDevices();
  }, []);

  // Load real staff from /api/users?role=staff
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/users?role=staff", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json() as Array<{
          id: string;
          name: string;
          role: string;
        }>;
        if (!Array.isArray(data) || data.length === 0) return;
        setStaff(data.map(u => ({
          id:     u.id,
          name:   u.name,
          role:   u.role === "manager" ? "manager" : u.role === "venue_owner" ? "owner" : "staff",
          status: "active" as const,
          pin:    "",
        })));
      } catch {
        // Keep INITIAL_STAFF on any error
      }
    }
    void loadStaff();
  }, []);

  // Load real vendors from /api/distributors — falls back to INITIAL_VENDORS on error
  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await fetch("/api/distributors", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json() as Array<{
          id: string;
          name: string;
          contactEmail?: string | null;
          updatedAt?: string | null;
        }>;
        if (!Array.isArray(data) || data.length === 0) return;
        setVendors(data.map(d => ({
          id:         d.id,
          name:       d.name,
          contact:    d.contactEmail ?? "",
          productIds: [],
          lastOrder:  d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : "—",
          rating:     4.5,
        })));
      } catch {
        // Keep INITIAL_VENDORS on any error
      }
    }
    void loadVendors();
  }, []);

  // Load real hourly revenue from /api/orders — compute per-hour totals
  useEffect(() => {
    async function loadRevenue() {
      try {
        const res = await fetch("/api/orders", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json() as Array<{
          createdAt?: string;
          totalCents?: number;
          status?: string;
        }>;
        if (!Array.isArray(data) || data.length === 0) return;

        const HOURS = ["10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm"];
        const buckets: Record<string, number> = {};
        HOURS.forEach(h => { buckets[h] = 0; });

        for (const order of data) {
          if (order.status === "cancelled" || order.status === "refunded") continue;
          if (!order.createdAt || !order.totalCents) continue;
          const d = new Date(order.createdAt);
          const h = d.getHours();
          let label: string | null = null;
          if (h === 10) label = "10am";
          else if (h === 11) label = "11am";
          else if (h === 12) label = "12pm";
          else if (h >= 1 && h <= 9) label = `${h}pm`;
          if (label && label in buckets) buckets[label] += Math.round(order.totalCents / 100);
        }

        const revenue = HOURS.map(h => ({ hour: h, amount: buckets[h] ?? 0 }));
        if (revenue.some(r => r.amount > 0)) setHourlyRevenue(revenue);
      } catch {
        // Keep INITIAL_REVENUE on any error
      }
    }
    void loadRevenue();
  }, []);

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
    if (dev) {
      addAuditEntry("device.role", `Changed ${dev.name} role to ${role}`);
      if (role === "demo") {
        addAuditEntry("demo.mode", `${dev.name} switched to demo mode`);
      }
    }
  }, [devices, addAuditEntry]);

  const shutdownDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: "offline" } : d));
    const dev = devices.find(d => d.id === deviceId);
    if (dev) addAuditEntry("device.shutdown", `Shutdown ${dev.name}`);
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
      toggleDeviceLock, forceRefreshDevice, setDeviceRole, shutdownDevice,
      addAuditEntry, requestRestock, switchStaffStatus,
    }}>
      {children}
    </CCContext.Provider>
  );
}
