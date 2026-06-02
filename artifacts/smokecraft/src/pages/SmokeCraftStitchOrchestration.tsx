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
  Lock,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Wine,
} from "lucide-react";
import "./SmokeCraftStitchOrchestration.css";

type Stage = "boot" | "novee" | "hub" | "onboarding" | "guide" | "reserve" | "pairing" | "golden";

interface SmokeCraftStitchOrchestrationProps {
  initialStage?: Stage;
}

type VisualAssetId =
  | "obsidianSubstrate"
  | "corporateEmblem"
  | "goldFoilText"
  | "craftHubSmoke"
  | "craftHubPour"
  | "craftHubBeer"
  | "craftHubWine"
  | "guideRosa"
  | "flagDominican"
  | "guideAlejandro"
  | "flagNicaragua"
  | "flagHonduras"
  | "broadleafCultivation"
  | "volumetricSmoke"
  | "emberParticles"
  | "maduroCigar"
  | "maduroLeafMacro"
  | "singleMalt"
  | "craftCocktail"
  | "smallPlate"
  | "humidorWalkIn"
  | "loungeFloor"
  | "brassSwitch"
  | "cloverNode"
  | "toastNode"
  | "squareNode";

interface CraftCard {
  id: "smoke" | "pour" | "beer" | "wine";
  name: string;
  label: string;
  status: string;
  description: string;
  icon: typeof Flame;
  images: VisualAssetId[];
  fallback: VisualAssetId;
}

