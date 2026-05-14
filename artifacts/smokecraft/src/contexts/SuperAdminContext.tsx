/**
 * SuperAdminContext — NOVEE OS Ghost Layer State
 *
 * Controls the sovereign command surface:
 *   - Ghost mode active/inactive
 *   - Live kill-switch states (synced with /api/governance/kill-switches)
 *   - Inventory overrides (items blocked from pairing engine)
 *   - Feature mask overrides per tier
 */

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from "react";
import { buildAuthorityProfile, type AuthorityProfile, type FeatureMask, AccessLevel } from "@/lib/authorityEngine";
import { useAuth } from "@/contexts/AuthContext";

export interface KillSwitch {
  name:        string;
  label:       string;
  description: string;
  enabled:     boolean;
  tier:        AccessLevel;
}

interface SuperAdminState {
  ghostActive:          boolean;
  authority:            AuthorityProfile;
  killSwitches:         KillSwitch[];
  blockedInventory:     Set<string>;
  featureOverrides:     Partial<Record<FeatureMask, boolean>>;
  activateGhost:        () => void;
  deactivateGhost:      () => void;
  toggleKillSwitch:     (name: string) => Promise<void>;
  toggleInventoryBlock: (itemId: string) => void;
  setFeatureOverride:   (feature: FeatureMask, visible: boolean) => void;
}

const SuperAdminContext = createContext<SuperAdminState | null>(null);

const DEFAULT_KILL_SWITCHES: KillSwitch[] = [
  { name: "session_blackout",   label: "Session Blackout",    description: "Immediately purge all active guest sessions", enabled: false, tier: AccessLevel.SOVEREIGN  },
  { name: "audio_silence",      label: "Audio Silence",       description: "Mute all audio playback across the venue",    enabled: false, tier: AccessLevel.SHIFT_LEAD },
  { name: "api_disconnect",     label: "API Disconnect",       description: "Suspend AI recommendation calls globally",    enabled: false, tier: AccessLevel.SOVEREIGN  },
  { name: "inventory_lock",     label: "Inventory Lock",       description: "Block all real-time inventory mutations",     enabled: false, tier: AccessLevel.SHIFT_LEAD },
  { name: "pairing_engine_off", label: "Pairing Engine Off",   description: "Stop the pairing engine for all crafts",     enabled: false, tier: AccessLevel.SHIFT_LEAD },
];

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const authority = buildAuthorityProfile(user);

  const [ghostActive,      setGhostActive]      = useState(false);
  const [killSwitches,     setKillSwitches]      = useState<KillSwitch[]>(DEFAULT_KILL_SWITCHES);
  const [blockedInventory, setBlockedInventory]  = useState<Set<string>>(new Set());
  const [featureOverrides, setFeatureOverrides]  = useState<Partial<Record<FeatureMask, boolean>>>({});
  const loaded = useRef(false);

  useEffect(() => {
    if (!ghostActive || loaded.current) return;
    loaded.current = true;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("axiom_token") : null;
    if (!token) return;
    fetch("/api/governance/kill-switches", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const remote: Record<string, boolean> = {};
        (data.killSwitches ?? []).forEach((s: { name: string; enabled: boolean }) => {
          remote[s.name] = s.enabled;
        });
        setKillSwitches(prev => prev.map(sw => ({
          ...sw,
          enabled: remote[sw.name] ?? sw.enabled,
        })));
      })
      .catch(() => {});
  }, [ghostActive]);

  const activateGhost = useCallback(() => {
    loaded.current = false;
    setGhostActive(true);
  }, []);

  const deactivateGhost = useCallback(() => setGhostActive(false), []);

  const toggleKillSwitch = useCallback(async (name: string) => {
    const sw = killSwitches.find(s => s.name === name);
    if (!sw) return;
    const next = !sw.enabled;
    setKillSwitches(prev => prev.map(s => s.name === name ? { ...s, enabled: next } : s));
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("axiom_token") : null;
    if (!token) return;
    await fetch(`/api/governance/kill-switches/${name}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {});
  }, [killSwitches]);

  const toggleInventoryBlock = useCallback((itemId: string) => {
    setBlockedInventory(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }, []);

  const setFeatureOverride = useCallback((feature: FeatureMask, visible: boolean) => {
    setFeatureOverrides(prev => ({ ...prev, [feature]: visible }));
  }, []);

  return (
    <SuperAdminContext.Provider value={{
      ghostActive, authority, killSwitches,
      blockedInventory, featureOverrides,
      activateGhost, deactivateGhost,
      toggleKillSwitch, toggleInventoryBlock, setFeatureOverride,
    }}>
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin(): SuperAdminState {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) throw new Error("useSuperAdmin must be inside SuperAdminProvider");
  return ctx;
}

export function useSuperAdminSafe(): SuperAdminState | null {
  return useContext(SuperAdminContext);
}
