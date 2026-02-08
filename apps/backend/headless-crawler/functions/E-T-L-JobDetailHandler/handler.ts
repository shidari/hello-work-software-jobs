import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Effect, Exit } from "effect";
import { fromEventToFirstRecord } from "./helper";
import { Extractor } from "../../lib/jobDetail/extractor";
import {
  transformerConfigLive,
  transformerLive,
} from "../../lib/jobDetail/transformer/context";
import {
  loaderConfigLive,
  loaderLive,
} from "../../lib/jobDetail/loader/context";
import { createJobDetailETLWorkflow } from "../../lib/workflow/etl";
import {
  createExtractJobDetailStage,
  createTransformStage,
  createLoadStage,
} from "../../lib/workflow/stages";
import type { LoadResult } from "../../lib/workflow/domain";

export const handler: SQSHandler = async (event: SQSEvent) => {
  const program = Effect.gen(function* () {
    // SQSイベントから求人番号を取得
    const jobNumber = yield* fromEventToFirstRecord(event);

    // ETLワークフローを作成
    const extractStage = createExtractJobDetailStage();
    const transformStage = createTransformStage();
    const loadStage = createLoadStage();
    const workflow = createJobDetailETLWorkflow(
      extractStage,
      transformStage,
      loadStage,
    );

    // ワークフローを実行
    yield* Effect.logInfo(
      `[Workflow] ${workflow.description} を実行中: ${jobNumber}`,
    );
    const result = yield* workflow.run(jobNumber);
    yield* Effect.logInfo(
      `[Complete] 求人番号 ${jobNumber} の処理が完了しました`,
    );

    return result;
  });

  // 依存関係を提供してプログラムを実行
  const runnable = program
    .pipe(Effect.provide(Extractor.Default))
    .pipe(Effect.scoped)
    .pipe(Effect.provide(transformerLive))
    .pipe(Effect.provide(transformerConfigLive))
    .pipe(Effect.provide(loaderLive))
    .pipe(Effect.provide(loaderConfigLive)) as Effect.Effect<
    LoadResult,
    any,
    never
  >;

  const result = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(result)) {
    console.log("Lambda job succeeded:", result.value);
  } else {
    console.error("Lambda job failed", result.cause);
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