const STITCH_IMAGES = {
  profound:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDhj2-yD55eFY8sXAgqCsiytEcK4WN-8otOuyAHjDyJhWosE11ghCXfeK1oiw1dFFLMR6I9XXwkVymlWmfTF-lvK2htym5lhQPXLUur6WDJm5r2BAHPtS4xn8ZDbyx-wp4CwJqyANhCbkSe-cb-kBD2Rxi3ZvG5oR0_CEuR2leSxRL8h4MWls2966cMqO-9btJcp74seO_jE2UPj5-K0NJrcErT17RXTr_IQEB7pOoJPZ7w1RVTHP0lDD5eyay2IYbrCw4w6x1sWLQ",
  novee:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAlhdqiSKn66_HoaP-kZnvcqK7Wq2d1THWHaXKm0jZnKtbT6C_xz9glrgLvVGZCivCZjhfVasoD5NBQWh6ePKVFkHxBfCIYM-in03Kyn8b_BlXCEWwxAc1FI9rX6sL71KZer-JTtBOeom2C8iZpQtVcFUWulE7r6k5psBvm94OPHeLaPqpQ-A6SJdRoRv2f9blDBx5YndqL-lNu-20HfXbbQAD24j3BjqVOcOQgfaGhbkKG6WCnzyJE3aGsFWis0q_l1MskKPLWXVE",
  smoke:
    "https://lh3.googleusercontent.com/aida/ADBb0uhIEUTRtDSLfVvoeCK1FiwxwstruheRLZVL7s1qe8E7W376n44tmuuiOCKG6Zg76Yfe6XlYfFm7VWZ6KW5jmm9jolNDewIoS_54ppOYtORqdgVKmQ48Tya6vmQB1MjGUSfX_Ux5VqlLQO1dDDkeIlSJPL18Mp8F1OtjriqrI-sEDJFYrAW9U-K-DekHury7InxnKrRg3RrLW4BiObYiDXK9lNf3vYgNoie_XkiAGM_N4V8IVZZX9Sl1OUY",
  wine:
    "https://lh3.googleusercontent.com/aida/ADBb0ugjIJZfwJ3IGEYKUJhER-QdccGeY-WcbTfiArJb-s9N3ERQdMNmb_K6bulXWMdtmsaQlf7QWvrCPdfCtK0I_7qxHcoEqmj_2jzkRsRttL3KMZCp0MLWoENgAQsDFT7xPEThYAoPHhFraE69m5CTsD7LHWKxMq3GoYYJnpZRiw1uNl1GECOLzvAy6dk9_5MZ6a0E1ZIhsLmNMLh8RlMDpb4s8zYGvuprrEmF_rX3lzyDVpApwvqnz7Vc78E",
  pour:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCskNm-Gipq4Xh2PEmPK9RMRTgGDUBuyMZiRYoAtME-Zh5z6j_ab5GU3AHR-ZrDs2sqFDRLu23c8NuimOJ1qSvRoL3IOkxJb90dCZQkV7rv0WZupovlupp3Q5Tfwvsebm7bP5ynjwSaAKpMMlFJtlpf5Dc-IxE6nztt22D5VZ-nIfF85DE7uazu54z3XZKTev7einMVBybyeFS5E1s-qHFA_fEufSTGP8ZBPj7y9PSzgDxJBhwIsDXc2jZC8BGPNADgf8HsLjbz3m4",
  beer:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDUADSYfZyDmWta433lljSL8PiO2ygnU_RD5LHM6qVdl_wyQBS-74Qg8otmBdDmp_FG_S8m9mKO_O-cNUWo4HzyxJYxCUYEq42Wb2Z8NQVALqdquemqVvGRF3P5vIEb8mt2BKxPOMHkTcUyWpVysZPBmmJrsQuOtBQrtoiYjBJEtADqDP8ky4NfdEw70-R-2WkFWClBxJKuC7YOb5AWkXvr4t5rRvgbv7oN3_hgEcDtPthlyF5f19ncQ5GFemANiRTQxtPHqDkJf7s",
  community:
    "https://lh3.googleusercontent.com/aida/ADBb0ugYc4r6XpOoxBC_0wB3pD3GSaOTeJippscVrxjV1OdTamhEalt10kK1w91das6GsXcMFkTFqZpWWWNiYJyxePU8VaUTKsJxLDh4zNM6DAtY4PCmeoL7UrpY0srY0oWTow7emrNVoQpHanRmD5CEvJluqZcG31BvL2-l13KDFw3j1xl-p7UeTX67IsxqFDwRH7GWQkG4cH4OiWKZxp9EtVQSEkpYXz4XxPs0zSS-XzglQZht2PgMSfvg9A",
  guideOne:
    "https://lh3.googleusercontent.com/aida/ADBb0ujvF0LDTfTtfi8FjKatJ-P4KXaG2BmntCvuzETLPaNMDfR2FDU4r88Mi3ZH3fa5FkinbJ2MM_MJihjHHXBIa8Hvzs19KVFE3Mwdzjy2Frtv-ft3q8eiOBDO_dE8VlecGtx3EqkYud-lJxq_bW-LX4w4va-XWmmZV2KVOg7RTsXxZSLdXiXqNroyfbHmFtoxvR_Gs-c4aCwNg_xyIaMaVaUlrDzOFjGZhKO8txtT3JKQkjwphdPfpkUX-Fs",
  guideTwo:
    "https://lh3.googleusercontent.com/aida/ADBb0ujAleMiYHqc5FeHUdrsR8hi-mmOt0uY80dYY60m2vjhAjA1-J5FV9wduNrygz3UAfUxaye3B-f8O3NlNe60kjh_IjPAOBhG-Vf3aUhnxd865SvrMxputnALIbQbQ5Fo2ho1qxqfvy2phMv824xgrvGdAEZ7E0JdLsonKIMtb_96B-jW-SF7II_bNMv5QVI4T87LZbyYR1SF82WAPulp9nqq3e3Ua_RMlDh0f1Nea3zrC_Jl6-GP_4UktKA",
  lab:
    "https://lh3.googleusercontent.com/aida/ADBb0uiX2XE4vk1tpK_YO1N6oLY0bZnftyAtfBu1H31tCovXscbczeW2hri9dlnWfNppkcvd7J8i0rFi2TmWYMEVuT_RTL-D0_6gxS9ehT3ySt9z-enYqGDQgUBA5JZinCC-mw9Vcvh3v5uF-prU7AD9hS58xtUTz7cMh6D23YZhy15eoPOFWmSi0NJUHcs5a4Ss5DqyehpCBPDECGFGRXR1sZGjqEmxhwHXEgcp7DpPJHQKzHMhZ53DgV7D2A",
  golden:
    "https://lh3.googleusercontent.com/aida/ADBb0uiKiZsMg3k_CQRIY9i4XNWFZXXzRd-CyGDxLyAQmMYYiUxGC3eu9br5f8upe9BBWWKjFuexFGvFf3otx7ojtpsunqbr03b5cyGZSuvcmbNHvU4eSPXhxt902bOY1msSfklxPH-k8y8x85VDoX3C0WEPxdD-XAbLjnluWdsqSsEqcE61Of-d0OIDv37JCvCkoBbcYZue6MKz3y5pnAKyqYO3An74lxScC7IlmaSc9TTZWBrqX-Fv8lpGGQ",
  eat:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuABVV3uUTEs6YLU3y8S_ojYGC21GciSiQAGBggHZZZDnzmuWitt3bXfPU2KkrDIckkPZgAOH8C_3Ed03HYK0SNzhHhXH_Z5OkzN_4zBkeU0on4zRR2i-LhremT-Kr1PLPk990Fo7PhOhiyPv5aodbu52OwfcF3V97VS61iD4b29iJVUZnNyOPVOQJpZDHQYaph4ZVnT1Pv6_gWT4-1Fmpik_BsCByjWzUJLnSfnJ6hATo9dvPT_91JMPsHz4O8s5aPQ22cFuVLxY9w",
};

