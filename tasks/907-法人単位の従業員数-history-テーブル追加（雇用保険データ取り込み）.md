---
number: 907
title: "法人単位の従業員数 history テーブル追加（雇用保険データ取り込み）"
state: open
author: shidari
labels: []
url: https://github.com/shidari/hello-work-software-jobs/issues/907
createdAt: 2026-04-19T13:55:41Z
updatedAt: 2026-04-19T13:55:41Z
---

## 背景

雇用保険データベースから法人単位の従業員数（被保険者数）を取り込み、月次推移を残したい。既存の `companies.employeeCount`（事業所単位・ハローワーク自己申告）とは意味が異なるため別テーブルで管理する。

## スキーマ案

```sql
CREATE TABLE corporate_employee_count_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  corporateNumber TEXT NOT NULL,   -- 13桁
  yearMonth TEXT NOT NULL,         -- 'YYYY-MM' or 'YYYY-MM-01'
  employeeCount INTEGER NOT NULL,
  source TEXT NOT NULL,            -- 'employment_insurance' 等
  createdAt TEXT NOT NULL
);
CREATE UNIQUE INDEX corporate_employee_count_history_unique
  ON corporate_employee_count_history (corporateNumber, yearMonth, source);
CREATE INDEX corporate_employee_count_history_corp
  ON corporate_employee_count_history (corporateNumber);
```

## 設計メモ

- **キー**: 法人番号（`corporateNumber`）。`companies.corporateNumber` は nullable かつ unique でない（1法人:N事業所）ため **FK は張らない**、論理参照のみ・JOIN は LEFT
- **粒度**: 月次。`yearMonth` は `YYYY-MM` TEXT もしくは `YYYY-MM-01` DATE 文字列（SQLite の date 関数を使うなら後者）
- **冪等性**: `UNIQUE(corporateNumber, yearMonth, source)` で再取り込みに耐える
- **既存 `companies.employeeCount` との住み分け**: 事業所単位（自己申告）と法人単位（被保険者数）で意味が別物。書き戻さず UI でも出し分ける

## 未決事項

- [ ] `yearMonth` のフォーマット（`YYYY-MM` vs `YYYY-MM-01`）
- [ ] 雇用保険データの取得元・更新頻度・基準日の扱い
- [ ] 取り込み経路（collector 追加？別ジョブ？）
- [ ] UI での表示可否（事業所ページに法人全体の推移を出すか）

## 関連

- [packages/db/schema.sql](packages/db/schema.sql)
- [.claude/rules/db.md](.claude/rules/db.md)

