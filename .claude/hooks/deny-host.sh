#!/usr/bin/env bash
# PreToolUse hook: deny Read / write / shell tool use when Claude is invoked
# outside the dev sandbox container. Recognizes "inside sandbox" by the
# SHO_SANDBOX env var (set in flake.nix's image Env).
#
# *** NOT wired in .claude/settings.json yet. ***
#
# Wiring this while Claude itself is running on the host immediately blocks the
# session that wires it. Activate ONLY after migrating Claude into the sandbox:
#
#   1. ./scripts/sandbox-image.sh && ./scripts/sandbox.sh    # build & enter
#   2. (inside container) verify: env | grep SHO_SANDBOX
#   3. (still inside container) add this entry to .claude/settings.json:
#
#      {
#        "hooks": {
#          "PreToolUse": [
#            ...,
#            {
#              "matcher": "Read|Glob|Grep|Bash|Edit|Write|NotebookEdit",
#              "hooks": [
#                {
#                  "type": "command",
#                  "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/deny-host.sh\""
#                }
#              ]
#            }
#          ]
#        }
#      }
#
# After wiring: host-side `claude` invocations on this repo will block Read /
# Glob / Grep / Bash / Edit / Write / NotebookEdit at the first tool call,
# with the message below shown to the user.
#
# Soft guard, not a security boundary (the user can unset the hook by editing
# settings.json). Goal is "host で Claude が誤って動かない" にする運用境界。

if [[ "${SHO_SANDBOX:-}" == "1" ]]; then
  exit 0
fi

cat >&2 <<'EOF'
[deny-host] Refusing tool use outside the dev sandbox.

  Claude on this repo is sandbox-only. Run:

    ./scripts/sandbox-image.sh   # build image (first time / flake.nix updates)
    ./scripts/sandbox.sh         # enter the container
    claude                       # start Claude inside the sandbox

  The sandbox image exports SHO_SANDBOX=1, which this hook checks. Read,
  Glob, Grep, Bash, Edit, Write, and NotebookEdit are blocked on host.
EOF
exit 2
