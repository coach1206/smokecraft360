/**
 * AxiomPresenceContext — Presence Engine runtime provider.
 *
 * Manages:
 *   - Geofence opt-in + browser Geolocation API polling
 *   - Live guest roster (seeded + real enrolled guest)
 *   - Arrival event queue
 *   - Session continuity for current guest
 *   - Simulated arrivals for demo purposes
 *
 * Exposes:
 *   guests, arrivals, geofenceActive, geofenceDistance
 *   acknowledgeArrival, dismissArrival
 *   enableGeofence, disableGeofence
 *   simulateArrival (demo)
 *   walletPass for current guest
 *   presenceIntel
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from "react";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import {
  buildSeedGuests, buildMentorGreeting, resolveArrivalActions,
  buildPairingSuggestion, buildWalletPass, buildPresenceIntelligence,
  haversineDistanceM,
  type PresenceGuest, type ArrivalEvent, type WalletPass,
  type PresenceIntelligence, type GeofenceConfig, type ArrivalTrigger,
} from "@/lib/axiomPresenceEngine";

// ── Demo geofence config (Times Square-ish — placeholder) ────────────────────

const DEMO_GEOFENCE: GeofenceConfig = {
  lat:       40.7580,
  lng:       -73.9855,
  radiusM:   200,
  venueName: "SmokeCraft Lounge",
};

// ── Geolocation poll interval ─────────────────────────────────────────────────

const GEO_POLL_MS = 30_000;

// ── Context interface ─────────────────────────────────────────────────────────

interface PresenceState {
  guests:            PresenceGuest[];
  arrivals:          ArrivalEvent[];
  geofenceActive:    boolean;
  geofenceDistance:  number | null;  // metres, null if no geo
  geofenceStatus:    "idle" | "requesting" | "denied" | "active" | "error";
  presenceIntel:     PresenceIntelligence;
  walletPass:        WalletPass | null;
  acknowledgeArrival:(id: string) => void;
  dismissArrival:    (id: string) => void;
  enableGeofence:    () => void;
  disableGeofence:   () => void;
  simulateArrival:   (guestId: string, trigger: ArrivalTrigger) => void;
  checkInGuest:      (guestId: string) => void;
  updateGuestStatus: (guestId: string, status: PresenceGuest["status"]) => void;
}

const Ctx = createContext<PresenceState | null>(null);

export function useAxiomPresence(): PresenceState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAxiomPresence must be inside AxiomPresenceProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AxiomPresenceProvider({ children }: { children: ReactNode }) {
  const { guestProfile, mentor } = useGuestProfile();

  const [guests,   setGuests]   = useState<PresenceGuest[]>(() => buildSeedGuests());
  const [arrivals, setArrivals] = useState<ArrivalEvent[]>([]);
  const [geofenceActive,   setGeofenceActive]   = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState<number | null>(null);
  const [geofenceStatus,   setGeofenceStatus]   = useState<PresenceState["geofenceStatus"]>("idle");

  const watchIdRef    = useRef<number | null>(null);
  const geoIntervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Merge enrolled guest into roster ───────────────────────────────────────

  useEffect(() => {
    if (!guestProfile) return;
    setGuests(prev => {
      const exists = prev.find(g => g.id === guestProfile.id);
      if (exists) return prev;
      const enrolled: PresenceGuest = {
        id:                guestProfile.id,
        firstName:         guestProfile.firstName,
        lastInitial:       guestProfile.lastInitial,
        phoneLast4:        guestProfile.phoneLast4,
        vipTier:           guestProfile.sessionCount >= 10 ? "reserve"
                         : guestProfile.sessionCount >= 4  ? "member"
                         : "standard",
        mentorId:          guestProfile.assignedMentorId,
        mentorName:        mentor?.name ?? null,
        atmospherePref:    guestProfile.atmospherePreference,
        boldnessPref:      guestProfile.boldnessPreference,
        flavorTags:        guestProfile.flavorHistory.slice(0, 5).map(f => f.tag),
        visitCount:        guestProfile.sessionCount,
        lastVisitAt:       null,
        loyaltyPoints:     guestProfile.sessionCount * 75,
        savedBlends:       [],
        activeReservation: null,
        optedIntoPresence: true,
        status:            "arrived",
        arrivedAt:         new Date().toISOString(),
        trigger:           "manual_check_in",
      };
      return [enrolled, ...prev];
    });
  }, [guestProfile, mentor]);

  // ── Build arrival event ────────────────────────────────────────────────────

  const fireArrival = useCallback((guest: PresenceGuest, trigger: ArrivalTrigger) => {
    const greeting = buildMentorGreeting(guest, null);
    const actions  = resolveArrivalActions(guest);
    const pairing  = buildPairingSuggestion(guest);
    const event: ArrivalEvent = {
      id:               `arr-${guest.id}-${Date.now()}`,
      guestId:          guest.id,
      guestName:        `${guest.firstName} ${guest.lastInitial}.`,
      vipTier:          guest.vipTier,
      trigger,
      arrivedAt:        new Date().toISOString(),
      mentorGreeting:   guest.mentorId ? greeting : null,
      actionsTriggered: actions,
      atmospherePreload: guest.atmospherePref,
      pairingSuggestion: pairing,
      loyaltyBonus:     actions.includes("loyalty_bonus") ? 50 : 0,
      acknowledged:     false,
      dismissed:        false,
    };
    setArrivals(prev => [event, ...prev].slice(0, 50));
    setGuests(prev => prev.map(g =>
      g.id === guest.id
        ? { ...g, status: "arrived", arrivedAt: event.arrivedAt, trigger }
        : g,
    ));
  }, []);

  // ── Simulate arrival (demo) ────────────────────────────────────────────────

  const simulateArrival = useCallback((guestId: string, trigger: ArrivalTrigger) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;
    fireArrival(guest, trigger);
  }, [guests, fireArrival]);

  // ── Manual check-in ────────────────────────────────────────────────────────

  const checkInGuest = useCallback((guestId: string) => {
    simulateArrival(guestId, "staff_confirm");
  }, [simulateArrival]);

  const updateGuestStatus = useCallback((guestId: string, status: PresenceGuest["status"]) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, status } : g));
  }, []);

  // ── Geofence — browser Geolocation API ────────────────────────────────────

  const startGeofenceWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setGeofenceStatus("error");
      return;
    }
    setGeofenceStatus("requesting");

    const check = () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const dist = haversineDistanceM(
            pos.coords.latitude, pos.coords.longitude,
            DEMO_GEOFENCE.lat, DEMO_GEOFENCE.lng,
          );
          setGeofenceDistance(Math.round(dist));
          setGeofenceStatus("active");
        },
        err => {
          if (err.code === 1) setGeofenceStatus("denied");
          else setGeofenceStatus("error");
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
    };

    check();
    geoIntervalId.current = setInterval(check, GEO_POLL_MS);
  }, []);

  const enableGeofence = useCallback(() => {
    setGeofenceActive(true);
    startGeofenceWatch();
  }, [startGeofenceWatch]);

  const disableGeofence = useCallback(() => {
    setGeofenceActive(false);
    setGeofenceStatus("idle");
    setGeofenceDistance(null);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (geoIntervalId.current != null) {
      clearInterval(geoIntervalId.current);
      geoIntervalId.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (geoIntervalId.current != null) clearInterval(geoIntervalId.current);
  }, []);

  // ── Arrival queue actions ──────────────────────────────────────────────────

  const acknowledgeArrival = useCallback((id: string) => {
    setArrivals(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const dismissArrival = useCallback((id: string) => {
    setArrivals(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const presenceIntel = buildPresenceIntelligence(guests);

  const walletPass = guestProfile
    ? buildWalletPass(
        guests.find(g => g.id === guestProfile.id) ?? {
          id: guestProfile.id, firstName: guestProfile.firstName,
          lastInitial: guestProfile.lastInitial, phoneLast4: guestProfile.phoneLast4,
          vipTier: "standard", mentorId: guestProfile.assignedMentorId,
          mentorName: mentor?.name ?? null,
          atmospherePref: guestProfile.atmospherePreference,
          boldnessPref: guestProfile.boldnessPreference,
          flavorTags: guestProfile.flavorHistory.map(f => f.tag),
          visitCount: guestProfile.sessionCount, lastVisitAt: null,
          loyaltyPoints: guestProfile.sessionCount * 75, savedBlends: [],
          activeReservation: null, optedIntoPresence: true,
          status: "arrived", arrivedAt: null, trigger: null,
        },
        mentor,
      )
    : null;

  return (
    <Ctx.Provider value={{
      guests, arrivals,
      geofenceActive, geofenceDistance, geofenceStatus,
      presenceIntel, walletPass,
      acknowledgeArrival, dismissArrival,
      enableGeofence, disableGeofence,
      simulateArrival, checkInGuest, updateGuestStatus,
    }}>
      {children}
    </Ctx.Provider>
  );
}
