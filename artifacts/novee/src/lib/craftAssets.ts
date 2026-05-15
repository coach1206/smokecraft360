export type CraftType = "smoke" | "pour" | "beer" | "wine";

export interface CraftScene {
  label: string;
  description: string;
  bg: string;
  glowColor: string;
  glowPos: string;
}

// ── SmokeCraft 360 — 12 scenes, 14 s cycle ──────────────────────────────────
const SMOKE_SCENES: CraftScene[] = [
  {
    label: "SELECTION · PREMIUM LEAF",
    description: "Dominican long-fill, natural Ecuadorian wrapper",
    bg: "radial-gradient(ellipse at 35% 65%, #1E1208 0%, #0D0806 50%, #060403 100%)",
    glowColor: "rgba(196,97,10,0.10)", glowPos: "35% 65%",
  },
  {
    label: "CALIBRATION · PRECISION CUT",
    description: "Straight cut at the shoulder — 2 mm below the cap",
    bg: "radial-gradient(ellipse at 50% 30%, #16120B 0%, #0A0806 55%, #050403 100%)",
    glowColor: "rgba(180,120,40,0.08)", glowPos: "50% 30%",
  },
  {
    label: "IGNITION · THERMAL ACTIVATION",
    description: "Toast and first draw — embers alive",
    bg: "radial-gradient(ellipse at 50% 75%, #2A1305 0%, #160A03 45%, #060402 100%)",
    glowColor: "rgba(210,80,10,0.15)", glowPos: "50% 75%",
  },
  {
    label: "FIRST THIRD · OPENING NOTES",
    description: "Creamy cedar, subtle pepper, clean construction",
    bg: "radial-gradient(ellipse at 40% 60%, #1A1008 0%, #0E0805 55%, #060403 100%)",
    glowColor: "rgba(196,97,10,0.09)", glowPos: "40% 60%",
  },
  {
    label: "SECOND THIRD · DEVELOPMENT",
    description: "Cocoa evolves — leather notes emerge",
    bg: "radial-gradient(ellipse at 60% 50%, #1C1209 0%, #100907 55%, #060403 100%)",
    glowColor: "rgba(180,100,20,0.10)", glowPos: "60% 50%",
  },
  {
    label: "FINAL THIRD · PEAK COMPLEXITY",
    description: "Full body, dark espresso, long finish",
    bg: "radial-gradient(ellipse at 55% 70%, #201408 0%, #120A05 50%, #060402 100%)",
    glowColor: "rgba(200,80,10,0.13)", glowPos: "55% 70%",
  },
  {
    label: "PROFESSIONAL LOUNGE · RITUAL",
    description: "Dark mahogany, slow single-malt pairing",
    bg: "radial-gradient(ellipse at 30% 40%, #12100E 0%, #0A0907 55%, #050404 100%)",
    glowColor: "rgba(160,100,40,0.07)", glowPos: "30% 40%",
  },
  {
    label: "CONTEMPORARY · NEXT GENERATION",
    description: "Modern blends, natural light, urban setting",
    bg: "radial-gradient(ellipse at 65% 35%, #161210 0%, #0C0909 55%, #050404 100%)",
    glowColor: "rgba(180,110,50,0.08)", glowPos: "65% 35%",
  },
  {
    label: "CONNOISSEUR · AUTHENTIC MASTERY",
    description: "Female sommelier — precision palate, bold selection",
    bg: "radial-gradient(ellipse at 45% 55%, #1A140E 0%, #0E0A07 55%, #060404 100%)",
    glowColor: "rgba(190,120,60,0.09)", glowPos: "45% 55%",
  },
  {
    label: "LEGACY · TRADITION & MEMORY",
    description: "Heritage representation — decades of craft wisdom",
    bg: "radial-gradient(ellipse at 25% 55%, #1E1710 0%, #120F0A 50%, #070605 100%)",
    glowColor: "rgba(170,110,50,0.08)", glowPos: "25% 55%",
  },
  {
    label: "MASTER ROLLER · DOMINICAN CRAFT",
    description: "Hand-rolled bunches, cedar press, perfect draw",
    bg: "radial-gradient(ellipse at 50% 55%, #221508 0%, #140E05 48%, #070503 100%)",
    glowColor: "rgba(200,90,15,0.12)", glowPos: "50% 55%",
  },
  {
    label: "EVENING PAIRING · SPIRITS",
    description: "Cigar meets aged rum — late-session transcendence",
    bg: "radial-gradient(ellipse at 40% 65%, #1E1610 0%, #120F09 50%, #070604 100%)",
    glowColor: "rgba(180,100,30,0.10)", glowPos: "40% 65%",
  },
];