const img = (path: string) => path.startsWith("http") ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const VISUAL_ASSETS: Record<VisualAssetId, { src: string; fallback?: string; label: string }> = {
  obsidianSubstrate: { src: "css:obsidian", label: "Matte True Obsidian Substrate" },
  corporateEmblem: { src: STITCH_IMAGES.profound, fallback: STITCH_IMAGES.profound, label: "Polished Smoked Chrome Vector Emblem" },
  goldFoilText: { src: "css:gold-foil", label: "Liquid Gold Foil Text Overlay" },
  craftHubSmoke: { src: STITCH_IMAGES.smoke, fallback: STITCH_IMAGES.smoke, label: "Human-Centered Elite Lounge Atmosphere" },
  craftHubPour: { src: STITCH_IMAGES.pour, fallback: STITCH_IMAGES.pour, label: "Crystal Bar Spirit Crafting" },
  craftHubBeer: { src: STITCH_IMAGES.beer, fallback: STITCH_IMAGES.beer, label: "Twilight Rooftop Social Deck" },
  craftHubWine: { src: STITCH_IMAGES.wine, fallback: STITCH_IMAGES.wine, label: "Private Stone-Walled Wine Cellar" },
  guideRosa: { src: STITCH_IMAGES.guideOne, fallback: STITCH_IMAGES.guideOne, label: "Doña Rosa Master Portrait" },
  flagDominican: { src: "css:flag-dominican", label: "Dominican Republic Emblematic Flag Graphic" },
  guideAlejandro: { src: STITCH_IMAGES.guideTwo, fallback: STITCH_IMAGES.guideTwo, label: "Alejandro Master Portrait" },
  flagNicaragua: { src: "css:flag-nicaragua", label: "Nicaraguan Emblematic Flag Graphic" },
  flagHonduras: { src: "css:flag-honduras", label: "Honduran Emblematic Flag Graphic" },
  broadleafCultivation: { src: STITCH_IMAGES.community, fallback: STITCH_IMAGES.community, label: "Broadleaf Tobacco Cultivation" },
  volumetricSmoke: { src: "css:volumetric-smoke", label: "Volumetric Smoke Texture Substrate" },
  emberParticles: { src: "css:ember-particles", label: "Micro-Ember Spark Particles" },
  maduroCigar: { src: STITCH_IMAGES.lab, fallback: STITCH_IMAGES.lab, label: "Hand-Rolled Nicaraguan Maduro Cigar" },
  maduroLeafMacro: { src: STITCH_IMAGES.lab, fallback: STITCH_IMAGES.lab, label: "Oily Maduro Leaf Macro Texture" },
  singleMalt: { src: STITCH_IMAGES.pour, fallback: STITCH_IMAGES.pour, label: "Crystal Tumbler Single-Malt Whiskey" },
  craftCocktail: { src: STITCH_IMAGES.pour, fallback: STITCH_IMAGES.pour, label: "Clear Artisan Craft Cocktail" },
  smallPlate: { src: STITCH_IMAGES.community, fallback: STITCH_IMAGES.community, label: "Elite Member Culinary Small Plate" },
  humidorWalkIn: { src: STITCH_IMAGES.golden, fallback: STITCH_IMAGES.golden, label: "Private Humidor Walk-In Architecture" },
  loungeFloor: { src: STITCH_IMAGES.community, fallback: STITCH_IMAGES.community, label: "High-Velocity Lounge Floor Seating Grid" },
  brassSwitch: { src: STITCH_IMAGES.eat, fallback: STITCH_IMAGES.eat, label: "Polished Brass Command Center Switch" },
  cloverNode: { src: "css:pos-clover", label: "Clover Sync System Interface Node" },
  toastNode: { src: "css:pos-toast", label: "Toast Order Sync Interface Node" },
  squareNode: { src: "css:pos-square", label: "Square POS Sync Interface Node" },
};

