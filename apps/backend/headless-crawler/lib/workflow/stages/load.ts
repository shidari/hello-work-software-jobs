/**
 * Load Stage 実装 - データ永続化
 *
 * 変換されたデータをストアに保存するワークフローステージ
 */

import { Effect } from "effect";
import type { LoadStage } from "../etl";
import type { TransformedJobData, LoadResult } from "../domain";
import { ApiRequestError, NetworkError, PersistenceError, type LoadError } from "../errors";
import { buildProgram as runLoaderProgram } from "../../jobDetail/loader/loader";
import { loaderConfigLive, loaderLive } from "../../jobDetail/loader/context";

/**
 * 既存のLoaderエラーをワークフローエラーにマッピング
 */
const mapLoaderError = (error: unknown, jobNumber: string): LoadError => {
	if (error && typeof error === "object" && "_tag" in error) {
		const tag = (error as { _tag: string })._tag;

		// API request errors
		if (
			tag === "ApiRequestError" ||
			tag === "PostJobError" ||
			tag === "HttpError"
		) {
			return new ApiRequestError({
				message: String(error),
				jobNumber,
				endpoint: "unknown",
				cause: error,
			});
		}

		// Network errors
		if (tag === "NetworkError" || tag === "FetchError") {
			return new NetworkError({
				message: String(error),
				jobNumber,
				endpoint: "unknown",
				cause: error,
			});
		}

		// Persistence errors
		if (tag === "PersistenceError" || tag === "LoadError") {
			return new PersistenceError({
				message: String(error),
				jobNumber,
				cause: error,
			});
		}
	}

	// デフォルトは永続化エラー
	return new PersistenceError({
		message: `Failed to load job detail for ${jobNumber}: ${String(error)}`,
		jobNumber,
		cause: error,
	});
};

/**
 * Load ステージの実装を作成
 */
export const createLoadStage = (): LoadStage => {
	return {
		loadData: (data: TransformedJobData) =>
			Effect.gen(function* () {
				const jobNumber = data.jobNumber as string;
				yield* Effect.logDebug(`データ保存を開始: ${jobNumber}`);

				// 既存のLoaderを使用
				yield* Effect.catchAll(
					runLoaderProgram(data)
						.pipe(Effect.provide(loaderLive))
						.pipe(Effect.provide(loaderConfigLive)),
					(error) => Effect.fail(mapLoaderError(error, jobNumber)),
				);

				yield* Effect.logDebug(`データ保存完了: ${jobNumber}`);

				return {
					success: true,
					jobNumber: data.jobNumber,
				};
			}),
	};
};
