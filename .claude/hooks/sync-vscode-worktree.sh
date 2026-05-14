#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree.
# Adds all worktrees under .claude/worktrees/ to the current VSCode
# (Remote-Containers) multi-root workspace, so main + active worktrees stay
# visible side-by-side. Idempotent: VSCode dedups by absolute path.
#
# Why enumerate instead of reading the hook payload: EnterWorktree's
# tool_input only carries `name` or `path` (auto-generated names aren't
# echoed back), and the PostToolUse `cwd` reflects the caller's cwd at hook
# invocation time — not the post-tool worktree path. Sweeping the directory
# also recovers state if previous EnterWorktree calls happened before this
# hook was wired up.
#
# Note: `code` CLI doesn't support --remove, so on ExitWorktree the folder
# stays in the workspace and points to a missing dir if the worktree was
# deleted. Remove manually via "Remove Folder from Workspace" in VSCode.
#
# No-ops when:
#   - VSCode Server's `code` CLI isn't installed (e.g. not running under Remote-Containers)
#   - the tool isn't EnterWorktree
#   - .claude/worktrees/ doesn't exist yet
# Failures are swallowed; we never block the tool.

set -u

# Prefer `code` on PATH (host VSCode CLI). Fall back to VSCode Server's
# remote-cli binary (when this runs inside a Remote-Containers attached
# sandbox). Either form drives the running VSCode window.
CODE=$(command -v code 2>/dev/null || true)
if [[ -z "$CODE" ]]; then
  CODE=$(ls -1 "$HOME"/.vscode-server/bin/*/bin/remote-cli/code 2>/dev/null | tail -n1)
fi
[[ -x "$CODE" ]] || exit 0

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[[ "$TOOL" == "EnterWorktree" ]] || exit 0

WORKTREES_DIR="${CLAUDE_PROJECT_DIR:-}/.claude/worktrees"
[[ -d "$WORKTREES_DIR" ]] || exit 0

for wt in "$WORKTREES_DIR"/*/; do
  [[ -d "$wt" ]] || continue
  "$CODE" --add "${wt%/}" >/dev/null 2>&1 || true
done

exit 0
