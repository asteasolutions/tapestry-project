#!/usr/bin/env bash
# PostToolUse (Edit|Write): regenerate the Prisma client whenever schema.prisma changes.
f=$(jq -r '.tool_input.file_path // empty')
[ "$f" = "$CLAUDE_PROJECT_DIR/server/prisma/schema.prisma" ] || exit 0

if ! out=$(cd "$CLAUDE_PROJECT_DIR/server" && npm run --silent prisma:generate 2>&1); then
  echo "prisma generate failed after editing schema.prisma:" >&2
  echo "$out" | tail -20 >&2
  exit 2
fi
jq -n '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: "Prisma client regenerated. If the schema change is final, create a migration with npm run prisma:create-migration <name> in server/ (needs the database running)."}}'
