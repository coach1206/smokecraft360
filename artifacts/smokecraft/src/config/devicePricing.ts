/**
 * devicePricing — static pricing reference for tablet and kiosk hardware.
 * Read-only in the UI; admin-editable in a future pricing management module.
 */

export const DEVICE_PRICING = {
  tablet: {
    rentalMonthly:    35,
    purchaseOneTime:  350,
    currency:         "USD",
    description:      "Touch-first table experience, fast ordering, swipe recommendations",
    features: [
      "Touch-optimised UI",
      "Auto-launch SmokeCraft 360",
      "Staff reset control",
      "Fast-order mode",
    ],
  },
  kiosk: {
    rentalMonthly:    199,
    purchaseOneTime:  1_600,
    currency:         "USD",
    description:      "Full-screen front-of-house unit with guided experience and auto-reset",
    features: [
      "Full-screen immersive UI",
      "90-second inactivity auto-reset",
      "Guided experience flow",
      "Custom venue branding",
      "Usage analytics",
    ],
  },
} as const;

export const PLAN_BUNDLES = {
  base: {
    label:       "Base",
    subtitle:    "QR only — no hardware required",
    price:       0,
    features:    ["Venue QR code", "Table QR codes", "BYOD mobile experience"],
    kioskMode:   false,
    maxDevices:  0,
    analytics:   false,
  },
  experience: {
    label:       "Experience",
    subtitle:    "QR + 1 kiosk + tablet support",
    price:       99,
    features:    ["Everything in Base", "1 kiosk device", "Unlimited tablet registrations", "Device analytics"],
    kioskMode:   true,
    maxDevices:  3,
    analytics:   true,
  },
  elite: {
    label:       "Elite",
    subtitle:    "Multiple kiosks · full device features",
    price:       249,
    features:    ["Everything in Experience", "Unlimited kiosks", "Priority support", "Advanced device analytics", "Custom theme per device"],
    kioskMode:   true,
    maxDevices:  Infinity,
    analytics:   true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_BUNDLES;

/** Map venue plan (DB) → bundle key */
export function venuePlanToBundle(plan: "basic" | "mid" | "premium"): PlanKey {
  if (plan === "premium") return "elite";
  if (plan === "mid")     return "experience";
  return "base";
}
