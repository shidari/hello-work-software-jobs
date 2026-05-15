#!/usr/bin/env bash
# PreToolUse hook: deny tool use when Claude is invoked outside the dev sandbox
# container (sho-sandbox). Wired in .claude/settings.json on Read / Glob / Grep
# / Bash / Edit / Write / NotebookEdit.
#
# Detection prefers kernel + bind-mount over env vars — env can be spoofed and
# (more commonly) get lost on image rebuilds, leaving SHO_SANDBOX unset inside
# a valid container. See .claude/rules/general.md "実行環境の判定".
#
# Soft guard, not a security boundary (the user can unset the hook by editing
# settings.json). Goal is "host で Claude が誤って動かない" にする運用境界。

# Primary detection: aarch64-linux container with /work bind-mounted as a
# symlink to the repo. Both signals are established by scripts/sandbox.sh
# at container start.
if [[ "$(uname -s)" == "Linux" && -L /work ]]; then
  exit 0
fi

# Last-resort manual bypass for unusual environments (e.g. remote nix linux
# builder VMs invoked directly). Documented but discouraged.
if [[ "${SHO_SANDBOX:-}" == "1" ]]; then
  exit 0
fi

cat >&2 <<'EOF'
[deny-host] Refusing tool use outside the dev sandbox.

  Claude on this repo is sandbox-only. Run:

    ./scripts/sandbox-image.sh   # build image (first time / flake.nix updates)
    ./scripts/sandbox.sh         # enter the container
    claude                       # start Claude inside the sandbox

  Read, Glob, Grep, Bash, Edit, Write, and NotebookEdit are blocked on host.
EOF
exit 2
