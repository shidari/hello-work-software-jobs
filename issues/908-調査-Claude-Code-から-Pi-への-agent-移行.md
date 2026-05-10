---
number: 908
title: "調査: Claude Code から Pi (@mariozechner/pi-coding-agent) への agent 移行"
state: open
author: shidari
labels: [investigation, tooling]
createdAt: 2026-05-10T00:00:00Z
updatedAt: 2026-05-10T00:00:00Z
---

## 概要

Claude Code から [Pi](https://pi.dev/) (Mario Zechner 製のミニマル CLI coding agent) への移行を検討する。
本プロジェクトは Claude Code 固有の機能 (skills / hooks / subagents / EnterWorktree) に依存しているので、
何が移植可能で何が代替設計を要するかを洗い出す。

## Pi とは

- リポジトリ: [badlogic/pi-mono](https://github.com/badlogic/pi-mono) / npm: `@mariozechner/pi-coding-agent`
- 設計思想: **最小限**。system prompt < 1000 tokens、ツールは `read` / `write` / `edit` / `bash` の 4 つだけ
- マルチプロバイダ対応 (Anthropic / OpenAI / Gemini / xAI / Bedrock / Groq / OpenRouter 等 20+)
- Claude Pro/Max / ChatGPT Plus / GitHub Copilot サブスク認証もサポート (`/login`)
- Skills エコシステム: [badlogic/pi-skills](https://github.com/badlogic/pi-skills) は Claude Code / Codex CLI / Amp / Droid と互換

## Claude Code との主要な差分

| 項目 | Claude Code | Pi |
|------|-------------|-----|
| System prompt | 数千 tokens (rules/safety/examples) | < 1000 tokens |
| MCP | サポート | **非サポート** (CLI + README で代替する哲学) |
| Subagents | あり (Explore / Plan / general-purpose 等) | **なし** (別セッション + ファイル連携) |
| Plan mode | あり (read-only) | **なし** (PLAN.md を手動運用) |
| Background bash | あり (`run_in_background`) | **なし** (tmux で代替) |
| TodoWrite | あり | **なし** (TODO.md を手動運用) |
| Hooks | settings.json で PreToolUse 等 | 仕組みは要調査 |
| Worktree | `EnterWorktree` ツール | **なし** (`git worktree` 手動) |
| Context Files | `CLAUDE.md` | `AGENTS.md` (階層的) |

## 本プロジェクトの Claude Code 依存資産

棚卸し結果:

### Skills (`.claude/skills/`)
- [commit-and-pr](.claude/skills/commit-and-pr/) — pi-skills 形式に変換可能性高い
- [crawler-diagnose](.claude/skills/crawler-diagnose/) — 同上
- [debug](.claude/skills/debug/) — 同上
- [pentest](.claude/skills/pentest/) — 同上

→ pi-skills が Claude Code フォーマット互換なので、そのままか軽微な修正で移植できる見込み。

### Hooks (`.claude/hooks/`)
- [enforce-worktree.sh](.claude/hooks/enforce-worktree.sh) — main worktree 上での Edit/Write/NotebookEdit を block
- [.claude/settings.json](.claude/settings.json) で PreToolUse hook として登録

→ Pi の hook 機構を要調査。なければ機能喪失 (`/tmp/.claude-allow-main-edit` センチネルや EnterWorktree 連携が前提なので、前提自体が崩れる)。

### CLAUDE.md / Rules (`.claude/rules/`)
- `CLAUDE.md` をルートに、`.claude/rules/{api,frontend,collector,db,models,logger,cli,general}.md` を分割管理
- Pi は `AGENTS.md` を読むので、`CLAUDE.md` → `AGENTS.md` のリネーム or symlink で対応可能

### Subagent 利用箇所
- `Explore` (広域コードベース調査)
- `Plan` (実装計画立案)
- `claude-code-guide` (Claude Code 自体の質問)
- `general-purpose` (open-ended research)

→ Pi にはサブエージェント機能がないため、別 pi セッションを起動 + ファイル経由で結果を渡す運用に切り替え。
   または、harness で TaskOutput/TaskStop に頼らず、`pi --headless` で別プロセス起動 + JSON ストリーミングを利用する設計を要検討。

### EnterWorktree / ExitWorktree
- 現状 `1 機能 = 1 worktree` ルール ([.claude/rules/general.md](.claude/rules/general.md)) が EnterWorktree ツールに強く依存
- Pi 移行後は `git worktree add` を直接実行する手動運用に戻る (or shell ラッパで擬似ツール化)
- `enforce-worktree.sh` hook も同時に設計し直し

## 移行の論点

### Pros
- **可視性**: tool 呼び出しが完全に見える (Claude Code のサブエージェントは黒箱)
- **コンテキスト効率**: system prompt 数 KB → < 1KB で長セッション耐性あり
- **マルチプロバイダ**: Claude / GPT / Gemini を切り替え可能。コスト最適化や品質比較がやりやすい
- **system prompt 不変**: 仕様変動が少なく、再現性が高い

### Cons
- **MCP 非対応**: 将来 MCP サーバを使いたくなった時に詰む (現状未使用なので OK)
- **subagent / plan mode / TodoWrite なし**: ワークフロー設計の作り直しが必要
- **worktree エコシステムが消える**: `enforce-worktree.sh` も含めて再設計
- **エコシステム成熟度**: Claude Code に比べてユーザ数・ドキュメント・stack overflow が薄い

### 中立
- **YOLO がデフォルト**: 安全策はユーザ側で組む。コンテナサンドボックス前提なので、本プロジェクトの運用形態とは整合する

## 次にやること (調査タスク)

- [ ] Pi の hook 機構を調査 ([pi-mono README](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent))
- [ ] pi-skills に既存 4 skill を移植する PoC (1 つだけ試す)
- [ ] subagent 代替 (別セッション + ファイル連携) の運用設計案
- [ ] worktree 運用を `git worktree` 直叩き + shell ラッパに戻すか判断
- [ ] サンドボックス Dockerfile に `@mariozechner/pi-coding-agent` を追加 ([scripts/sandbox.sh](scripts/sandbox.sh) / [Dockerfile](Dockerfile))
- [ ] 1 機能だけ Pi で完走させる試行 (issue #907 等の小規模なやつで dogfooding)

## 参考リンク

- [Pi 公式](https://pi.dev/)
- [Mario Zechner のブログ記事 — What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [npm @mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
- [GitHub badlogic/pi-mono](https://github.com/badlogic/pi-mono)
- [GitHub badlogic/pi-skills](https://github.com/badlogic/pi-skills) (Claude Code 互換)
- [Pi vs Claude Code 比較](https://github.com/disler/pi-vs-claude-code)
- [awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)