// ── PourCraft 360 — 12 scenes, 16 s cycle ───────────────────────────────────
const POUR_SCENES: CraftScene[] = [
  {
    label: "SELECTION · SINGLE MALT",
    description: "18-year Speyside — honeyed oak, dried apricot",
    bg: "radial-gradient(ellipse at 45% 55%, #1E1608 0%, #130F06 50%, #080604 100%)",
    glowColor: "rgba(212,175,55,0.10)", glowPos: "45% 55%",
  },
  {
    label: "POUR · WHISKEY DYNAMICS",
    description: "Controlled slow pour — 2 oz measured ritual",
    bg: "radial-gradient(ellipse at 50% 60%, #221809 0%, #16100A 48%, #080705 100%)",
    glowColor: "rgba(200,160,40,0.12)", glowPos: "50% 60%",
  },
  {
    label: "BOURBON · HEAVY TUMBLER",
    description: "Kentucky straight — caramel, vanilla, oak char",
    bg: "radial-gradient(ellipse at 40% 65%, #1C1509 0%, #120F08 52%, #070604 100%)",
    glowColor: "rgba(210,150,30,0.10)", glowPos: "40% 65%",
  },
  {
    label: "COGNAC · SNIFTER RITUAL",
    description: "XO Armagnac — warmed by palm, floral bloom",
    bg: "radial-gradient(ellipse at 55% 50%, #201708 0%, #140F07 50%, #080604 100%)",
    glowColor: "rgba(200,145,25,0.11)", glowPos: "55% 50%",
  },
  {
    label: "ICE · SPHERE FORMATION",
    description: "2.5\" sphere — slow dilution, visual clarity",
    bg: "radial-gradient(ellipse at 50% 35%, #141211 0%, #0C0B0A 55%, #060505 100%)",
    glowColor: "rgba(160,180,200,0.07)", glowPos: "50% 35%",
  },
  {
    label: "PAIRING · SPIRIT REVEAL",
    description: "Cigar companion: 12yr rum + mild Connecticut",
    bg: "radial-gradient(ellipse at 35% 60%, #1E160A 0%, #140F08 50%, #080604 100%)",
    glowColor: "rgba(210,160,40,0.10)", glowPos: "35% 60%",
  },
  {
    label: "TERROIR · STORY IN THE GLASS",
    description: "Islay peat — coastal air, brine, smoked heather",
    bg: "radial-gradient(ellipse at 45% 70%, #221A0C 0%, #160F08 48%, #080604 100%)",
    glowColor: "rgba(190,150,35,0.09)", glowPos: "45% 70%",
  },
  {
    label: "BARREL · AGING PROFILE",
    description: "Ex-bourbon cask — first fill vs second fill nuance",
    bg: "radial-gradient(ellipse at 30% 55%, #201808 0%, #140F06 50%, #080503 100%)",
    glowColor: "rgba(200,140,25,0.10)", glowPos: "30% 55%",
  },
  {
    label: "COLOR · CLARITY ASSESSMENT",
    description: "Deep amber — nose tipped to natural light",
    bg: "radial-gradient(ellipse at 50% 40%, #1E1608 0%, #130F06 52%, #070503 100%)",
    glowColor: "rgba(210,170,50,0.11)", glowPos: "50% 40%",
  },
  {
    label: "NOSE · PALATE JOURNEY",
    description: "Three inhales before the first sip — patience",
    bg: "radial-gradient(ellipse at 60% 55%, #1C1607 0%, #120E06 52%, #070503 100%)",
    glowColor: "rgba(200,155,35,0.09)", glowPos: "60% 55%",
  },
  {
    label: "EVENING · LATE SESSION",
    description: "Nightcap pours — deep chair, warm room",
    bg: "radial-gradient(ellipse at 45% 65%, #1A140A 0%, #110D08 52%, #060504 100%)",
    glowColor: "rgba(185,140,30,0.08)", glowPos: "45% 65%",
  },
  {
    label: "RESERVE · LIMITED RELEASE",
    description: "Cask strength, no chill-filter — 58.2% ABV",
    bg: "radial-gradient(ellipse at 50% 55%, #261C0A 0%, #180F07 48%, #090503 100%)",
    glowColor: "rgba(220,175,50,0.13)", glowPos: "50% 55%",
  },
];

