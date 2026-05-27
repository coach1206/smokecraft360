import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  GlassWater,
  Home,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wine,
} from "lucide-react";
import { useLocation } from "wouter";
import "./CraftHubVisualPortal.css";

type PortalItem = {
  id: string;
  label: string;
  eyebrow: string;
  route: string;
  image: string;
  status: string;
  accent: string;
  description: string;
};

const craftCards: PortalItem[] = [
  {
    id: "smokecraft",
    label: "SmokeCraft 360",
    eyebrow: "Signature Ritual",
    route: "/smokecraft",
    image: "/images/scenes/smokecraft-card.jpg",
    status: "Live",
    accent: "#d8a82d",
    description: "Guided cigar profile, mentor flow, pairing intelligence, and guest ritual memory.",
  },
  {
    id: "winecraft",
    label: "WineCraft",
    eyebrow: "Cellar Curation",
    route: "/winecraft",
    image: "/images/craft/wine-1.png",
    status: "Ready",
    accent: "#b64b63",
    description: "Sommelier-led discovery for bottles, pairings, reserve notes, and service moments.",
  },
  {
    id: "pourcraft",
    label: "PourCraft",
    eyebrow: "Spirits Room",
    route: "/pourcraft",
    image: "/images/scenes/pourcraft-card.jpg",
    status: "Ready",
    accent: "#d99432",
    description: "Whiskey, cocktail, and premium pour intelligence for staff and guest journeys.",
  },
  {
    id: "beercraft",
    label: "BeerCraft",
    eyebrow: "Taproom Intelligence",
    route: "/beercraft",
    image: "/images/scenes/brewcraft-card.jpg",
    status: "Ready",
    accent: "#d8a82d",
    description: "Craft beer discovery, flight building, inventory signal, and hospitality pacing.",
  },
];

const sideItems = [
  { label: "CraftHub", route: "/craft-hub", icon: Home },
  { label: "Cellar", route: "/cellar", icon: Wine },
  { label: "Humidor", route: "/humidor", icon: ShieldCheck },
  { label: "Lounge", route: "/lounge", icon: GlassWater },
  { label: "Concierge", route: "/concierge", icon: UserRound },
  { label: "History", route: "/history", icon: Clock },
  { label: "Settings", route: "/settings", icon: Settings },
];

function tapFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(16);
  }
}

export default function CraftHubVisualPortal() {
  const [location, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);

  const visibleCards = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return craftCards;
    return craftCards.filter((card) =>
      `${card.label} ${card.eyebrow} ${card.description}`.toLowerCase().includes(value),
    );
  }, [query]);

  const go = (route: string) => {
    tapFeedback();
    if (route === "/concierge") setConciergeOpen(true);
    navigate(route);
  };

  return (
    <main className="chvp-shell">
      {/* Backup reference only: public/stitch-export.html should remain untouched when present. */}
      <div className="chvp-scene" />
      <div className="chvp-smoke chvp-smoke-a" />
      <div className="chvp-smoke chvp-smoke-b" />
      <div className="chvp-embers" />

      <aside className="chvp-sidebar" aria-label="CraftHub navigation">
        <button className="chvp-brand" onClick={() => go("/craft-hub")} aria-label="CraftHub home">
          <span className="chvp-brand-mark">SC</span>
          <span>
            <strong>SmokeCraft 360</strong>
            <small>NOVEE powered kiosk</small>
          </span>
        </button>

        <nav className="chvp-nav">
          {sideItems.map(({ label, route, icon: Icon }) => (
            <button
              key={label}
              className={route === location ? "active" : ""}
              onClick={() => go(route)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="chvp-curator">
          <div className="chvp-curator-photo">
            <UserRound size={34} strokeWidth={1.4} />
          </div>
          <div>
            <span className="chvp-overline">Curator Online</span>
            <h2>TheCigarLion</h2>
            <p>Rank Contestant · VIP Lounge POS 3 · Awake</p>
          </div>
        </section>

        <button className="chvp-staff" onClick={() => setStaffOpen(true)}>
          <Bell size={20} />
          <span>Summon Staff</span>
          <ChevronRight size={18} />
        </button>
      </aside>

      <section className="chvp-main">
        <header className="chvp-topbar">
          <button className="chvp-icon-btn" onClick={() => setNoticeOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <label className="chvp-search">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search craft, cellar, guest memory..."
              aria-label="Search CraftHub modules"
            />
          </label>
          <button className="chvp-icon-btn" onClick={() => setNoticeOpen(true)} aria-label="Notifications">
            <Bell size={21} />
          </button>
          <button className="chvp-icon-btn" onClick={() => go("/settings")} aria-label="Settings">
            <SlidersHorizontal size={21} />
          </button>
        </header>

        <section className="chvp-hero">
          <div>
            <span className="chvp-overline">CraftHub Portal</span>
            <h1>A living hospitality command floor.</h1>
            <p>
              Every craft room is connected to the guest journey, lounge atmosphere,
              staff orchestration, and NOVEE OS control intelligence.
            </p>
          </div>
          <div className="chvp-hero-status" aria-label="System status">
            <span>Venue Pulse</span>
            <strong>Authenticated</strong>
            <small>Humidity 72% · Lounge active · POS online</small>
          </div>
        </section>

        <section className="chvp-card-grid" aria-label="Craft experiences">
          <AnimatePresence mode="popLayout">
            {visibleCards.map((card) => (
              <motion.button
                layout
                key={card.id}
                className={`chvp-craft-card ${selected === card.id ? "selected" : ""}`}
                style={{ ["--card-accent" as string]: card.accent }}
                onMouseEnter={() => setSelected(card.id)}
                onFocus={() => setSelected(card.id)}
                onClick={() => go(card.route)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                whileTap={{ scale: 0.985 }}
              >
                <img src={card.image} alt="" loading="eager" />
                <span className="chvp-card-status">{card.status}</span>
                <span className="chvp-card-copy">
                  <small>{card.eyebrow}</small>
                  <strong>{card.label}</strong>
                  <em>{card.description}</em>
                </span>
                <ChevronRight size={26} />
              </motion.button>
            ))}
          </AnimatePresence>
        </section>

        <section className="chvp-intel-row">
          <button onClick={() => go("/concierge")}>
            <Sparkles size={20} />
            <span>Concierge mode</span>
            <strong>{conciergeOpen ? "Listening" : "Standby"}</strong>
          </button>
          <button onClick={() => go("/history")}>
            <BookOpen size={20} />
            <span>Journey history</span>
            <strong>18 sessions</strong>
          </button>
          <button onClick={() => go("/staff-summon")}>
            <Bell size={20} />
            <span>Staff signal</span>
            <strong>Tap to call</strong>
          </button>
        </section>
      </section>

      <AnimatePresence>
        {noticeOpen && (
          <motion.div className="chvp-modal-backdrop" onClick={() => setNoticeOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="chvp-modal" onClick={(event) => event.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
              <span className="chvp-overline">System Notices</span>
              <h2>CraftHub is live.</h2>
              <p>All portal taps are wired to real app routes. No static Stitch-only controls remain on this screen.</p>
              <button onClick={() => setNoticeOpen(false)}>Close</button>
            </motion.section>
          </motion.div>
        )}

        {staffOpen && (
          <motion.div className="chvp-modal-backdrop" onClick={() => setStaffOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="chvp-modal" onClick={(event) => event.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
              <span className="chvp-overline">Staff Summon</span>
              <h2>Lounge team notified.</h2>
              <p>POS 3 receives the service request with current CraftHub context and guest station state.</p>
              <button onClick={() => go("/staff-summon")}>Open staff signal</button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
