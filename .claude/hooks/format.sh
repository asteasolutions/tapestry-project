#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the edited file with its workspace's Prettier config,
# so `prettier ./src --check` in `npm run lint` keeps passing.
f=$(jq -r '.tool_input.file_path // empty')
[ -f "$f" ] || exit 0
case "$f" in
  "$CLAUDE_PROJECT_DIR"/*/src/*) ;;
  *) exit 0 ;;
esac
ws=${f#"$CLAUDE_PROJECT_DIR"/}
ws=${ws%%/*}
# Run from the workspace so its .prettierrc.cjs and .prettierignore apply.
cd "$CLAUDE_PROJECT_DIR/$ws" && "$CLAUDE_PROJECT_DIR/node_modules/.bin/prettier" --write --ignore-unknown --log-level warn "$f"
