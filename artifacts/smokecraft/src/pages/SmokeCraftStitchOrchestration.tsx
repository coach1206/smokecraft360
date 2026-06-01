import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Beer,
  Box,
  Check,
  Flame,
  GlassWater,
  Home,
  Leaf,
  RotateCcw,
  UserRound,
  Wine,
} from "lucide-react";
import "./SmokeCraftStitchOrchestration.css";

type Stage = "boot" | "novee" | "hub" | "onboarding" | "guide" | "reserve" | "pairing" | "golden";

interface SmokeCraftStitchOrchestrationProps {
  initialStage?: Stage;
}

const STITCH_IMAGES = {
  profound:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC0KkWhv5sVI33T9hAr0mYHmDkf7lUyXgodz4Cc9DI23kdiM6jvX4JpHjYHdoPm_idEtcqpnS1gaGnmBcoRqbdS_wRBruDvWL2Zpq4iJaCTTq8v4Yh5zxjICGrLhjXen7BzJhTOLDZ9nUEatXzR3kwPtIRIMJFEYcMXHEZkfcy7WN3-53UdpWvXtF-kysPt8s2Z9RVDOgSAPkATt5W_QwGwNuAhtOF1ZuekEJTO5f9pia3psrggXRPrfLt8-skY2VG_UAQMzi-wLjo",
  novee:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCHpxBFJj-P04TV9_MbOuusZ497ngWOmvuVYwQQO-55WJQpypaSl2y13lgpPUPb0Ed3VCiyT_RXNaqe3YdeqzvnqQiS8NwwH3ss0yQXy6aYwVxHrEKCr5rBf7EzEWz17On-bNXZOLNzpL4HEYv2thxBsPBWRdjhlnTHfvFiunZvD_K1dBoocwBLReGVheNp4bloJ7OO50QHDnZb9hpIy-D5aSAVJ9pikAT3LuzLzAnnYuJyO7-zM8SQORQi-vKfvYCOgcgsmP47I6A",
  smoke:
    "https://lh3.googleusercontent.com/aida/ADBb0uhtU8rz_LUuM2Rs6VF6IbOHs2GcKncyUqQ8Thqk46-kFmxWCnYM38gCe4HTEiQwd5OoLqx3XfFipqA6HLoOiYZ6hLTp8wQ6BXqxptudmmSy-tk-yrSSxOA1GBXJGwVm-I9a3cWNEAAZtLI9iflIxR7hLiT-P_p3psEHLu-7MOfUCtHN7odA_qLbPWBsS2KqOI8ICaLQE5I0sU3z14GXzi9OKzPYOGtKfzS_jMseIgXP3XegckKVxV7zaew",
  wine:
    "https://lh3.googleusercontent.com/aida/ADBb0ugjIJZfwJ3IGEYKUJhER-QdccGeY-WcbTfiArJb-s9N3ERQdMNmb_K6bulXWMdtmsaQlf7QWvrCPdfCtK0I_7qxHcoEqmj_2jzkRsRttL3KMZCp0MLWoENgAQsDFT7xPEThYAoPHhFraE69m5CTsD7LHWKxMq3GoYYJnpZRiw1uNl1GECOLzvAy6dk9_5MZ6a0E1ZIhsLmNMLh8RlMDpb4s8zYGvuprrEmF_rX3lzyDVpApwvqnz7Vc78E",
  pour:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCskNm-Gipq4Xh2PEmPK9RMRTgGDUBuyMZiRYoAtME-Zh5z6j_ab5GU3AHR-ZrDs2sqFDRLu23c8NuimOJ1qSvRoL3IOkxJb90dCZQkV7rv0WZupovlupp3Q5Tfwvsebm7bP5ynjwSaAKpMMlFJtlpf5Dc-IxE6nztt22D5VZ-nIfF85DE7uazu54z3XZKTev7einMVBybyeFS5E1s-qHFA_fEufSTGP8ZBPj7y9PSzgDxJBhwIsDXc2jZC8BGPNADgf8HsLjbz3m4",
  beer:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDUADSYfZyDmWta433lljSL8PiO2ygnU_RD5LHM6qVdl_wyQBS-74Qg8otmBdDmp_FG_S8m9mKO_O-cNUWo4HzyxJYxCUYEq42Wb2Z8NQVALqdquemqVvGRF3P5vIEb8mt2BKxPOMHkTcUyWpVysZPBmmJrsQuOtBQrtoiYjBJEtADqDP8ky4NfdEw70-R-2WkFWClBxJKuC7YOb5AWkXvr4t5rRvgbv7oN3_hgEcDtPthlyF5f19ncQ5GFemANiRTQxtPHqDkJf7s",
};

