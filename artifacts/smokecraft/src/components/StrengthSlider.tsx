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
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7B5A1E", textTransform: "uppercase", letterSpacing: "0.16em" }}>
          Mild
        </span>
        <div className="text-center">
          <div style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.8rem", fontWeight: 700, color: "#B8891A", lineHeight: 1 }}
            data-testid="strength-value">
            {value}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#7B5A1E", marginTop: 4 }}>
            {STRENGTH_LABELS[value]}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7B5A1E", textTransform: "uppercase", letterSpacing: "0.16em" }}>
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
                background: "linear-gradient(135deg, #b07c14, #D48B00)",
                boxShadow:  "0 0 10px rgba(212,139,0,0.55)",
              } : { background: "rgba(90,60,30,0.18)" }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.2,
              color: step <= value ? "#7B5A1E" : "rgba(90,60,30,0.4)",
            }}>
              {["V.Mild","Mild","Med","Full","Intense"][step - 1]}
            </span>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {value > 0 && (
        <p style={{ fontSize: 14, fontWeight: 600, color: "#7B5A1E" }}>
          ✓ {STRENGTH_DESCRIPTIONS[value]}
        </p>
      )}
    </div>
  );
}
