/**
 * Provider Abstraction Layer — public exports
 *
 * ALL orchestrators are exported from here.
 * Route handlers must NEVER import provider-specific code directly —
 * they must use these orchestrators.
 *
 * Orchestrator responsibilities:
 *   AIOrchestrator      — AI / LLM generation (OpenAI + failover)
 *   POSOrchestrator     — POS order routing (Toast / Square / Clover / Lightspeed)
 *   StripeOrchestrator  — Payment processing (Stripe via credential vault)
 *   VoiceOrchestrator   — TTS synthesis (ElevenLabs via credential vault)
 *   BookingOrchestrator — Reservation / table booking lifecycle
 *   LightingOrchestrator — Venue ambient lighting scene control
 *   MusicOrchestrator   — Venue ambient music / playlist sync
 */

export { AIOrchestrator }       from "./AIOrchestrator";
export { POSOrchestrator }      from "./POSOrchestrator";
export {
  StripeOrchestrator,
  getStripeContext,
  recordStripeSuccess,
  recordStripeFailure,
  resolveStripeKeyLegacy,
}                               from "./StripeOrchestrator";
export type { StripeContext }   from "./StripeOrchestrator";

export { VoiceOrchestrator }    from "./VoiceOrchestrator";
export type {
  SynthesizeOptions,
  SynthesizeResult,
}                               from "./VoiceOrchestrator";

export { BookingOrchestrator }  from "./BookingOrchestrator";
export type {
  CreateBookingOptions,
  UpdateBookingOptions,
  BookingResult,
  BookingStatus,
}                               from "./BookingOrchestrator";

export { LightingOrchestrator } from "./LightingOrchestrator";
export type {
  ChangeLightingOptions,
  LightingResult,
  LightingPreset,
}                               from "./LightingOrchestrator";

export { MusicOrchestrator }    from "./MusicOrchestrator";
export type {
  SyncPlaylistOptions,
  MusicResult,
  MusicGenre,
  MusicTempo,
}                               from "./MusicOrchestrator";

export { bootKernelProviders, SYSTEM_VENUE_ID } from "./kernelProviderBoot";
