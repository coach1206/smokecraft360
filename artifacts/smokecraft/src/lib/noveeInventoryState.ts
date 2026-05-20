/* ══════════════════════════════════════════════════════════
   Triple-Axis Inventory State
   HUMIDOR · BAR · KITCHEN
══════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

/* ─────────────── HUMIDOR ─────────────── */
export interface HumidorItem {
  id: string;
  name: string;
  brand: string;
  vitola: string;
  wrapper: string;
  origin: string;
  qty: number;
  boxCount: number;
  humidityTarget: number;
  humidityActual: number;
  strength: "Mild" | "Medium" | "Medium-Full" | "Full";
  status: "optimal" | "low" | "critical" | "reorder";
  popularityRank: number;
}

export const HUMIDOR_INVENTORY: HumidorItem[] = [
  { id: "h1",  name: "Padron 1964 Aniversario Natural",   brand: "Padron",       vitola: "Hermoso",      wrapper: "Natural Maduro",    origin: "Nicaragua",        qty: 24, boxCount: 2, humidityTarget: 70, humidityActual: 71, strength: "Full",         status: "optimal",  popularityRank: 1 },
  { id: "h2",  name: "Cohiba Behike 54",                  brand: "Cohiba",       vitola: "Behike",       wrapper: "Cuban Sun Grown",   origin: "Cuba",             qty: 8,  boxCount: 1, humidityTarget: 68, humidityActual: 67, strength: "Full",         status: "low",      popularityRank: 2 },
  { id: "h3",  name: "Arturo Fuente Opus X",              brand: "Arturo Fuente",vitola: "Robusto",      wrapper: "Cameroon",          origin: "Dominican Republic",qty: 20,boxCount: 2, humidityTarget: 70, humidityActual: 70, strength: "Full",         status: "optimal",  popularityRank: 3 },
  { id: "h4",  name: "Arturo Fuente Opus X BBMF",         brand: "Arturo Fuente",vitola: "Giant",        wrapper: "Cameroon",          origin: "Dominican Republic",qty: 6, boxCount: 1, humidityTarget: 70, humidityActual: 72, strength: "Full",         status: "critical", popularityRank: 4 },
  { id: "h5",  name: "Liga Privada No. 9",                brand: "Drew Estate",  vitola: "Toro",         wrapper: "Connecticut Habano",origin: "Nicaragua",        qty: 18, boxCount: 2, humidityTarget: 72, humidityActual: 72, strength: "Full",         status: "optimal",  popularityRank: 5 },
  { id: "h6",  name: "Plasencia Alma Fuerte Nos. 2",      brand: "Plasencia",    vitola: "Toro",         wrapper: "Jalapa Nicaragua",  origin: "Nicaragua",        qty: 15, boxCount: 1, humidityTarget: 70, humidityActual: 69, strength: "Full",         status: "optimal",  popularityRank: 6 },
  { id: "h7",  name: "Romeo y Julieta No. 2",             brand: "Romeo y Julieta",vitola:"Churchill",   wrapper: "Connecticut Shade", origin: "Cuba",             qty: 30, boxCount: 3, humidityTarget: 68, humidityActual: 68, strength: "Medium",       status: "optimal",  popularityRank: 7 },
  { id: "h8",  name: "Davidoff Millennium Blend No. 2",   brand: "Davidoff",     vitola: "Robusto",      wrapper: "Ecuador",           origin: "Dominican Republic",qty: 12,boxCount: 1, humidityTarget: 68, humidityActual: 67, strength: "Medium",       status: "optimal",  popularityRank: 8 },
  { id: "h9",  name: "Montecristo No. 4",                 brand: "Montecristo",  vitola: "Petite Corona",wrapper: "Cuban",             origin: "Cuba",             qty: 22, boxCount: 2, humidityTarget: 70, humidityActual: 71, strength: "Mild",         status: "optimal",  popularityRank: 9 },
  { id: "h10", name: "Rocky Patel Vintage 1990",          brand: "Rocky Patel",  vitola: "Toro",         wrapper: "Colorado Maduro",   origin: "Honduras",         qty: 4,  boxCount: 0, humidityTarget: 70, humidityActual: 73, strength: "Medium-Full",  status: "reorder",  popularityRank: 10 },
];

/* Derived totals */
export function getHumidorSummary(items: HumidorItem[]) {
  const total      = items.reduce((s, i) => s + i.qty, 0);
  const critical   = items.filter(i => i.status === "critical" || i.status === "reorder");
  const humidAlarm = items.some(i => Math.abs(i.humidityActual - i.humidityTarget) > 4);
  return { total, critical, humidAlarm };
}