const img = (path: string) => path.startsWith("http") ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const craftCards = [
  {
    id: "smoke",
    name: "SmokeCraft 360",
    label: "Cigar Ritual",
    status: "Active",
    description: "Build the profile. Match the pour. Guide the moment.",
    icon: Flame,
    images: [STITCH_IMAGES.smoke, "images/scenes/smokecraft-card.jpg", "images/smoke-home-1.jpg"],
  },
  {
    id: "pour",
    name: "PourCraft 360",
    label: "Spirits Room",
    status: "Coming Soon",
    description: "Guide cocktails, bourbon, whiskey, and premium pours.",
    icon: GlassWater,
    images: [STITCH_IMAGES.pour, "images/scenes/pourcraft-card.jpg", "images/pour/pour_whiskey.png"],
  },
  {
    id: "beer",
    name: "BeerCraft 360",
    label: "Taproom Experience",
    status: "Coming Soon",
    description: "Match flavor, mood, and menu with the right beer.",
    icon: Beer,
    images: [STITCH_IMAGES.beer, "images/scenes/brewcraft-card.jpg", "images/beer-verified-1.jpg"],
  },
  {
    id: "wine",
    name: "WineCraft 360",
    label: "Cellar Experience",
    status: "Coming Soon",
    description: "Taste, pair, and recommend with confidence.",
    icon: Wine,
    images: [STITCH_IMAGES.wine, "images/craft/wine-1.png", "images/wine-1.jpg"],
  },
];

const guides = [
  {
    id: "nicaraguan",
    name: "Doña Rosa",
    title: "Wrapper Artistry Mentor",
    region: "Nicaragua · Esteli",
    photo: "images/mentor_nicaraguan.jpg",
    notes: "Volcanic spice, deep wrapper oil, confident structure.",
  },
  {
    id: "dominican",
    name: "Señor Alejandro",
    title: "Aged Leaf Guide",
    region: "Dominican Republic · Cibao",
    photo: "images/mentor_dominican.jpg",
    notes: "Cedar, earth, warm transitions, patient balance.",
  },
  {
    id: "honduran",
    name: "Maestro Cortés",
    title: "Draw Precision Guide",
    region: "Honduras · Jamastran",
    photo: "images/mentor_honduran.jpg",
    notes: "Creamy texture, smooth draw, refined construction.",
  },
];

const mastery = [
  "Your Guide selected",
  "Wrapper profile locked",
  "Vitola and strength shaped",
  "Pairing ready",
];

function touchPulse() {
  try {
    navigator.vibrate?.(18);
  } catch {
    // Kiosk browsers may block vibration.
  }
}

