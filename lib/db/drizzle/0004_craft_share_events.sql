CREATE TABLE "craft_share_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "craft_type" text NOT NULL,
  "score" numeric(5, 2) NOT NULL,
  "recommendation_name" text NOT NULL,
  "share_method" text NOT NULL,
  "session_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "craft_share_events_craft_idx" ON "craft_share_events" ("craft_type");
--> statement-breakpoint
CREATE INDEX "craft_share_events_method_idx" ON "craft_share_events" ("share_method");
--> statement-breakpoint
CREATE INDEX "craft_share_events_date_idx" ON "craft_share_events" ("created_at");
