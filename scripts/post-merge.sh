#!/bin/bash
set -e
pnpm install --frozen-lockfile
# drizzle-kit push --force still prompts interactively when it detects tables in
# the DB that aren't in the schema (tablesResolver naming-conflict). In a non-TTY
# CI environment those prompts hang and then error. Piping `yes` auto-answers
# every prompt with "y" (treat unrecognised DB tables as new, never rename).
# The subshell + 2>/dev/null suppresses the SIGPIPE broken-pipe exit code that
# `yes` emits when drizzle-kit closes stdin, preventing set -e from aborting.
(yes 2>/dev/null || true) | pnpm --filter db push-force
