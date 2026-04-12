# Models (packages/models)

ドメインモデル定義。全レイヤーから参照。2 層構造:

- **`src/raw.ts`**: バリデーション付き Raw スキーマ（brand なし）。パターン・フィルター・Union リテラル等のバリデーション
- **`src/index.ts`**: branded ドメインスキーマ。Raw スキーマに `Schema.brand()` と `.annotations()` を付与するだけ

## Raw フィールドスキーマ

`RawJobNumber`, `RawEstablishmentNumber`, `RawEmploymentType`, `RawJobCategory`, `RawWageType`, `RawWage`, `RawWorkingTime`, `RawEmployeeCount`, `RawHomePageUrl` 等

## Branded 型

`JobNumber`, `EstablishmentNumber`, `EmploymentType`, `JobCategory`, `WageType`, `Wage`, `WorkingTime`, `EmployeeCount`, `HomePageUrl` 等
