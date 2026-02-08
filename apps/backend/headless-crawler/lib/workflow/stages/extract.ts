/**
 * Extract Stage 実装 - 求人番号抽出
 *
 * HelloWorkサイトから求人番号のリストを抽出するワークフローステージ
 */

import { Effect } from "effect";
import type { ExtractStage } from "../etl";
import type { JobSearchCriteria, JobNumberExtractionResult } from "../domain";
import {
  NavigationError,
  ExtractionError,
  PageValidationError,
  PaginationError,
} from "../errors";
import { HelloWorkCrawler } from "../../E-T-crawler/context";

/**
 * 既存のエラーをワークフローエラーにマッピング
 */
const mapLegacyError = (error: unknown) => {
  // エラー型に基づいて適切なワークフローエラーに変換
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = (error as { _tag: string })._tag;

    // Navigation errors
    if (
      tag === "GoToJobSearchPageError" ||
      tag === "SearchThenGotoJobListPageError"
    ) {
      return new NavigationError({
        message: String(error),
        cause: error,
      });
    }

    // Validation errors
    if (
      tag === "JobSearchPageValidationError" ||
      tag === "JobListPageValidationError"
    ) {
      return new PageValidationError({
        message: String(error),
        expectedPage: tag.includes("JobSearch")
          ? "JobSearchPage"
          : "JobListPage",
        currentUrl: "unknown",
      });
    }

    // Pagination errors
    if (tag === "NextJobListPageError" || tag === "IsNextPageEnabledError") {
      return new PaginationError({
        message: String(error),
        currentPage: 0,
        cause: error,
      });
    }

    // Extraction errors
    if (
      tag === "ExtractJobNumbersError" ||
      tag === "ListJobsError" ||
      tag === "JobNumberValidationError"
    ) {
      return new ExtractionError({
        message: String(error),
        cause: error,
      });
    }
  }

  // デフォルトは抽出エラー
  return new ExtractionError({
    message: String(error),
    cause: error,
  });
};

/**
 * 求人番号抽出ステージの実装を作成
 */
export const createExtractStage = (): ExtractStage => {
  return {
    extractJobNumbers: (criteria: JobSearchCriteria) =>
      Effect.gen(function* () {
        yield* Effect.logInfo(
          `求人番号抽出を開始: 条件=${JSON.stringify(criteria, null, 2)}`,
        );

        // 既存のHelloWorkCrawlerを使用
        const crawler = yield* HelloWorkCrawler;

        // クロール実行（エラーマッピング付き）
        const jobMetadata = yield* Effect.catchAll(
          crawler.crawlJobLinks(),
          (error) => Effect.fail(mapLegacyError(error)),
        );

        yield* Effect.logInfo(`求人番号抽出完了: ${jobMetadata.length}件`);

        return {
          jobNumbers: jobMetadata,
          totalCount: jobMetadata.length,
        };
      }),
  };
};
