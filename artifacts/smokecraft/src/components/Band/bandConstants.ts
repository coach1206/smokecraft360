export interface ColorOption {
  id: string;
  label: string;
  primary: string;
  accent: string;
  text: string;
  eliteOnly?: boolean;
}

export interface EmblemOption {
  id: string;
  label: string;
  eliteOnly?: boolean;
}

export interface StyleOption {
  id: string;
  label: string;
  descriptor: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { id: "gold",     label: "Gold",     primary: "#2A1F08", accent: "#D48B00", text: "#F5E4A0" },
  { id: "black",    label: "Onyx",     primary: "#141010", accent: "#8B7355", text: "#D4C4A0" },
  { id: "burgundy", label: "Burgundy", primary: "#3A0F18", accent: "#C4708A", text: "#F0C8D4" },
  { id: "navy",     label: "Navy",     primary: "#0F1B35", accent: "#4A8AC4", text: "#C4D8F0" },
  { id: "forest",   label: "Forest",   primary: "#0F2018", accent: "#6AB87A", text: "#C4E8CC" },
  { id: "crimson",  label: "Crimson",  primary: "#2A0808", accent: "#C46060", text: "#F0C4C4" },
  { id: "obsidian", label: "Obsidian", primary: "#060606", accent: "#A0A0A0", text: "#E0E0E0", eliteOnly: true },
  { id: "platinum", label: "Platinum", primary: "#1A1814", accent: "#C8C8C8", text: "#1A1A1B",  eliteOnly: true },
  { id: "jade",     label: "Jade",     primary: "#041C14", accent: "#3DB88A", text: "#B0F0D8",  eliteOnly: true },
  { id: "rose",     label: "Rose",     primary: "#200A14", accent: "#E07090", text: "#F8D0E0",  eliteOnly: true },
];

export const EMBLEM_OPTIONS: EmblemOption[] = [
  { id: "crown",   label: "Crown"   },
  { id: "flame",   label: "Flame"   },
  { id: "leaf",    label: "Leaf"    },
  { id: "star",    label: "Star"    },
  { id: "shield",  label: "Shield"  },
  { id: "diamond", label: "Diamond", eliteOnly: true },
  { id: "zap",     label: "Bolt",    eliteOnly: true },
  { id: "anchor",  label: "Anchor",  eliteOnly: true },
  { id: "eye",     label: "Eye",     eliteOnly: true },
];

export const BLEND_STYLES: StyleOption[] = [
  { id: "bold",     label: "Bold",     descriptor: "Full-Bodied Character" },
  { id: "smooth",   label: "Smooth",   descriptor: "Effortless Refinement"  },
  { id: "rich",     label: "Rich",     descriptor: "Deep Complexity"        },
  { id: "exotic",   label: "Exotic",   descriptor: "Rare Distinction"       },
  { id: "delicate", label: "Delicate", descriptor: "Subtle Elegance"        },
];

export const TEXT_STYLES = [
  { id: "serif",  label: "Serif",  eliteOnly: false },
  { id: "sans",   label: "Sans",   eliteOnly: false },
  { id: "italic", label: "Italic", eliteOnly: true  },
] as const;
