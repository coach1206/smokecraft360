import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useVenueContext } from "@/contexts/VenueContext";
import { TouchCard } from "@/components/Touchscreen";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, ChevronRight } from "lucide-react";
import { socket } from "@/lib/socket";

const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/touch/admin",
  venue_owner: "/touch/venue",
  manager: "/touch/venue",
  staff: "/touch/venue",
  vendor: "/touch/vendor",
  brand_partner: "/touch/vendor",
};

const TYPE_LABELS: Record<string, string> = {
  live:    "Live Sprint",
  daily:   "Daily",
  weekly:  "Weekly",
  venue:   "Venue Championship",
  grand:   "Grand Master",
};

const TYPE_COLORS: Record<string, string> = {
  live:    "#ef4444",
  daily:   "#f59e0b",
  weekly:  "#8b5cf6",
  venue:   "#06b6d4",
  grand:   "#D48B00",
};

interface TournamentAnnouncement {
  tournamentId: string;
  type: string;
  title: string;
  endAt: string;
  venueId: string | null;
  ts: number;
}

export default function TouchscreenHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { getBackground, config } = useVenueContext();
  const role = user?.role;
  const venueId = config.id;

  const [announcement, setAnnouncement] = useState<TournamentAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Join the venue-specific socket room so we only receive events for our venue
  useEffect(() => {
    function joinVenueRoom() {
      if (venueId && venueId !== "default") {
        socket.emit("join_venue", { venueId });
      }
    }

    if (socket.connected) {
      joinVenueRoom();
    }
    socket.on("connect", joinVenueRoom);
    return () => {
      socket.off("connect", joinVenueRoom);
    };
  }, [venueId]);

  useEffect(() => {
    function onTournamentCreated(data: TournamentAnnouncement) {
      if (dismissed === data.tournamentId) return;
      // Defense-in-depth: only show if the event is for our venue or global
      if (data.venueId && data.venueId !== venueId) return;
      setAnnouncement(data);
    }

    socket.on("tournament_created", onTournamentCreated);
    return () => {
      socket.off("tournament_created", onTournamentCreated);
    };
  }, [dismissed, venueId]);

  function handleDismiss() {
    if (announcement) {
      setDismissed(announcement.tournamentId);
    }
    setAnnouncement(null);
  }

  const tiles = [
    { id: "admin", label: "Admin Console", description: "System-wide control", roles: ["super_admin"], route: "/touch/admin", variant: "gold" as const },
    { id: "venue", label: "Venue Operations", description: "Manage your venue", roles: ["venue_owner", "manager", "staff"], route: "/touch/venue", variant: "gold" as const },
    { id: "vendor", label: "Vendor Portal", description: "Products & campaigns", roles: ["vendor", "brand_partner"], route: "/touch/vendor", variant: "gold" as const },
    { id: "experience", label: "Start Experience", description: "Begin a guided session", roles: ["*"], route: "/intro", variant: "default" as const },
    { id: "demo", label: "Demo & Investor", description: "Showcase the platform", roles: ["*"], route: "/experience-center", variant: "glass" as const },
  ];

  const visible = tiles.filter(
    (t) => t.roles.includes("*") || (role && t.roles.includes(role)),
  );

  if (role && ROLE_ROUTES[role]) {
    queueMicrotask(() => navigate(ROLE_ROUTES[role]));
    return null;
  }

  const accentColor = announcement ? (TYPE_COLORS[announcement.type] ?? "#D48B00") : "#D48B00";
  const typeLabel   = announcement ? (TYPE_LABELS[announcement.type]  ?? announcement.type) : "";

  return (
    <BackgroundLayer image={getBackground("touchHome")} style={{
        minHeight: "100dvh",
        color: "#1A1A1B",
        padding: "40px 20px env(safe-area-inset-bottom, 20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#D48B00",
            margin: "0 0 8px",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.03em",
          }}
        >
          SmokeCraft 360
        </h1>
        <p style={{ fontSize: 14, color: "rgba(26,26,27,0.52)", margin: 0 }}>
          Select your interface
        </p>
      </div>

      <AnimatePresence>
        {announcement && (
          <motion.div
            key={announcement.tournamentId}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{
              width: "100%",
              maxWidth: 700,
              marginBottom: 20,
              padding: "14px 16px",
              borderRadius: 16,
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}50`,
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${accentColor}20`,
              border: `1px solid ${accentColor}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Trophy size={20} color={accentColor} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: accentColor,
                marginBottom: 3,
              }}>
                New Tournament Live Now
              </div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#1A1A1B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {announcement.title}
              </div>
              <div style={{ fontSize: 11, color: "rgba(26,26,27,0.48)", marginTop: 2 }}>
                {typeLabel} · Join the competition now
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/competition")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "8px 14px",
                borderRadius: 10,
                background: accentColor,
                border: "none",
                color: "#1A1A1B",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              Enter <ChevronRight size={14} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(26,26,27,0.09)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={12} color="rgba(26,26,27,0.48)" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {visible.map((t) => (
          <TouchCard
            key={t.id}
            label={t.label}
            description={t.description}
            variant={t.variant}
            size="large"
            onClick={() => navigate(t.route)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          marginTop: 32,
          minHeight: 72,
          padding: "0 32px",
          background: "rgba(26,26,27,0.06)",
          border: "1px solid rgba(26,26,27,0.10)",
          borderRadius: 14,
          color: "rgba(26,26,27,0.48)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Back to Home
      </button>
    </BackgroundLayer>
  );
}