function useBoot(initialStage: Stage) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [bootPhase, setBootPhase] = useState(0);

  useEffect(() => {
    if (initialStage !== "boot") return;
    setStage("boot");
    setBootPhase(0);
    const timers = [
      window.setTimeout(() => setBootPhase(1), 1500),
      window.setTimeout(() => setStage("novee"), 4500),
      window.setTimeout(() => {
        try {
          localStorage.setItem("novee_authorized", "true");
          localStorage.setItem("novee_last_handshake", String(Date.now()));
        } catch {
          // Storage can be disabled in kiosk shells.
        }
        setStage("hub");
      }, 7500),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [initialStage]);

  return { stage, setStage, bootPhase };
}

export default function SmokeCraftStitchOrchestration({ initialStage = "boot" }: SmokeCraftStitchOrchestrationProps) {
  const { stage, setStage, bootPhase } = useBoot(initialStage);
  const [guide, setGuide] = useState(guides[0]);
  const [wrapper, setWrapper] = useState("Maduro");
  const [vitola, setVitola] = useState("Toro");
  const [strength, setStrength] = useState("Medium Full");
  const [pairing, setPairing] = useState("Single Malt Whiskey");

  const enter = (next: Stage) => {
    touchPulse();
    setStage(next);
  };

  const context = useMemo(
    () => ({ guide, wrapper, vitola, strength, pairing }),
    [guide, wrapper, vitola, strength, pairing],
  );

  return (
    <main className="scso-shell">
      <Atmosphere />
      {stage !== "boot" && stage !== "novee" && (
        <LeftRail
          active={stage}
          onHub={() => enter("hub")}
          onSmoke={() => enter("onboarding")}
          onPairing={() => enter("pairing")}
          onGolden={() => enter("golden")}
        />
      )}

      {stage === "boot" && <BootScreen phase={bootPhase} />}
      {stage === "novee" && <NoveeAuthScreen />}
      {stage === "hub" && <CraftHub onLaunch={() => enter("onboarding")} />}
      {stage === "onboarding" && <Onboarding onBack={() => enter("hub")} onEnter={() => enter("guide")} />}
      {stage === "guide" && (
        <GuidePortfolio
          selected={guide.id}
          onSelect={(id) => {
            touchPulse();
            setGuide(guides.find((g) => g.id === id) ?? guides[0]);
          }}
          onBack={() => enter("onboarding")}
          onContinue={() => enter("reserve")}
        />
      )}
      {stage === "reserve" && (
        <ReserveWorkspace
          context={context}
          setWrapper={setWrapper}
          setVitola={setVitola}
          setStrength={setStrength}
          onReset={() => {
            touchPulse();
            setWrapper("Maduro");
            setVitola("Toro");
            setStrength("Medium Full");
          }}
          onBack={() => enter("guide")}
          onPairing={() => enter("pairing")}
        />
      )}
      {stage === "pairing" && (
        <PairingIntelligence
          context={context}
          setPairing={setPairing}
          onBack={() => enter("reserve")}
          onGolden={() => enter("golden")}
        />
      )}
      {stage === "golden" && <GoldenBoxFinale context={context} onHome={() => enter("hub")} onRestart={() => enter("onboarding")} />}
    </main>
  );
}

function Atmosphere() {
  return (
    <>
      <div className="scso-ambient" />
      <div className="scso-smoke scso-smoke-a" />
      <div className="scso-smoke scso-smoke-b" />
      <div className="scso-embers" />
    </>
  );
}

function BootScreen({ phase }: { phase: number }) {
  return (
    <section className="scso-stage scso-boot">
      <div className="scso-emblem scso-stitch-logo" aria-hidden="true">
        <img src={STITCH_IMAGES.profound} alt="" draggable={false} />
      </div>
      <p className="scso-kicker">System Cold Init</p>
      <h1 className={phase > 0 ? "scso-foil scso-emerge" : "scso-foil"}>PROFOUND INNOVATIONS LLC</h1>
      <div className="scso-boot-line" />
    </section>
  );
}

function NoveeAuthScreen() {
  return (
    <section className="scso-stage scso-auth">
      <div className="scso-status-node">System Active</div>
      <div className="scso-ring" />
      <p className="scso-kicker">Powered</p>
      <img className="scso-novee-logo" src={STITCH_IMAGES.novee} alt="NOVEE OS" draggable={false} />
      <p className="scso-sub">Experience runtime authorized</p>
    </section>
  );
}

function LeftRail({
  active,
  onHub,
  onSmoke,
  onPairing,
  onGolden,
}: {
  active: Stage;
  onHub: () => void;
  onSmoke: () => void;
  onPairing: () => void;
  onGolden: () => void;
}) {
  const items = [
    { id: "hub", label: "Hub", onClick: onHub, icon: Home },
    { id: "smoke", label: "SC", onClick: onSmoke, icon: Flame },
    { id: "pairing", label: "PR", onClick: onPairing, icon: GlassWater },
    { id: "golden", label: "GB", onClick: onGolden, icon: Box },
  ];
  return (
    <nav className="scso-rail" aria-label="SmokeCraft navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const selected =
          (item.id === "hub" && active === "hub") ||
          (item.id === "smoke" && ["onboarding", "guide", "reserve"].includes(active)) ||
          (item.id === "pairing" && active === "pairing") ||
          (item.id === "golden" && active === "golden");
        return (
          <button key={item.id} type="button" className={selected ? "active" : ""} onPointerDown={item.onClick} aria-label={item.label}>
            <Icon size={25} strokeWidth={1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function CraftHub({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="scso-content scso-hub">
      <header className="scso-header">
        <div>
          <p className="scso-kicker">NOVEE OS · Craft Hub</p>
          <h1>CRAFT HUB</h1>
          <p>Choose your experience.</p>
        </div>
        <div className="scso-venue">
          <span>Venue Status</span>
          <strong>Online</strong>
          <small>Humidity 72% · Lounge Active · POS Connected</small>
        </div>
      </header>

      <div className="scso-card-grid">
        {craftCards.map((card, idx) => {
          const Icon = card.icon;
          const active = card.id === "smoke";
          return (
            <button
              key={card.id}
              type="button"
              className={`scso-craft-card ${active ? "is-active" : ""}`}
              onPointerDown={active ? onLaunch : touchPulse}
              style={{ ["--delay" as string]: `${idx * 2}s` }}
            >
              {card.images.map((src, imageIndex) => (
                <img
                  key={src}
                  src={img(src)}
                  alt=""
                  className={`scso-card-image image-${imageIndex + 1}`}
                  draggable={false}
                />
              ))}
              <div className="scso-card-shade" />
              <div className="scso-card-status">{card.status}</div>
              <div className="scso-card-copy">
                <Icon size={34} strokeWidth={1.4} />
                <span>{card.label}</span>
                <h2>{card.name}</h2>
                <p>{card.description}</p>
                {active && <strong>Enter SmokeCraft 360</strong>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Onboarding({ onBack, onEnter }: { onBack: () => void; onEnter: () => void }) {
  return (
    <section
      className="scso-content scso-onboarding"
      style={{ ["--stitch-onboarding-image" as string]: `url("${STITCH_IMAGES.smoke}")` }}
    >
      <BackButton onClick={onBack} />
      <div className="scso-editorial">
        <p className="scso-kicker">Session 1 Initialization</p>
        <h1>Your Ritual Begins</h1>
        <p>Enter the lounge, choose your guide, and shape the first profile.</p>
      </div>
      <button type="button" className="scso-primary scso-bottom-cta" onPointerDown={onEnter}>
        Enter the Lounge
      </button>
    </section>
  );
}

function GuidePortfolio({
  selected,
  onSelect,
  onBack,
  onContinue,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="scso-content scso-guide">
      <BackButton onClick={onBack} />
      <header className="scso-header scso-header-compact">
        <div>
          <p className="scso-kicker">Selection Chamber</p>
          <h1>Your Guide</h1>
          <p>Choose the voice that will shape the ritual.</p>
        </div>
      </header>
      <div className="scso-guide-grid">
        {guides.map((g) => (
          <button key={g.id} type="button" className={selected === g.id ? "selected" : ""} onPointerDown={() => onSelect(g.id)}>
            <img src={img(g.photo)} alt={g.name} draggable={false} />
            <div>
              <span>{g.region}</span>
              <h2>{g.name}</h2>
              <strong>{g.title}</strong>
              <p>{g.notes}</p>
            </div>
          </button>
        ))}
      </div>
      <MasteryWidget selected={guides.find((g) => g.id === selected) ?? guides[0]} />
      <button type="button" className="scso-primary scso-continue" onPointerDown={onContinue}>
        Continue
      </button>
    </section>
  );
}

function MasteryWidget({ selected }: { selected: (typeof guides)[number] }) {
  return (
    <aside className="scso-widget">
      <p className="scso-kicker">Your Mastery Path</p>
      <h2>{selected.name}</h2>
      {mastery.map((item, i) => (
        <div key={item} className={i === 0 ? "done" : ""}>
          <Check size={18} />
          <span>{item}</span>
        </div>
      ))}
    </aside>
  );
}

function ReserveWorkspace({
  context,
  setWrapper,
  setVitola,
  setStrength,
  onReset,
  onBack,
  onPairing,
}: {
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; pairing: string };
  setWrapper: (v: string) => void;
  setVitola: (v: string) => void;
  setStrength: (v: string) => void;
  onReset: () => void;
  onBack: () => void;
  onPairing: () => void;
}) {
  return (
    <section className="scso-content scso-reserve">
      <BackButton onClick={onBack} />
      <header className="scso-header scso-header-compact">
        <div>
          <p className="scso-kicker">Your Reserve</p>
          <h1>Build the Profile</h1>
          <p>{context.guide.name} is guiding this session.</p>
        </div>
        <button type="button" className="scso-secondary" onPointerDown={onReset}>
          <RotateCcw size={20} />
          Reset Blend
        </button>
      </header>
      <div className="scso-workspace-grid">
        <div className="scso-prep-mat">
          <img src={img("images/cigar_hero.jpg")} alt="Hand-rolled Maduro cigar" draggable={false} />
        </div>
        <div className="scso-controls">
          <ChoiceGroup label="Wrapper" value={context.wrapper} items={["Maduro", "Natural", "Connecticut"]} onChange={setWrapper} />
          <ChoiceGroup label="Vitola" value={context.vitola} items={["Robusto", "Toro", "Churchill"]} onChange={setVitola} />
          <ChoiceGroup label="Strength" value={context.strength} items={["Mild", "Medium Full", "Full"]} onChange={setStrength} />
          <button type="button" className="scso-primary" onPointerDown={onPairing}>
            Match the Pour
          </button>
        </div>
      </div>
    </section>
  );
}

function ChoiceGroup({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="scso-choice-group">
      <span>{label}</span>
      <div>
        {items.map((item) => (
          <button key={item} type="button" className={value === item ? "active" : ""} onPointerDown={() => {
            touchPulse();
            onChange(item);
          }}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function PairingIntelligence({
  context,
  setPairing,
  onBack,
  onGolden,
}: {
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; pairing: string };
  setPairing: (v: string) => void;
  onBack: () => void;
  onGolden: () => void;
}) {
  const pairings = ["Single Malt Whiskey", "Aged Rum", "Espresso Martini"];
  return (
    <section className="scso-content scso-pairing">
      <BackButton onClick={onBack} />
      <header className="scso-header scso-header-compact">
        <div>
          <p className="scso-kicker">AI Sommelier</p>
          <h1>Pair With My Profile</h1>
          <p>{context.wrapper} · {context.vitola} · {context.strength}</p>
        </div>
      </header>
      <div className="scso-pairing-grid">
        <PanelImage src="images/tobacco_criollo.jpg" title="Macro Tobacco Path" body="Oily wrapper leaf, dark tooth, balanced burn." />
        <div className="scso-sommelier">
          <Leaf size={46} strokeWidth={1.2} />
          <h2>Synergy Calculation</h2>
          <p>Cocoa, cedar, warm spice, and a clean finish suggest a rich pour with soft caramel and oak structure.</p>
          <div className="scso-meter"><span style={{ width: "88%" }} /></div>
          <strong>Affinity 88%</strong>
        </div>
        <div className="scso-reserves">
          {pairings.map((p) => (
            <button key={p} type="button" className={context.pairing === p ? "active" : ""} onPointerDown={() => {
              touchPulse();
              setPairing(p);
            }}>
              <img src={img(p === "Single Malt Whiskey" ? "images/whiskey.png" : p === "Aged Rum" ? "images/pour/pour_aged.png" : "images/pour/pour_cocktail.png")} alt="" />
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="scso-primary scso-continue" onPointerDown={onGolden}>
        Add To Tab
      </button>
    </section>
  );
}

function PanelImage({ src, title, body }: { src: string; title: string; body: string }) {
  return (
    <div className="scso-panel-image">
      <img src={img(src)} alt="" draggable={false} />
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

function GoldenBoxFinale({
  context,
  onHome,
  onRestart,
}: {
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; pairing: string };
  onHome: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="scso-content scso-golden">
      <div className="scso-burst" />
      <div className="scso-golden-box">
        <img src={img("images/golden_box.png")} alt="" draggable={false} />
        <div>
          <p className="scso-kicker">The Golden Box Finale</p>
          <h1>The Golden Box</h1>
          <dl>
            <div><dt>Guide</dt><dd>{context.guide.name}</dd></div>
            <div><dt>Build</dt><dd>{context.wrapper} · {context.vitola} · {context.strength}</dd></div>
            <div><dt>Pairing</dt><dd>{context.pairing}</dd></div>
            <div><dt>Dispatch</dt><dd>E.A.T. queue ready · 144 Puros remaining</dd></div>
          </dl>
          <button type="button" className="scso-primary" onPointerDown={onRestart}>
            Generate My Ritual
          </button>
          <button type="button" className="scso-link-button" onPointerDown={onHome}>
            Return to Craft Hub
          </button>
        </div>
      </div>
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="scso-back" onPointerDown={onClick}>
      <ArrowLeft size={24} />
      Back
    </button>
  );
}