const asset = (id: VisualAssetId) => img(VISUAL_ASSETS[id].src);
const assetFallback = (id: VisualAssetId) => img(VISUAL_ASSETS[id].fallback ?? VISUAL_ASSETS[id].src);

const craftCards: CraftCard[] = [
  {
    id: "smoke",
    name: "SmokeCraft 360",
    label: "Cigar Ritual",
    status: "Active",
    description: "Build the profile. Match the pour. Guide the moment.",
    icon: Flame,
    images: ["craftHubSmoke"],
    fallback: "craftHubSmoke",
  },
  {
    id: "pour",
    name: "PourCraft 360",
    label: "Spirits Room",
    status: "Coming Soon",
    description: "Guide cocktails, bourbon, whiskey, and premium pours.",
    icon: GlassWater,
    images: ["craftHubPour"],
    fallback: "craftHubPour",
  },
  {
    id: "beer",
    name: "BeerCraft 360",
    label: "Taproom Experience",
    status: "Coming Soon",
    description: "Match flavor, mood, and menu with the right beer.",
    icon: Beer,
    images: ["craftHubBeer"],
    fallback: "craftHubBeer",
  },
  {
    id: "wine",
    name: "WineCraft 360",
    label: "Cellar Experience",
    status: "Coming Soon",
    description: "Taste, pair, and recommend with confidence.",
    icon: Wine,
    images: ["craftHubWine"],
    fallback: "craftHubWine",
  },
];

const guides = [
  {
    id: "rosa",
    name: "Doña Rosa",
    title: "Wrapper Artistry Mentor",
    region: "Dominican Republic · Cibao",
    photo: "guideRosa" as VisualAssetId,
    flag: "flagDominican" as VisualAssetId,
    countryClass: "dominican",
    notes: "Volcanic spice, deep wrapper oil, confident structure.",
  },
  {
    id: "alejandro",
    name: "Señor Alejandro",
    title: "Fermentation Master",
    region: "Nicaragua · Esteli",
    photo: "guideAlejandro" as VisualAssetId,
    flag: "flagNicaragua" as VisualAssetId,
    countryClass: "nicaragua",
    notes: "Cedar, earth, warm transitions, patient balance.",
  },
  {
    id: "honduran",
    name: "Maestro Cortés",
    title: "Draw Precision Guide",
    region: "Honduras · Jamastran",
    photo: "broadleafCultivation" as VisualAssetId,
    flag: "flagHonduras" as VisualAssetId,
    countryClass: "honduras",
    notes: "Creamy texture, smooth draw, refined construction.",
  },
];

const mastery = [
  "Your Guide selected",
  "Wrapper profile locked",
  "Vitola and strength shaped",
  "Pairing ready",
];

const coachTopics = [
  { topic: "Guide Selection", assetId: "humidorWalkIn" as VisualAssetId, body: "Help staff explain the mentor and wrapper path." },
  { topic: "Wrapper Profile", assetId: "maduroLeafMacro" as VisualAssetId, body: "Clarify leaf, body, strength, and aroma." },
  { topic: "Pairing Logic", assetId: "singleMalt" as VisualAssetId, body: "Guide the pour without slowing the ritual." },
  { topic: "Room Flow", assetId: "loungeFloor" as VisualAssetId, body: "Read the lounge and keep service calm." },
  { topic: "Command Hub", assetId: "brassSwitch" as VisualAssetId, body: "Adjust venue controls and staff alerts." },
  { topic: "Guest Recovery", assetId: "smallPlate" as VisualAssetId, body: "Recover the moment with clean service steps." },
];

