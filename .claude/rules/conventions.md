# コーディング規約・運用ルール

## General Rules

- **プロジェクト外のファイル参照禁止**: 原則として、このリポジトリ外のファイル（`~/devbox.json` 等）を参照・編集しないこと。ツールチェーンはプロジェクトレベルの `devbox.json` で管理する
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
- **コマンドが見つからない場合**: `command not found` になったら `devbox run <command>` で実行する。パッケージが足りなければ `devbox add` で追加する
- **修正作業の開始前**: コードの修正・追加を始める前に、まず `git pull --rebase` で最新の状態にすること
- **コミット前チェック**: ユーザーが「コミット」を依頼したら、`git commit` の前に以下を実行すること
  1. `pnpm exec biome check --write <staged files>` (staged ファイルのみ lint + format)
  3. 変更があったパッケージのみ `pnpm exec tsc --noEmit` (型チェック)
  4. CLAUDE.md / `.claude/rules/architecture.md` / ルート README.md を Read し、以下の項目が staged 変更と整合しているか確認し、必要なら更新して staging に追加すること:
     - ディレクトリ構成（追加・削除・リネーム）
     - 技術スタック / バージョン番号
     - コマンド例のパス
     - API エンドポイント
     - 環境変数
  - 問題があれば修正してからコミットする
- **コミット後の自動PR**: コミット完了後、以下を自動実行する
  1. main ブランチ上なら、コミット内容に基づいたブランチ名（例: `feat/xxx`, `refactor/xxx`）を自動作成し、コミットをそのブランチに移動する
  2. `git push -u origin <branch>` でリモートに push
  3. そのブランチの PR が未作成なら `gh pr create` で PR を作成する（既存なら push のみ）

## Environment Variables

- Frontend: `JOB_STORE_ENDPOINT`
- API: Cloudflare credentials
- Crawler: `JOB_STORE_ENDPOINT`, `API_KEY`, `SQS_QUEUE_URL`, `SQS_ENDPOINT_URL` (Lambda 環境変数)
- Admin CLI: `HWCTL_ENDPOINT`, `HWCTL_API_KEY`, `HWCTL_COLLECTOR_ENDPOINT`, `HWCTL_CF_ACCOUNT_ID`, `HWCTL_CF_API_TOKEN`, `HWCTL_CF_QUEUE_ID`, `HWCTL_CF_DLQ_ID`

## CI/CD

- `pr-checks.yml` - Build, type check, test, lint on PRs
- `deploy-collector.yml` - main push 時に OIDC 認証 → CDK deploy（collector / models 変更時のみ）
