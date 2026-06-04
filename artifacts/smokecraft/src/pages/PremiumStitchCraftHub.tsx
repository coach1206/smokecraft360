import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import "./PremiumStitchCraftHub.css";

type Ritual = "portal" | "smoke" | "wine";
type CraftDestination = "smoke" | "pour" | "guest" | "passport" | "pos" | "eat";

const stitch = (name: string) => `/stitch-assets/${name}`;
const image = (name: string) => `/images/${name}`;

const craftTiles = [
  {
    id: "smoke" as const,
    className: "featured",
    title: "SmokeCraft",
    eyebrow: "Signature ritual",
    body: "A cinematic humidor journey through cut, light, draw, and rare reserve pairings.",
    image: stitch("03-smokecraft.png"),
  },
  {
    id: "pour" as const,
    className: "portrait",
    title: "PourCraft",
    eyebrow: "Spirit pairing",
    body: "Whiskey, cocktail, and cellar intelligence staged for premium tableside discovery.",
    image: stitch("stitch-05-pourcraft.png"),
  },
  {
    id: "guest" as const,
    className: "standard",
    title: "Guest Journey",
    eyebrow: "Experience path",
    body: "Personalized hospitality moments from arrival to tasting, reward, and return visit.",
    image: image("scenes/craft-hub.jpg"),
  },
  {
    id: "passport" as const,
    className: "standard",
    title: "Passport Networking",
    eyebrow: "Member graph",
    body: "Connect guests, tastemakers, ambassadors, and venue experiences across CraftHub.",
    image: stitch("07-community.png"),
  },
  {
    id: "pos" as const,
    className: "standard",
    title: "POS 3",
    eyebrow: "Tableside commerce",
    body: "Premium purchase flow, staff handoff, and order intelligence in one touch layer.",
    image: stitch("10-lab.jpeg"),
  },
  {
    id: "eat" as const,
    className: "standard",
    title: "E.A.T. Intelligence",
    eyebrow: "Food pairing AI",
    body: "Menu, pairing, service, and kitchen signals tuned to the guest's current ritual.",
    image: stitch("12-eat.jpg"),
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

  const openDestination = (type: CraftDestination) => {
    triggerHaptic([80, 30, 80]);
    if (type === "smoke") {
      setRitual("smoke");
      setRewardOpen(false);
      window.setTimeout(() => setRewardOpen(true), 2400);
      return;
    }
    if (type === "pour") navigate("/pourcraft");
    if (type === "guest") navigate("/experience-center");
    if (type === "passport") navigate("/presence");
    if (type === "pos") navigate("/pos");
    if (type === "eat") navigate("/titan-eat");
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

      <header className="psch-topbar">
        <div className="psch-brand">SMOKECRAFT 360</div>
        <button type="button" className="psch-top-assist" onClick={summonStaff}>Staff Assist</button>
      </header>

      <section className="psch-content">
        {ritual === "portal" ? (
          <PortalView
            onEnter={openDestination}
            onStart={() => openDestination("smoke")}
            onContinue={() => setRitual("wine")}
            onOpenHub={() => {
              triggerHaptic();
              setRitual("portal");
              setRewardOpen(false);
            }}
            onStaffAssist={summonStaff}
          />
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

function PortalView({
  onEnter,
  onStart,
  onContinue,
  onOpenHub,
  onStaffAssist,
}: {
  onEnter: (type: CraftDestination) => void;
  onStart: () => void;
  onContinue: () => void;
  onOpenHub: () => void;
  onStaffAssist: () => void;
}) {
  return (
    <section className="psch-portal">
      <div className="psch-hero-copy">
        <span>CraftHub 360</span>
        <h1>Enter the inner sanctum.</h1>
        <p>Fire, oak, spirit, cuisine, and service intelligence staged as a private hospitality theater.</p>
      </div>

      <div className="psch-primary-actions" aria-label="Primary kiosk actions">
        <button type="button" className="is-primary" onClick={onStart}>
          <strong>Start Experience</strong>
          <span>Begin the signature ritual</span>
        </button>
        <button type="button" onClick={onOpenHub}>
          <strong>Open CraftHub</strong>
          <span>Reveal every premium portal</span>
        </button>
        <button type="button" onClick={onContinue}>
          <strong>Continue Session</strong>
          <span>Resume the tasting journey</span>
        </button>
        <button type="button" onClick={onStaffAssist}>
          <strong>Staff Assist</strong>
          <span>Call concierge support</span>
        </button>
      </div>

      <div className="psch-bento" aria-label="CraftHub premium destination cards">
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
