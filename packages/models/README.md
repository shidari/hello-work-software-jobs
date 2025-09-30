# @sho/models

モノレポ全体で共有される型定義・スキーマパッケージです。

## 概要

`@sho/models`は、フロントエンド、バックエンド、データベース間で型の一貫性を保つための中核パッケージです。Valibotスキーマ、Drizzle ORMスキーマ、TypeScript型定義を一元管理し、全パッケージの**Source of Truth**として機能します。

## 技術スタック

- **TypeScript** (v5.8.3) - 型定義
- **Valibot** (v1.1.0) - ランタイムスキーマバリデーション
- **Drizzle ORM** (v0.44.2) - データベーススキーマ定義
- **tsdown** (v0.15.3) - ビルドツール
- **Playwright** (v1.53.1) - テスト用ブラウザ自動化（devDependency）

## パッケージ構成

```
src/
├── common.ts                  # 共通型定義
├── index.ts                   # エクスポート
├── frontend/                  # フロントエンド向け型定義
│   ├── index.ts
│   └── type.ts
├── headless-crawler/          # クローラー向け型定義
│   ├── index.ts
│   ├── scraper.ts
│   └── type.ts
├── job-store/                 # API/DB向け型定義
│   ├── client.ts
│   ├── drizzle.ts             # Drizzle ORMスキーマ
│   ├── index.ts
│   ├── jobFetch.ts
│   ├── jobInsert.ts
│   ├── tmp.ts
│   ├── type.ts
│   └── jobList/
```

## 主要機能

### 1. 型の一元管理

すべてのパッケージが`@sho/models`から型定義をインポートすることで、型の整合性を担保します。

```typescript
// 各パッケージでの使用例
import { JobListResponse, InsertJobRequestBody } from '@sho/models';
```

### 2. Valibotスキーマバリデーション

ランタイムでのデータ検証をValibotスキーマで実現します。

```typescript
import { insertJobRequestBodySchema } from '@sho/models';
import * as v from 'valibot';

const result = v.safeParse(insertJobRequestBodySchema, data);
if (result.success) {
  // 型安全に使用可能
  const validatedData = result.output;
}
```

### 3. Drizzle ORMスキーマ

データベーステーブル定義をDrizzle ORMスキーマとして管理します。

```typescript
import { jobsTable } from '@sho/models';

// データベース操作で使用
const jobs = await db.select().from(jobsTable);
```

## ビルド

```bash
# TypeScriptをビルド
pnpm build

# 型チェック
pnpm type-check
```

ビルドされたファイルは`dist/`ディレクトリに出力されます：
- `dist/index.mjs` - ESM形式
- `dist/index.js` - CommonJS形式
- `dist/index.d.ts` - 型定義ファイル

## 使用方法

### 他のパッケージから利用

```json
// package.json
{
  "dependencies": {
    "@sho/models": "workspace:*"
  }
}
```

```typescript
// TypeScriptファイル内
import { 
  JobListResponse,
  insertJobRequestBodySchema,
  jobsTable 
} from '@sho/models';
```

### 型定義の追加

1. 適切なディレクトリ配下に型定義を追加
2. `src/index.ts`からエクスポート
3. `pnpm build`でビルド
4. 他のパッケージで利用可能に

## 設計思想

### モノレポにおけるSource of Truth

`@sho/models`は、以下の理由から型定義の唯一の情報源（Source of Truth）として機能します：

- **一貫性**: すべてのパッケージが同じ型定義を参照
- **変更容易性**: 型定義の変更が一箇所で完結
- **コンパイル時チェック**: 型の不整合をコンパイル時に検出
- **ランタイム検証**: Valibotによる実行時のデータ検証

### 型安全性の徹底

- TypeScript strict mode有効化
- Valibotスキーマによるランタイムバリデーション
- Drizzle ORMによるデータベース操作の型安全性

## 注意事項

- `@sho/models`を変更した後は、必ず`pnpm build`を実行してください
- 破壊的な型変更を行う場合は、依存するすべてのパッケージの影響を確認してください
- Drizzle ORMスキーマを変更した場合は、マイグレーションの生成・適用が必要です

## ライセンス

ISC
