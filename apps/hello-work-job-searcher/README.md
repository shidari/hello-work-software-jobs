# ハローワーク求人情報検索アプリ

ハローワークの求人情報を検索・閲覧できるNext.jsアプリケーションです。

## 機能

- 求人情報の検索・一覧表示
- お気に入り機能
- レスポンシブデザイン

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- CSS Modules
- React

## 開発環境のセットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## プロジェクト構成

```
src/
├── app/
│   ├── components/     # 共通コンポーネント
│   ├── jobs/          # 求人関連ページ
│   ├── favorites/     # お気に入り機能
│   ├── hooks/         # カスタムフック
│   ├── store/         # 状態管理
│   └── styles/        # グローバルスタイル
```

## スタイリング

- CSS Modulesを使用
- レスポンシブデザイン対応
- アクセシビリティを考慮したカラーパレット

## デプロイ

Vercelプラットフォームでのデプロイを推奨します。

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。