// ── BeerCraft 360 — 12 scenes, 12 s cycle ───────────────────────────────────
const BEER_SCENES: CraftScene[] = [
  {
    label: "DISCOVERY · CRAFT PORTFOLIO",
    description: "200 rotating taps — guided by taste, not trend",
    bg: "radial-gradient(ellipse at 45% 55%, #1C1408 0%, #120D06 52%, #070503 100%)",
    glowColor: "rgba(184,115,51,0.10)", glowPos: "45% 55%",
  },
  {
    label: "PILSNER · PERFECT POUR",
    description: "Czech lager — angled glass, 45° first pour",
    bg: "radial-gradient(ellipse at 50% 40%, #181408 0%, #100E06 55%, #060503 100%)",
    glowColor: "rgba(200,170,80,0.10)", glowPos: "50% 40%",
  },
  {
    label: "IPA · HOP FORWARD",
    description: "West Coast IPA — citrus, pine, bitter finish",
    bg: "radial-gradient(ellipse at 40% 60%, #1A1508 0%, #110F07 52%, #060504 100%)",
    glowColor: "rgba(190,140,40,0.10)", glowPos: "40% 60%",
  },
  {
    label: "STOUT · DEEP ROAST",
    description: "Imperial stout — chocolate, espresso, dark fruit",
    bg: "radial-gradient(ellipse at 35% 65%, #0E0C0B 0%, #090807 55%, #040403 100%)",
    glowColor: "rgba(120,80,40,0.09)", glowPos: "35% 65%",
  },
  {
    label: "SOUR · ACIDITY PROFILE",
    description: "Flemish red — oak-aged, lactic tartness",
    bg: "radial-gradient(ellipse at 55% 50%, #161408 0%, #0F0D07 55%, #060503 100%)",
    glowColor: "rgba(170,130,40,0.09)", glowPos: "55% 50%",
  },
  {
    label: "WHEAT · HAZY SESSION",
    description: "Belgian witbier — coriander, orange peel, cloud",
    bg: "radial-gradient(ellipse at 50% 45%, #1C170A 0%, #130F08 52%, #080604 100%)",
    glowColor: "rgba(200,175,90,0.10)", glowPos: "50% 45%",
  },
  {
    label: "CARBONATION · BUBBLE DYNAMICS",
    description: "Nitrogen vs CO₂ — mouthfeel science at the tap",
    bg: "radial-gradient(ellipse at 50% 30%, #181408 0%, #100E06 55%, #060503 100%)",
    glowColor: "rgba(180,160,80,0.09)", glowPos: "50% 30%",
  },
  {
    label: "GLASSWARE · VESSEL SELECTION",
    description: "Snifter, stein, tulip — form follows function",
    bg: "radial-gradient(ellipse at 45% 55%, #141210 0%, #0E0C0A 55%, #050504 100%)",
    glowColor: "rgba(160,130,80,0.08)", glowPos: "45% 55%",
  },
  {
    label: "TEMPERATURE · SERVE PRECISION",
    description: "38°F lager vs 55°F stout — always calibrated",
    bg: "radial-gradient(ellipse at 40% 50%, #0E1012 0%, #090C0E 55%, #040506 100%)",
    glowColor: "rgba(100,150,180,0.07)", glowPos: "40% 50%",
  },
  {
    label: "HOPS · TERROIR PROFILE",
    description: "Citra vs Mosaic vs Simcoe — field to fermentor",
    bg: "radial-gradient(ellipse at 55% 60%, #181508 0%, #100E07 52%, #060503 100%)",
    glowColor: "rgba(180,140,40,0.10)", glowPos: "55% 60%",
  },
  {
    label: "FERMENTATION · YEAST STORY",
    description: "Belgian Abbey strain — banana ester, clove spice",
    bg: "radial-gradient(ellipse at 35% 55%, #1A1608 0%, #110F07 52%, #060503 100%)",
    glowColor: "rgba(170,130,50,0.09)", glowPos: "35% 55%",
  },
  {
    label: "HEAD · POUR COMPLETION",
    description: "2 cm of foam — the final act of service",
    bg: "radial-gradient(ellipse at 50% 40%, #1C1608 0%, #120E07 52%, #070503 100%)",
    glowColor: "rgba(200,180,100,0.10)", glowPos: "50% 40%",
  },
];

