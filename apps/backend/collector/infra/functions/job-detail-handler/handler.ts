import { JobNumber } from "@sho/models";
import type { SQSEvent } from "aws-lambda";
import { Effect, Schema } from "effect";
import { PlaywrightChromium } from "../../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../../lib/job-detail-crawler";

// ── handleQueue ──

const handleQueue = async (jobNumber: string) => {
  const startedAt = new Date().toISOString();

  const program = Effect.gen(function* () {
    const parsed = yield* Schema.decodeEither(JobNumber)(jobNumber);
    yield* processJob(parsed);
  });

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightChromium.Default),
    Effect.scoped,
  );

  await runnable.pipe(
    Effect.matchEffect({
      onSuccess: () => {
        console.log(
          JSON.stringify({
            event: "job_detail_run",
            jobNumber,
            status: "success",
            startedAt,
            finishedAt: new Date().toISOString(),
          }),
        );
        return Effect.void;
      },
      onFailure: (error) => {
        const errorMessage =
          typeof error === "string"
            ? error
            : `${error._tag}: ${"reason" in error ? error.reason : error.message}`;
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
        return Effect.void;
      },
    }),
    Effect.runPromise,
  );
};

// ── Lambda handler ──

export const handler = async (event: SQSEvent): Promise<void> => {
  // batchSize: 1 なので Records は常に1件
  const record = event.Records[0];
  if (!record) {
    console.error("No records in SQS event");
    return;
  }

  const { jobNumber } = JSON.parse(record.body) as { jobNumber: string };
  await handleQueue(jobNumber);
};
