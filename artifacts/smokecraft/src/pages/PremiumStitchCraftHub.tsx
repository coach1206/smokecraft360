import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import "./PremiumStitchCraftHub.css";

type Ritual = "portal" | "smoke" | "wine";
type Context = "cellar" | "humidor" | "lounge" | "concierge" | "history";

const stitch = (name: string) => `/stitch-assets/${name}`;

const navItems: { id: Context; icon: string; label: string }[] = [
  { id: "cellar", icon: "wine_bar", label: "Cellar" },
  { id: "humidor", icon: "smoking_rooms", label: "Humidor" },
  { id: "lounge", icon: "chair", label: "Lounge" },
  { id: "concierge", icon: "concierge", label: "Concierge" },
  { id: "history", icon: "history", label: "History" },
];

const craftTiles = [
  {
    id: "smoke" as const,
    className: "wide",
    title: "SmokeCraft 360",
    eyebrow: "Master Level: Chris Clark",
    body: "The alchemy of tobacco. Learn the ritual of the cut, the light, and the slow draw.",
    image: stitch("03-smokecraft.png"),
  },
  {
    id: "wine" as const,
    className: "tall",
    title: "WineCraft",
    body: "Unveil the cellar's deepest secrets with JC Collins.",
    image: stitch("04-wine.png"),
  },
  {
    id: "pour" as const,
    className: "half",
    title: "PourCraft",
    body: "Master the spirit. From the Highland peat to the Kentucky oak.",
    image: stitch("stitch-05-pourcraft.png"),
  },
  {
    id: "beer" as const,
    className: "half",
    title: "BeerCraft",
    body: "The grain's true expression. Explore the elite taproom selection.",
    image: stitch("stitch-06-beercraft.png"),
  },
];

function triggerHaptic(pattern: number | number[] = 18) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are optional on many tablet browsers.
  }
}

