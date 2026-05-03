---
number: 701
title: "investigate: Next.js → Vinext (Cloudflare Vite-based) 移行の検討"
state: open
author: shidari
labels: ["enhancement"]
url: https://github.com/shidari/hello-work-software-jobs/issues/701
createdAt: 2026-02-27T06:50:12Z
updatedAt: 2026-02-27T06:50:12Z
---

## 概要

Cloudflare が Vite ベースの Next.js 互換フレームワーク **Vinext** を発表した（2026/2/24）。
Next.js 16 の API の 94% を再実装しており、既存の `app/`, `pages/`, `next.config.js` がそのまま動くドロップインリプレースメントを謳っている。

現在フロントエンドは **Vercel + Next.js 16** でホスティングしているが、API は既に **Cloudflare Workers** 上にある。
Vinext に移行すればフロントエンドも Cloudflare Workers にデプロイでき、インフラを Cloudflare に統合できる。

## Vinext の主な特徴

- **Vite ベース**: Turbopack の代わりに Vite を使用
- **ドロップイン互換**: `next` → `vinext` にスクリプト置換するだけで移行可能
- **RSC / Server Actions / Streaming / Middleware**: 対応済み
- **ビルド速度**: Next.js 16 比で最大 4.4x 高速（Vite 8/Rolldown 使用時）
- **バンドルサイズ**: 57% 削減（168.9 KB → 72.9 KB gzipped）
- **Cloudflare ネイティブ**: KV キャッシュで ISR、D1 / Durable Objects / AI バインディング直接利用可能
- **`vinext deploy` 一発デプロイ**: Cloudflare Workers へ直接デプロイ

## 当プロジェクトとの互換性

| 技術 | 対応状況 |
|------|---------|
| App Router | OK |
| React 19 | OK |
| RSC (Server Components) | OK |
| Hono RPC (`hc`) | OK（クライアントライブラリなので問題なし） |
| Jotai | OK（クライアントサイドのみ） |
| @tanstack/react-virtual | OK（クライアントサイドのみ） |
| Parallel Routes (`@search`, `@detail`) | 要検証（94% カバレッジの範囲内か不明） |
| `generateStaticParams()` | **未対応**（ロードマップ上） |

## メリット

- **インフラ統合**: Vercel 依存をなくし、フロントエンドも Cloudflare Workers に統合
- **コスト削減**: Vercel の課金体系から離脱（Workers は従量課金で安い）
- **D1 直接アクセス**: フロントエンドから D1 に直接バインディング可能になれば、proxy route が完全に不要になる
- **ビルド高速化**: CI/CD のビルド時間短縮

## リスク・懸念

- **experimental**: 2026/2/24 公開、まだ1週間。本番での実績がほぼない
- **94% カバレッジ**: 残り 6% に当プロジェクトが使う機能が含まれる可能性
- **Parallel Routes**: 当プロジェクトのコア機能（`@search` / `@detail` 並列ルート）が動くか要検証
- **`generateStaticParams()`**: 未対応（現在は使っていないが将来的に影響あり）

## 移行手順（想定）

```bash
npm install vinext
# package.json の scripts で "next" → "vinext" に置換
# vinext dev で動作確認
# vinext deploy で Cloudflare Workers にデプロイ
```

## 調査タスク

- [ ] `npx skills add cloudflare/vinext` で自動移行スキルを試す
- [ ] Parallel Routes (`@search`, `@detail`) が動作するか検証
- [ ] `force-dynamic` エクスポートが動作するか検証
- [ ] Hono RPC + proxy route が正常動作するか検証
- [ ] Cloudflare D1 バインディングをフロントエンドから直接利用できるか調査
- [ ] ビルド速度・バンドルサイズの実測

## 参考

- ブログ: https://blog.cloudflare.com/vinext/
- GitHub: https://github.com/cloudflare/vinext
- ベンチマーク: https://benchmarks.vinext.workers.dev


