/**
 * NOVEE OS Runtime Engine Registry
 *
 * Central barrel export for all singleton engine instances.
 * Import from here rather than individual files.
 *
 * Initialization order matters:
 *   1. ExperienceStateEngine      — base state machine (no dependencies)
 *   2. EnvironmentalOrchestratorEngine — subscribes to ExperienceStateEngine
 *   3. SignalVisualizationEngine  — subscribes to ExperienceStateEngine
 *   4. EnvironmentalMemoryEngine  — references both State + Env engines
 *   5. SpatialNavigationEngine    — references State + Env engines
 *   6. CinematicTransitionEngine  — standalone, no engine deps
 *   7. ExperienceFlowOrchestrator — references all of the above
 *
 * All engines are singletons instantiated at module load time.
 * No explicit init() call required — subscribe immediately after import.
 */

export { ExperienceStateEngine }           from "./ExperienceStateEngine";
export type {
  JourneyStage,
  EmotionalPacing,
  CraftType,
  ExperienceState,
}                                          from "./ExperienceStateEngine";

export { EnvironmentalOrchestratorEngine } from "./EnvironmentalOrchestratorEngine";
export type {
  AtmosphericMode,
  EnvironmentalState,
}                                          from "./EnvironmentalOrchestratorEngine";

export { SpatialNavigationEngine }         from "./SpatialNavigationEngine";
export type {
  NavigationIntent,
  SpatialNavEvent,
}                                          from "./SpatialNavigationEngine";

export { SignalVisualizationEngine }       from "./SignalVisualizationEngine";
export type {
  SignalType,
  SignalEvent,
  NodeState,
}                                          from "./SignalVisualizationEngine";

export { CinematicTransitionEngine }       from "./CinematicTransitionEngine";
export type {
  TransitionType,
  TransitionConfig,
  TransitionOrigin,
}                                          from "./CinematicTransitionEngine";

export { EnvironmentalMemoryEngine }       from "./EnvironmentalMemoryEngine";
export type {
  EnvironmentalMemory,
}                                          from "./EnvironmentalMemoryEngine";

export { ExperienceFlowOrchestrator }      from "./ExperienceFlowOrchestrator";
export type {
  FlowMilestone,
  FlowEventType,
  FlowEvent,
  FlowState,
}                                          from "./ExperienceFlowOrchestrator";

export { EnvironmentalContinuityEngine }   from "./EnvironmentalContinuityEngine";
export type {
  SensoryProfile,
  ContinuousEnvironmentState,
}                                          from "./EnvironmentalContinuityEngine";

export { OperationalSurfacingEngine }      from "./OperationalSurfacingEngine";
export type {
  SurfacingPhase,
  SurfacingState,
}                                          from "./OperationalSurfacingEngine";

export { SensoryWeightEngine }             from "./SensoryWeightEngine";
export type {
  SensoryWeightState,
  TouchRipple,
}                                          from "./SensoryWeightEngine";
