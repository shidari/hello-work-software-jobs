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
// TypeScript
import type { TJobDetail, JobListQuery } from '@sho/models';
import { insertJobRequestBodySchema, jobsTable } from '@sho/models';
```