export default function PremiumStitchCraftHub() {
  const [, navigate] = useLocation();
  const [booting, setBooting] = useState(true);
  const [context, setContext] = useState<Context>("cellar");
  const [ritual, setRitual] = useState<Ritual>("portal");
  const [rewardOpen, setRewardOpen] = useState(false);
  const [summonOpen, setSummonOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 3400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x = 0;
      y = 0;
      size = 0;
      speedY = 0;
      opacity = 0;
      angle = 0;
      rotationSpeed = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 100;
        this.size = Math.random() * 150 + 50;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * 0.15 + 0.05;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = Math.random() * 0.01 - 0.005;
      }

      update() {
        this.y -= this.speedY;
        this.angle += this.rotationSpeed;
        if (this.y < -this.size) this.reset();
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, `rgba(180, 180, 180, ${this.opacity})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 30 }, () => new Particle());
    let raf = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      raf = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const enterRitual = (type: "smoke" | "wine" | "pour" | "beer") => {
    triggerHaptic([80, 30, 80]);
    if (type === "smoke" || type === "wine") {
      setRitual(type);
      setRewardOpen(false);
      if (type === "smoke") {
        window.setTimeout(() => setRewardOpen(true), 2400);
      }
      return;
    }
    navigate(type === "pour" ? "/pourcraft" : "/beercraft");
  };

  const switchContext = (next: Context) => {
    triggerHaptic();
    setContext(next);
    setRitual("portal");
    setRewardOpen(false);
  };

  const summonStaff = () => {
    triggerHaptic([100, 50, 100]);
    setSummonOpen(true);
  };

  return (
    <main className="psch-shell">
      <canvas ref={canvasRef} className="psch-smoke-canvas" aria-hidden="true" />

      <section className={`psch-startup ${booting ? "" : "is-hidden"}`} aria-hidden={!booting}>
        <div className="psch-startup-mark">
          <img src={stitch("stitch-01-profound.png")} alt="Profound Innovations" />
        </div>
        <div className="psch-startup-line" />
        <img className="psch-startup-novee" src={stitch("stitch-02-novee.png")} alt="NOVEE OS" />
        <div className="psch-startup-copy">INITIALIZING NEURAL COMMAND...</div>
      </section>

      <aside className="psch-sidebar" aria-label="CraftHub premium navigation">
        <div className="psch-curator">
          <div className="psch-curator-title">The Curator</div>
          <div className="psch-curator-row">
            <img src={stitch("08-guide-one.png")} alt="Chris Clark" />
            <div>
              <strong>Chris Clark</strong>
              <span>Master Sommelier</span>
            </div>
          </div>
        </div>

        <nav className="psch-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={context === item.id ? "is-active" : ""}
              onClick={() => switchContext(item.id)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="psch-sidebar-footer">
          <button type="button" className="psch-summon" onClick={summonStaff}>
            Summon Staff
          </button>
          <button type="button" className="psch-settings" onClick={() => navigate("/settings")}>
            <span className="material-symbols-outlined">tune</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <header className="psch-topbar">
        <div className="psch-brand">SMOKECRAFT 360</div>
        <div className="psch-top-actions">
          <label className="psch-search">
            <span className="material-symbols-outlined">search</span>
            <input placeholder="Explore Vault..." aria-label="Explore Vault" />
          </label>
          <button type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button type="button" aria-label="Settings" onClick={() => navigate("/settings")}>
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <section className="psch-content">
        {ritual === "portal" ? (
          <PortalView onEnter={enterRitual} />
        ) : (
          <RitualView
            ritual={ritual}
            rewardOpen={rewardOpen}
            onBack={() => {
              setRitual("portal");
              setRewardOpen(false);
            }}
          />
        )}
      </section>

      <footer className="psch-footer">
        <span>© 2024 SMOKECRAFT 360 | NOVEE OS</span>
        <nav aria-label="Legal links">
          <a href="/legal">Privacy</a>
          <a href="/legal">Terms</a>
          <button type="button" onClick={summonStaff}>Concierge Support</button>
        </nav>
      </footer>

      {summonOpen && (
        <section className="psch-summon-overlay" role="dialog" aria-modal="true" aria-label="Neural command">
          <div className="psch-command-line" />
          <h2>NEURAL COMMAND</h2>
          <p>Staff Notified | Response Time: &lt; 45s</p>
          <div className="psch-command-grid">
            <div>
              <span className="material-symbols-outlined">restaurant_menu</span>
              <strong>E.A.T. Command</strong>
            </div>
            <div>
              <span className="material-symbols-outlined">point_of_sale</span>
              <strong>POS 3 Cockpit</strong>
            </div>
          </div>
          <button type="button" onClick={() => setSummonOpen(false)}>Cancel Command</button>
        </section>
      )}
    </main>
  );
}

function PortalView({ onEnter }: { onEnter: (type: "smoke" | "wine" | "pour" | "beer") => void }) {
  return (
    <section className="psch-portal">
      <div className="psch-hero-copy">
        <h1>CraftHub Portal</h1>
        <p>Welcome to the inner sanctum. Orchestrate your journey through fire, oak, and grain.</p>
      </div>

      <div className="psch-bento" aria-label="CraftHub premium ritual tiles">
        {craftTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`psch-tile ${tile.className}`}
            onClick={() => onEnter(tile.id)}
          >
            <img src={tile.image} alt="" draggable={false} />
            <span className="psch-tile-shade" />
            <span className="psch-tile-copy">
              {tile.eyebrow && <small>{tile.eyebrow}</small>}
              <strong>{tile.title}</strong>
              <em>{tile.body}</em>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RitualView({
  ritual,
  rewardOpen,
  onBack,
}: {
  ritual: "smoke" | "wine";
  rewardOpen: boolean;
  onBack: () => void;
}) {
  const title = ritual === "wine" ? "Wine Ritual: JC Collins Selection" : "Smoke Ritual: Chris Clark Collection";
  return (
    <section className="psch-ritual">
      <div className="psch-ritual-head">
        <button type="button" onClick={onBack} aria-label="Back to CraftHub portal">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2>{title}</h2>
      </div>

      <div className="psch-ritual-grid">
        <section className="psch-challenge">
          <div className="psch-challenge-head">
            <div>
              <small>Current Challenge</small>
              <h3>The Perfect Draw</h3>
            </div>
            <span className="material-symbols-outlined">timer</span>
          </div>
          <p>
            Analyze the moisture levels of your selection. A proper draw begins with the environment.
            Ensure the humidor is calibrated at exactly 70/70.
          </p>
          <div className="psch-challenge-actions">
            <button type="button">Begin Analysis</button>
            <button type="button">Details</button>
          </div>
        </section>

        <aside className="psch-scorecard">
          <h3>Your Master Score</h3>
          <div className="psch-score-ring">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="16" />
              <circle className="value" cx="18" cy="18" r="16" />
            </svg>
            <strong>780</strong>
            <span>Elite Rank</span>
          </div>
          <Metric label="Flavor Profile" value="Advanced" width="85%" />
          <Metric label="Ritual Precision" value="Master" width="92%" />
        </aside>
      </div>

      <blockquote className="psch-note">
        <strong>Curator's Note</strong>
        <p>
          "A great cigar is like a fine melody; it has an introduction, a complex bridge,
          and a lingering finale. Never rush the light. Patience is the first ingredient."
        </p>
      </blockquote>

      {rewardOpen && (
        <section className="psch-reward">
          <div className="psch-reward-icon">
            <span className="material-symbols-outlined">card_giftcard</span>
          </div>
          <h2>The Golden Box Unlocked</h2>
          <p>Your mastery has been recognized. A rare reserve has been allocated to your profile. Summon staff to redeem.</p>
          <button type="button">Redeem Now</button>
        </section>
      )}
    </section>
  );
}

function Metric({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div className="psch-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="psch-meter">
        <span style={{ width }} />
      </div>
    </div>
  );
}
