#!/usr/bin/env bash
# PreToolUse (Bash): ask the user before destructive or secret-reading shell commands.
# Complements the deny rules in settings.json, which are easy to sidestep (e.g. `rm -fr`).
cmd=$(jq -r '.tool_input.command // empty')
reasons=()

check() {
  if grep -qE -- "$1" <<<"$cmd"; then reasons+=("$2"); fi
}

check '\bgit\s+push\b.*(--force|\s-f\b)' 'force push'
check '\bgit\s+reset\s+--hard' 'git reset --hard discards uncommitted work'
check '\bgit\s+clean\s+-[a-zA-Z]*f' 'git clean deletes untracked files'
check '\bgit\s+branch\s+-D\b' 'force-deletes a branch'
check '\bgit\s+(checkout\s+(--\s|\.(\s|$))|restore\b)' 'discards uncommitted changes'
check '\bgit\s+stash\s+(drop|clear)\b' 'deletes stashed work'
check '\brm\s+(-[a-zA-Z]*[rR]|--recursive)' 'recursive delete'
check 'prisma\s+migrate\s+reset|--force-reset|--accept-data-loss' 'drops or rewrites database data'
check '\bdocker(\s+compose|-compose)\b.*\bdown\b.*(\s-v\b|--volumes)' 'deletes Docker volumes (database, S3 data)'
check '\bdocker\s+(volume\s+(rm|prune)|system\s+prune)' 'deletes Docker data'
# Real env files hold secrets; the *.example templates are fine.
# Writing to them is blocked outright; anything else that touches them needs confirmation.
check_env=$(sed -E 's/\.env(\.test|\.local)?\.example//g' <<<"$cmd")
if grep -qE '\.env(\.test|\.local)?\b' <<<"$check_env"; then
  if grep -qE '(>>?|\btee\b|\bsed\s+-i|\bcp\b|\bmv\b|\btruncate\b)[^|;&]*\.env' <<<"$check_env"; then
    echo 'Blocked: writing to real .env files is not allowed. Ask the user to change them.' >&2
    exit 2
  fi
  reasons+=('touches a real .env file (secrets)')
fi

[ ${#reasons[@]} -eq 0 ] && exit 0

reason="Needs confirmation: $(IFS=';'; echo "${reasons[*]}" | sed 's/;/; /g')"
jq -n --arg r "$reason" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $r}}'
