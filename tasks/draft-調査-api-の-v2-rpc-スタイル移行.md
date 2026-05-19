---
title: "調査: API を v2 RPC スタイルに段階移行 (hono-trpc は不採用)"
state: draft
author: claude
labels: [api, investigation]
---

## 結論

- API は **Hono を維持しつつ v2 で RPC スタイルに段階移行**する
- **hono-trpc (tRPC + `@hono/trpc-server`) は不採用** (理由は後段)
- 移行方針: `/v2/<resource>.<op>` を既存ルートの隣に生やし、collector → frontend を順次切替 → v1 削除

## 動機

REST 表面に縛られて以下が地味な摩擦になっている:

- HTTP verb の取り合わせに毎回悩む (PATCH / PUT / POST どれか)
- 204 / 200 / 201 の選択が CQRS 層の戻り値と合わない
- 名前付き操作 (e.g., "bulk re-fetch detail", "merge company records") を「リソース + verb」に押し込むのが窮屈
- 一方で **CQRS 層 ([cqrs/commands.ts](../apps/backend/api/src/cqrs/commands.ts) / [queries.ts](../apps/backend/api/src/cqrs/queries.ts)) は既に Command/Query 単位で名前付き**になっている

→ HTTP 表面を CQRS 名にそのまま揃えれば、内部実装と URL で認知負荷の二重持ちが消える。Next.js 側に RPC wrapper を被せる案も検討したが、それでは「verb 選択 / status code 分岐」など REST 起因の摩擦は解消されないので不採用。

## v2 設計方針

### URL 命名

`POST /v2/<resource>.<operation>` で統一。全部 POST + JSON body。

| v1 | v2 |
|---|---|
| `GET /jobs?...` | `POST /v2/jobs.list` |
| `GET /jobs/:jobNumber` | `POST /v2/jobs.get` |
| `POST /jobs` | `POST /v2/jobs.insert` |
| `GET /companies/:establishmentNumber` | `POST /v2/companies.get` |
| `POST /companies` | `POST /v2/companies.upsert` |
| `GET /stats/daily` | `POST /v2/stats.daily` |

### body / レスポンス

- 入力は JSON body のみ (query / path param 廃止)
- 成功: `200 + { data }`
- ビジネスエラー (`Data.TaggedError`): `200 + { error: { _tag, message, ... } }` で `_tag` を JSON に降ろす (現状の `Effect.match` 分岐をそのまま JSON 化)
- システムエラー (DB 障害等): 5xx
- 認可エラー (api-key 不正): 401 のまま (HTTP semantics に従う)

→ client 側で status code 分岐がほぼ消え、`if (res.body.error)` 一本にまとまる。

### validator

現状の **Effect Schema を継続使用**。`hono-openapi` の `validator as effectValidator` がそのまま使える (URL shape が変わるだけ)。CQRS への変換は今と同じ。

### OpenAPI / Swagger UI

維持する。全 procedure が POST になっても `describeRoute` の `summary` を効かせれば Swagger UI 上で操作名が一覧できる。group tag (`jobs` / `companies` / `stats`) で整理する。

## 移行プラン (soft v2)

1. **v2 ルーター追加** (`src/app/v2/`) — 各 procedure を CQRS にそのまま流す薄い handler。v1 は残す
2. **OpenAPI 統合** — `/openapi` は v1 + v2 両方を吐く
3. **collector を v2 に切替** — `lib/apiClient/{mutation,query}.ts` を v2 ベースに書き換え (内部 monorepo なので一発)
4. **frontend を v2 に切替** — RSC 5 箇所 (jobs page / jobs/[jobNumber] / companies/[establishmentNumber] / JobsList_client / JobSearchFilter) を v2 client 経由に
5. **v1 削除** — collector / frontend のデプロイが両方 v2 を指していることを確認してから

### 概算

| 工程 | 概算 |
|---|---|
| v2 ルーター実装 + OpenAPI 結合 | 1 d |
| collector 切替 | 0.5 d |
| frontend 切替 (Storybook mock 含む) | 0.5-1 d |
| v1 削除 + cleanup | 0.5 d |
| **合計** | **2.5-3 d** |

CQRS 層が既に RPC-shaped なので大半が機械的移植。

### リスク / 留意点

- **rate-limit** ([src/middleware/rate-limit.ts](../apps/backend/api/src/middleware/rate-limit.ts)) が path ベース粒度なら v2 path にも合わせる
- **Cloudflare edge cache** は GET にしか効かない。v1 で cacheable だった `GET /jobs/:n` 等を POST 化すると CDN cache がゼロになる
  - 影響が出るなら v2 でも GET path を併設する、または Workers Cache API で明示管理
  - 現状ヒット率を計測した上で判断 (要事前調査)
- **Hono RPC client** (`hc<AppType>`) は v2 でも型がそのまま降りる。frontend / collector の client は path とリクエスト形だけ書き換え

## 不採用: hono-trpc (tRPC + `@hono/trpc-server`)

検討したが以下の理由で不採用:

1. tRPC の最大の差別化要素 (E2E 型安全) は **Hono RPC で既に達成済み** — 上書きしても得るものなし
2. validator が Effect Schema で固まっており、tRPC の input parser (zod / Standard Schema) と噛み合わない (Effect Schema は Standard Schema 準拠を表明していない / 2026-05 時点)
3. OpenAPI 維持のための `trpc-openapi` はメンテ鈍化 + procedure 全てに `.meta` 二重定義が要る
4. 移行コスト 6-10 d に対し得るものが少ない (v2 RPC redesign なら 2.5-3 d で同等の DX 改善)

## 不採用: Next.js 側に RPC wrapper

ヘルパで `jobs.list()` / `jobs.byNumber()` を生やす案も検討したが、不採用:

- 名前は綺麗になるが、API 側の REST 起因の摩擦 (verb 選択 / status code 分岐 / 名前付き operation の押し込み) は consumer 側ヘルパでは解消できない
- consumer は frontend だけでなく collector もある — wrapper を 2 箇所に書くことになる

## 関連 / 参考

- 現状の API ルート: [src/app/jobs.ts](../apps/backend/api/src/app/jobs.ts) / [companies.ts](../apps/backend/api/src/app/companies.ts) / [stats.ts](../apps/backend/api/src/app/stats.ts)
- CQRS: [cqrs/commands.ts](../apps/backend/api/src/cqrs/commands.ts) / [queries.ts](../apps/backend/api/src/cqrs/queries.ts)
- API rule: [.claude/rules/api.md](../.claude/rules/api.md)
- consumer (frontend): [backend-client.ts](../apps/frontend/hello-work-job-searcher/src/lib/backend-client.ts)
- consumer (collector): [apiClient/mutation.ts](../apps/backend/collector/lib/apiClient/mutation.ts) / [query.ts](../apps/backend/collector/lib/apiClient/query.ts)
