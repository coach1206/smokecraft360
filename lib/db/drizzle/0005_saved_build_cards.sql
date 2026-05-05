CREATE TABLE "saved_build_cards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "craft_type" text NOT NULL,
        "style_title" text DEFAULT '' NOT NULL,
        "mood_title" text DEFAULT '' NOT NULL,
        "recommendation_name" text DEFAULT '' NOT NULL,
        "score" numeric(5, 2) DEFAULT '0' NOT NULL,
        "saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "saved_build_cards_user_idx" ON "saved_build_cards" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "saved_build_cards_craft_idx" ON "saved_build_cards" USING btree ("craft_type");
