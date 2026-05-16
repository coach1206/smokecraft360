-- Migration: kernel_module_slug_history
-- Tracks every slug rename so old deep-links can be redirected to the current slug.

CREATE TABLE IF NOT EXISTS kernel_module_slug_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES kernel_modules(id) ON DELETE CASCADE,
  old_slug    TEXT NOT NULL,
  new_slug    TEXT NOT NULL,
  changed_by  TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kmsh_module_id ON kernel_module_slug_history(module_id);
CREATE INDEX IF NOT EXISTS idx_kmsh_old_slug  ON kernel_module_slug_history(old_slug);
