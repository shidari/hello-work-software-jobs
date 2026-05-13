---
number: 757
title: "調査: Cloudflare Containers でバックエンドを Haskell 化する可能性"
state: open
author: shidari
labels: []
url: https://github.com/shidari/hello-work-software-jobs/issues/757
createdAt: 2026-03-06T16:59:25Z
updatedAt: 2026-03-06T16:59:25Z
---

## 概要

Cloudflare Containers を使えば、バックエンドを Haskell で書ける可能性がある。調査メモ。

## Cloudflare Containers とは

- 任意の Docker コンテナ（`linux/amd64`）を Cloudflare のグローバルネットワーク上で実行できるコンテナ実行基盤
- Workers の「軽量・低レイテンシ」を補完する形で設計
- Durable Objects ベースでインスタンスのライフサイクル管理・スケーリングを実現
- **Worker 経由でのみアクセス**（単体で公開エンドポイントを持たない）

## ステータス

**Public Beta**（2025年6月〜）。Workers Paid プラン（$5/月）で即日利用可。

## 料金

| リソース | 無料枠（月間） | 超過料金 |
|---------|------------|---------|
| メモリ | 25 GiB-時間 | $0.0000025 / GiB秒 |
| CPU | 375 vCPU-分 | $0.000020 / vCPU秒 |
| ディスク | 200 GB-時間 | $0.00000007 / GB秒 |

アクティブ時間のみ課金（10ms単位）。スリープ中は無課金。

## インスタンスタイプ

| タイプ | vCPU | メモリ | ディスク |
|--------|------|--------|---------|
| lite | 1/16 | 256 MiB | 2 GB |
| basic | 1/4 | 1 GiB | 4 GB |
| standard-1 | 1/2 | 4 GiB | 8 GB |
| standard-2 | 1 | 6 GiB | 12 GB |
| standard-3 | 2 | 8 GiB | 16 GB |
| standard-4 | 4 | 12 GiB | 20 GB |

## 制約

- アーキテクチャ: `linux/amd64` のみ（ARM 非対応）
- ディスク: 一時的（スリープでリセット）
- イメージストレージ上限: 50 GB/アカウント

## Workers との統合

```typescript
import { Container, getRandom } from "@cloudflare/containers";

class MyAPI extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";
}

export default {
  async fetch(req: Request, env: { MY_API: DurableObjectNamespace }) {
    const instance = getRandom(env.MY_API, 3);
    return instance.fetch(req);
  },
};
```

## Haskell での利用

**可能。** Docker イメージが動けば言語不問。

考慮点:
- GHC + cabal/stack の Docker イメージはサイズが大きい → multi-stage build で軽量化
- イメージストレージ上限（50 GB）に注意
- Servant や Scotty 等の Haskell Web フレームワークでHTTPサーバーを立て、Worker から `fetch()` でプロキシ

## 参考リンク

- https://developers.cloudflare.com/containers/
- https://blog.cloudflare.com/containers-are-available-in-public-beta-for-simple-global-and-programmable/
- https://github.com/cloudflare/containers


