# コーディング規約・運用ルール

## General Rules

- **プロジェクト外のファイル参照禁止**: 原則として、このリポジトリ外のファイル（`~/.config/...` 等）を参照・編集しないこと。ツールチェーンはプロジェクトレベルの `Dockerfile`（Apple container サンドボックス）で管理する
- **ad-hoc スクリプト禁止**: コマンド出力の加工に `python3 -c`, `node -e` 等のワンライナーを使わないこと。`jq` 等の専用ツールを使う

## Coding Conventions

- **Formatting/Linting**: Use Biome（staged ファイルのみ対象。プロジェクト全体への実行は禁止）
- **Commits**: Conventional Commits format
  - Message in Japanese
  - Include scope (e.g., `feat(api): 求人検索フィルターを追加`)
  - Include body explaining the change
- **Error Handling**: Use Effect (`Data.TaggedError`, `Effect.match`) for error handling (no throwing exceptions)
- **Validation**: Runtime validation with Effect Schema (`import { Schema } from "effect"`)
- **Package Manager**: pnpm 10.24.0
- **CLI実行**: `npx` ではなく `pnpm exec` を使うこと
- **コマンドが見つからない場合**: `command not found` になったら `./scripts/sandbox.sh` でサンドボックスコンテナに入ってから実行する。パッケージが足りなければ `Dockerfile` に追加して再ビルドする
- **修正作業の開始前**: コードの修正・追加を始める前に、まず `git pull --rebase` で最新の状態にすること
- **コミット前チェック**: ユーザーが「コミット」を依頼したら、`/commit-and-pr` コマンドの手順に従うこと
- **コミット後の自動PR**: コミット完了後、以下を自動実行する
  1. main ブランチ上なら、コミット内容に基づいたブランチ名（例: `feat/xxx`, `refactor/xxx`）を自動作成し、コミットをそのブランチに移動する
  2. `git push -u origin <branch>` でリモートに push
  3. そのブランチの PR が未作成なら `gh pr create` で PR を作成する（既存なら push のみ）

## Environment Variables

- Frontend: `JOB_STORE_ENDPOINT`
- API: Cloudflare credentials
- Crawler: `JOB_STORE_ENDPOINT`, `API_KEY`, `SQS_QUEUE_URL`, `SQS_ENDPOINT_URL` (Lambda 環境変数)
- Admin CLI: `HWCTL_ENDPOINT`

## CI/CD

- `pr-checks.yml` - Build, type check, test, lint on PRs
- `deploy-collector.yml` - main push 時に OIDC 認証 → CDK deploy（collector / models 変更時のみ）

---

# PR 作成ルール

PR は「後で見返せるドキュメント」として機能するように、冗長でもいいから詳しく書く。

## PR body テンプレート

```markdown
## Summary
変更の1-3行サマリー

## Background & Motivation
- なぜこの変更が必要なのか
- 現状の問題点・課題
- どのようなユーザー/ユースケースに影響するか

## Design Decisions
変更に含まれる設計判断を列挙する。各判断について:
- 何を選んだか
- なぜそれを選んだか（理由・制約）
- 検討して棄却した代替案（あれば）

## Changes
パッケージ/ディレクトリごとにファイル単位で変更内容を記述する。
- 新規ファイル: 何をするファイルか
- 変更ファイル: 何が変わったか（追加・削除・修正）
- 削除ファイル: なぜ不要になったか

## Test Plan
- 実施したテスト（手動/自動）
- E2E で確認した内容
- CI で確認する項目
```

## 注意事項

- 醜くてもいいから詳しく書く。簡潔さより網羅性を優先
- 「なぜそうしたか」を必ず書く。コードの diff だけでは伝わらない意図を残す
- 会話の中で出た設計議論（棄却した案、ユーザーのフィードバック）も Design Decisions に含める
- body にバッククォート等の特殊文字を含む場合は `--body-file` を使う
