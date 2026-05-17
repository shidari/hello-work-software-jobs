---
name: debug
description: 3 基盤（Collector / API / Frontend）のログを横断検索する。jobNumber や URL を起点に、CloudWatch（ops MCP）/ Workers Logs / Vercel Logs を一括で引く。詳細は docs/LOGGING.md のキー名規約に依存。
---

# 横断デバッグ

3 つの実行基盤のログを取得する。Collector は ops MCP 経由（dev sandbox に awscli は無い）、API / Frontend は dev sandbox の wrangler / vercel CLI 経由。

## 使い方

```bash
# API（Cloudflare Workers Logs / wrangler tail）
bash .claude/skills/debug/scripts/debug.sh api [pattern] [minutes]

# フロントエンド（Vercel Logs）
bash .claude/skills/debug/scripts/debug.sh frontend [pattern] [since]

# jobNumber で 3 基盤横断トレース（crawler 部は MCP 呼び出し指示を出力）
bash .claude/skills/debug/scripts/debug.sh trace <jobNumber> [minutes]
```

Collector ログは bash サブコマンドからは出さない。下の「Crawler (CloudWatch via MCP)」節に従って ops-aws-cloudwatch を呼ぶ。

## サブコマンド詳細

### Crawler (CloudWatch via MCP)

ops MCP server `ops-aws-cloudwatch` の `execute_log_insights_query` を使う。
ロググループ: `/aws/lambda/job-detail-etl`、リージョン: `ap-northeast-1`。

クエリのパターン:

```
# jobNumber 指定なし（ERROR 抽出）
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 200

# jobNumber 指定あり
fields @timestamp, @message
| filter @message like /<jobNumber>/
| sort @timestamp desc
| limit 200
```

戻りメッセージは TSV 形式（`@message` 内）。最後のカラムを取り出して JSON parse すると Lambda の構造化ログ ([docs/LOGGING.md](../../../docs/LOGGING.md)) になる。`errorMessage` から `*Error` タグを抽出して集計し、エラー分布 + 直近イベントを報告する。

### `api [pattern] [minutes=15]`
- `wrangler tail job-store --format json` でライブ取得
- `pattern` 指定時は jq でフィルタ
- **履歴クエリは Cloudflare ダッシュボードを参照** (Workers Logs UI)

### `frontend [pattern] [since=1h]`
- `vercel logs --since <since>` で取得
- `pattern` 指定時は grep で絞り込み
- 実行ディレクトリは `apps/frontend/hello-work-job-searcher` に自動切替

### `trace <jobNumber> [minutes=60]`
- 全 3 基盤を `jobNumber` で串刺し検索
- Crawler 部は MCP クエリの指示を出力（実行は Claude が ops-aws-cloudwatch を呼ぶ）
- API / Frontend 部は wrangler / vercel CLI を起動
- **前提**: 各基盤が [docs/LOGGING.md](../../../docs/LOGGING.md) の規約で `jobNumber` を構造化ログに含めていること

## 前提条件

| 基盤 | 必要な認証 |
|------|----------|
| Crawler (MCP) | ops container が起動済み (`./scripts/ops-sandbox.ts`)、host `~/.aws` に `crawler-debug` profile があり認証が生きていること |
| API | `wrangler login` 済み |
| Frontend | `vercel login` 済み + `apps/frontend/hello-work-job-searcher` が Vercel プロジェクトにリンク済み |

認証が切れている場合、wrangler / vercel スクリプトはエラーで停止し再ログイン手順を案内する。MCP 側の AWS 認証エラーは host で `aws sso login --profile crawler-debug` → `./scripts/ops-sandbox.ts --stop && ./scripts/ops-sandbox.ts` で snapshot を取り直す。

## 個別スクリプト

- `scripts/debug.sh` — ディスパッチャ（crawler は MCP 誘導メッセージのみ）
- `scripts/debug-api.sh` — wrangler tail
- `scripts/debug-frontend.sh` — vercel logs
- `scripts/debug-trace.sh` — 横断トレース（crawler 部は MCP 指示出力）
- `scripts/_check-auth.sh` — 認証チェック共通関数（wrangler / vercel のみ）
