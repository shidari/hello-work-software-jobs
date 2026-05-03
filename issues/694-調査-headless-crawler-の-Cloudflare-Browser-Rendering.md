---
number: 694
title: "調査: headless-crawler の Cloudflare Browser Rendering 移行"
state: open
author: shidari
labels: ["enhancement"]
url: https://github.com/shidari/hello-work-software-jobs/issues/694
createdAt: 2026-02-26T14:05:02Z
updatedAt: 2026-02-27T06:20:39Z
---

## 概要

現在 AWS Lambda + Playwright で動いている headless-crawler を Cloudflare Browser Rendering に移行する案の調査結果。

## 背景

- API (job-store-api) は既に Cloudflare Workers で稼働中
- crawler だけ AWS (Lambda + SQS + EventBridge + CDK) で運用しており、インフラが分散している
- `@cloudflare/playwright` が GA になり (2025/09)、Playwright API 互換で移行可能になった

## 調査結果

### Cloudflare Browser Rendering

- Workers 上でヘッドレス Chromium を操作できるサービス
- `@cloudflare/playwright` (Playwright v1.57.0 ベース) が GA サポート
- 料金: Workers Paid ($5/月) + ブラウザ時間 月10時間無料、超過 $0.09/h
- 同時ブラウザ: 30 (Paid)、タイムアウト: 最大10分

### Free プラン vs Paid プラン

| | Free | Paid ($5/月) |
|---|---|---|
| ブラウザ時間 | **1日10分** | **月10時間** (超過 $0.09/h) |
| 同時ブラウザ | 3 | 30 |
| 新規インスタンス/分 | 3 | 30 |
| REST API レート | 6/分 | 180/分 |

- 求人番号抽出が1回約8分かかるため、Free の1日10分だと1回実行でほぼ上限
- 求人詳細 ETL の分も含めると Free では厳しい
- 週1実行なら Free でギリギリだが、余裕がない
- ただし既に job-store-api で Workers Paid プランを使っているなら追加の基本料なし

### Playwright API 互換性: 高い

現在使用中の API (`page.goto`, `locator.click/fill/check/selectOption/textContent/all/evaluate`, `page.waitForURL`, `page.content`) は全て `@cloudflare/playwright` で対応済み。

### コスト比較

| | AWS Lambda (正常運用時) | Cloudflare Browser Rendering |
|---|---|---|
| 月額 | $1〜2 | $5 (Workers基本料、既存Paidなら追加なし) + ブラウザ時間10h無料 |

コスト削減効果は小さい。DLQ 追加済みでリトライ地獄も対策済み。

### SQS → Cloudflare Queues

SQS の代替として Cloudflare Queues が使える。

| | SQS (現在) | Cloudflare Queues |
|---|---|---|
| メッセージ送信 | `sqs.sendMessage()` | `env.QUEUE.send()` |
| メッセージ受信 | Lambda SQS Event Source | Workers `queue()` ハンドラ |
| DLQ | SQS の `deadLetterQueue` 設定 | `dead_letter_queue` 設定 |
| バッチ | `batchSize` | `max_batch_size` |
| 同時実行制限 | `maxConcurrency` | `max_concurrency` |
| 料金 | リクエスト課金 | **月100万オペレーション無料**、超過 $0.40/100万 |

現在の SQS の使い方（batchSize: 1、DLQ、maxConcurrency: 5）は Cloudflare Queues でそのまま再現できる。

**Queues のコスト**: 週1実行・求人200件で月約2,400オペレーション。100万の無料枠に対して0.24%で**事実上タダ**。エグレス料金もなし。

### 移行メリット

- **インフラ統一**: AWS (CDK + Lambda + SQS + EventBridge + Layer) → Cloudflare (wrangler.jsonc + Queues + Cron Triggers)
- **コールドスタート改善**: Lambda のコールドスタート → Cloudflare のウォームプール
- **Lambda Layer 不要**: `@sparticuz/chromium` + playwright.zip が不要に
- **CDK 不要**: wrangler.jsonc のみでインフラ管理
- **AWS 依存の削除**: AWS アカウント・IAM・CDK が不要になり、Cloudflare に完全統一

