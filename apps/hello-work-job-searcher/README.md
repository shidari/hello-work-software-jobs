# ハローワーク求人情報検索アプリ

ハローワークの求人情報を検索・閲覧できるNext.jsアプリケーションです。

## 概要

React 19とNext.js 15の最新技術スタックを採用したモダンなWebアプリケーション。TanStack React Virtualによる仮想化、Jotaiによる効率的な状態管理、neverthrowによる型安全なエラーハンドリングを実現しています。

## 技術スタック

- **フレームワーク**: Next.js (v15.5.3) - App Router
- **ライブラリ**: React (v19.1.1)
- **言語**: TypeScript (v5)
- **開発ツール**: Turbopack - 高速な開発サーバー
- **仮想化**: TanStack React Virtual (v3.13.12)
- **状態管理**: Jotai (v2.13.1)
- **エラーハンドリング**: neverthrow (v8.2.0)
- **バリデーション**: Valibot (v1.1.0)
- **API**: Hono (v4.8.3) - プロキシAPI兼RPC実装
- **テスト**: Playwright (v1.55.0)
- **スタイリング**: CSS Modules

## 主要機能

### 完成済み機能

- ✅ 求人一覧表示（仮想化無限スクロール）
- ✅ 求人詳細ページ（動的ルーティング `/jobs/[jobNumber]`）
- ✅ 高度な検索・フィルタリング機能
  - 会社名検索（リアルタイム、デバウンス機能付き）
  - 職務内容キーワード検索
  - 除外キーワード検索
  - 従業員数範囲フィルタ（1-9人、10-30人、30-100人、100人以上）
  - 期限切れ求人の除外フィルタ
- ✅ お気に入り機能（localStorage永続化）
- ✅ お気に入り求人の一覧表示・管理（専用ページ `/favorites`）
- ✅ サーバーサイドレンダリング（SSR）による初期データプリロード
- ✅ TanStack React Virtualによる仮想化とスクロール位置保持
- ✅ レスポンシブデザイン

## 開発環境のセットアップ

### 前提条件

- Node.js (推奨: 最新LTS版)
- pnpm (v10.15.1以上)

### インストール

```bash
# 依存関係のインストール
pnpm install
```

### 環境変数の設定

`.env.sample`を参考に`.env.local`ファイルを作成してください。

### 開発サーバーの起動

```bash
# Turbopack対応の開発サーバー（ポート9002で起動）
pnpm dev
```

ブラウザで [http://localhost:9002](http://localhost:9002) を開いてアプリケーションを確認できます。

### ビルド

```bash
# 本番用ビルド
pnpm build

# 本番環境での起動
pnpm start
```

### テスト実行

```bash
# PlaywrightによるE2Eテスト
pnpm test

# 型チェック
pnpm type-check
```

## プロジェクト構成

```
src/
├── app/
│   ├── api/                       # プロキシAPI
│   │   └── [[...route]]/          # Catch-allルート
│   ├── components/                # 共通コンポーネント
│   │   ├── client/                # クライアントコンポーネント
│   │   └── NavHeader/             # ナビゲーションヘッダー
│   ├── favorites/                 # お気に入りページ
│   ├── hooks/                     # カスタムフック
│   ├── jobs/                      # 求人関連ページ
│   │   └── [jobNumber]/           # 動的ルーティング
│   ├── store/                     # Jotai状態管理
│   ├── styles/                    # グローバルスタイル
│   ├── layout.tsx                 # ルートレイアウト
│   ├── page.tsx                   # トップページ
│   └── util.ts                    # ユーティリティ関数
└── tests/                         # E2Eテスト
```

## アーキテクチャ

### ハイブリッドデータフェッチング

サーバーサイドレンダリング（SSR）とクライアントサイドフェッチングを組み合わせた効率的なデータ取得を実現：

- **初回ロード**: SSRによる初期データプリロード
- **以降の操作**: クライアントサイドでの動的フェッチング

### 仮想化による最適化

TanStack React Virtualを使用し、大量の求人データを効率的に表示：

- メモリ使用量の削減
- スムーズなスクロール体験
- スクロール位置の保持

### プロキシAPI設計

フロントエンドとバックエンドAPIの間にプロキシレイヤーを配置：

- CORS問題の回避
- APIキーの秘匿化
- 型安全なRPC実装（Hono）
- エラーハンドリングの一元管理

### 状態管理（Jotai）

効率的なatom分離設計：

- `jobListAtom`: 求人一覧データ
- `JobOverviewListAtom`: 求人概要リスト
- `favoriteJobsAtom`: お気に入り求人（localStorage永続化）

## スタイリング

- CSS Modulesを使用したスコープ付きスタイル
- レスポンシブデザイン対応
- アクセシビリティを考慮したカラーパレット

## デプロイ

Vercelプラットフォームでのデプロイを推奨します。

デプロイ済みURL: https://my-hello-work-job-list-hello-work-j.vercel.app/

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。

## ライセンス

ISC
