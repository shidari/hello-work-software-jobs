#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree.
# Points each worktree's .claude/settings.local.json at the main repo's
# .claude/settings.local.json (absolute symlink). main itself is a symlink to
# permissions/settings.local.json after scripts/sandbox.sh's migration, so the
# resolution chain is:
#   worktree settings → main settings → permissions/settings.local.json (real)
#                                       └─ host: regular file
#                                          container: dir-overlay-mounted empty {}
# Pointing at main (not permissions/ directly) keeps the hook safe to run
# **before** the sandbox.sh migration has happened; sandbox.sh is allowed to
# do destructive bootstrap, the hook is not.
#
# Idempotent:
#   - already correct symlink → no-op
#   - missing → create
#   - regular file with content → leave alone, warn to stderr (don't destroy
#     a pre-migration manually written allow list)
#
# Failures never block the tool.

set -u

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[[ "$TOOL" == "EnterWorktree" ]] || exit 0

REPO="${CLAUDE_PROJECT_DIR:-}"
[[ -n "$REPO" ]] || exit 0
TARGET="$REPO/.claude/settings.local.json"
WORKTREES_DIR="$REPO/.claude/worktrees"
[[ -d "$WORKTREES_DIR" ]] || exit 0

# Don't bootstrap anything here — sandbox.sh owns the migration. If TARGET is
# missing, the user hasn't run sandbox.sh yet; worktree symlinks will still be
# created and become valid as soon as TARGET appears.

for wt in "$WORKTREES_DIR"/*/; do
  [[ -d "$wt" ]] || continue
  link="${wt%/}/.claude/settings.local.json"
  mkdir -p "$(dirname "$link")"
  if [[ -L "$link" ]]; then
    [[ "$(readlink "$link")" == "$TARGET" ]] || ln -sf "$TARGET" "$link"
  elif [[ ! -e "$link" ]]; then
    ln -s "$TARGET" "$link"
  else
    echo "[link-worktree-settings] WARN: $link is a regular file; leaving as-is" >&2
  fi
done

exit 0
