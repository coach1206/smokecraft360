#!/usr/bin/env sh
set -eu

export PORT="${PORT:-23331}"
export BASE_PATH="${BASE_PATH:-/novee/}"

exec pnpm --filter @workspace/novee run dev
