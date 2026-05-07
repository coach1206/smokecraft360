/**
 * UpgradePrompt — locked feature card shown when a venue lacks an entitlement.
 *
 * Usage:
 *   <UpgradePrompt featureId="ADVANCED_ANALYTICS" featureName="Advanced Analytics" />
 */

import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowUpRight } from "lucide-react";

interface Props {
  featureId:    string;
  featureName:  string;
  description?: string;
  compact?:     boolean;
}

const GOLD  = "rgba(212,139,0,";
const WHITE = "rgba(255,255,255,";

export function UpgradePrompt({ featureName, description, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{ background: `${GOLD}0.05)`, border: `1px solid ${GOLD}0.18)` }}>
        <Lock size={11} style={{ color: `${GOLD}0.5)` }} />
        <span style={{ color: `${GOLD}0.6)` }}>{featureName}</span>
        <span style={{ color: `${GOLD}0.35)` }}>— upgrade required</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-16 px-8 rounded-2xl text-center"
      style={{ background: `${GOLD}0.04)`, border: `1px solid ${GOLD}0.12)` }}>

      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${GOLD}0.08)`, border: `1px solid ${GOLD}0.2)` }}>
        <Lock size={22} style={{ color: `${GOLD}0.55)` }} />
      </div>

      <div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={13} style={{ color: `${GOLD}0.5)` }} />
          <span className="text-xs uppercase tracking-[0.2em]" style={{ color: `${GOLD}0.5)` }}>
            Premium Feature
          </span>
        </div>
        <h3 className="font-serif text-xl mb-2" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
          {featureName}
        </h3>
        {description && (
          <p className="text-sm max-w-sm mx-auto" style={{ color: `${WHITE}0.35)` }}>
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em]"
        style={{
          background: `linear-gradient(135deg, ${GOLD}0.15), ${GOLD}0.08))`,
          border:     `1px solid ${GOLD}0.3)`,
          color:      `${GOLD}0.75)`,
        }}>
        <ArrowUpRight size={13} />
        Contact Axiom to Upgrade
      </div>
    </motion.div>
  );
}