/* ─────────────── BAR ─────────────── */
export interface BarItem {
  id: string;
  name: string;
  category: "bourbon" | "scotch" | "cognac" | "tequila" | "rum" | "gin" | "wine" | "champagne";
  brand: string;
  age?: string;
  bottlesRemaining: number;
  bottlesCapacity: number;
  pourCount: number;
  pricePerPour: number;
  status: "available" | "low" | "critical" | "reserved";
  pairingScore: number;
}

export const BAR_INVENTORY: BarItem[] = [
  { id: "b1",  name: "Pappy Van Winkle 15yr",      category: "bourbon",    brand: "Van Winkle",   age: "15yr", bottlesRemaining: 3,  bottlesCapacity: 6,  pourCount: 14, pricePerPour: 85,  status: "low",       pairingScore: 98 },
  { id: "b2",  name: "Macallan 18 Sherry Oak",     category: "scotch",     brand: "Macallan",     age: "18yr", bottlesRemaining: 4,  bottlesCapacity: 8,  pourCount: 22, pricePerPour: 68,  status: "available", pairingScore: 95 },
  { id: "b3",  name: "Hennessy XO",                category: "cognac",     brand: "Hennessy",           bottlesRemaining: 5,  bottlesCapacity: 8,  pourCount: 18, pricePerPour: 78,  status: "available", pairingScore: 91 },
  { id: "b4",  name: "Old Forester 1920",          category: "bourbon",    brand: "Old Forester", age: "1920", bottlesRemaining: 7,  bottlesCapacity: 12, pourCount: 34, pricePerPour: 42,  status: "available", pairingScore: 88 },
  { id: "b5",  name: "Blanton's Single Barrel",    category: "bourbon",    brand: "Blanton's",          bottlesRemaining: 2,  bottlesCapacity: 6,  pourCount: 9,  pricePerPour: 54,  status: "critical",  pairingScore: 96 },
  { id: "b6",  name: "Woodford Reserve Double",    category: "bourbon",    brand: "Woodford",           bottlesRemaining: 6,  bottlesCapacity: 10, pourCount: 28, pricePerPour: 38,  status: "available", pairingScore: 84 },
  { id: "b7",  name: "Clase Azul Reposado",        category: "tequila",    brand: "Clase Azul",         bottlesRemaining: 3,  bottlesCapacity: 6,  pourCount: 12, pricePerPour: 52,  status: "low",       pairingScore: 82 },
  { id: "b8",  name: "Dom Pérignon 2015",          category: "champagne",  brand: "Moët & Chandon",     bottlesRemaining: 4,  bottlesCapacity: 12, pourCount: 6,  pricePerPour: 210, status: "reserved",  pairingScore: 97 },
  { id: "b9",  name: "Opus One 2019",              category: "wine",       brand: "Opus One",           bottlesRemaining: 2,  bottlesCapacity: 6,  pourCount: 8,  pricePerPour: 180, status: "critical",  pairingScore: 94 },
  { id: "b10", name: "Buffalo Trace",              category: "bourbon",    brand: "Buffalo Trace",      bottlesRemaining: 8,  bottlesCapacity: 12, pourCount: 32, pricePerPour: 28,  status: "available", pairingScore: 80 },
];

export function getBarSummary(items: BarItem[]) {
  const totalBottles = items.reduce((s, i) => s + i.bottlesRemaining, 0);
  const critical     = items.filter(i => i.status === "critical");
  const totalPours   = items.reduce((s, i) => s + i.pourCount, 0);
  return { totalBottles, critical, totalPours };
}

/* ─────────────── KITCHEN ─────────────── */
export interface KitchenItem {
  id: string;
  name: string;
  category: "small_plate" | "amuse" | "cheese" | "charcuterie" | "dessert" | "sensory_pairing";
  description: string;
  servingsRemaining: number;
  servingsCapacity: number;
  prepTime: string;
  pairingNotes: string;
  soldTonight: number;
  status: "available" | "low" | "sold_out" | "prep";
  popularityScore: number;
}

