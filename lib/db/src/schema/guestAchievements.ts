/**
 * guest_achievements — achievement unlocks per guest profile.
 * Each row is a unique achievement unlock (enforced by unique constraint).
 */

import { pgTable, uuid, text, integer, timestamp, index, unique } from "drizzle-orm/pg-core";

export const guestAchievementsTable = pgTable("guest_achievements", {
  id:                      uuid("id").primaryKey().defaultRandom(),
  guestProfileId:          uuid("guest_profile_id").notNull(),
  achievementId:           text("achievement_id").notNull(),
  achievementName:         text("achievement_name").notNull(),
  achievementDescription:  text("achievement_description"),
  craftType:               text("craft_type"),
  xpValue:                 integer("xp_value").notNull().default(0),
  iconSlug:                text("icon_slug"),
  unlockedAt:              timestamp("unlocked_at").notNull().defaultNow(),
}, t => ({
  byGuest:     index("guest_ach_guest_idx").on(t.guestProfileId),
  uniqueAch:   unique("guest_achievement_unique").on(t.guestProfileId, t.achievementId),
}));

export type GuestAchievement = typeof guestAchievementsTable.$inferSelect;
export type InsertGuestAchievement = typeof guestAchievementsTable.$inferInsert;

// ── Built-in achievement registry ────────────────────────────────────────────

export const ACHIEVEMENT_REGISTRY: Record<string, {
  name: string; description: string; craftType?: string; xpValue: number; iconSlug: string;
}> = {
  first_swipe:        { name: "First Light",         description: "Made your first swipe",               xpValue: 10,  iconSlug: "star"     },
  ten_swipes:         { name: "Curious Mind",         description: "Swiped 10 times",                    xpValue: 25,  iconSlug: "compass"  },
  fifty_swipes:       { name: "Seasoned Palate",      description: "Swiped 50 times",                    xpValue: 75,  iconSlug: "crown"    },
  first_challenge:    { name: "Challenge Accepted",   description: "Completed first AI challenge",       xpValue: 30,  iconSlug: "bolt"     },
  challenge_streak_3: { name: "Sharp Mind",           description: "3 correct answers in a row",         xpValue: 50,  iconSlug: "fire"     },
  smoke_initiate:     { name: "Smoke Initiate",       description: "Completed SmokeCraft journey", craftType: "smoke", xpValue: 40,  iconSlug: "cigar"    },
  pour_initiate:      { name: "Pour Initiate",        description: "Completed PourCraft journey",  craftType: "pour",  xpValue: 40,  iconSlug: "glass"    },
  brew_initiate:      { name: "Brew Initiate",        description: "Completed BrewCraft journey",  craftType: "brew",  xpValue: 40,  iconSlug: "hops"     },
  vape_initiate:      { name: "Vape Initiate",        description: "Completed VapeCraft journey",  craftType: "vape",  xpValue: 40,  iconSlug: "vapor"    },
  enrolled:           { name: "Identity Established", description: "Joined the Axiom community",        xpValue: 100, iconSlug: "axiom"    },
  all_crafts:         { name: "Omnivore",             description: "Explored all 4 craft worlds",       xpValue: 150, iconSlug: "universe" },
};
