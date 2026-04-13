# AGENTS.md

AI エージェント（Claude Code 等）がこのリポジトリで作業する際の行動指針。

## コンテキスト

このリポジトリはハローワーク求人情報の自動収集・管理システム。日本語で開発。
詳細は [ARCHITECTURE.md](ARCHITECTURE.md) と [docs/](docs/) を参照。

## 行動原則

1. **コードを読んでから書く** — 既存の実装パターンを確認してから変更する
2. **最小限の変更** — 依頼された範囲だけ変更する。余計なリファクタリング・コメント追加はしない
3. **Effect パターンに従う** — エラーは `Data.TaggedError`、スキーマは `Effect Schema`
4. **日本語で Conventional Commits** — `feat(api): 求人検索フィルターを追加` の形式
5. **コミット後は自動 PR** — main ブランチ上ならブランチ作成 → push → PR 作成まで実行

## ドキュメント体系

```
CLAUDE.md              # Claude Code エントリポイント（コマンド集）
AGENTS.md              # ← このファイル（AI エージェント行動指針）
ARCHITECTURE.md        # アーキテクチャ全体像
docs/
├── FRONTEND.md        # フロントエンド設計（UI, Storybook, 状態管理）
├── QUALITY.md         # テスト・品質方針（PBT, Biome）
├── SECURITY.md        # セキュリティ方針
├── design-docs/       # 設計判断の記録
│   └── index.md
├── references/        # コーディング規約・PR ルール
│   └── conventions.md
└── exec-plans/        # 実行計画
    ├── active/
    └── completed/
```

## ルールファイルの参照

`.claude/rules/` 配下のファイルは `docs/` へのシンボリックリンク。
正規の編集先は常に `docs/` 側。

| .claude/rules/ | 参照先 |
|----------------|--------|
| architecture.md | → [ARCHITECTURE.md](ARCHITECTURE.md) |
| conventions.md | → [docs/references/conventions.md](docs/references/conventions.md) |
| testing.md | → [docs/QUALITY.md](docs/QUALITY.md) |
| pull-request.md | → [docs/references/conventions.md](docs/references/conventions.md)（PR セクション） |
| frontend.md | → [docs/FRONTEND.md](docs/FRONTEND.md) |
| general.md | → [.claude/rules/general.md](.claude/rules/general.md)（devbox 等） |
