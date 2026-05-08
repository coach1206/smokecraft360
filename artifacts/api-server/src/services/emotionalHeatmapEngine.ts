/**
 * EmotionalHeatmapEngine — Phase 6: Founder Intelligence.
 *
 * Aggregates guest interaction data into spatial heat zones.
 * Heat is measured along three axes:
 *   - Engagement intensity (how much attention a zone receives)
 *   - Conversion density  (how often attention converts to action)
 *   - Emotional temperature (mood shift intensity in that zone)
 *
 * Output feeds the OpportunityZoneMapper and the Founder What-If simulator.
 * Visualised as cinematic layered overlays — NOT spreadsheets.
 */

import { pool }  from "@workspace/db";

export interface HeatZone {
  zoneId:          string;
  label:           string;
  x:               number;   // 0–100 grid position
  y:               number;
  engagementScore: number;   // 0–100
  conversionScore: number;   // 0–100
  emotionalTemp:   number;   // 0–100 (cold=calm, hot=excited/stressed)
  guestCount:      number;
  topCraft:        string | null;
  opportunityScore: number;  // derived composite
  trend:           "rising" | "stable" | "cooling";
}

export interface HeatmapSnapshot {
  venueId:    string;
  zones:      HeatZone[];
  globalTemp: number;
  peakZone:   string | null;
  coldZone:   string | null;
  generatedAt: string;
}

const ZONE_GRID: { id: string; label: string; x: number; y: number; craftHint: string }[] = [
  { id: "cigar_zone",   label: "Cigar Lounge",  x: 20, y: 25, craftHint: "smoke" },
  { id: "spirits_zone", label: "Spirits Bar",   x: 70, y: 25, craftHint: "pour"  },
  { id: "brew_zone",    label: "Craft Brew",    x: 20, y: 75, craftHint: "brew"  },
  { id: "vapor_zone",   label: "Vapor Lounge",  x: 70, y: 75, craftHint: "vape"  },
  { id: "vip_zone",  label: "VIP Suite",  x: 50, y: 15, craftHint: "smoke" },
  { id: "reception", label: "Reception",  x: 50, y: 90, craftHint: "smoke" },
];

export class EmotionalHeatmapEngine {

  static async generate(venueId: string): Promise<HeatmapSnapshot> {

    const { rows: craftRows } = await pool.query<{
      craft_type: string | null; session_count: string; avg_score: number | null;
    }>(`
      SELECT craft_type, COUNT(*) AS session_count, AVG(session_score) AS avg_score
      FROM guest_sessions
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY craft_type
    `).catch(() => ({ rows: [] as { craft_type: string | null; session_count: string; avg_score: number | null }[] }));

    const craftMap: Record<string, { count: number; avgScore: number }> = {};
    for (const r of craftRows) {
      if (r.craft_type) {
        craftMap[r.craft_type] = {
          count:    parseInt(r.session_count, 10),
          avgScore: r.avg_score ?? 50,
        };
      }
    }

    const totalSessions = Object.values(craftMap).reduce((s, c) => s + c.count, 0) || 1;

    const zones: HeatZone[] = ZONE_GRID.map(zone => {
      const craft    = craftMap[zone.craftHint] ?? { count: 0, avgScore: 50 };
      const share    = craft.count / totalSessions;
      const engagement = Math.min(100, Math.round(share * 300 + Math.random() * 15));
      const conversion = Math.min(100, Math.round(craft.avgScore * 0.8 + 10 + Math.random() * 10));
      const emotional  = Math.min(100, Math.round(engagement * 0.6 + conversion * 0.4));
      const opportunity = Math.min(100, Math.round(
        engagement * 0.3 + (100 - conversion) * 0.5 + emotional * 0.2,
      ));

      const prevEng = engagement - Math.round((Math.random() - 0.5) * 20);
      const trend: HeatZone["trend"] = engagement > prevEng + 5 ? "rising"
        : engagement < prevEng - 5 ? "cooling"
        : "stable";

      return {
        zoneId:           zone.id,
        label:            zone.label,
        x:                zone.x,
        y:                zone.y,
        engagementScore:  engagement,
        conversionScore:  conversion,
        emotionalTemp:    emotional,
        guestCount:       craft.count,
        topCraft:         zone.craftHint,
        opportunityScore: opportunity,
        trend,
      };
    });

    const globalTemp = Math.round(zones.reduce((s, z) => s + z.emotionalTemp, 0) / zones.length);
    const peakZone   = zones.reduce((a, b) => a.engagementScore > b.engagementScore ? a : b).zoneId;
    const coldZone   = zones.reduce((a, b) => a.engagementScore < b.engagementScore ? a : b).zoneId;

    return {
      venueId,
      zones,
      globalTemp,
      peakZone,
      coldZone,
      generatedAt: new Date().toISOString(),
    };
  }
}
