#!/usr/bin/env bash
# Block Edit/Write/NotebookEdit on the main worktree to enforce "1 feature = 1 worktree".
# See .claude/rules/general.md for rationale.
# Bypass for trivial fixes: `touch /tmp/.claude-allow-main-edit` (one-shot, auto-consumed).
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
hook_cwd=$(jq -r '.cwd // empty' <<<"$input")

[[ -z "$file_path" ]] && exit 0

case "$file_path" in
  /*) abs_path="$file_path" ;;
  *) abs_path="$hook_cwd/$file_path" ;;
esac

dir=$(dirname "$abs_path")
repo_root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)

# Outside any git repo — allow (e.g. ~/.claude/* user-level files)
[[ -z "$repo_root" ]] && exit 0

# Linked worktree has `.git` as a file (gitdir pointer); main worktree has it as a directory.
[[ -f "$repo_root/.git" ]] && exit 0

sentinel=/tmp/.claude-allow-main-edit
if [[ -e "$sentinel" ]]; then
  rm -f "$sentinel"
  exit 0
fi

cat >&2 <<EOF
[enforce-worktree] About to edit "$file_path" on the main worktree ($repo_root).

Per .claude/rules/general.md, features / bug fixes / refactors must happen in a separate worktree. Use EnterWorktree before editing.

For trivial changes (typo, comment, single-line doc): confirm with the user first, then run \`touch $sentinel\` and retry. The sentinel is one-shot and auto-consumed on the next edit.
EOF
exit 2
