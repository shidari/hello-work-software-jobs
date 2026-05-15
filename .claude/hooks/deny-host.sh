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
#     scripts/sandbox.sh at container start
#   - web (Claude Code on the web): Linux + Anthropic-managed cloud
#     container, repo cloned under /home/user/<repo>
#
# Detection prefers kernel + filesystem signals over env vars — env can be
# spoofed and (more commonly) get lost on image rebuilds, leaving SHO_SANDBOX
# unset inside a valid container. See .claude/rules/general.md "実行環境の判定".
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

cat >&2 <<'EOF'
[deny-host] Refusing tool use outside the dev sandbox / Claude Code on the web.

  Claude on this repo is sandbox-only on host (macOS). Run:

    ./scripts/sandbox-image.sh   # build image (first time / flake.nix updates)
    ./scripts/sandbox.sh         # enter the container
    claude                       # start Claude inside the sandbox

  All tools (file, shell, network, agent, MCP) are blocked on host. If you
  genuinely need to bypass for an unusual environment, set SHO_SANDBOX=1.
EOF
exit 2
