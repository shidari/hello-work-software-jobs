#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree.
# Adds the new worktree as a folder to the current VSCode (Remote-Containers)
# multi-root workspace, so main + active worktrees stay visible side-by-side.
#
# Note: `code` CLI doesn't support --remove, so on ExitWorktree the folder
# stays in the workspace and points to a missing dir if the worktree was
# deleted. Remove manually via "Remove Folder from Workspace" in VSCode.
#
# No-ops when:
#   - VSCode Server's `code` CLI isn't installed (e.g. not running under Remote-Containers)
#   - the cwd from hook stdin doesn't resolve to a directory
#   - the tool isn't EnterWorktree
# Failures are swallowed; we never block the tool.

set -u

CODE=$(ls -1 "$HOME"/.vscode-server/bin/*/bin/remote-cli/code 2>/dev/null | tail -n1)
[[ -x "$CODE" ]] || exit 0

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[[ "$TOOL" == "EnterWorktree" ]] || exit 0

TARGET=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[[ -d "$TARGET" ]] || exit 0

"$CODE" --add "$TARGET" >/dev/null 2>&1 || true
exit 0
