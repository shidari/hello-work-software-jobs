---
title: "改善: ops-github MCP に branch 削除手段を生やす"
state: draft
author: claude
labels: [mcp-ops, dx]
---

## 背景

PR merge 後の merged branch 削除を sandbox 内 Claude から完結させたいが、現状の `ops-github` MCP には branch 削除 tool が無い:

- 露出している branch 系: `create_branch` / `list_branches` / `update_pull_request_branch`
- 露出していない: ref delete (`DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}`)

結果、merge 後の cleanup だけ host (`gh api -X DELETE ...`) または web UI に出る必要があり、フロー断絶になっている。

## 案

どちらかを選ぶ:

### 案 A: `github-mcp-server` の toolset に削除系を追加

[.claude/rules/cli.md](../.claude/rules/cli.md) の「MCP ops コンテナ」節記載の通り、現状 toolset は `pull_requests,issues,actions,repos` に絞られている。`repos` toolset に branch delete が含まれているかは未確認 — 公式 `github-mcp-server` の最新版で `delete_branch` 相当が露出していれば、起動 flag (`--enabled-toolsets` の `repos` あたり) で済む可能性がある。

確認手順:
1. ops コンテナ内で `github-mcp-server --help` (または起動オプション一覧) を見て delete 系 tool が toolset の何に属しているか確認
2. 含まれていれば [packages/mcp-ops/start.sh](../packages/mcp-ops/start.sh) の toolset 設定を更新
3. ops image 再 build (`./scripts/ops-sandbox-image.ts`)

### 案 B: 薄い raw API tool を別 server で expose

`github-mcp-server` に無い操作 (branch delete / 任意 REST) を扱う薄い proxy を追加する。例えば `mcp-proxy` で `GH_API` 風の generic な PAT 経由 REST 呼び出し tool を 1 個生やす。汎用性は上がるが PAT scope の安全境界が緩むのでお勧めしない。

→ **案 A を試して、駄目なら案 B を再考** の順。

## PAT scope

[cli.md](../.claude/rules/cli.md) 記載の fine-grained PAT は `Contents:RW` / `Pull requests:RW` / `Issues:RW` / `Actions:R`。ref delete は `Contents:RW` で通るはずなので scope 追加は不要 (要 verify)。

## 影響範囲

- 触る場所: [packages/mcp-ops/start.sh](../packages/mcp-ops/start.sh) (toolset 設定)、必要なら [packages/mcp-ops/flake.nix](../packages/mcp-ops/flake.nix)
- 再 build: `./scripts/ops-sandbox-image.ts`
- 手元動作確認: 試用 branch を作って MCP 経由で削除できるか
