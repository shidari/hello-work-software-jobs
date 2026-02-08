/**
 * ワークフローエラー型定義
 *
 * 各ETLステージで発生する可能性のあるエラーを定義
 */

import { Data } from "effect";

// ===========================
// Extract Stage Errors
// ===========================

/**
 * 求人検索ページへのナビゲーションエラー
 */
export class NavigationError extends Data.TaggedError("NavigationError")<{
  readonly message: string;
  readonly url?: string;
  readonly cause?: unknown;
}> {}

/**
 * 求人リスト抽出エラー
 */
export class ExtractionError extends Data.TaggedError("ExtractionError")<{
  readonly message: string;
  readonly currentUrl?: string;
  readonly cause?: unknown;
}> {}

/**
 * ページ検証エラー
 */
export class PageValidationError extends Data.TaggedError(
  "PageValidationError",
)<{
  readonly message: string;
  readonly expectedPage: string;
  readonly currentUrl: string;
}> {}

/**
 * ページネーションエラー
 */
export class PaginationError extends Data.TaggedError("PaginationError")<{
  readonly message: string;
  readonly currentPage: number;
  readonly cause?: unknown;
}> {}

/**
 * Extractステージのエラー全体
 */
export type ExtractError =
  | NavigationError
  | ExtractionError
  | PageValidationError
  | PaginationError;

// ===========================
// Transform Stage Errors
// ===========================

/**
 * HTML解析エラー
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly message: string;
  readonly jobNumber: string;
  readonly field?: string;
  readonly cause?: unknown;
}> {}

/**
 * フィールド変換エラー
 */
export class FieldTransformationError extends Data.TaggedError(
  "FieldTransformationError",
)<{
  readonly message: string;
  readonly jobNumber: string;
  readonly fieldName: string;
  readonly value?: unknown;
}> {}

/**
 * バリデーションエラー
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly jobNumber: string;
  readonly errors: readonly string[];
}> {}

/**
 * Transformステージのエラー全体
 */
export type TransformError =
  | ParseError
  | FieldTransformationError
  | ValidationError;

// ===========================
// Load Stage Errors
// ===========================

/**
 * APIリクエストエラー
 */
export class ApiRequestError extends Data.TaggedError("ApiRequestError")<{
  readonly message: string;
  readonly jobNumber: string;
  readonly statusCode?: number;
  readonly endpoint: string;
  readonly cause?: unknown;
}> {}

/**
 * ネットワークエラー
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly jobNumber: string;
  readonly endpoint: string;
  readonly cause?: unknown;
}> {}

/**
 * データ永続化エラー
 */
export class PersistenceError extends Data.TaggedError("PersistenceError")<{
  readonly message: string;
  readonly jobNumber: string;
  readonly cause?: unknown;
}> {}

/**
 * Loadステージのエラー全体
 */
export type LoadError = ApiRequestError | NetworkError | PersistenceError;

// ===========================
// Workflow Errors
// ===========================

/**
 * ワークフロー全体のエラー
 */
export type WorkflowError = ExtractError | TransformError | LoadError;

/**
 * ブラウザ初期化エラー
 */
export class BrowserInitializationError extends Data.TaggedError(
  "BrowserInitializationError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * 設定エラー
 */
export class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
  readonly message: string;
  readonly missingKey?: string;
}> {}

/**
 * イベントスキーマ検証エラー
 */
export class EventValidationError extends Data.TaggedError(
  "EventValidationError",
)<{
  readonly message: string;
  readonly issues: readonly string[];
}> {}

/**
 * インフラストラクチャエラー
 */
export type InfrastructureError =
  | BrowserInitializationError
  | ConfigurationError
  | EventValidationError;
