import { useCallback, useRef, useState } from "react";

export type EngagementAction =
  | "select"
  | "customize"
  | "confirm"
  | "purchase"
  | "navigate"
  | "experience_start"
  | "experience_answer"
  | "experience_complete"
  | "campaign_enter"
  | "craft_complete"
  | "design_save";

const POINTS_MAP: Record<EngagementAction, number> = {
  select:               10,
  customize:            15,
  confirm:              25,
  purchase:             50,
  navigate:              5,
  experience_start:     10,
  experience_answer:     5,
  experience_complete:  30,
  campaign_enter:       20,
  craft_complete:       30,
  design_save:          10,
};

const COOLDOWN_MS = 2000;

interface EngagementState {
  totalPoints: number;
  sessionActions: number;
  lastReward: { action: EngagementAction; points: number } | null;
}

export function useEngagement() {
  const [state, setState] = useState<EngagementState>({
    totalPoints: 0,
    sessionActions: 0,
    lastReward: null,
  });
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackAction = useCallback((action: EngagementAction, meta?: Record<string, string>) => {
    const now = Date.now();
    const lastTime = cooldownRef.current.get(action) ?? 0;
    if (now - lastTime < COOLDOWN_MS && action !== "purchase" && action !== "confirm") {
      return 0;
    }
    cooldownRef.current.set(action, now);

    const points = POINTS_MAP[action] ?? 0;

    setState(prev => ({
      totalPoints: prev.totalPoints + points,
      sessionActions: prev.sessionActions + 1,
      lastReward: { action, points },
    }));

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, lastReward: null }));
    }, 2500);

    const token = localStorage.getItem("smokecraft_token");
    if (token) {
      const REASON_MAP: Partial<Record<EngagementAction, string>> = {
        experience_complete: "taste_challenge",
        customize:           "build_your_own",
        craft_complete:      "craft_complete",
        design_save:         "design_save",
      };
      const reason = REASON_MAP[action];
      if (reason) {
        fetch("/api/loyalty/award", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ points: Math.min(points, 500), reason }),
        }).catch(() => {});
      }
    }

    const EVENT_MAP: Partial<Record<EngagementAction, string>> = {
      select:           "product_selected",
      purchase:         "order_created",
      campaign_enter:   "campaign_conversion",
      experience_start: "recommendation_view",
      craft_complete:   "recommendation_view",
    };
    const mappedEvent = EVENT_MAP[action];
    if (mappedEvent) {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: mappedEvent,
          metadata: { engagementAction: action, points, ...(meta ?? {}) },
        }),
      }).catch(() => {});
    }

    return points;
  }, []);

  const dismissReward = useCallback(() => {
    setState(prev => ({ ...prev, lastReward: null }));
  }, []);

  return { ...state, trackAction, dismissReward };
}