export const KITCHEN_INVENTORY: KitchenItem[] = [
  { id: "k1",  name: "Wagyu Beef Sliders",           category: "small_plate",     description: "A5 Wagyu, black garlic aioli, brioche",               servingsRemaining: 8,  servingsCapacity: 24, prepTime: "12 min", pairingNotes: "Pairs with Full-bodied bourbons and Full-strength cigars", soldTonight: 14, status: "low",       popularityScore: 97 },
  { id: "k2",  name: "Lobster Bisque Shot",           category: "amuse",           description: "Maine lobster, tarragon cream, caviar",               servingsRemaining: 0,  servingsCapacity: 30, prepTime: "—",      pairingNotes: "Pairs with Champagne and Mild cigars",                    soldTonight: 30, status: "sold_out",  popularityScore: 94 },
  { id: "k3",  name: "Truffle Deviled Eggs",          category: "amuse",           description: "Black truffle, Dijon, smoked paprika",                servingsRemaining: 14, servingsCapacity: 36, prepTime: "5 min",  pairingNotes: "Pairs with Medium-bodied Scotch and Medium cigars",       soldTonight: 20, status: "available", popularityScore: 88 },
  { id: "k4",  name: "Premium Cigar Pairing Board",  category: "sensory_pairing", description: "Dark chocolate, dried figs, roasted coffee, honeycomb",servingsRemaining: 6,  servingsCapacity: 15, prepTime: "8 min",  pairingNotes: "Universal pairing — enhances all cigar profiles",         soldTonight: 9,  status: "low",       popularityScore: 96 },
  { id: "k5",  name: "Pan-Seared Sea Bass",           category: "small_plate",     description: "Chilean sea bass, miso glaze, micro herbs",           servingsRemaining: 4,  servingsCapacity: 12, prepTime: "18 min", pairingNotes: "Pairs with Light-Medium cigars and Chardonnay",           soldTonight: 8,  status: "low",       popularityScore: 85 },
  { id: "k6",  name: "Artisan Cheese Slate",          category: "cheese",          description: "Aged Gouda, Manchego, Brie de Meaux, quince paste",   servingsRemaining: 10, servingsCapacity: 20, prepTime: "6 min",  pairingNotes: "Pairs excellently with Cognac and Medium-Full cigars",    soldTonight: 10, status: "available", popularityScore: 82 },
  { id: "k7",  name: "Reserve Charcuterie Board",    category: "charcuterie",     description: "Prosciutto di Parma, Jamón Ibérico, cornichons",       servingsRemaining: 5,  servingsCapacity: 15, prepTime: "7 min",  pairingNotes: "Pairs with Bourbon, Scotch, and Full cigars",             soldTonight: 10, status: "low",       popularityScore: 90 },
  { id: "k8",  name: "Valrhona Dark Chocolate",       category: "dessert",         description: "70% Valrhona, fleur de sel, raspberry coulis",        servingsRemaining: 18, servingsCapacity: 30, prepTime: "4 min",  pairingNotes: "Classic finish — pairs with Maduro wrappers and aged rum", soldTonight: 12, status: "available", popularityScore: 78 },
];

export function getKitchenSummary(items: KitchenItem[]) {
  const soldOut  = items.filter(i => i.status === "sold_out");
  const low      = items.filter(i => i.status === "low");
  const available= items.filter(i => i.status === "available");
  const totalSold= items.reduce((s, i) => s + i.soldTonight, 0);
  return { soldOut, low, available, totalSold };
}

/* ─────────────── React hook ─────────────── */
export function useInventory() {
  const [humidor,  setHumidor]  = useState<HumidorItem[]>(HUMIDOR_INVENTORY);
  const [bar,      setBar]      = useState<BarItem[]>(BAR_INVENTORY);
  const [kitchen,  setKitchen]  = useState<KitchenItem[]>(KITCHEN_INVENTORY);
  const [humidity, setHumidity] = useState(71);
  const [temp,     setTemp]     = useState(68);

  useEffect(() => {
    const id = setInterval(() => {
      setHumidity(h => parseFloat(Math.min(76, Math.max(63, h + (Math.random() - 0.5) * 0.8)).toFixed(1)));
      setTemp(t => parseFloat(Math.min(74, Math.max(64, t + (Math.random() - 0.5) * 0.5)).toFixed(1)));

      if (Math.random() < 0.08) {
        setBar(items => items.map(item =>
          item.pourCount > 0 && Math.random() < 0.15
            ? { ...item, pourCount: item.pourCount + 1, bottlesRemaining: Math.max(0, item.bottlesRemaining - (item.pourCount % 6 === 0 ? 1 : 0)) }
            : item
        ));
      }

      if (Math.random() < 0.05) {
        setHumidor(items => items.map(item =>
          item.qty > 0 && Math.random() < 0.12
            ? { ...item, qty: item.qty - 1, humidityActual: parseFloat((item.humidityTarget + (Math.random() - 0.5) * 4).toFixed(1)) }
            : item
        ));
      }
    }, 4800);
    return () => clearInterval(id);
  }, []);

  return {
    humidor, bar, kitchen,
    ambientHumidity: humidity,
    ambientTemp: temp,
    humidorSummary:  getHumidorSummary(humidor),
    barSummary:      getBarSummary(bar),
    kitchenSummary:  getKitchenSummary(kitchen),
  };
}
