-- Kernel Module Audit Log — NOVEE OS Titan Kernel
-- Records every PATCH to kernel_modules with a before/after diff, who changed it, and when.
-- Safe to re-run: uses IF NOT EXISTS guards.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kernel_module_audit_log" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module_id"  uuid NOT NULL REFERENCES "kernel_modules"("id") ON DELETE CASCADE,
  "changed_by" text NOT NULL,
  "changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "diff"       jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kernel_audit_log_module_idx"
  ON "kernel_module_audit_log" USING btree ("module_id", "changed_at" DESC);