const progressStages: { id: Stage; label: string }[] = [
  { id: "hub", label: "Hub" },
  { id: "onboarding", label: "Start" },
  { id: "guide", label: "Guide" },
  { id: "reserve", label: "Build" },
  { id: "pairing", label: "Pair" },
  { id: "golden", label: "Box" },
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
  const [flavor, setFlavor] = useState("Cocoa");
  const [cut, setCut] = useState("Straight");
  const [mood, setMood] = useState("Slow Evening");
  const [pairing, setPairing] = useState("Single Malt Whiskey");
  const [coachOpen, setCoachOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [floorDeckOpen, setFloorDeckOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const enter = (next: Stage) => {
    touchPulse();
    setStage(next);
  };

  const context = useMemo(
    () => ({ guide, wrapper, vitola, strength, flavor, cut, mood, pairing }),
    [guide, wrapper, vitola, strength, flavor, cut, mood, pairing],
  );
  const showStaffHandoff = stage === "hub" || stage === "golden";

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
      {stage !== "boot" && stage !== "novee" && (
        <SessionProgress active={stage} />
      )}
      {showStaffHandoff && (
        <StaffHandoffDock
          onCoach={() => {
            touchPulse();
            setCoachOpen(true);
          }}
          onEatAction={() => {
            touchPulse();
            setPinOpen(true);
          }}
          onCommand={() => {
            touchPulse();
            setCommandOpen(true);
          }}
          muted={muted}
          onMute={() => {
            touchPulse();
            setMuted((value) => !value);
          }}
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
          setFlavor={setFlavor}
          setCut={setCut}
          setMood={setMood}
          onReset={() => {
            touchPulse();
            setWrapper("Maduro");
            setVitola("Toro");
            setStrength("Medium Full");
            setFlavor("Cocoa");
            setCut("Straight");
            setMood("Slow Evening");
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
      {coachOpen && <CoachHelpPortal onClose={() => setCoachOpen(false)} />}
      {commandOpen && <CommandHubPanel onClose={() => setCommandOpen(false)} />}
      {pinOpen && (
        <StaffPinPad
          onCancel={() => setPinOpen(false)}
          onSuccess={() => {
            setPinOpen(false);
            setFloorDeckOpen(true);
          }}
        />
      )}
      {floorDeckOpen && <EatPosDeck onClose={() => setFloorDeckOpen(false)} />}
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
      <div className="scso-emblem scso-stitch-logo" aria-hidden="true" title={VISUAL_ASSETS.corporateEmblem.label}>
        <img src={asset("corporateEmblem")} alt="" draggable={false} onError={(event) => { event.currentTarget.src = assetFallback("corporateEmblem"); }} />
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
      <p className="scso-sub">Craft Hub authorized</p>
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

function StaffHandoffDock({
  onCoach,
  onEatAction,
  onCommand,
  muted,
  onMute,
}: {
  onCoach: () => void;
  onEatAction: () => void;
  onCommand: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  return (
    <aside className="scso-handoff-dock" aria-label="Staff actions">
      <button type="button" className="scso-handoff-button" onPointerDown={onEatAction}>
        <Lock size={22} strokeWidth={1.7} />
        <span>Staff Handoff</span>
        <strong>Open E.A.T.</strong>
      </button>
      <button type="button" className="scso-coach-button" onPointerDown={onCoach}>
        <MessageCircle size={22} strokeWidth={1.7} />
        <span>Coach Help</span>
        <strong>6 Topics Ready</strong>
      </button>
      <button type="button" onPointerDown={onCommand}>
        <SlidersHorizontal size={22} strokeWidth={1.7} />
        <span>Command Hub</span>
        <strong>Room Controls</strong>
      </button>
      <button type="button" onPointerDown={onMute}>
        {muted ? <VolumeX size={22} strokeWidth={1.7} /> : <Volume2 size={22} strokeWidth={1.7} />}
        <span>Audio</span>
        <strong>{muted ? "Muted" : "Active"}</strong>
      </button>
    </aside>
  );
}

function SessionProgress({ active }: { active: Stage }) {
  const activeIndex = progressStages.findIndex((step) => step.id === active);
  return (
    <div className="scso-session-progress" aria-label="Session progress">
      {progressStages.map((step, index) => (
        <span key={step.id} className={index <= activeIndex ? "active" : ""}>
          {step.label}
        </span>
      ))}
    </div>
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
              className={`scso-craft-card ${active ? "is-active" : ""} ${card.images.length === 1 ? "single-image" : ""}`}
              onPointerDown={active ? onLaunch : touchPulse}
              style={{ ["--delay" as string]: `${idx * 2}s` }}
            >
              {card.images.map((assetId, imageIndex) => (
                <div
                  key={assetId}
                  className={`scso-card-image image-${imageIndex + 1}`}
                  title={VISUAL_ASSETS[assetId].label}
                  style={{
                    backgroundImage: `url("${asset(assetId)}"), url("${assetFallback(card.fallback)}")`,
                    ["--fallback-image" as string]: `url("${assetFallback(card.fallback)}")`,
                  }}
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
      style={{
        ["--stitch-onboarding-image" as string]: `url("${asset("craftHubSmoke")}")`,
        ["--stitch-onboarding-fallback" as string]: `url("${assetFallback("craftHubSmoke")}")`,
      }}
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
          <button key={g.id} type="button" className={`${selected === g.id ? "selected" : ""} flag-${g.countryClass}`} onPointerDown={() => onSelect(g.id)}>
            <span className={`scso-flag-field scso-${g.flag}`} aria-hidden="true" title={VISUAL_ASSETS[g.flag].label} />
            <img src={asset(g.photo)} alt={g.name} draggable={false} onError={(event) => { event.currentTarget.src = assetFallback(g.photo); }} />
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
  setFlavor,
  setCut,
  setMood,
  onReset,
  onBack,
  onPairing,
}: {
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; flavor: string; cut: string; mood: string; pairing: string };
  setWrapper: (v: string) => void;
  setVitola: (v: string) => void;
  setStrength: (v: string) => void;
  setFlavor: (v: string) => void;
  setCut: (v: string) => void;
  setMood: (v: string) => void;
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
          <img src={asset("maduroCigar")} alt={VISUAL_ASSETS.maduroCigar.label} draggable={false} onError={(event) => { event.currentTarget.src = assetFallback("maduroCigar"); }} />
          <div className="scso-spec-ledger">
            <span>{context.wrapper}</span>
            <span>{context.vitola}</span>
            <span>{context.strength}</span>
            <span>{context.flavor}</span>
            <span>{context.cut} Cut</span>
          </div>
        </div>
        <div className="scso-controls">
          <MasteryMatrix context={context} />
          <ChoiceGroup label="Wrapper" value={context.wrapper} items={["Maduro", "Natural", "Connecticut"]} onChange={setWrapper} />
          <ChoiceGroup label="Vitola" value={context.vitola} items={["Robusto", "Toro", "Churchill"]} onChange={setVitola} />
          <ChoiceGroup label="Strength" value={context.strength} items={["Mild", "Medium Full", "Full"]} onChange={setStrength} />
          <ChoiceGroup label="Flavor" value={context.flavor} items={["Cocoa", "Cedar", "Spice"]} onChange={setFlavor} />
          <ChoiceGroup label="Cut" value={context.cut} items={["Straight", "V-Cut", "Punch"]} onChange={setCut} />
          <ChoiceGroup label="Mood" value={context.mood} items={["Slow Evening", "Celebration", "Quiet Focus"]} onChange={setMood} />
          <button type="button" className="scso-primary" onPointerDown={onPairing}>
            Match the Pour
          </button>
        </div>
      </div>
    </section>
  );
}

function MasteryMatrix({
  context,
}: {
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; flavor: string; cut: string; mood: string; pairing: string };
}) {
  const rows = [
    ["Wrapper Selection", context.wrapper],
    ["Strength Profile", context.strength],
    ["Flavor Family", context.flavor],
    ["Body Level", context.vitola],
    ["Aroma Notes", `${context.cut} cut · ${context.mood}`],
    ["Mentor Recommendation", context.guide.name],
    ["Suggested Pairing Path", context.pairing],
  ];

  return (
    <section
      className="scso-mastery-matrix"
      style={{
        ["--matrix-image" as string]: `url("${asset("broadleafCultivation")}")`,
        ["--matrix-fallback" as string]: `url("${assetFallback("broadleafCultivation")}")`,
      }}
    >
      <p className="scso-kicker">Your Mastery Path</p>
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
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
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; flavor: string; cut: string; mood: string; pairing: string };
  setPairing: (v: string) => void;
  onBack: () => void;
  onGolden: () => void;
}) {
  const pairings = ["Single Malt Whiskey", "Craft Cocktail", "Culinary Small Plate"];
  return (
    <section className="scso-content scso-pairing">
      <BackButton onClick={onBack} />
      <header className="scso-header scso-header-compact">
        <div>
          <p className="scso-kicker">AI Sommelier</p>
          <h1>Pair With My Profile</h1>
          <p>{context.wrapper} · {context.vitola} · {context.strength} · {context.flavor} · {context.mood}</p>
        </div>
      </header>
      <div className="scso-pairing-grid">
        <PanelImage assetId="maduroLeafMacro" title="Macro Tobacco Path" body="Oily wrapper leaf, dark tooth, balanced burn." />
        <div className="scso-sommelier">
          <Leaf size={46} strokeWidth={1.2} />
          <h2>Synergy Calculation</h2>
          <p>{context.flavor}, {context.wrapper.toLowerCase()} wrapper, and a {context.cut.toLowerCase()} cut suggest a rich pour with soft caramel and oak structure.</p>
          <div className="scso-meter"><span style={{ width: "88%" }} /></div>
          <strong>Affinity 88%</strong>
        </div>
        <div className="scso-reserves">
          {pairings.map((p) => (
            <button key={p} type="button" className={context.pairing === p ? "active" : ""} onPointerDown={() => {
              touchPulse();
              setPairing(p);
            }}>
              <img
                src={asset(p === "Single Malt Whiskey" ? "singleMalt" : p === "Craft Cocktail" ? "craftCocktail" : "smallPlate")}
                alt=""
                onError={(event) => { event.currentTarget.src = assetFallback("singleMalt"); }}
              />
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

function PanelImage({ assetId, title, body }: { assetId: VisualAssetId; title: string; body: string }) {
  return (
    <div className="scso-panel-image">
      <img src={asset(assetId)} alt="" draggable={false} onError={(event) => { event.currentTarget.src = assetFallback(assetId); }} />
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
  context: { guide: (typeof guides)[number]; wrapper: string; vitola: string; strength: string; flavor: string; cut: string; mood: string; pairing: string };
  onHome: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="scso-content scso-golden">
      <div className="scso-burst" />
      <div className="scso-golden-box">
        <img src={STITCH_IMAGES.golden} alt="The Golden Box Stitch visual" draggable={false} onError={(event) => { event.currentTarget.src = assetFallback("humidorWalkIn"); }} />
        <div>
          <p className="scso-kicker">The Golden Box Finale</p>
          <h1>The Golden Box</h1>
          <dl>
            <div><dt>Guide</dt><dd>{context.guide.name}</dd></div>
            <div><dt>Build</dt><dd>{context.wrapper} · {context.vitola} · {context.strength}</dd></div>
            <div><dt>Ritual</dt><dd>{context.flavor} · {context.cut} Cut · {context.mood}</dd></div>
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

function CoachHelpPortal({ onClose }: { onClose: () => void }) {
  const [activeTopic, setActiveTopic] = useState(coachTopics[0].topic);
  const [reply, setReply] = useState("Select a topic for clear service guidance.");
  const [loading, setLoading] = useState(false);

  async function askCoach(topic: string) {
    touchPulse();
    setActiveTopic(topic);
    setLoading(true);
    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Give concise touchscreen staff guidance for ${topic} inside SmokeCraft 360.`,
          topicContext: topic,
        }),
      });
      if (!response.ok) throw new Error("Coach unavailable");
      const data = await response.json() as { reply?: string };
      setReply(data.reply ?? "Guidance ready.");
    } catch {
      setReply(`${topic}: guide the guest clearly, confirm the choice, and keep the session moving without leaving the ritual.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scso-modal-backdrop" role="dialog" aria-modal="true">
      <section className="scso-coach-modal">
        <header>
          <div>
            <p className="scso-kicker">Coach Help</p>
            <h2>Service Guidance</h2>
          </div>
          <button type="button" className="scso-link-button" onPointerDown={onClose}>Close</button>
        </header>
        <div className="scso-coach-grid">
          {coachTopics.map((card) => (
            <button
              key={card.topic}
              type="button"
              className={activeTopic === card.topic ? "active" : ""}
              onPointerDown={() => void askCoach(card.topic)}
              style={{
                ["--coach-image" as string]: `url("${asset(card.assetId)}")`,
                ["--coach-fallback" as string]: `url("${assetFallback(card.assetId)}")`,
              }}
            >
              <span>{card.topic}</span>
              <small>{card.body}</small>
            </button>
          ))}
        </div>
        <div className="scso-coach-response">
          <strong>{loading ? "Loading guidance" : activeTopic}</strong>
          <p>{reply}</p>
        </div>
      </section>
    </div>
  );
}

function CommandHubPanel({ onClose }: { onClose: () => void }) {
  const controls = [
    ["Ambient Intensity", "Warm Low"],
    ["Experience Mode", "Guided Ritual"],
    ["Session Flow", "Continuous"],
    ["Table Activity", "Live"],
    ["Staff Alerts", "Ready"],
    ["Pairing Recommendations", "Visible"],
    ["POS Sync Visibility", "Staff Only"],
    ["Admin View Access", "PIN Gated"],
  ];

  return (
    <div className="scso-modal-backdrop" role="dialog" aria-modal="true">
      <section className="scso-command-modal">
        <header>
          <div>
            <p className="scso-kicker">Executive Command Hub</p>
            <h2>Visual Control Dashboard</h2>
          </div>
          <button type="button" className="scso-link-button" onPointerDown={onClose}>Close</button>
        </header>
        <div className="scso-command-layout">
          <PanelImage assetId="brassSwitch" title="Room Controls" body="Staff can tune the lounge without interrupting the guest ritual." />
          <div className="scso-command-grid">
            {controls.map(([label, value]) => (
              <button key={label} type="button" onPointerDown={touchPulse}>
                <span>{label}</span>
                <strong>{value}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StaffPinPad({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Enter"];

  function pressKey(key: string) {
    touchPulse();
    if (key === "Clear") {
      setPin("");
      setError("");
      return;
    }
    if (key === "Enter") {
      if (["1234", "2580", "7890", "3600"].includes(pin)) {
        setUnlocked(true);
        window.setTimeout(onSuccess, 620);
      } else {
        setError("Invalid staff PIN");
        setPin("");
      }
      return;
    }
    if (pin.length < 4) setPin((current) => `${current}${key}`);
  }

  return (
    <div className="scso-modal-backdrop" role="dialog" aria-modal="true">
      <section className={`scso-pin-modal ${unlocked ? "unlocked" : ""}`}>
        <div className="scso-pin-ripple" />
        <header>
          <Lock size={28} strokeWidth={1.6} />
          <div>
            <p className="scso-kicker">Staff PIN</p>
            <h2>E.A.T Action Gate</h2>
          </div>
        </header>
        <div className="scso-pin-dots" aria-label="PIN entry">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index < pin.length ? "filled" : ""} />)}
        </div>
        {error && <p className="scso-pin-error">{error}</p>}
        <div className="scso-pin-grid">
          {keys.map((key) => (
            <button key={key} type="button" onPointerDown={() => pressKey(key)}>
              {key}
            </button>
          ))}
        </div>
        <button type="button" className="scso-link-button" onPointerDown={onCancel}>Cancel</button>
      </section>
    </div>
  );
}

function EatPosDeck({ onClose }: { onClose: () => void }) {
  const modules = [
    ["E.A.T Status", "Live Floor Deck"],
    ["Revenue Velocity", "2.4x Active"],
    ["Humidor Countdown", "145 Puros Remaining"],
    ["Socket Handshake", "POS Connected"],
  ];
  const queue = [
    ["Ritual Ticket", "Maduro Toro · Medium Full"],
    ["Pairing", "Single Malt Whiskey"],
    ["Dispatch", "Bar and humidor ready"],
  ];
  const nodes = [
    ["Clover", "Connected", "Just now", "Feed live", "Healthy", "node-clover"],
    ["Toast", "Ready", "2 min ago", "Orders synced", "Healthy", "node-toast"],
    ["Square", "Ready", "4 min ago", "Payments synced", "Healthy", "node-square"],
    ["Shopify", "Standby", "Manual", "Retail queue", "Ready", "node-custom"],
    ["Lightspeed", "Standby", "Manual", "Venue queue", "Ready", "node-custom"],
    ["Manual Import", "Ready", "Manual", "Staff upload", "Ready", "node-custom"],
    ["Custom POS", "Ready", "Manual", "Gateway slot", "Ready", "node-custom"],
  ];

  return (
    <div className="scso-pos-backdrop" role="dialog" aria-modal="true">
      <section className="scso-pos-deck">
        <div className="scso-pos-ripple" />
        <header>
          <div className="scso-eat-logo">
            <img src={asset("brassSwitch")} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div>
              <p className="scso-kicker">E.A.T. System</p>
              <h2>Live POS Handoff</h2>
            </div>
          </div>
          <button type="button" className="scso-link-button" onPointerDown={onClose}>Return to Guest</button>
        </header>
        <div className="scso-pos-modules">
          {modules.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="scso-pos-queue">
          {queue.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="scso-pos-strip" aria-label="POS sync strip">
          {nodes.map(([name, status, sync, feed, health, nodeClass]) => (
            <article key={name} className={nodeClass}>
              <div className="scso-pos-node-mark" />
              <span>{name}</span>
              <strong>{status}</strong>
              <small>{sync} · {feed} · {health}</small>
              <button type="button" onPointerDown={touchPulse}>
                <RefreshCw size={16} strokeWidth={1.8} />
                Refresh
              </button>
            </article>
          ))}
        </div>
        <button type="button" className="scso-primary">Send To Staff Queue</button>
      </section>
    </div>
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
