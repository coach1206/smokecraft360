interface MoodSelectorProps {
  selected: string;
  onChange: (mood: string) => void;
}

const MOODS = ["relaxed", "bold", "social", "reflective", "celebratory", "focused", "adventurous", "intense"];

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="mood-selector">
      {MOODS.map((mood) => {
        const isSelected = selected === mood;
        return (
          <button
            key={mood}
            data-testid={`mood-btn-${mood}`}
            onClick={() => onChange(mood)}
            className={`py-3 px-4 rounded border text-sm font-serif capitalize tracking-wider transition-all duration-300 ${
              isSelected
                ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(200,150,50,0.2)]"
                : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {mood}
          </button>
        );
      })}
    </div>
  );
}
