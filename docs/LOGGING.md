# ロギング規約

3 つの実行基盤 (Collector / API / Frontend) を横断検索可能にするための、最小限のキー名規約。
ロガー実装は統一しない。**キー名と必須フィールドだけ統一する**。

## 必須フィールド

すべての構造化ログに以下を含める。

| キー | 型 | 例 | 用途 |
|------|------|------|------|
| `service` | `"collector" \| "api" \| "frontend"` | `"api"` | 基盤識別 |
| `level` | `"debug" \| "info" \| "warn" \| "error"` | `"error"` | 重要度 |
| `msg` | `string` | `"job detail fetch failed"` | 人間可読サマリ |

## 相関フィールド (該当する場合は必ず含める)

| キー | 型 | 由来 |
|------|------|------|
| `jobNumber` | `string` | `13010-12345678` 形式。3 基盤横断トレースのキー |
| `establishmentNumber` | `string` | 事業所番号 |
| `requestId` | `string` | リクエスト単位の相関 ID (将来 OTel `trace_id` に置き換え) |

**Rule of thumb**: 関数のスコープに `jobNumber` があるなら、その関数内のすべてのログに含める。

## エラー固有フィールド

| キー | 型 | 由来 |
|------|------|------|
| `_tag` | `string` | `Data.TaggedError` の `_tag`。例: `JobDetailTransformError` |
| `error.message` | `string` | 元エラーメッセージ |
| `error.stack` | `string?` | スタックトレース (本番では省略可) |

## 実装: `@sho/logger`

[packages/logger](../packages/logger/src/index.ts) が [Effect Logging](https://effect.website/docs/observability/logging/) を使った JSON ロガーを提供する。
3 サービス (collector / api / frontend) すべてがこのパッケージに依存する。

各サービスは `src/log.ts` (collector は `infra/functions/logger.ts`) で `service` を束縛した薄いラッパを公開する:

```ts
// 例: apps/backend/api/src/log.ts
import { logErrorCause, makeLogger } from "@sho/logger";
export const { LoggerLayer, runLog } = makeLogger("api");
export { logErrorCause };
```

## 使い方

### Effect の中

```ts
yield* Effect.logInfo("job detail success");  // service, timestamp, msg が自動付与

yield* Effect.logError("job detail failed").pipe(
  Effect.annotateLogs({ jobNumber, status: 500 }),
);
```

### エラーハンドリング (tapErrorCause)

```ts
program.pipe(
  Effect.tapErrorCause((cause) => logErrorCause("operation failed", cause)),
  Effect.annotateLogs({ jobNumber }),  // この Effect 内のログすべてに付与
  Effect.provide(LoggerLayer),
);
```

`logErrorCause` は `Data.TaggedError` を Schema で検証して `_tag` / `error.message` を自動抽出する。

### Effect の外 (Hono ミドルウェア、RSC ページ等)

`runLog` で Effect をブリッジする:

```ts
await runLog(
  Effect.logInfo("request completed").pipe(
    Effect.annotateLogs({ method, url, status, durationMs }),
  ),
);
```

## アンチパターン

- `console.log("failed for " + jobNumber)` — grep でキー検索できない
- `console.error(error)` のみ — `_tag` が落ちる
- 絵文字プレフィックス (`📥 ...`) — フィルターに使えない (人間向けの prefix は別途許容)

## クエリ (横断トレース)

`/debug` skill が以下を自動化する。

```bash
# jobNumber 横断検索
.claude/skills/debug/scripts/debug.sh trace 13010-12345678
```

## 機密情報

ログに以下を**含めない**:

- API キー (`x-api-key` の値)
- Cookie / Authorization ヘッダー
- ユーザーの個人特定情報 (氏名・住所・電話番号)

求人情報 (jobNumber / 求人内容) は公開情報のためログ可。

## 将来の OpenTelemetry 移行

`requestId` を OTel `trace_id` 形式 (16 バイト hex) で生成しておけば、後で OTel SDK を被せた時にそのまま `trace_id` として使える。
