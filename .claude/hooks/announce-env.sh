#!/usr/bin/env bash
# SessionStart hook: declare 「Claude が host で動いてるか sandbox 内で動いてるか」を
# session 冒頭で固定するための banner を Claude のコンテキストに inject する。
#
# 判定は kernel / mount-level の signal を使う。SHO_SANDBOX env は他の hook
# (deny-host.sh) でも使ってるが、env は容易に spoof / 取り違えが起こるので
# 自己判定には使わない。Apple container は Linux でしか動かさず、host は
# macOS (Darwin) 固定なので `uname -s` だけでほぼ確定する。/work bind mount
# は image 設定で固定 (flake.nix Cmd の WorkingDir) なので冗長確認に使う。
#
# SessionStart hook は stdout を JSON
# `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":...}}`
# で出すと additionalContext が Claude のコンテキストに inject される。plain
# text のままだと通常の hook 出力扱いになり inject されない。

set -euo pipefail

kernel=$(uname -s)
case "$kernel" in
  Darwin)
    msg="ENV: host (macOS, $(uname -r))
  - Apple container CLI 経由で sandbox/ops コンテナを管理可能
  - sandbox 内 CLI (gh / wrangler / vercel 等) を叩く時は 'container exec sho-sandbox ...' か中に入る"
    ;;
  Linux)
    if [[ -d /work ]]; then
      msg="ENV: sandbox (sho-sandbox, Linux $(uname -r))
  - gh / wrangler / vercel / claude 等の CLI は PATH 上にある (/work/node_modules/.bin)
  - container CLI は無い (host にしかない)"
    else
      msg="ENV: linux-other (Linux $(uname -r), /work 無し)"
    fi
    ;;
  *)
    msg="ENV: unknown ($kernel)"
    ;;
esac

# JSON エンコードは jq に任せる (改行・引用符の hand-escape はバグの温床)。
# jq は host (nix profile) / sandbox (flake.nix で同梱) のどちらにも居る。
# host の macOS system python3 を使うと sandbox image に python3 が無いので片肺に
# なるため、両環境にある jq を採用した。
jq -nc --arg msg "$msg" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'
