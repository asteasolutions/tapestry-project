#!/usr/bin/env bash
# PreToolUse (Edit|Write): block edits to env files, package-lock.json and existing Prisma migrations.
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  *.example) exit 0 ;;
  */.env | */.env.*)
    echo "Blocked: $f is an env file with real values. Ask the user to change it." >&2
    exit 2
    ;;
  */package-lock.json)
    echo "Blocked: package-lock.json is generated. Change dependencies with npm install / npm uninstall instead." >&2
    exit 2
    ;;
  */prisma/migrations/*)
    if [ -e "$f" ]; then
      echo "Blocked: never edit existing migrations. Change schema.prisma and run 'npm run prisma:create-migration <name>' in server/." >&2
      exit 2
    fi
    ;;
esac
exit 0
