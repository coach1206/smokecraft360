import { Slider } from "@/components/ui/slider";

interface StrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const LABELS = ["", "Very Mild", "Mild", "Medium", "Full", "Intense"];

export function StrengthSlider({ value, onChange }: StrengthSliderProps) {
  return (
    <div className="w-full space-y-6 py-4" data-testid="strength-slider-container">
      <div className="flex justify-between items-end">
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "rgba(180,155,100,0.55)", fontFamily: "inherit" }}
        >
          Mild
        </span>
        <div className="text-center">
          <div
            className="font-serif leading-none"
            style={{ fontSize: "2.4rem", color: "rgba(212,175,55,0.9)" }}
            data-testid="strength-value"
          >
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: "rgba(180,155,100,0.5)" }}>
            {LABELS[value]}
          </div>
        </div>
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "rgba(180,155,100,0.55)" }}
        >
          Intense
        </span>
      </div>

      {/* Custom styled slider */}
      <div className="relative py-2">
        <Slider
          min={1}
          max={5}
          step={1}
          value={[value]}
          onValueChange={(val) => onChange(val[0])}
          className="cursor-pointer"
          data-testid="strength-slider"
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between px-0.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex flex-col items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full transition-all duration-500"
              style={
                step <= value
                  ? {
                      background: "linear-gradient(135deg, hsl(48 90% 60%), hsl(43 85% 48%))",
                      boxShadow: "0 0 8px rgba(212,175,55,0.55)",
                    }
                  : { background: "rgba(255,255,255,0.07)" }
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
