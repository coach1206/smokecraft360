import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductResult } from "@/services/api";
import ExperienceFrame from "@/components/ExperienceFrame";

interface BrewStoryProps {
  product: ProductResult;
  accent?: string;
  testId?: string;
}

interface StoryPanel {
  id: string;
  label: string;
  title: string;
  body: string;
}

function generateStory(p: ProductResult): StoryPanel[] {
  const name = p.name || "this brew";
  const notes = p.flavorNotes ?? [];
  const tags = p.pairingTags ?? [];
  const str = p.strength ?? 3;

  const originMap: Record<string, string> = {
    light: "Born from centuries of European lager tradition, light brews like this trace their lineage to Bohemian cellars where patience and cold fermentation created the world's most refreshing style.",
    crisp: "Crisp beers emerged from the Alpine brewing houses of Central Europe, where mountain spring water and noble hops defined a style built on clarity and precision.",
    citrus: "Citrus-forward brewing owes its modern identity to the American craft revolution of the 1980s, when West Coast brewers discovered that New World hops could paint with flavors previously reserved for orchards.",
    caramel: "Caramel and toffee notes in beer trace back to British malt houses, where kilning barley at carefully controlled temperatures unlocked layers of sweetness that no amount of sugar could replicate.",
    smoky: "Smoked beers carry the ghost of the oldest brewing tradition on Earth. Before the invention of the drum kiln, every malt was smoke-dried — meaning every beer our ancestors drank tasted like this.",
    "dark-chocolate": "Dark, roasted beers descend from London's porter houses of the 1700s, where heavily kilned malts created a revolutionary black brew that fueled an empire's working class.",
    fruity: "Fruit-forward beer styles were pioneered by Belgian abbey brewers, who discovered that certain yeast strains could conjure banana, stone fruit, and berry from nothing but grain and water.",
    spicy: "Spice in beer is an ancient practice — the Egyptians brewed with coriander and juniper millennia before hops became the standard bittering agent.",
  };

  const primaryNote = notes[0] ?? "smooth";
  const origin = originMap[primaryNote]
    ?? `Every great brew has a story. ${name} draws from a tradition of careful ingredient selection and patient craftsmanship that spans generations of brewing mastery.`;

  const strengthWord = str <= 2 ? "sessionable" : str === 3 ? "balanced" : "full-bodied";
  const flavorList = notes.length >= 2
    ? `${notes.slice(0, -1).join(", ")} and ${notes[notes.length - 1]}`
    : notes[0] ?? "complex malt";

  const taste = `${name} lands on the palate as distinctly ${strengthWord}. The ${flavorList} notes aren't competing — they're layered. `
    + (str >= 3
      ? `The higher ABV gives each sip weight, letting the flavors linger and evolve as the glass warms. This is a beer that rewards slow drinking.`
      : `The lighter body means the flavors arrive quickly and cleanly — no heaviness, no lingering bitterness. It's built for another round.`);

  const secretMap: Record<string, string> = {
    light: "Professional tasters always let light beers warm five degrees past serving temp. The cold masks half the flavor — the real character shows up at cellar temperature.",
    citrus: "That citrus punch you taste? It's not from fruit. It's from essential oils in the hop cones, released in the final minutes of the boil — a technique called 'late hopping' that most breweries guard as their signature move.",
    caramel: "The caramel sweetness comes from Maillard reactions during the malt kilning process — the same chemistry that browns a steak. Brewers control the exact temperature window to hit caramel without tipping into burnt toast.",
    smoky: "Here's what most people don't know: smoked malt loses its intensity the longer you age it. The best smoked beers are brewed with malt that's been kilned within weeks, not months.",
    "dark-chocolate": "The chocolate flavor in dark beers isn't added — it's an illusion created by roasting barley past 400°F. The same compounds that give dark chocolate its bitterness form naturally in the grain.",
    fruity: "The fruit you taste was made entirely by yeast. During fermentation, certain strains produce esters — chemical compounds identical to those found in real bananas, pears, and stone fruit. No fruit ever touched this beer.",
  };

  const secret = secretMap[primaryNote]
    ?? `Here's what separates knowing from tasting: the ${tags[0] ?? "pairing"} affinity in ${name} isn't coincidence — it's a deliberate balance point the brewer targets during recipe formulation. When you pair it right, both the beer and the companion get better.`;

  return [
    { id: "origin",  label: "Origin",         title: "Where It Comes From", body: origin },
    { id: "taste",   label: "Taste Science",   title: "What You're Tasting", body: taste },
    { id: "secret",  label: "Insider Secret",  title: "What Most Miss",      body: secret },
  ];
}

const SWIPE_THRESHOLD = 50;

export default function BrewStory({ product, accent = "#D4AF37", testId = "brewstory" }: BrewStoryProps) {
  const panels = generateStory(product);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);

  function go(next: number) {
    if (next < 0 || next >= panels.length) return;
    setDirection(next > idx ? 1 : -1);
    setIdx(next);
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 220 : -220, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -220 : 220, opacity: 0 }),
  };

  return (
    <ExperienceFrame accent={`${accent}44`} padding="24px 28px" testId={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 28, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <p style={{
          margin: 0, fontSize: 10, letterSpacing: "0.32em",
          textTransform: "uppercase", color: accent, fontWeight: 600,
        }}>
          BrewStory
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {panels.map((p, i) => (
          <button
            key={p.id}
            type="button"
            data-testid={`${testId}-tab-${p.id}`}
            onClick={() => go(i)}
            style={{
              background: i === idx ? accent : "rgba(255,255,255,0.08)",
              color: i === idx ? "#0a0604" : "#E5E5E5",
              border: "none",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        style={{ position: "relative", minHeight: 160, overflow: "hidden" }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const onUp = (ev: PointerEvent) => {
            const dx = ev.clientX - startX;
            if (dx < -SWIPE_THRESHOLD) go(idx + 1);
            else if (dx > SWIPE_THRESHOLD) go(idx - 1);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointerup", onUp);
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={panels[idx].id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            data-testid={`${testId}-panel-${panels[idx].id}`}
          >
            <h4 style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: 20, fontWeight: 600, margin: "0 0 12px", color: "#FFFFFF",
            }}>
              {panels[idx].title}
            </h4>
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.7,
              color: "rgba(229,229,229,0.9)",
            }}>
              {panels[idx].body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
        {panels.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === idx ? 24 : 6, height: 6, borderRadius: 3,
              background: i === idx ? accent : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </ExperienceFrame>
  );
}
