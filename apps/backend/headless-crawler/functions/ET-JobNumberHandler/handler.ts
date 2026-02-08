import { Effect, Exit, Config, Logger, LogLevel } from "effect";
import { sendMessageToQueue } from "../helpers/helper";
import { safeParse } from "valibot";
import { eventSchema } from "@sho/models";
import { issueToLogString } from "../../lib/core/util";
import { mainLive } from "../../lib/E-T-crawler/context";
import { PlaywrightChromiumPageResource } from "../../lib/core/headless-browser";
import { EventValidationError } from "../../lib/workflow/errors";
import { createJobNumberExtractionWorkflow } from "../../lib/workflow/etl";
import { createExtractStage } from "../../lib/workflow/stages";
import type { ExtractedJobList } from "../../lib/workflow/domain";

export const handler = async (event: unknown) => {
  const program = Effect.gen(function* () {
    const QUEUE_URL = yield* Config.string("QUEUE_URL");
    const { debugLog } = yield* (() => {
      const result = safeParse(eventSchema, event);
      if (!result.success)
        return Effect.fail(
          new EventValidationError({
            message: `detail: ${result.issues.map(issueToLogString).join(", ")}`,
            issues: result.issues.map(issueToLogString),
          }),
        );
      return Effect.succeed(result.output);
    })();

    // ワークフローを作成
    const extractStage = createExtractStage();
    const workflow = createJobNumberExtractionWorkflow(extractStage);

    // 検索条件（既存の設定から）
    const criteria = {
      workLocation: { prefecture: "東京都" },
      desiredOccupation: {
        occupationSelection: "ソフトウェア開発技術者、プログラマー",
      },
      employmentType: "RegularEmployee",
      searchPeriod: "today",
    };

    // ワークフローを実行
    yield* Effect.logInfo(`[Workflow] ${workflow.description} を実行中...`);
    const result = yield* workflow.run(criteria);

    // SQSキューにメッセージを送信
    yield* Effect.forEach(result.jobNumbers, (job) =>
      sendMessageToQueue({ jobNumber: job.jobNumber }, QUEUE_URL),
    );

    yield* Effect.logInfo(
      `[Complete] ${result.totalCount}件の求人番号を処理しました`,
    );
    return result.jobNumbers;
  });

  // 依存関係を提供してプログラムを実行
  const runnable = program
    .pipe(Effect.provide(mainLive))
    .pipe(Effect.provide(PlaywrightChromiumPageResource.Default))
    .pipe(Effect.scoped) as Effect.Effect<ExtractedJobList, any, never>;

  const exit = await Effect.runPromiseExit(
    Logger.withMinimumLogLevel(
      (() => {
        const result = safeParse(eventSchema, event);
        return result.success && result.output.debugLog
          ? LogLevel.Debug
          : LogLevel.Info;
      })(),
    )(runnable),
  );

  if (Exit.isSuccess(exit)) {
    console.log("handler succeeded", JSON.stringify(exit.value, null, 2));
    return exit.value;
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
