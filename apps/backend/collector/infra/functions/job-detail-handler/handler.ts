import { JobNumber } from "@sho/models";
import type { SQSEvent } from "aws-lambda";
import { Cause, Effect, Exit, Schema } from "effect";
import { PlaywrightBrowserConfig } from "../../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../../lib/job-detail-crawler";

// ── SQS メッセージスキーマ ──

const SqsJobMessage = Schema.Struct({
  jobNumber: Schema.String,
});

// ── handleQueue ──

const handleQueue = async (jobNumber: string) => {
  const startedAt = new Date().toISOString();

  const program = Effect.scoped(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeEither(JobNumber)(jobNumber);
      yield* processJob(parsed);
    }),
  );

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.main),
    Effect.provide(PlaywrightBrowserConfig.main),
  );

  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    console.log(
      JSON.stringify({
        event: "job_detail_run",
        jobNumber,
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  for (const failure of Cause.failures(exit.cause)) {
    if (typeof failure === "object" && "error" in failure && failure.error)
      console.error(failure.error);
  }
  const errorMessage = Cause.pretty(exit.cause);
  console.error(
    JSON.stringify({
      event: "job_detail_run",
      jobNumber,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      errorMessage,
    }),
  );
  throw new Error(`job-detail-handler failed: ${errorMessage}`);
};

// ── Lambda handler ──

export const handler = async (event: SQSEvent): Promise<void> => {
  // batchSize: 1 なので Records は常に1件
  const record = event.Records[0];
  if (!record) {
    console.error("No records in SQS event");
    return;
  }

  const parsed = Schema.decodeUnknownSync(SqsJobMessage)(
    JSON.parse(record.body),
  );
  await handleQueue(parsed.jobNumber);
};
