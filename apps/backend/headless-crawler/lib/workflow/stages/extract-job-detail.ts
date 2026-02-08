/**
 * Extract Job Detail Stage 実装 - 求人詳細HTML抽出
 *
 * 求人番号から求人詳細ページのHTMLを抽出するワークフローステージ
 */

import { Effect } from "effect";
import type { ExtractJobDetailStage } from "../etl";
import type { JobNumber } from "@sho/models";
import type { RawHtml } from "../domain";
import { ExtractionError, NavigationError, PageValidationError } from "../errors";
import { Extractor } from "../../jobDetail/extractor";

/**
 * 既存のExtractorエラーをワークフローエラーにマッピング
 */
const mapExtractorError = (error: unknown, jobNumber: JobNumber) => {
	if (error && typeof error === "object" && "_tag" in error) {
		const tag = (error as { _tag: string })._tag;

		// Navigation errors
		if (
			tag === "GoToJobSearchPageError" ||
			tag === "SearchNoThenGotoSingleJobListPageError"
		) {
			return new NavigationError({
				message: String(error),
				cause: error,
			});
		}

		// Validation errors
		if (
			tag === "JobSearchPageValidationError" ||
			tag === "JobListPageValidationError" ||
			tag === "JobDetailPageValidationError"
		) {
			return new PageValidationError({
				message: String(error),
				expectedPage: tag.replace("ValidationError", ""),
				currentUrl: "unknown",
			});
		}

		// Extraction errors
		if (tag === "ExtractJobDetailRawHtmlError") {
			return new ExtractionError({
				message: String(error),
				cause: error,
			});
		}
	}

	// デフォルトは抽出エラー
	return new ExtractionError({
		message: `Failed to extract job detail for ${jobNumber}: ${String(error)}`,
		cause: error,
	});
};

/**
 * 求人詳細HTML抽出ステージの実装を作成
 */
export const createExtractJobDetailStage = (): ExtractJobDetailStage => {
	return {
		extractRawHtml: (jobNumber: JobNumber) =>
			Effect.gen(function* () {
				yield* Effect.logDebug(`求人詳細HTML抽出を開始: ${jobNumber}`);

				// 既存のExtractorサービスを使用
				const extractor = yield* Extractor;

				// HTMLを抽出（エラーマッピング付き）
				const result = yield* Effect.catchAll(
					extractor.extractRawHtml(jobNumber),
					(error) => Effect.fail(mapExtractorError(error, jobNumber)),
				);

				yield* Effect.logDebug(`求人詳細HTML抽出完了: ${jobNumber}`);

				// RawHtml型に変換
				return {
					content: result.rawHtml as string,
					fetchedDate: result.fetchedDate,
					jobNumber: result.jobNumber,
				};
			}),
	};
};
