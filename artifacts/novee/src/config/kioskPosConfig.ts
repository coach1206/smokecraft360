export type SupportedPOSProvider = "clover" | "toast" | "square" | "lightspeed";

export const POS_TERMINAL_CONFIG = {
  terminalId: "KLO-TERMINAL-04B",
  venueId: "00000000-0000-0000-0000-000000000001",
  laneName: "VIP Lounge POS 3",
  preferredProvider: "clover" as SupportedPOSProvider,
  supportedProviders: ["clover", "toast", "square", "lightspeed"] as SupportedPOSProvider[],
  offlineQueueLimit: 75,
  idleResetMs: 180_000,
  staffIdleResetMs: 600_000,
  minTouchTargetPx: 54,
  orientation: "landscape",
  capabilities: {
    offlineShadowTabs: true,
    seatAssignment: true,
    kdsHoldForRitual: true,
    inventoryDeduction: true,
    paymentTokenQueue: true,
  },
} as const;

export function formatProviderLabel(provider: SupportedPOSProvider): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
