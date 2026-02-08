/**
 * ETLワークフロー定義
 *
 * Extract-Transform-Loadの各ステージを定義し、合成可能なワークフローを提供
 */

import { Effect } from "effect";
import type { Stage, Workflow } from "./types";
import {
	composeStages,
	createWorkflow,
} from "./types";
import type {
	JobSearchCriteria,
	ExtractedJobList,
	RawHtml,
	TransformedJobData,
	LoadResult,
	JobNumberExtractionResult,
	TransformationResult,
} from "./domain";
import type {
	ExtractError,
	TransformError,
	LoadError,
} from "./errors";
import type { JobNumber } from "@sho/models";

// ===========================
// Extract Stage
// ===========================

/**
 * Extract ステージ: 求人番号のリストを抽出
 *
 * HelloWorkサイトから求人番号のリストをクロールして抽出する
 */
export interface ExtractStage {
	/**
	 * 求人番号リストを抽出する
	 */
	readonly extractJobNumbers: Stage<
		JobSearchCriteria,
		JobNumberExtractionResult,
		ExtractError,
		unknown
	>;
}

/**
 * 単一の求人詳細のHTMLを抽出
 */
export interface ExtractJobDetailStage {
	/**
	 * 求人番号から生のHTMLを抽出する
	 */
	readonly extractRawHtml: Stage<JobNumber, RawHtml, ExtractError, unknown>;
}

// ===========================
// Transform Stage
// ===========================

/**
 * Transform ステージ: 生のHTMLを構造化データに変換
 */
export interface TransformStage {
	/**
	 * 生のHTMLを構造化データに変換する
	 */
	readonly transformHtml: Stage<
		RawHtml,
		TransformationResult,
		TransformError,
		never
	>;
}

// ===========================
// Load Stage
// ===========================

/**
 * Load ステージ: 変換されたデータを永続化
 */
export interface LoadStage {
	/**
	 * データをストアに保存する
	 */
	readonly loadData: Stage<TransformedJobData, LoadResult, LoadError, never>;
}

// ===========================
// Composed Workflows
// ===========================

/**
 * 求人番号抽出ワークフロー (ET)
 *
 * 求人検索条件から求人番号のリストを抽出する
 */
export const createJobNumberExtractionWorkflow = (
	extractStage: ExtractStage,
): Workflow<
	JobSearchCriteria,
	JobNumberExtractionResult,
	ExtractError,
	unknown
> =>
	createWorkflow(
		"求人番号抽出ワークフロー (Extract-Transform)",
		extractStage.extractJobNumbers,
	);

/**
 * 求人詳細ETLワークフロー (E-T-L)
 *
 * 求人番号から詳細を抽出、変換、ロードする完全なETLパイプライン
 */
export const createJobDetailETLWorkflow = (
	extractStage: ExtractJobDetailStage,
	transformStage: TransformStage,
	loadStage: LoadStage,
): Workflow<
	JobNumber,
	LoadResult,
	ExtractError | TransformError | LoadError,
	unknown
> => {
	const etlPipeline: Stage<
		JobNumber,
		LoadResult,
		ExtractError | TransformError | LoadError,
		unknown
	> = (jobNumber: JobNumber) =>
		Effect.gen(function* () {
			// Extract: 生のHTMLを取得
			yield* Effect.logInfo(`[Extract] 求人番号 ${jobNumber} のHTMLを抽出中...`);
			const rawHtml = yield* extractStage.extractRawHtml(jobNumber);

			// Transform: HTMLを構造化データに変換
			yield* Effect.logInfo(`[Transform] 求人番号 ${jobNumber} のデータを変換中...`);
			const transformed = yield* transformStage.transformHtml(rawHtml);

			// Load: データを永続化
			yield* Effect.logInfo(`[Load] 求人番号 ${jobNumber} のデータを保存中...`);
			const loadResult = yield* loadStage.loadData(transformed.data);

			yield* Effect.logInfo(`[Complete] 求人番号 ${jobNumber} の処理が完了しました`);
			return loadResult;
		});

	return createWorkflow(
		"求人詳細ETLワークフロー (Extract-Transform-Load)",
		etlPipeline,
	);
};

/**
 * バッチETLワークフロー
 *
 * 複数の求人番号に対してETLを実行
 */
export const createBatchETLWorkflow = (
	etlWorkflow: Workflow<
		JobNumber,
		LoadResult,
		ExtractError | TransformError | LoadError,
		unknown
	>,
): Workflow<
	ExtractedJobList,
	readonly LoadResult[],
	ExtractError | TransformError | LoadError,
	unknown
> => {
	const batchPipeline: Stage<
		ExtractedJobList,
		readonly LoadResult[],
		ExtractError | TransformError | LoadError,
		unknown
	> = (jobList: ExtractedJobList) =>
		Effect.gen(function* () {
			yield* Effect.logInfo(`[Batch] ${jobList.length}件の求人を処理中...`);

			const results = yield* Effect.forEach(
				jobList,
				(job) => etlWorkflow.run(job.jobNumber),
				{ concurrency: 1 }, // 順次処理（並行処理も可能）
			);

			yield* Effect.logInfo(`[Batch] 処理完了: ${results.length}件`);
			return results;
		});

	return createWorkflow("バッチETLワークフロー", batchPipeline);
};
