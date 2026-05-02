import { Slider } from "@/components/ui/slider";

interface StrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const STRENGTH_LABELS = ["", "Very Mild", "Mild", "Medium", "Full", "Intense"];
const STRENGTH_DESCRIPTIONS = [
  "",
  "Light and smooth — gentle on the palate",
  "Easy and pleasant — a good everyday choice",
  "Balanced — the classic sweet spot",
  "Rich and full — bold character",
  "Powerful and commanding — for the experienced",
];

export function StrengthSlider({ value, onChange }: StrengthSliderProps) {
  return (
    <div className="w-full space-y-5 py-2" data-testid="strength-slider-container">
      {/* Value display */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium uppercase tracking-[0.18em]"
          style={{ color: "rgba(190,165,120,0.65)" }}>
          Mild
        </span>
        <div className="text-center">
          <div className="font-serif leading-none"
            style={{ fontSize: "2.8rem", color: "rgba(212,175,55,0.95)", fontWeight: 700 }}
            data-testid="strength-value">
            {value}
          </div>
          <div className="text-sm font-semibold uppercase tracking-[0.15em] mt-1"
            style={{ color: "rgba(212,175,55,0.80)" }}>
            {STRENGTH_LABELS[value]}
          </div>
        </div>
        <span className="text-sm font-medium uppercase tracking-[0.18em]"
          style={{ color: "rgba(190,165,120,0.65)" }}>
          Intense
        </span>
      </div>

      {/* Slider */}
      <div className="relative py-3">
        <Slider
          min={1} max={5} step={1}
          value={[value]}
          onValueChange={(val) => onChange(val[0])}
          className="cursor-pointer"
          data-testid="strength-slider"
        />
      </div>

      {/* Step dots + labels */}
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full transition-all duration-400"
              style={step <= value ? {
                background: "linear-gradient(135deg, hsl(48 90% 60%), hsl(43 85% 48%))",
                boxShadow:  "0 0 10px rgba(212,175,55,0.6)",
              } : { background: "rgba(255,255,255,0.10)" }} />
            <span className="text-xs font-medium text-center leading-tight"
              style={{ color: step <= value ? "rgba(212,175,55,0.75)" : "rgba(180,155,100,0.35)", fontSize: 11 }}>
              {["V.Mild","Mild","Medium","Full","Intense"][step - 1]}
            </span>
          </div>
        ))}
      </div>

      {/* Feedback text */}
      {value > 0 && (
        <p className="text-sm font-medium" style={{ color: "rgba(212,175,55,0.72)" }}>
          ✓ {STRENGTH_DESCRIPTIONS[value]}
        </p>
      )}
    </div>
  );
}
