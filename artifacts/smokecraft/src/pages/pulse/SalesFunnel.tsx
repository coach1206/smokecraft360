import { motion } from "framer-motion";
import { usePulse } from "./PulseContext";

const P = {
  surface: "rgba(6,15,35,0.95)",
  border:  "rgba(0,180,255,0.12)",
  blue:    "#00C4E8",
  platinum:"#E8EDF5",
  green:   "#22c55e",
  amber:   "#F59E0B",
  red:     "#ef4444",
  faint:   "rgba(100,160,220,0.35)",
  sub:     "rgba(168,216,240,0.65)",
  fore:    "#E8EDF5",
  mono:    "'SF Mono','Fira Code',monospace",
  sans:    "system-ui,-apple-system,'Helvetica Neue',sans-serif",
};

const STAGES = [
  { key: "discovery"  as const, label: "DISCOVERY",   desc: "Guests shown menu" },
  { key: "engagement" as const, label: "ENGAGEMENT",  desc: "Profiles viewed"   },
  { key: "selection"  as const, label: "SELECTION",   desc: "Items chosen"      },
  { key: "conversion" as const, label: "CONVERSION",  desc: "Orders completed"  },
];

function dropRate(a: number, b: number): number {
  if (a === 0) return 0;
  return Math.round((1 - b / a) * 100);
}

function connectorColor(isBottleneck: boolean): string {
  return isBottleneck ? P.amber : P.blue;
}

export function SalesFunnel() {
  const { data } = usePulse();
  const f = data?.funnel ?? { discovery: 148, engagement: 63, selection: 29, conversion: 18 };

  const values: Record<(typeof STAGES)[number]["key"], number> = {
    discovery:  f.discovery,
    engagement: f.engagement,
    selection:  f.selection,
    conversion: f.conversion,
  };

  // Bottleneck detection
  const selToConvRate  = f.selection  > 0 ? f.conversion / f.selection  : 1;
  const engToSelRate   = f.engagement > 0 ? f.selection  / f.engagement : 1;
  const discToEngRate  = f.discovery  > 0 ? f.engagement / f.discovery  : 1;

  const maxVal = Math.max(...Object.values(values));

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 14, padding: "20px 22px",
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: P.blue, fontFamily: P.mono, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          REVENUE FUNNEL
        </div>
        <div style={{ fontSize: 11, color: "rgba(168,216,240,0.50)", fontFamily: P.sans, marginTop: 3 }}>
          Discovery → Engagement → Selection → Conversion
        </div>
      </div>

      {/* Flow graph */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STAGES.map((stage, i) => {
          const val    = values[stage.key];
          const widthPct = Math.max(18, (val / maxVal) * 100);

          // Determine if the transition INTO this stage is a bottleneck
          let bottleneck = false;
          if (stage.key === "engagement" && discToEngRate < 0.35)  bottleneck = true;
          if (stage.key === "selection"  && engToSelRate  < 0.35)  bottleneck = true;
          if (stage.key === "conversion" && selToConvRate < 0.35)  bottleneck = true;

          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              {/* Stage block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Label */}
                <div style={{ fontSize: 7, color: P.faint, fontFamily: P.mono, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
                  {stage.label}
                </div>

                {/* Bar */}
                <div style={{ height: 32, background: "rgba(0,0,0,0.35)", borderRadius: 4, overflow: "hidden", marginBottom: 6, position: "relative" }}>
                  <motion.div
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      background: isLast
                        ? `linear-gradient(90deg, ${P.green}, ${P.green}88)`
                        : `linear-gradient(90deg, ${P.blue}, ${P.blue}88)`,
                      borderRadius: 4,
                      boxShadow: isLast
                        ? `0 0 12px rgba(34,197,94,0.35)`
                        : `0 0 12px rgba(0,196,232,0.30)`,
                      display: "flex", alignItems: "center", paddingLeft: 10,
                    }}
                  >
                    <motion.span
                      animate={{ opacity: 1 }}
                      initial={{ opacity: 0 }}
                      style={{
                        fontSize: 13, fontFamily: P.mono, fontWeight: 800,
                        color: P.fore, letterSpacing: "0.05em", whiteSpace: "nowrap",
                      }}
                    >
                      {val.toLocaleString()}
                    </motion.span>
                  </motion.div>
                </div>

                {/* Desc + drop rate */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 9, color: P.sub, fontFamily: P.sans }}>{stage.desc}</div>
                  {i > 0 && (
                    <div style={{
                      fontSize: 8, fontFamily: P.mono, fontWeight: 700,
                      color: bottleneck ? P.amber : P.faint,
                    }}>
                      {dropRate(
                        values[STAGES[i-1].key],
                        val,
                      )}% drop
                    </div>
                  )}
                </div>
              </div>

              {/* Connector arrow */}
              {!isLast && (
                <div style={{ padding: "0 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.3 }}
                    style={{
                      fontSize: 14,
                      color: connectorColor(
                        (i === 0 && discToEngRate < 0.35) ||
                        (i === 1 && engToSelRate  < 0.35) ||
                        (i === 2 && selToConvRate < 0.35)
                      ),
                    }}
                  >
                    ›
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottleneck legend */}
      {(discToEngRate < 0.35 || engToSelRate < 0.35 || selToConvRate < 0.35) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 14, padding: "8px 12px",
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)",
            borderRadius: 8, fontSize: 9, color: P.amber, fontFamily: P.mono, letterSpacing: "0.1em",
          }}
        >
          STAFF BOTTLENECK DETECTED — low conversion in flagged segment
        </motion.div>
      )}
    </div>
  );
}
