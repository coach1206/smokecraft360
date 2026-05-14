/**
 * NOVEE OS — Dynamic Pricing Engine
 *
 * Single source of truth for all craft price calculations.
 * Called by PatronView (card display + sale recording) and any
 * future server-side price audit.
 *
 * Returns a `PriceInfo` object so callers never recompute derived values.
 */

export interface PriceInfo {
  price: number;
  label: string;
  /** Tailwind utility class controlling the label text colour */
  color: string;
}

export const calculateDynamicPrice = (
  basePrice: number,
  occupancy: number,
  isActive:  boolean,
  isMember:  boolean,
): PriceInfo => {
  // Members are ALWAYS locked at base price
  if (isMember) return { price: basePrice, label: 'Member Lock',      color: 'text-green-400'    };
  if (!isActive) return { price: basePrice, label: 'Standard',         color: 'text-[#1A1A1B]/50'     };

  if (occupancy > 80) {
    return { price: +(basePrice * 1.12).toFixed(2), label: 'Premium Demand',  color: 'text-red-500'      };
  }
  if (occupancy < 25) {
    return { price: +(basePrice * 0.85).toFixed(2), label: 'Volume Incentive', color: 'text-axiom-amber'  };
  }

  return { price: basePrice, label: 'Market Rate', color: 'text-[#1A1A1B]/50' };
};
