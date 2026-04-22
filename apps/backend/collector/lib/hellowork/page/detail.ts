import type { Page } from "../browser";

// ============================================================
// Branded page type — 求人詳細ページ
// ============================================================

const _jobDetailPage: unique symbol = Symbol("JobDetailPage");
export type JobDetailPage = Page & { [_jobDetailPage]: unknown };
