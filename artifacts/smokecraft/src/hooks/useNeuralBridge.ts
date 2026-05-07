/**
 * useNeuralBridge — React hook for Neural Bridge event subscriptions.
 *
 * Subscribe to real-time cross-engine events from the API server.
 * Each event type is independently buffered (last N events) and exposed
 * via a typed state object. Components can selectively react to only the
 * engine events they care about.
 *
 * Events:
 *   neural:guest_interaction  — raw trigger pulse from any guest action
 *   neural:room_energy        — Room Energy score update from Executive engine
 *   neural:revenue_pressure   — Revenue Pressure snapshot from Executive engine
 *   neural:identity_evolved   — guest identity profile update
 *   neural:network_pulse      — cross-venue network aggregate
 */

import { useEffect, useState, useCallback } from "react";
import { socket }                            from "@/lib/socket";

// ── Event types ────────────────────────────────────────────────────────────────

export interface NeuralGuestInteraction {
  type: string;
  guestId?: string;
  userId?: string;
  venueId?: string;
  sessionId?: string;
  craftType?: string;
  ts: number;
}

export interface NeuralRoomEnergy {
  tableId: string;
  sessionId?: string;
  energyScore: number;
  status: "HIGH_MOMENTUM" | "STAGNATION_RISK";
  recommendation: string;
  venueId?: string;
  triggeredBy: string;
  ts: number;
}

export interface NeuralRevenuePressure {
  venueId?: string;
  criticalCount: number;
  highCount: number;
  watchCount: number;
  topItem?: { name: string; urgency: string } | null;
  triggeredBy: string;
  ts: number;
}

export interface NeuralIdentityEvolved {
  guestId: string;
  explorationConfidence: number;
  luxuryThreshold: number;
  evolutionCycle: number;
  evolutionDelta: number;
  triggeredBy: string;
  ts: number;
}

export interface NeuralNetworkPulse {
  activeSessions: number;
  guestCount: number;
  topCraft: string;
  triggeredBy: string;
  ts: number;
}

// ── Feed entry — unified stream for the overlay feed ─────────────────────────

export interface NeuralFeedEntry {
  id: string;
  engine: "interaction" | "energy" | "pressure" | "identity" | "network";
  label: string;
  value: string;
  color: string;
  ts: number;
}

const MAX_FEED = 40;

function feedId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface NeuralBridgeState {
  /** Last guest interaction pulse */
  lastInteraction:  NeuralGuestInteraction | null;
  /** Latest room energy reading */
  lastRoomEnergy:   NeuralRoomEnergy | null;
  /** Latest revenue pressure snapshot */
  lastPressure:     NeuralRevenuePressure | null;
  /** Latest identity evolution event */
  lastIdentity:     NeuralIdentityEvolved | null;
  /** Latest network pulse */
  lastPulse:        NeuralNetworkPulse | null;
  /** Unified feed — newest first, max 40 entries */
  feed:             NeuralFeedEntry[];
  /** True if at least one Neural Bridge event has been received */
  bridgeActive:     boolean;
}

const COLORS = {
  interaction: "#D48B00",
  energy:      "#4ade80",
  pressure:    "#f87171",
  identity:    "#a78bfa",
  network:     "#60a5fa",
};

export function useNeuralBridge(): NeuralBridgeState {
  const [lastInteraction, setLastInteraction]  = useState<NeuralGuestInteraction | null>(null);
  const [lastRoomEnergy,  setLastRoomEnergy]   = useState<NeuralRoomEnergy | null>(null);
  const [lastPressure,    setLastPressure]     = useState<NeuralRevenuePressure | null>(null);
  const [lastIdentity,    setLastIdentity]     = useState<NeuralIdentityEvolved | null>(null);
  const [lastPulse,       setLastPulse]        = useState<NeuralNetworkPulse | null>(null);
  const [feed,            setFeed]             = useState<NeuralFeedEntry[]>([]);
  const [bridgeActive,    setBridgeActive]     = useState(false);

  const pushFeed = useCallback((entry: Omit<NeuralFeedEntry, "id">) => {
    setBridgeActive(true);
    setFeed(prev => [{ ...entry, id: feedId() }, ...prev].slice(0, MAX_FEED));
  }, []);

  useEffect(() => {
    const onInteraction = (e: NeuralGuestInteraction) => {
      setLastInteraction(e);
      pushFeed({
        engine: "interaction",
        label:  e.type.replace(/_/g, " ").toUpperCase(),
        value:  e.craftType ? `craft: ${e.craftType}` : e.venueId ? `venue: ${e.venueId.slice(0, 8)}` : "guest action",
        color:  COLORS.interaction,
        ts:     e.ts,
      });
    };

    const onRoomEnergy = (e: NeuralRoomEnergy) => {
      setLastRoomEnergy(e);
      pushFeed({
        engine: "energy",
        label:  "ROOM ENERGY",
        value:  `${e.energyScore} · ${e.status.replace(/_/g, " ")}`,
        color:  e.status === "HIGH_MOMENTUM" ? COLORS.energy : "#fb923c",
        ts:     e.ts,
      });
    };

    const onPressure = (e: NeuralRevenuePressure) => {
      setLastPressure(e);
      if (e.criticalCount > 0 || e.highCount > 0) {
        pushFeed({
          engine: "pressure",
          label:  "REVENUE PRESSURE",
          value:  `${e.criticalCount} critical · ${e.highCount} high${e.topItem ? ` · ${e.topItem.name}` : ""}`,
          color:  COLORS.pressure,
          ts:     e.ts,
        });
      }
    };

    const onIdentity = (e: NeuralIdentityEvolved) => {
      setLastIdentity(e);
      pushFeed({
        engine: "identity",
        label:  "IDENTITY EVOLVED",
        value:  `conf ${(e.explorationConfidence * 100).toFixed(0)}% · lux ${(e.luxuryThreshold * 100).toFixed(0)}%`,
        color:  COLORS.identity,
        ts:     e.ts,
      });
    };

    const onPulse = (e: NeuralNetworkPulse) => {
      setLastPulse(e);
      pushFeed({
        engine: "network",
        label:  "NETWORK PULSE",
        value:  `${e.activeSessions} sessions · ${e.guestCount} guests · ${e.topCraft}`,
        color:  COLORS.network,
        ts:     e.ts,
      });
    };

    socket.on("neural:guest_interaction", onInteraction);
    socket.on("neural:room_energy",       onRoomEnergy);
    socket.on("neural:revenue_pressure",  onPressure);
    socket.on("neural:identity_evolved",  onIdentity);
    socket.on("neural:network_pulse",     onPulse);

    return () => {
      socket.off("neural:guest_interaction", onInteraction);
      socket.off("neural:room_energy",       onRoomEnergy);
      socket.off("neural:revenue_pressure",  onPressure);
      socket.off("neural:identity_evolved",  onIdentity);
      socket.off("neural:network_pulse",     onPulse);
    };
  }, [pushFeed]);

  return { lastInteraction, lastRoomEnergy, lastPressure, lastIdentity, lastPulse, feed, bridgeActive };
}
