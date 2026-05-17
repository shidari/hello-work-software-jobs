---
number: 909
title: "調査: Next.js 公式 Cloudflare adapter リリース後にフロントを CF に集約"
state: open
author: shidari
labels: []
createdAt: 2026-05-16
---

## 概要

frontend (Vercel) を API 側 (Cloudflare Workers) に集約したい。技術的には今日でも [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) で移行可能だが、**Next.js 16.2 で安定化した Adapter API の公式 Cloudflare adapter** がまだ未公開。公式 adapter のリリースを待ってから移行することで、書き直しコストを回避する。

## 背景

- 現状フロントは Vercel (`apps/frontend/hello-work-job-searcher`、Next.js 16.2.6)
- API は Cloudflare Workers + D1 (`apps/backend/api`、wrangler.jsonc は Worker 1 + D1 1 のミニマム構成)
- 集約の動機: 課金/管理の一元化、Worker 間の service binding 活用、IaC 化（Pulumi 等）への布石

## Next.js 公式 Adapter API の状況 (2026-05 時点)

- **Next.js 16.2 (2026-03-25 リリース) で [Adapter API が stable 化](https://nextjs.org/blog/nextjs-across-platforms)**
- ビルド時に「routes / prerenders / static assets / runtime targets / dependencies / caching rules」の typed・versioned な記述を出力 → adapter がプラットフォーム固有インフラに変換
- Vercel adapter も同じ公開契約を使う（特権 hook なし、OSS）。プロバイダ間の互換性が仕様レベルで担保される方向
- **Cloudflare adapter は OpenNext 経由で「active development」、"expected releases later this year"**
- `nextjs/adapter-cloudflare` リポジトリは **まだ未公開**（org に見えるのは `adapter-vercel` / `adapter-bun` のみ）

## 既存 `@opennextjs/cloudflare` の状況

- Next.js 16 系（16.2 含む）対応済み、Node.js runtime ベース
- ただし新 Adapter API 契約にはまだ乗っていない（独自変換系）
- 既知制約:
  - **Node Middleware (Next.js 15.2+ で追加) 非対応** → 現フロントは middleware 未使用なので影響なし
  - Worker bundle size: 3 MiB (free) / 10 MiB (paid, gzip 後) → 現フロントの規模 (`jobs` / `favorites` / `companies` の 3 系統) なら 10MB 枠は余裕の見込み
  - Windows 非保証

## 判断軸

| 観点 | 今すぐ移行 (現 OpenNext) | 公式 adapter 待ち |
|------|-------------------------|---------------------|
| 動作 | ✅ 動く | ⏳ リポジトリ未公開 |
| 安定性 | コミュニティ製の独自変換 | Vercel と同じ契約に乗る |
| 後の書き直し | ⚠️ 公式 adapter 出たら recipe 変わる可能性 | ✅ 一度書けば済む |
| リリース時期 | 今 | "later this year"（年内、確約なし）|

**結論: 急いでないので待ち**。Vercel コスト/障害が痛むまでは現状維持。

## ToDo

- [ ] `nextjs/adapter-cloudflare` リポジトリの公開を監視（[nextjs GitHub org](https://github.com/nextjs)）
- [ ] 公式 adapter リリース後、production-ready 判定（テストスイート通過状況・採用事例）
- [ ] 移行設計: Vercel → CF Workers (フロント) + 既存 API Worker との service binding、ISR cache の R2/KV 設計、custom domain 設計
- [ ] 移行実施 (wrangler ベースで)
- [ ] 構成が固まった後に Pulumi 化を別途検証（front Worker + api Worker + D1 + R2/KV + DNS が見えてから判断）

## 関連

- [Next.js Across Platforms: Adapters, OpenNext, and Our Commitments](https://nextjs.org/blog/nextjs-across-platforms) (2026-03-25)
- [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare)
- [Next.js Ecosystem Working Group](https://nextjs.org/ecosystem-working-group)
