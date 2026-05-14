-- Kernel Foundation — NOVEE OS Titan Kernel tables
-- Creates three tables and their enums needed for the /api/kernel route group.
-- Safe to re-run: all statements use IF NOT EXISTS guards.

--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_module_status') THEN
    CREATE TYPE "kernel_module_status" AS ENUM ('active', 'inactive', 'suspended');
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_craft_type') THEN
    CREATE TYPE "kernel_craft_type" AS ENUM ('smoke', 'pour', 'brew', 'vape', 'none');
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kernel_mode') THEN
    CREATE TYPE "kernel_mode" AS ENUM ('sovereign', 'essential');
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kernel_modules" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"          text NOT NULL,
  "craft_type"    "kernel_craft_type" NOT NULL DEFAULT 'none',
  "slug"          text NOT NULL UNIQUE,
  "status"        "kernel_module_status" NOT NULL DEFAULT 'active',
  "description"   text,
  "launch_url"    text,
  "registered_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kernel_mode_config" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venue_id"   uuid NOT NULL UNIQUE,
  "mode"       "kernel_mode" NOT NULL DEFAULT 'sovereign',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telemetry_events" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module_id"   uuid,
  "venue_id"    uuid,
  "event_type"  text NOT NULL,
  "payload"     jsonb DEFAULT '{}',
  "occurred_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telemetry_events_type_idx"     ON "telemetry_events" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telemetry_events_occurred_idx" ON "telemetry_events" USING btree ("occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telemetry_events_module_idx"   ON "telemetry_events" USING btree ("module_id");
