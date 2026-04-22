import type { Page } from "../browser";

// ── ページ種別（branded type + _tag で判別可能な union） ──

declare const _firstJobListPage: unique symbol;
export type FirstJobListPage = Page & {
  readonly _tag: "FirstJobListPage";
  readonly [_firstJobListPage]: unknown;
};

declare const _nextJobListPage: unique symbol;
export type NextJobListPage = Page & {
  readonly _tag: "NextJobListPage";
  readonly [_nextJobListPage]: unknown;
};

export type JobListPage = FirstJobListPage | NextJobListPage;
