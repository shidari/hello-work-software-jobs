#!/usr/bin/env bash
# PreToolUse hook: deny tool use on the user's macOS host.
#
# Wired in .claude/settings.json with matcher ".*" so it fires on every tool
# (file, shell, network, agent spawn, MCP). The earlier narrow matcher
# (Read|Glob|Grep|Bash|Edit|Write|NotebookEdit) left a hole where host-side
# Claude could still hit MCP write tools (mcp__github__*) and outbound HTTP
# (WebFetch) — defeating the "host sandbox-only" intent.
#
# Allowed environments:
#   - sandbox (sho-sandbox): Linux + /work bind-mount symlink set by
#     scripts/sandbox.ts at container start
#   - web (Claude Code on the web): Linux + Anthropic-managed cloud
#     container, repo cloned under /home/user/<repo>
#
# Detection prefers kernel + filesystem signals over env vars — env can be
# spoofed and (more commonly) get lost on image rebuilds, leaving SHO_SANDBOX
# unset inside a valid container. See .claude/rules/general.md "実行環境の判定".
#
# Host carve-outs (narrow allowlist so Claude can repair the sandbox itself):
#   - read-only tools: Read / Grep / Glob / NotebookRead
#   - Edit / Write restricted to the sandbox-management surface:
#       scripts/ , .claude/hooks/ , flake.nix , flake.lock , packages/mcp-ops/
#   Anything else on host is still denied.
#
# Soft guard, not a security boundary (the user can unset the hook by editing
# settings.json). Goal is "host で Claude が誤って動かない" にする運用境界。

set -uo pipefail

kernel=$(uname -s)

# Sandbox (Apple container sho-sandbox): /work is a symlink to the repo root.
if [[ "$kernel" == "Linux" && -L /work ]]; then
  exit 0
fi

# Claude Code on the web: ephemeral Linux container managed by Anthropic.
# The repo is cloned under /home/user/<repo>. The sho-sandbox image uses /root
# as $HOME and has no /home/user, so this is a clean disambiguator.
if [[ "$kernel" == "Linux" && -d /home/user ]]; then
  exit 0
fi

# Last-resort manual bypass for unusual environments (e.g. remote nix linux
# builder VMs invoked directly). Documented but discouraged.
if [[ "${SHO_SANDBOX:-}" == "1" ]]; then
  exit 0
fi

# ---- host carve-outs ----
# We're on host (macOS). Allow a narrow set of tools so Claude can still
# inspect the tree and repair the sandbox plumbing (scripts/sandbox.ts bugs,
# flake.nix updates, hook tweaks) without dropping into the container.
payload=$(cat)
tool_name=$(printf '%s' "$payload" | jq -r '.tool_name // empty' 2>/dev/null || true)

case "$tool_name" in
  Read|Grep|Glob|NotebookRead)
    exit 0
    ;;
  Edit|Write|MultiEdit|NotebookEdit)
    file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
    rel="${file_path#${CLAUDE_PROJECT_DIR:-}/}"
    case "$rel" in
      scripts/*|.claude/hooks/*|flake.nix|flake.lock|packages/mcp-ops/*)
        exit 0
        ;;
    esac
    ;;
esac

cat >&2 <<'EOF'
[deny-host] Refusing tool use outside the dev sandbox / Claude Code on the web.

  Claude on this repo is sandbox-only on host (macOS). Run:

    ./scripts/sandbox-image.ts   # build image (first time / flake.nix updates)
    ./scripts/sandbox.ts         # enter the container
    claude                       # start Claude inside the sandbox

  Host carve-outs (allowed without entering the sandbox):
    - Read-only tools: Read / Grep / Glob / NotebookRead
    - Edit / Write under: scripts/ , .claude/hooks/ , flake.nix ,
      flake.lock , packages/mcp-ops/

  Everything else (Bash, network, agent spawn, MCP, edits outside the
  allowlist) is blocked. If you genuinely need to bypass for an unusual
  environment, set SHO_SANDBOX=1.
EOF
exit 2
