#!/usr/bin/env sh
set -eu

export PORT="${PORT:-26250}"
export BASE_PATH="${BASE_PATH:-/}"

exec pnpm --filter @workspace/smokecraft run dev
