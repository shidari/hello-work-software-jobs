---
name: debug
description: 3 基盤（Collector / API / Frontend）のログを CLI から横断検索する。jobNumber や URL を起点に、CloudWatch / Workers Logs / Vercel Logs を一括で引く。詳細は docs/LOGGING.md のキー名規約に依存。
---

# 横断デバッグ

3 つの実行基盤のログを CLI から取得する。バラバラのダッシュボードを開かずに済ませる。

## 使い方

```bash
# クローラ（CloudWatch）
bash .claude/skills/debug/scripts/debug.sh crawler [jobNumber] [minutes]

# API（Cloudflare Workers Logs / wrangler tail）
bash .claude/skills/debug/scripts/debug.sh api [pattern] [minutes]

# フロントエンド（Vercel Logs）
bash .claude/skills/debug/scripts/debug.sh frontend [pattern] [since]

# jobNumber で 3 基盤横断トレース
bash .claude/skills/debug/scripts/debug.sh trace <jobNumber> [minutes]
```

## サブコマンド詳細

### `crawler [jobNumber] [minutes=30]`
- CloudWatch Logs `/aws/lambda/job-detail-etl` をフィルタ
- `jobNumber` 指定時はそれを含むイベントのみ抽出
- エラー分布 + 直近イベントを JSON で出力

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
- 時系列にソートして出力
- **前提**: 各基盤が [docs/LOGGING.md](../../../docs/LOGGING.md) の規約で `jobNumber` を構造化ログに含めていること

## 前提条件

| 基盤 | 必要な認証 |
|------|----------|
| Crawler | `AWS_PROFILE=crawler-debug` |
| API | `wrangler login` 済み |
| Frontend | `vercel login` 済み + `apps/frontend/hello-work-job-searcher` が Vercel プロジェクトにリンク済み |

認証が切れている場合、各サブスクリプトがエラーで停止し再ログイン手順を案内する。

## 個別スクリプト

- `scripts/debug.sh` — ディスパッチャ
- `scripts/debug-crawler.sh` — CloudWatch Logs クエリ
- `scripts/debug-api.sh` — wrangler tail
- `scripts/debug-frontend.sh` — vercel logs
- `scripts/debug-trace.sh` — 横断トレース
- `scripts/_check-auth.sh` — 認証チェック共通関数
