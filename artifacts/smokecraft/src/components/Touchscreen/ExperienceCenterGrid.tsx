import { TouchCard } from "./TouchCard";

interface ExperienceCenterGridProps {
  onSelect: (experienceId: string) => void;
  ndaSigned: boolean;
}

const EXPERIENCES = [
  { id: "smokecraft", label: "SmokeCraft", description: "Premium cigar experience", variant: "gold" as const },
  { id: "pourcraft", label: "PourCraft", description: "Fine spirits & whisky", variant: "default" as const },
  { id: "brewcraft", label: "BrewCraft", description: "Craft beer discovery", variant: "default" as const },
  { id: "vapecraft", label: "VapeCraft", description: "Modern vapor lounge", variant: "default" as const },
  { id: "investor", label: "Investor Walkthrough", description: "Full platform tour", variant: "glass" as const },
];

export function ExperienceCenterGrid({ onSelect, ndaSigned }: ExperienceCenterGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16,
        padding: "4px 0",
      }}
    >
      {EXPERIENCES.map((exp) => (
        <TouchCard
          key={exp.id}
          label={exp.label}
          description={exp.description}
          variant={exp.variant}
          size="large"
          disabled={!ndaSigned}
          onClick={() => ndaSigned && onSelect(exp.id)}
        />
      ))}
    </div>
  );
}
