#!/usr/bin/env bash
# codex review --uncommitted を最大 N 周ループする。
# 各周: codex review → claude -p で「確かに」と思える指摘だけ修正 → 差分が増えなければ早期終了。
#
# Usage:
#   ./loop.sh              # デフォルト 3 周
#   ./loop.sh 2            # 1〜3 の範囲で指定可（位置引数）
#   MAX_ROUNDS=2 ./loop.sh # 環境変数でも指定可
#
# MAX_ROUNDS は 3 周を hard cap とする。暴走防止のためそれを超える値は exit 1 で弾く。
# 緩めたい場合は本ファイルの MAX_ROUNDS_HARD_CAP を直接書き換える。
#
# 前提:
#   - **sandbox 内での実行必須** (SHO_SANDBOX=1 で判別)。子 claude が
#     --dangerously-skip-permissions で動くため host 直接実行は危険
#   - codex / claude / git が実行環境で利用可能（codex / claude が無い場合は graceful skip）
#   - 未コミット差分 (staged + unstaged + untracked) が存在する
#   - codex / claude ともに login 済み

set -euo pipefail

# サンドボックス必須。子 claude が `--dangerously-skip-permissions` で動くため、
# host で誤起動するとファイルシステム / ネットワークに無制限アクセスを与えてしまう。
# flake.nix の image Env に焼き込んだ SHO_SANDBOX=1 で host vs sandbox を判別する
# (.claude/hooks/deny-host.sh と同じ env を見る。deny-host は primary に
# kernel + bind-mount で判定)。
if [[ "${SHO_SANDBOX:-}" != "1" ]]; then
  cat >&2 <<'EOF'
ERROR: codex-review-loop は --dangerously-skip-permissions を使うため sandbox 内でのみ実行可。

  ./scripts/sandbox.sh で sandbox に入り直してから再実行してください。
EOF
  exit 1
fi

# 3 周を hard cap にする。codex / claude を多数回走らせて API 課金・実行時間・
# 想定外の編集量が暴走するのを防ぐため、ここを超える値は受け付けない。
# 緩めたい時はこのファイル自体を編集する（位置引数 / env では超えられない）。
readonly MAX_ROUNDS_HARD_CAP=3

MAX_ROUNDS="${1:-${MAX_ROUNDS:-3}}"

if ! [[ "$MAX_ROUNDS" =~ ^[0-9]+$ ]] || [[ "$MAX_ROUNDS" -lt 1 ]]; then
  echo "ERROR: MAX_ROUNDS は 1 以上の整数を指定してください (got: $MAX_ROUNDS)" >&2
  exit 1
fi

if [[ "$MAX_ROUNDS" -gt "$MAX_ROUNDS_HARD_CAP" ]]; then
  echo "ERROR: MAX_ROUNDS=$MAX_ROUNDS は上限 $MAX_ROUNDS_HARD_CAP を超えています。" >&2
  echo "       暴走防止のため位置引数 / env では $MAX_ROUNDS_HARD_CAP 周までしか指定できません。" >&2
  exit 1
fi

# sandbox は Linux + coreutils なので sha256sum 固定でよい。
if ! command -v sha256sum >/dev/null 2>&1; then
  echo "ERROR: sha256sum が見つかりません (sandbox image が壊れている可能性)" >&2
  exit 1
fi
CHECKSUM=sha256sum

# codex / claude が無ければ graceful skip。/commit-and-pr の Step 0 として呼ばれた時、
# 環境に codex/claude が無くても commit フローを止めない。
if ! command -v codex >/dev/null 2>&1; then
  echo "WARN: codex CLI が見つかりません。codex review loop をスキップします。" >&2
  exit 0
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "WARN: claude CLI が見つかりません。codex review loop をスキップします。" >&2
  exit 0
fi
git rev-parse --git-dir >/dev/null 2>&1 || { echo "ERROR: not in a git repo" >&2; exit 1; }

if [[ -z "$(git status --porcelain)" ]]; then
  echo "未コミット差分なし。何もしません。"
  exit 0
fi

# tracked diff + untracked file 内容の両方を含めた fingerprint。
# git diff HEAD だけだと untracked が漏れて、claude が untracked を編集/追加しても
# 「修正なし」と誤判定して 1 周目で早期終了してしまう。
worktree_fingerprint() {
  {
    git diff HEAD 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null | while IFS= read -r f; do
      [[ -f "$f" ]] && "$CHECKSUM" "$f"
    done
  } | "$CHECKSUM" | awk '{print $1}'
}

for round in $(seq 1 "$MAX_ROUNDS"); do
  echo ""
  echo "================================================================"
  echo "  codex review loop: Round $round / $MAX_ROUNDS"
  echo "================================================================"

  diff_before=$(worktree_fingerprint)

  echo ""
  echo "--- codex review --uncommitted ---"
  if ! review_output=$(codex review --uncommitted 2>&1); then
    echo "WARN: codex review が失敗。次周へ。" >&2
    echo "$review_output" >&2
    continue
  fi
  printf '%s\n' "$review_output"

  echo ""
  echo "--- claude triage + fix ---"
  prompt=$(cat <<EOF
以下は codex (別 LLM) による未コミット差分のレビュー結果です。
あなたはこの差分の作者として、各指摘について「確かに」と納得できる部分だけ修正してください。

判定基準:
- バグ / セキュリティ / 型不整合 → 修正
- 文脈を読み違えた指摘（削除予定コード等） → 却下
- スタイル・好みの問題で既存コードの方針と整合しない → 却下
- テスト追加系 → 当該差分のスコープ内なら修正、別 PR 相当なら却下

修正が終わったら、accept / reject を 1 行ずつ要約してください。

--- codex review output ---
$review_output
EOF
)

  if ! claude -p "$prompt" --permission-mode bypassPermissions --dangerously-skip-permissions; then
    echo "WARN: claude -p が失敗。次周へ。" >&2
    continue
  fi

  diff_after=$(worktree_fingerprint)
  if [[ "$diff_before" == "$diff_after" ]]; then
    echo ""
    echo "Round $round: 修正なし。ループ早期終了。"
    break
  fi
done

echo ""
echo "================================================================"
echo "  codex review loop: 完了"
echo "================================================================"
echo ""
echo "現在の差分:"
git status --short
