# Logger (packages/logger)

3 サービス横断の構造化ログライブラリ。[docs/LOGGING.md](../../docs/LOGGING.md) のキー名規約を実装する。

## API

- `makeLogger(service)` → `{ LoggerLayer, runLog }` を返す
- `logErrorCause(msg, cause)` → Cause から `_tag` / `error.message` を抽出してエラーログを出す

## 設計

- Effect の `Logger.make` + `Logger.replace` で差し替え
- `service` はファクトリ引数で束縛
- `Schema.Struct({ _tag, message })` で `Data.TaggedError` を型安全に抽出
- Workers / Node / Edge すべてで動作（`console.*` と `Date` と `JSON` のみ使用）

## 利用側

各サービスで薄いラッパを用意する:

```ts
// apps/backend/api/src/log.ts
import { logErrorCause, makeLogger } from "@sho/logger";
export const { LoggerLayer, runLog } = makeLogger("api");
export { logErrorCause };
```

service ごとに個別の LoggerLayer を持つため、サービス名はラッパでのみ決定される。

## コマンド

```bash
pnpm --filter @sho/logger build       # tsdown ビルド
pnpm --filter @sho/logger type-check  # 型チェック
```

## 依存

`effect` のみ。副作用は `console.log` / `console.error`。
