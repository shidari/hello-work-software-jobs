/**
 * ドメインモデル - ETLワークフローの各ステージで使用される型定義
 *
 * Extract, Transform, Load の各ステージで明確に定義されたドメインモデル
 */

import type { JobNumber, JobMetadata } from "@sho/models";
import type { InferOutput } from "valibot";
import type { transformedSchema } from "@sho/models";

// ===========================
// Extract Domain
// ===========================

/**
 * 求人検索の条件
 */
export interface JobSearchCriteria {
	readonly workLocation: {
		readonly prefecture: string;
	};
	readonly desiredOccupation: {
		readonly occupationSelection: string;
	};
	readonly employmentType: string;
	readonly searchPeriod: string;
}

/**
 * 抽出された求人メタデータのリスト
 */
export type ExtractedJobList = readonly JobMetadata[];

/**
 * 求人番号の抽出結果
 */
export interface JobNumberExtractionResult {
	readonly jobNumbers: ExtractedJobList;
	readonly totalCount: number;
}

// ===========================
// Transform Domain
// ===========================

/**
 * 抽出された生のHTML
 */
export interface RawHtml {
	readonly content: string;
	readonly fetchedDate: string;
	readonly jobNumber: JobNumber;
}

/**
 * 変換された求人データ
 */
export type TransformedJobData = InferOutput<typeof transformedSchema>;

/**
 * 変換結果
 */
export interface TransformationResult {
	readonly data: TransformedJobData;
	readonly jobNumber: JobNumber;
}

// ===========================
// Load Domain
// ===========================

/**
 * ロード結果
 */
export interface LoadResult {
	readonly success: boolean;
	readonly jobNumber: JobNumber;
}

// ===========================
// Workflow Configuration
// ===========================

/**
 * ブラウザ設定
 */
export interface BrowserConfig {
	readonly headless: boolean;
	readonly args: readonly string[];
	readonly executablePath?: string;
}

/**
 * ETLワークフロー設定
 */
export interface ETLWorkflowConfig {
	readonly browserConfig: BrowserConfig;
	readonly nextPageDelayMs: number;
	readonly jobSearchCriteria: JobSearchCriteria;
	readonly roughMaxCount: number;
}

/**
 * Transform設定
 */
export interface TransformConfig {
	readonly validateStrictly: boolean;
}

/**
 * Load設定
 */
export interface LoadConfig {
	readonly endpoint: string;
	readonly apiKey: string;
	readonly retryCount: number;
}