### 移行リスク

- Effect ランタイムの Workers 互換性 (要検証)
- ハローワークサイトからの Cloudflare IP ブロックの可能性
- 求人番号抽出の実行時間 (現在 480秒) がタイムアウト制約 (最大10分) に収まるか
- SQS → Cloudflare Queues への書き換え

### 移行後のアーキテクチャイメージ

現在:
```
apps/backend/
├── job-store-api/       → Cloudflare Workers
└── headless-crawler/    → AWS Lambda + CDK + SQS + EventBridge
```

移行後:
```
apps/backend/
├── job-store-api/       → Cloudflare Workers (既存)
└── headless-crawler/    → Cloudflare Workers + Browser Rendering + Queues + Cron Triggers
```

- job-store-api と crawler は責務が異なる (API vs バッチ処理) ため、**別 Worker** として管理
- 同じ Cloudflare アカウント内で wrangler.jsonc をそれぞれ持つ
- CDK / AWS の依存が完全に消え、インフラが Cloudflare に統一される
- SQS → Cloudflare Queues、EventBridge → Cron Triggers に置き換え

### API の変更点

#### スクレイピング部分（インポート変更のみ）

```typescript
// Before
import { chromium } from "playwright";
const browser = await chromium.launch(options);

// After
import { chromium } from "@cloudflare/playwright";
const browser = await chromium.launch(env.MYBROWSER);
```

`page.goto()`, `locator.click()`, `.fill()`, `.content()` 等はそのまま。

#### ハンドラ（書き換え必要）

```typescript
// Before: Lambda SQSHandler
import { SQSHandler } from "aws-lambda";
export const handler: SQSHandler = async (event) => { ... };

// After: Workers queue/scheduled handler
export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const { jobNumber } = msg.body;
      // ... ETL処理
      msg.ack();
    }
  },
  async scheduled(event, env) {
    // 求人番号抽出 (EventBridge 相当)
  },
};
```

#### インフラ（CDK → wrangler.jsonc に全面書き換え）

```jsonc
// wrangler.jsonc
{
  "name": "headless-crawler",
  "compatibility_flags": ["nodejs_compat"],
  "browser": { "binding": "MYBROWSER" },
  "queues": {
    "producers": [{ "queue": "job-detail-queue", "binding": "JOB_DETAIL_QUEUE" }],
    "consumers": [{ "queue": "job-detail-queue", "max_batch_size": 1, "max_concurrency": 5, "dead_letter_queue": "job-detail-dlq" }]
  },
  "triggers": {
    "crons": ["0 1 * * 1"]
  }
}
```

### 移行作業

| 作業 | 規模 |
|---|---|
| `lib/browser.ts` 書き換え (launch 方法変更) | 小 |
| スクレイピングロジック (`lib/page.ts`, `lib/job-*-crawler/`) | **変更なし** |
| スキーマ・変換 (`lib/schemas/`) | **変更なし** |
| ハンドラ書き換え (Lambda → Workers scheduled/queue handler) | 中 |
| SQS → Cloudflare Queues | 中 |
| CDK → wrangler.jsonc | 大 |
| テスト・動作確認 | 大 |

### 検討事項: パッケージ命名

移行すると Cloudflare Workers が2つになる。現在の命名を見直す余地がある。

- `job-store-api` — API サーバーなのでそのままで問題なし
- `headless-crawler` — Lambda + Playwright 前提の名前。移行後は "headless" でも "Lambda" でもなくなるので名前が合わなくなる
  - 候補: `job-crawler`, `job-collector`, `job-scraper` など

## 結論

インフラを Cloudflare に統一したいなら移行する価値あり。コスト削減目的だけなら優先度低。


