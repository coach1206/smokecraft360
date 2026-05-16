/**
 * environmentalGraph — maps relationships between environmental states,
 * ambient scenes, guest behaviors, and engagement outcomes.
 */

import { RelationshipGraph } from "./relationshipGraph";
import { logger }            from "../lib/logger";

export const environmentalGraph = new RelationshipGraph("environmental");

export function recordSceneTransition(
  fromScene: string,
  toScene:   string,
  trigger:   string,
  deltaEngagement: number,
): void {
  environmentalGraph.upsertNode(fromScene, "environment", fromScene);
  environmentalGraph.upsertNode(toScene,   "environment", toScene);
  environmentalGraph.upsertNode(trigger,   "orchestration", trigger);

  const quality = Math.max(0, Math.min(1, (deltaEngagement + 1) / 2));
  environmentalGraph.addEdge(fromScene, toScene,   "transitions_to", quality);
  environmentalGraph.addEdge(trigger,  toScene,    "triggers",       quality);
  environmentalGraph.addEdge(toScene,  fromScene,  "reverts_to",     1 - quality);
}

export function recordSceneOutcome(
  scene:      string,
  craftType:  string,
  hour:       number,
  engagement: number,
): void {
  const timeCtx = `hour:${hour}`;
  environmentalGraph.upsertNode(scene,    "environment", scene);
  environmentalGraph.upsertNode(craftType,"product",     craftType);
  environmentalGraph.upsertNode(timeCtx,  "temporal_pattern", timeCtx);

  const weight = Math.max(0, Math.min(1, engagement));
  environmentalGraph.addEdge(scene, craftType, "optimized_for", weight);
  environmentalGraph.addEdge(scene, timeCtx,   "effective_at",  weight);
}

export function recommendTransition(fromScene: string): string | null {
  const options = environmentalGraph.neighbors(fromScene, "transitions_to");
  if (!options.length) return null;
  const best = options.reduce((a, b) => b.id > a.id ? b : a);
  return best.label;
}

export function bestSceneForCraft(craftType: string): string | null {
  const incomers = environmentalGraph.incomingNeighbors(craftType, "optimized_for");
  return incomers.length ? incomers[0].label : null;
}

export function graphStats(): { nodes: number; edges: number; name: string } {
  return { ...environmentalGraph.stats(), name: environmentalGraph.name };
}

logger.debug("environmentalGraph: module loaded");
