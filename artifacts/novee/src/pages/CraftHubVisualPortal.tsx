import type { PointerEvent } from "react";
import { useMemo, useState, useRef, useEffect } from "react";
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

type TouchPulse = {
  id: number;
  x: number;
  y: number;
};

const craftCards: PortalItem[] = [
  {
    id: "smokecraft",
    label: "SmokeCraft 360",
    eyebrow: "Cigar Ritual",
    route: "/smokecraft",
    image: "/images/scenes/smokecraft-card.jpg",
    status: "Live",
    accent: "#d8a82d",
    description: "Build the profile. Match the pour. Guide the moment.",
  },
  {
    id: "winecraft",
    label: "WineCraft 360",
    eyebrow: "Cellar Experience",
    route: "/winecraft",
    image: "/images/craft/wine-1.png",
    status: "Ready",
    accent: "#b64b63",
    description: "Taste, pair, and recommend with confidence.",
  },
  {
    id: "pourcraft",
    label: "PourCraft 360",
    eyebrow: "Spirits Room",
    route: "/pourcraft",
    image: "/images/scenes/pourcraft-card.jpg",
    status: "Ready",
    accent: "#d99432",
    description: "Guide cocktails, bourbon, whiskey, and premium pours.",
  },
  {
    id: "beercraft",
    label: "BeerCraft 360",
    eyebrow: "Taproom Experience",
    route: "/beercraft",
    image: "/images/scenes/brewcraft-card.jpg",
    status: "Ready",
    accent: "#d8a82d",
    description: "Match flavor, mood, and menu with the right beer.",
  },
];

const sideItems = [
  { label: "Craft Hub", route: "/craft-hub", icon: Home },
  { label: "Cellar", route: "/cellar", icon: Wine },
  { label: "Humidor", route: "/humidor", icon: ShieldCheck },
  { label: "Lounge", route: "/lounge", icon: GlassWater },
  { label: "Concierge", route: "/concierge", icon: UserRound },
  { label: "History", route: "/history", icon: Clock },
  { label: "Settings", route: "/settings", icon: Settings },
];

let lastHapticAt = 0;

function tapFeedback(pattern: number | number[] = 18) {
  const now = Date.now();
  if (now - lastHapticAt < 90) return;
  lastHapticAt = now;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are best-effort; iPadOS/Safari may ignore vibration.
  }
}

export default function CraftHubVisualPortal() {
  const [location, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [touchPulse, setTouchPulse] = useState<TouchPulse | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    class Particle {
      x = 0; y = 0; size = 0; speedY = 0; opacity = 0; maxOpacity = 0; vx = 0;
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = canvas!.height + Math.random() * 100;
        this.size = Math.random() * 80 + 40;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.opacity = 0;
        this.maxOpacity = Math.random() * 0.18 + 0.04;
        this.vx = Math.random() * 0.4 - 0.2;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.vx;
        if (this.opacity < this.maxOpacity) this.opacity += 0.005;
        if (this.y < -100) this.reset();
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `rgba(216, 168, 45, ${this.opacity * 0.6})`);
        grad.addColorStop(0.5, `rgba(200, 200, 200, ${this.opacity * 0.3})`);
        grad.addColorStop(1, "rgba(200, 200, 200, 0)");
        ctx.fillStyle = grad;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles: Particle[] = Array.from({ length: 40 }, () => new Particle());
    let raf: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

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

  const handleTouchPress = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("button, a, input, [role='button']")) return;
    tapFeedback();
    setTouchPulse({ id: Date.now(), x: event.clientX, y: event.clientY });
  };

  return (
    <main className="chvp-shell" onPointerDownCapture={handleTouchPress}>
      {/* Backup reference only: public/stitch-export.html should remain untouched when present. */}
      <canvas ref={canvasRef} id="chvp-smoke-canvas" aria-hidden="true" />
      <div className="chvp-gold-glow" aria-hidden="true" />
      <div className="chvp-scene" />
      <div className="chvp-smoke chvp-smoke-a" />
      <div className="chvp-smoke chvp-smoke-b" />
      <div className="chvp-embers" />
      <AnimatePresence>
        {touchPulse && (
          <motion.span
            key={touchPulse.id}
            className="chvp-touch-ripple"
            style={{ left: touchPulse.x, top: touchPulse.y }}
            initial={{ opacity: 0.42, scale: 0.18 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside className="chvp-sidebar" aria-label="Craft Hub navigation">
        <button className="chvp-brand" onClick={() => go("/craft-hub")} aria-label="Craft Hub home">
          <span className="chvp-brand-mark">SC</span>
          <span>
            <strong>SmokeCraft 360</strong>
            <small>NOVEE kiosk</small>
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
              placeholder="Search craft, cellar, or guest notes..."
              aria-label="Search Craft Hub"
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
            <span className="chvp-overline">Craft Hub</span>
            <h1>Welcome to Craft Hub</h1>
            <p>Craft the experience. Guide the moment. Elevate the room.</p>
          </div>
          <div className="chvp-hero-status" aria-label="System status">
            <span>Venue Status</span>
            <strong>Online</strong>
            <small>Humidity 72% · Lounge Active · POS Connected</small>
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
            <span>Concierge</span>
            <strong>{conciergeOpen ? "Listening" : "Standby"}</strong>
          </button>
          <button onClick={() => go("/history")}>
            <BookOpen size={20} />
            <span>History</span>
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
              <span className="chvp-overline">Notices</span>
              <h2>Craft Hub is ready.</h2>
              <p>Every card and tool opens a real screen. Choose an experience or return to the room.</p>
              <button onClick={() => setNoticeOpen(false)}>Close</button>
            </motion.section>
          </motion.div>
        )}

        {staffOpen && (
          <motion.div className="chvp-modal-backdrop" onClick={() => setStaffOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="chvp-modal" onClick={(event) => event.stopPropagation()} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
              <span className="chvp-overline">Staff Summon</span>
              <h2>Lounge team notified.</h2>
              <p>POS 3 receives the request with the current screen and station.</p>
              <button onClick={() => go("/staff-summon")}>Open staff signal</button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
