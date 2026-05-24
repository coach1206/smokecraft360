import { TouchCard } from "./TouchCard";

interface Section {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const ICON_MAP: Record<string, string> = {
  venues: "◈",
  revenue: "◆",
  campaigns: "◇",
  alerts: "△",
  devices: "▣",
  partners: "◬",
  fraud: "◉",
  demo: "▶",
  experience: "✦",
  orders: "▤",
  inventory: "▥",
  rewards: "★",
  staff: "◎",
  product: "▢",
  catalog: "▧",
  performance: "◆",
  payouts: "◈",
  assets: "◇",
};

interface RoleHomeGridProps {
  sections: Section[];
  onSelect: (sectionId: string) => void;
}

export function RoleHomeGrid({ sections, onSelect }: RoleHomeGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
        padding: "4px 0",
      }}
    >
      {sections.map((s) => (
        <TouchCard
          key={s.id}
          label={s.label}
          description={s.description}
          icon={<span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22 }}>{ICON_MAP[s.icon] ?? "◆"}</span>}
          onClick={() => onSelect(s.id)}
          variant={s.id === "experience" || s.id === "demo" ? "gold" : "default"}
        />
      ))}
    </div>
  );
}
