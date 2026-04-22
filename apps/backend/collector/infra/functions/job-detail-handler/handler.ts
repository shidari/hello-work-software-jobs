import { JobNumber } from "@sho/models";
import type { SQSEvent } from "aws-lambda";
import { Effect, Schema } from "effect";
import { ChromiumBrowserConfig, DebugDumpConfig } from "../../../lib/hellowork/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../../lib/hellowork/job-detail-crawler";
import { LoggerLayer, logErrorCause } from "../logger";
import { cleanupTmp, disableCoreDump, logTmpUsage } from "../tmp-usage";

// ── SQS メッセージスキーマ ──

const SqsJobMessage = Schema.Struct({
  jobNumber: Schema.String,
});

// ── processJobDetail ──

const processJobDetail = (jobNumber: string) => {
  const program = Effect.gen(function* () {
    const parsed = yield* Schema.decodeEither(JobNumber)(jobNumber);
    yield* processJob(parsed);
    yield* Effect.logInfo("job detail success");
  }).pipe(
    Effect.ensuring(cleanupTmp),
    Effect.retry({
      times: 2,
      while: (e) => {
        switch (e._tag) {
          case "PageActionError":
          case "PageNavigationError":
          case "ListJobsError":
          case "ApiResponseError":
            return true;
          default:
            return false;
        }
      },
    }),
    Effect.tapErrorCause((cause) => logErrorCause("job detail failed", cause)),
    Effect.annotateLogs({ jobNumber }),
  );

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.main),
    Effect.provide(ChromiumBrowserConfig.lambda),
    Effect.provide(DebugDumpConfig.noop),
    Effect.provide(LoggerLayer),
    Effect.orDie,
  );
  return runnable;
};

// ── Lambda handler ──

const program = (event: SQSEvent) =>
  Effect.gen(function* () {
    // batchSize: 1 なので Records は常に1件
    const record = event.Records[0];
    if (!record) {
      yield* Effect.logWarning("no records in SQS event");
      return;
    }

    yield* disableCoreDump;
    yield* cleanupTmp;
    yield* Effect.promise(() => logTmpUsage("job-detail-etl:start"));

    const parsed = Schema.decodeUnknownSync(SqsJobMessage)(
      JSON.parse(record.body),
    );
    yield* processJobDetail(parsed.jobNumber);
  });

export const handler = async (event: SQSEvent): Promise<void> => {
  const runnable = program(event).pipe(Effect.provide(LoggerLayer));
  await Effect.runPromise(runnable);
};
