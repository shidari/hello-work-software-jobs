/**
 * Transform Stage 実装 - データ変換
 *
 * 生のHTMLを構造化データに変換するワークフローステージ
 */

import { Effect } from "effect";
import type { TransformStage } from "../etl";
import type { RawHtml, TransformationResult } from "../domain";
import {
	ParseError,
	FieldTransformationError,
	ValidationError,
	type TransformError,
} from "../errors";
import { buildProgram as buildTransformerProgram } from "../../jobDetail/transformer/transfomer";
import {
	transformerConfigLive,
	transformerLive,
} from "../../jobDetail/transformer/context";

/**
 * 既存のTransformerエラーをワークフローエラーにマッピング
 */
const mapTransformerError = (error: unknown, jobNumber: string): TransformError => {
	if (error && typeof error === "object" && "_tag" in error) {
		const tag = (error as { _tag: string })._tag;

		// Parsing errors
		if (
			tag === "ParseError" ||
			tag === "ParseJobDetailError" ||
			tag === "ExtractTableError"
		) {
			return new ParseError({
				message: String(error),
				jobNumber,
				cause: error,
			});
		}

		// Field transformation errors
		if (
			tag === "TransformError" ||
			tag === "FieldTransformError" ||
			tag.includes("TransformationError")
		) {
			return new FieldTransformationError({
				message: String(error),
				jobNumber,
				fieldName: "unknown",
			});
		}

		// Validation errors
		if (tag === "ValidationError" || tag.includes("ValidateError")) {
			return new ValidationError({
				message: String(error),
				jobNumber,
				errors: [String(error)],
			});
		}
	}

	// デフォルトはパースエラー
	return new ParseError({
		message: `Failed to transform job detail for ${jobNumber}: ${String(error)}`,
		jobNumber,
		cause: error,
	});
};

/**
 * Transform ステージの実装を作成
 */
export const createTransformStage = (): TransformStage => {
	return {
		transformHtml: (rawHtml: RawHtml) =>
			Effect.gen(function* () {
				yield* Effect.logDebug(
					`データ変換を開始: ${rawHtml.jobNumber}`,
				);

				// 既存のTransformerを使用
				const transformed = yield* Effect.catchAll(
					buildTransformerProgram(rawHtml.content)
						.pipe(Effect.provide(transformerLive))
						.pipe(Effect.provide(transformerConfigLive)),
					(error) => Effect.fail(mapTransformerError(error, rawHtml.jobNumber)),
				);

				yield* Effect.logDebug(
					`データ変換完了: ${rawHtml.jobNumber}`,
				);

				return {
					data: transformed,
					jobNumber: rawHtml.jobNumber,
				};
			}),
	};
};
