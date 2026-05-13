---
number: 908
title: "test: カバレッジが低い領域に documented unit test を追加"
state: open
author: shidari
labels: []
createdAt: 2026-05-05
---

## 概要

monorepo 全体でテストカバレッジが手薄。特に純粋ロジック層・ユーティリティ層が無テストのまま integration test に依存している箇所が多い。`describe` / `it` の文言が **仕様書として読める形**（documented test）で unit test を足し、リグレッション検知と実装意図の明文化を同時に進める。

## 現状サマリ

| ワークスペース | テストファイル数 | 主な穴 |
|---|---|---|
| `apps/backend/api` | 2（HTTP integration 中心） | CQRS query / middleware の単体ロジックが未カバー |
| `apps/backend/collector` | 5（PBT + fixture 駆動） | 比較的カバー良好。`crawl.ts` 周辺のページネーション・バリデーションだけ補強余地 |
| `apps/frontend/hello-work-job-searcher` | **0** | atom / utility / Client Component すべて未カバー |
| `packages/models` | 1 | OK |
| `packages/db` | **0** | 集約クエリ・スキーマ変換が未カバー |
| `packages/logger` | **0** | `logErrorCause` の Cause 抽出が未カバー |

## 優先順位

ROI（仕様の重要度 × テスト容易さ）で並べた。1 タスク = 1 worktree = 1 PR で進める。

### P1: API の CQRS query

- 対象: [apps/backend/api/src/cqrs/queries.ts](apps/backend/api/src/cqrs/queries.ts)
- 補完したい仕様:
  - LIKE エスケープ: `%` / `_` / `\` を含むキーワードが literal 扱いされる
  - フィルタ条件の組み立て: 雇用形態 / 職種 / 賃金範囲 / 都道府県 などの組み合わせ
  - ページネーション境界: `page=0` の扱い、`page > totalPages` の扱い、`limit` の上下限
- 純関数寄りで DB 依存少なめの部分から始める。Kysely クエリビルダの compile 結果を文字列比較する方式が documented になりやすい。

### P2: packages/db の集約クエリ

- 対象: [packages/db/src/queries.ts](packages/db/src/queries.ts)
- 補完したい仕様:
  - 日次新着求人数の集約（`/stats/daily` の根っこ）: 日付境界（JST）、空区間の扱い、欠損日の埋め
  - スキーマ変換 `DbJobRowSchema` ↔ ドメイン
- 実装方針: `better-sqlite3` の in-memory + `migrations/*.sql` をロードして fixture row を投入 → 集約結果をアサート。Workers / D1 と独立した dialect 非依存パッケージなので最小依存で書ける。

### P3: packages/logger

- 対象: [packages/logger/src/](packages/logger/src/)
- 補完したい仕様:
  - `makeLogger(service)` が出力に `service` フィールドを bind すること
  - `logErrorCause(msg, cause)` が `Data.TaggedError` から `_tag` / `error.message` を抽出すること
  - `Cause` が複合（`Cause.parallel` / `Cause.sequential`）のときの抽出挙動
- 実装方針: `console.log` / `console.error` を `vi.spyOn` で受けて出力 JSON をアサート。`docs/LOGGING.md` のキー名規約をテストの `describe` 文言に直接落とす。

## 中期候補

すぐは着手しないが将来追加する候補:

- [apps/backend/api/src/middleware/rate-limit.ts](apps/backend/api/src/middleware/rate-limit.ts) — トークンバケット計算（時刻進行・補充・枯渇）の単体検証
- [apps/backend/collector/lib/hellowork/job-number-crawler/crawl.ts](apps/backend/collector/lib/hellowork/job-number-crawler/crawl.ts) — 求人番号バリデーション・ページ送り終了条件
- `apps/frontend/hello-work-job-searcher/src/atom.ts` — お気に入り Jotai atom の localStorage 永続化挙動
- `apps/frontend/hello-work-job-searcher/src/util.ts` — 日付フォーマット等の純関数

## 進め方

- 1 パッケージ = 1 worktree = 1 PR。CI が走っている間に次の worktree に着手できる
- `describe` / `it` の文言は **日本語で仕様**を書く（既存 `apps/backend/api/test/unit.spec.ts` の「ページ管理」「重複エラー」「セキュリティ」のスタイルを踏襲）
- coverage 設定が無いワークスペース（`apps/backend/api` / `packages/db` / `packages/logger`）は、テスト追加と合わせて `vitest.config.ts` に `coverage.include` を足す

## 参考

- 現状調査メモ（このイシューの根拠となった audit）: 2026-05-05 セッションの Explore agent 結果
- 既存の良い例:
  - [apps/backend/api/test/unit.spec.ts](apps/backend/api/test/unit.spec.ts) — Effect.gen + DI で documented にできている HTTP integration
  - [apps/backend/collector/lib/hellowork/__tests__/transformer.test.ts](apps/backend/collector/lib/hellowork/__tests__/transformer.test.ts) — PBT (effect/FastCheck) で domain transform の不変条件を表現
