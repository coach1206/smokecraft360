import { Slider } from "@/components/ui/slider";

interface StrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function StrengthSlider({ value, onChange }: StrengthSliderProps) {
  return (
    <div className="w-full space-y-6 py-4" data-testid="strength-slider-container">
      <div className="flex justify-between items-end">
        <span className="text-sm font-serif text-muted-foreground uppercase tracking-widest">Mild</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-serif text-primary" data-testid="strength-value">{value}</span>
          <span className="text-sm text-muted-foreground pb-1">/ 5</span>
        </div>
        <span className="text-sm font-serif text-muted-foreground uppercase tracking-widest">Intense</span>
      </div>
      
      <Slider
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        className="cursor-pointer"
        data-testid="strength-slider"
      />
      
      <div className="flex justify-between px-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
              step <= value ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
