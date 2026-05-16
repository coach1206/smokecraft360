-- Venue POS Operating Mode — task-229
-- Adds server-side persistence for the POS operating mode and its last-changed
-- audit metadata to the venues table. Safe to re-run: uses IF NOT EXISTS guards.

--> statement-breakpoint
ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "pos_mode"            text         DEFAULT 'overlay',
  ADD COLUMN IF NOT EXISTS "pos_mode_changed_by" text,
  ADD COLUMN IF NOT EXISTS "pos_mode_changed_at" timestamp with time zone;
