CREATE TABLE "craft_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"session_id" uuid,
	"craft" text NOT NULL,
	"phase" text DEFAULT 'intro' NOT NULL,
	"style_choice" text,
	"mood_choice" text,
	"profile_answers" jsonb DEFAULT '{}'::jsonb,
	"score" numeric(5, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"craft" text NOT NULL,
	"draft_name" text DEFAULT 'My Draft' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locked_fields" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craft_session_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"craft" text NOT NULL,
	"build_id" uuid,
	"timer_started_at" timestamp,
	"timer_duration_secs" integer DEFAULT 2100 NOT NULL,
	"phase" text DEFAULT 'intro' NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_saved_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "craft_session_states" ADD CONSTRAINT "craft_session_states_build_id_craft_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."craft_builds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "craft_builds_user_idx" ON "craft_builds" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "craft_builds_venue_idx" ON "craft_builds" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "craft_builds_craft_idx" ON "craft_builds" USING btree ("craft");--> statement-breakpoint
CREATE INDEX "craft_builds_phase_idx" ON "craft_builds" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "design_drafts_user_idx" ON "design_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "design_drafts_venue_idx" ON "design_drafts" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "design_drafts_craft_idx" ON "design_drafts" USING btree ("craft");--> statement-breakpoint
CREATE INDEX "craft_session_states_user_idx" ON "craft_session_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "craft_session_states_venue_idx" ON "craft_session_states" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "craft_session_states_craft_idx" ON "craft_session_states" USING btree ("craft");