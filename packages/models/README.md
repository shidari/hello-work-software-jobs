# @sho/models

モノレポ共通型定義・スキーマパッケージ

## コマンド

```bash
# ビルド
pnpm build

# 型チェック
pnpm type-check
```

## 使用方法

```json
// package.json
{
  "dependencies": {
    "@sho/models": "workspace:*"
  }
}
```

```typescript
import { Job, JobNumber, Wage, EmploymentTypeValue } from '@sho/models';
```