// ── WineCraft 360 — 12 scenes, 18 s cycle ───────────────────────────────────
const WINE_SCENES: CraftScene[] = [
  {
    label: "TERROIR · VINEYARD ORIGIN",
    description: "Burgundy Premier Cru — limestone, maritime winds",
    bg: "radial-gradient(ellipse at 40% 60%, #1A0C10 0%, #100810 55%, #060407 100%)",
    glowColor: "rgba(155,58,74,0.10)", glowPos: "40% 60%",
  },
  {
    label: "HARVEST · SELECTION TABLE",
    description: "Hand-sorted at the cave — only perfect clusters",
    bg: "radial-gradient(ellipse at 50% 50%, #1C0E12 0%, #120912 54%, #060408 100%)",
    glowColor: "rgba(160,60,80,0.10)", glowPos: "50% 50%",
  },
  {
    label: "DECANTING · OXYGEN RITUAL",
    description: "One hour aeration — sediment separation complete",
    bg: "radial-gradient(ellipse at 45% 55%, #18090F 0%, #100810 55%, #060407 100%)",
    glowColor: "rgba(145,50,70,0.09)", glowPos: "45% 55%",
  },
  {
    label: "FIRST POUR · GLASS CEREMONY",
    description: "2 oz into wide-bowl Burgundy glass — slow tilt",
    bg: "radial-gradient(ellipse at 55% 60%, #1E0E14 0%, #130A12 52%, #070508 100%)",
    glowColor: "rgba(165,65,85,0.11)", glowPos: "55% 60%",
  },
  {
    label: "COLOR · CLARITY ASSESSMENT",
    description: "Garnet core, ruby rim — age and extraction read",
    bg: "radial-gradient(ellipse at 50% 40%, #1C0B10 0%, #11080E 55%, #060407 100%)",
    glowColor: "rgba(175,60,80,0.10)", glowPos: "50% 40%",
  },
  {
    label: "AROMA · BOUQUET DEVELOPMENT",
    description: "Dark cherry, violets, wet earth — classic Pinot",
    bg: "radial-gradient(ellipse at 40% 55%, #1A0B12 0%, #11090F 54%, #060407 100%)",
    glowColor: "rgba(155,55,75,0.09)", glowPos: "40% 55%",
  },
  {
    label: "PALATE · TASTE JOURNEY",
    description: "Entry, mid-palate, finish — three-act structure",
    bg: "radial-gradient(ellipse at 50% 60%, #1E1014 0%, #130B11 52%, #070508 100%)",
    glowColor: "rgba(160,60,80,0.10)", glowPos: "50% 60%",
  },
  {
    label: "TANNIN · STRUCTURE MAPPING",
    description: "Silky tannins — 14 months French oak, 40% new",
    bg: "radial-gradient(ellipse at 35% 55%, #140B0E 0%, #0E090C 55%, #050406 100%)",
    glowColor: "rgba(140,50,65,0.09)", glowPos: "35% 55%",
  },
  {
    label: "PAIRING · SOMM LOGIC",
    description: "Duck confit, mushroom risotto, aged gruyère",
    bg: "radial-gradient(ellipse at 55% 50%, #1E0E14 0%, #130A11 52%, #070507 100%)",
    glowColor: "rgba(160,60,80,0.10)", glowPos: "55% 50%",
  },
  {
    label: "GLASS · VESSEL SCIENCE",
    description: "Wide-bowl Burgundy — aeration meets aesthetics",
    bg: "radial-gradient(ellipse at 45% 50%, #160C10 0%, #0F0A0E 55%, #060507 100%)",
    glowColor: "rgba(148,55,72,0.09)", glowPos: "45% 50%",
  },
  {
    label: "VARIETAL · RED PROFILES",
    description: "Pinot, Cab, Merlot, Syrah — distinct personalities",
    bg: "radial-gradient(ellipse at 40% 60%, #200F16 0%, #160C14 50%, #080708 100%)",
    glowColor: "rgba(170,65,85,0.11)", glowPos: "40% 60%",
  },
  {
    label: "SOMMELIER · FINAL REVEAL",
    description: "The selection confirmed — pour, sip, remember",
    bg: "radial-gradient(ellipse at 50% 55%, #1E0E14 0%, #140C13 52%, #080708 100%)",
    glowColor: "rgba(165,65,85,0.12)", glowPos: "50% 55%",
  },
];

export const CRAFT_SCENES: Record<CraftType, CraftScene[]> = {
  smoke: SMOKE_SCENES,
  pour:  POUR_SCENES,
  beer:  BEER_SCENES,
  wine:  WINE_SCENES,
};

export const CRAFT_CYCLE_MS: Record<CraftType, number> = {
  smoke: 14000,
  pour:  16000,
  beer:  12000,
  wine:  18000,
};
