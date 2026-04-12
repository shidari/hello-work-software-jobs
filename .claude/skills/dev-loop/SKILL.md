---
name: dev-loop
description: Plan → Act → Review のフィードバックループで開発を進める。タスクの計画、実装、レビューを反復し、品質を担保する。
---

# Dev Loop

Plan → Act → Review の反復ループで開発タスクを進める。

## スコープ判定

タスクの対象に応じて、参照するルールを切り替える:

| 対象パッケージ | ルールファイル | テストコマンド |
|--------------|--------------|--------------|
| `apps/backend/api` | `.claude/rules/api.md` | `cd apps/backend/api && pnpm test` |
| `apps/backend/collector` | `.claude/rules/collector.md` | `cd apps/backend/collector && pnpm test` |
| `apps/frontend/hello-work-job-searcher` | `.claude/rules/frontend.md` | `cd apps/frontend/hello-work-job-searcher && pnpm exec vitest --run` |
| `packages/db` | `.claude/rules/db.md` | `cd packages/db && pnpm exec tsc --noEmit` |
| `packages/models` | `.claude/rules/models.md` | `cd packages/models && pnpm exec tsc --noEmit` |

**複数パッケージにまたがる場合は、関連するルールファイルをすべて参照する。**

## ループ

### 1. Plan（計画）

- ユーザーの要求を分解し、具体的なタスクリストを作成する
- スコープ判定に基づき、関連するルールファイルを読み込む
- 各タスクの依存関係と実行順序を決める
- 影響範囲（変更ファイル、テスト、ドキュメント）を特定する
- **ユーザーに計画を提示し、承認を得てから次に進む**

### 2. Act（実装）

- 計画に従い、1 タスクずつ実装する
- タスク完了ごとに対象パッケージのテストを実行する
- TodoWrite で進捗を追跡する
- **計画にないことはやらない。スコープ外の問題を見つけたら報告だけする**

### 3. Review（レビュー）

- 実装が計画通りか確認する
- 対象パッケージのテスト・型チェック・lint を実行する
- 変更の差分を確認し、不要な変更がないか検証する
- **問題があれば Plan に戻る。問題なければユーザーに報告する**

## 原則

- **1 ループ = 1 つの明確な成果物**。大きなタスクは複数ループに分割する
- **ユーザーの承認なしに Plan を変更しない**
- **Act 中に新しい問題を見つけたら、現在のタスクを完了してから報告する**
- **Review で問題がなければ、次のループに進むかユーザーに確認する**
- **対象パッケージ外のファイルは変更しない**（ドキュメント更新を除く）
