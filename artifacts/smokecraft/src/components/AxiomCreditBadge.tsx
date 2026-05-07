/**
 * AxiomCreditBadge — Tokenized Prestige currency display.
 *
 * Shows the guest's Axiom Credit balance inline.
 * Animates on balance change.
 * Renders a "GHOST ACCESS" badge when tier is craftsman+ (ghost tickers unlocked).
 *
 * Usage: <AxiomCreditBadge guestId={guestProfile.id} />
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }      from "framer-motion";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

interface BalanceData {
  balance:          number;
  masteryTier:      string;
  totalMastery:     number;
  ghostTickerAccess:boolean;
}

const TIER_COLOR: Record<string, string> = {
  explorer:    "rgba(26,26,27,0.40)",
  apprentice:  "#3BBFA3",
  craftsman:   "#a78bfa",
  sommelier:   "#D48B00",
  grand_master:"#f59e0b",
};

interface Props {
  guestId:   string;
  className?: string;
}

export default function AxiomCreditBadge({ guestId, className }: Props) {
  const [data,    setData]    = useState<BalanceData | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const prevBal  = useRef<number | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/credits/balance/${guestId}`)
      .then(r => r.ok ? r.json() as Promise<BalanceData> : null)
      .then(d => {
        if (!d) return;
        if (prevBal.current !== null && d.balance !== prevBal.current) setAnimKey(k => k + 1);
        prevBal.current = d.balance;
        setData(d);
      })
      .catch(() => {});
  }, [guestId]);

  if (!data) return null;

  const tierColor = TIER_COLOR[data.masteryTier] ?? TIER_COLOR.explorer;

  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {/* Credit counter */}
      <motion.div
        key={animKey}
        initial={{ scale: animKey > 0 ? 1.25 : 1, color: animKey > 0 ? "#4ade80" : tierColor }}
        animate={{ scale: 1, color: tierColor }}
        transition={{ duration: 0.5 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 11px", borderRadius: 20,
          background: `${tierColor}12`,
          border: `1px solid ${tierColor}44`,
        }}
      >
        <span style={{ fontSize: "0.58rem", fontWeight: 900, letterSpacing: "0.16em", color: tierColor, textTransform: "uppercase" }}>
          ✦ AX
        </span>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: tierColor, fontFamily: "'Cormorant Garamond', serif" }}>
          {data.balance.toLocaleString()}
        </span>
      </motion.div>

      {/* Ghost access badge */}
      <AnimatePresence>
        {data.ghostTickerAccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 9px", borderRadius: 20,
              background: "rgba(167,139,250,0.10)",
              border: "1px solid rgba(167,139,250,0.35)",
            }}
          >
            <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.12em", color: "#a78bfa", textTransform: "uppercase" }}>
              ◆ GHOST ACCESS
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
