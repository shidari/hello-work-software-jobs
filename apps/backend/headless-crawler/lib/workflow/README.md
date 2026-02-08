# Workflow Architecture - クローラーETLパイプライン

## 概要

このディレクトリには、関数型ドメイン駆動設計に基づくETL（Extract-Transform-Load）ワークフローの実装が含まれています。

## アーキテクチャ

```
lib/workflow/
├── types.ts          # ワークフロー型定義
├── domain.ts         # ドメインモデル
├── errors.ts         # エラー型定義
├── etl.ts            # ETLワークフロー定義
├── index.ts          # エクスポート
└── stages/           # ETLステージ実装
    ├── extract.ts            # 求人番号抽出
    ├── extract-job-detail.ts # 求人詳細HTML抽出
    ├── transform.ts          # データ変換
    ├── load.ts               # データ永続化
    └── index.ts              # エクスポート
```

## コアコンセプト

### 1. ワークフロー (Workflow)

ワークフローは、入力を出力に変換する再利用可能なパイプラインです。

```typescript
interface Workflow<Input, Output, Error, Dependencies> {
  readonly run: Stage<Input, Output, Error, Dependencies>;
  readonly description: string;
}
```

### 2. ステージ (Stage)

ステージは、ワークフローの単一のステップを表す純粋な関数です。

```typescript
type Stage<Input, Output, Error, Dependencies> = (
  input: Input,
) => Effect.Effect<Output, Error, Dependencies>;
```

### 3. ドメインモデル

各ETLステージには明確に定義されたドメインモデルがあります：

- **Extract Domain**: `JobSearchCriteria` → `JobMetadata[]` または `JobNumber` → `RawHtml`
- **Transform Domain**: `RawHtml` → `TransformedJobData`
- **Load Domain**: `TransformedJobData` → `LoadResult`

### 4. エラーハンドリング

各ステージは、特定のエラー型を定義します：

- **ExtractError**: `NavigationError | ExtractionError | PageValidationError | PaginationError`
- **TransformError**: `ParseError | FieldTransformationError | ValidationError`
- **LoadError**: `ApiRequestError | NetworkError | PersistenceError`

## 使用例

### 求人番号抽出ワークフロー

```typescript
import { createExtractStage, createJobNumberExtractionWorkflow } from "@/lib/workflow";

const extractStage = createExtractStage();
const workflow = createJobNumberExtractionWorkflow(extractStage);

const criteria = {
  workLocation: { prefecture: "東京都" },
  desiredOccupation: {
    occupationSelection: "ソフトウェア開発技術者、プログラマー",
  },
  employmentType: "RegularEmployee",
  searchPeriod: "today",
};

const result = await Effect.runPromise(
  workflow.run(criteria)
    .pipe(Effect.provide(/* dependencies */))
);
```

### 求人詳細ETLワークフロー

```typescript
import {
  createExtractJobDetailStage,
  createTransformStage,
  createLoadStage,
  createJobDetailETLWorkflow,
} from "@/lib/workflow";

const extractStage = createExtractJobDetailStage();
const transformStage = createTransformStage();
const loadStage = createLoadStage();
const workflow = createJobDetailETLWorkflow(
  extractStage,
  transformStage,
  loadStage,
);

const jobNumber = "13010-12345678";
const result = await Effect.runPromise(
  workflow.run(jobNumber)
    .pipe(Effect.provide(/* dependencies */))
);
```

## ワークフローの合成

ワークフローは関数的に合成できます：

```typescript
import { composeStages } from "@/lib/workflow";

const composedStage = composeStages(
  extractStage.extractRawHtml,
  transformStage.transformHtml,
);
```

## 利点

1. **再利用性**: ワークフローは異なるコンテキストで再利用できます
2. **テスト可能性**: 各ステージを独立してテストできます
3. **型安全性**: TypeScriptの型システムによる完全な型安全性
4. **エラーハンドリング**: 構造化された明示的なエラーハンドリング
5. **合成可能性**: ステージを簡単に組み合わせて新しいワークフローを作成できます

## 既存コードとの統合

新しいワークフローアーキテクチャは、既存のEffect-tsベースのコードと完全に互換性があります：

- 既存の`HelloWorkCrawler`, `Extractor`, `JobDetailTransformer`, `JobDetailLoader`サービスをそのまま使用
- 既存のエラーをワークフローエラーにマッピングする層を提供
- 既存のコンテキストとレイヤー（`mainLive`, `transformerLive`, etc.）を使用

## 今後の拡張

- [ ] ワークフローの並行実行サポート
- [ ] リトライロジックの統合
- [ ] ワークフローメトリクスとモニタリング
- [ ] ワークフローのテストユーティリティ
- [ ] より細かいステージの分割
