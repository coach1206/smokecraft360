CREATE TYPE "public"."tournament_type" AS ENUM('live', 'daily', 'weekly', 'venue', 'grand');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('upcoming', 'active', 'scoring', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "tournaments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "type" "tournament_type" NOT NULL,
  "craft_type" text,
  "venue_id" uuid,
  "status" "tournament_status" DEFAULT 'upcoming' NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "max_entrants" integer,
  "prize_first" text,
  "prize_second" text,
  "prize_third" text,
  "featured" boolean DEFAULT false NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "user_name" text,
  "craft_build_id" uuid,
  "score" integer DEFAULT 0 NOT NULL,
  "rank" integer,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tournament_entries_tournament_id_tournaments_id_fk"
    FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "tournaments_status_idx" ON "tournaments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tournaments_type_idx" ON "tournaments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tournaments_venue_idx" ON "tournaments" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "tournaments_start_at_idx" ON "tournaments" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "tournament_entries_tournament_idx" ON "tournament_entries" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_entries_user_idx" ON "tournament_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tournament_entries_score_idx" ON "tournament_entries" USING btree ("score");
