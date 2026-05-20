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
#   - Bash:
#       閲覧系コマンド ls / grep / rg / find / wc / file / stat / tree のみ allow。
#       cat / head / tail / awk / sed 等は host では出さない — argv 経由で
#       .env の中身を漏らすベクターを作らないため。
#       find は -exec / -execdir / -delete / -ok* / -fprint* / -fls を含む
#       場合のみ block — 副作用・任意コマンド実行ベクターを潰す。
#       vercel は閲覧系 subcommand (`vercel logs` / `inspect` / `ls`) のみ
#       allow。`vercel deploy` / `env add` 等の書き込み系は host で明示的に
#       叩く運用にして、自動許可レーンから外す。
#       シェルメタ文字 `|` `>` `<` `&&` `||` `;` `` ` `` `$(...)` を含む
#       command は一律 block — allowlist 先頭の裏で第二コマンドや副作用を
#       走らせるバイパス経路 (`ls | sh`、`ls > .env`、`find -exec sh` 等)
#       を塞ぐため。
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
  Bash)
    # 先頭 word が allowlist と完全一致した時だけ通す。cat / head / tail を
    # 入れないのは、argv 経由で .env の中身を吐くベクターを断つため。grep
    # 等は残してあるので閲覧目的では足りる（`grep . .env` のような濫用は
    # 信用ベース。Read tool 側は permissions.deny で `.env` をブロックする）。
    #
    # vercel は **閲覧系 subcommand のみ** allow (`vercel logs` / `inspect` /
    # `ls`)。`vercel deploy` / `env add` / `link` 等の書き込み系は block —
    # 本番への副作用は host での明示的なオペレーションに留めたいので、
    # Claude の自動許可レーンには載せない。
    #
    # シェルメタ文字 guard: `ls | cat .env` `ls > .env` `ls && cat .env`
    # のように allowlist 先頭の後ろに第二コマンドや副作用をぶら下げる経路を
    # 一網打尽に block する。pipe `|` も deny — `ls | sh` 等で任意コマンドが
    # 動かせてしまうため (`ls | grep foo` 程度は `grep foo` 単体や Read tool
    # で代替できる)。redirect (`>` `<` `>>`) も同様に副作用ベクターなので
    # block。`grep foo file` のような pure inspection だけが通る運用にする。
    # env-prefix (`FOO=1 vercel ...`) は awk の先頭 token が `FOO=1` になり
    # allowlist 外で自然に block。
    command=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
    case "$command" in
      *"&&"*|*"||"*|*";"*|*"|"*|*">"*|*"<"*|*'`'*|*'$('*)
        ;;
      *)
        first_word=$(printf '%s' "$command" | awk '{print $1}')
        case "$first_word" in
          ls|grep|rg|wc|file|stat|tree)
            # cat / head / tail を含めないのは、argv 経由で .env の中身を
            # 吐くベクターを断つため。grep 等は残してあるので閲覧目的では
            # 足りる (`grep . .env` のような濫用は信用ベース。Read tool 側は
            # permissions.deny で `.env` をブロックする)。
            exit 0
            ;;
          find)
            # find は -exec / -execdir で任意コマンド実行、-delete で破壊、
            # -fprint* / -fls / -ok* で書き込み副作用が起こせる。引数に
            # これらを含むなら block。素の `find . -name '*.ts'` だけ通す。
            case " $command " in
              *" -exec "*|*" -execdir "*|*" -ok "*|*" -okdir "*|*" -delete "*|*" -fprint "*|*" -fprintf "*|*" -fprint0 "*|*" -fls "*)
                ;;
              *)
                exit 0
                ;;
            esac
            ;;
          vercel)
            # vercel は **閲覧系 subcommand のみ** allow。`vercel deploy` /
            # `env add` / `link` 等の書き込み系は block — 本番への副作用は
            # host での明示的なオペレーションに留め、Claude の自動許可
            # レーンには載せない。
            second_word=$(printf '%s' "$command" | awk '{print $2}')
            case "$second_word" in
              logs|inspect|ls|list)
                exit 0
                ;;
            esac
            ;;
        esac
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
    - Bash: inspection commands
      (ls / grep / rg / find / wc / file / stat / tree),
      plus read-only vercel subcommands (vercel logs / inspect / ls).
      Commands with shell metacharacters (| > < && || ; ` $(...)) are
      blocked regardless of the leading word. find with -exec/-delete/
      -fprint*/-fls/-ok* is also blocked. cat / head / tail / awk / sed
      and write vercel subcommands (vercel deploy / env add / link / …)
      are intentionally NOT allowed.

  Everything else (network, agent spawn, MCP, edits outside the allowlist,
  Bash commands not in the host allowlist) is blocked. If you genuinely
  need to bypass for an unusual environment, set SHO_SANDBOX=1.
EOF
exit 2
