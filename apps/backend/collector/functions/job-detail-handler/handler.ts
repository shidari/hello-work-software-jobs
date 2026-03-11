import { JobNumber } from "@sho/models";
import { Console, Effect, Schema } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../lib/job-detail-crawler";

export const handleQueue = async (jobNumber: string) => {
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
      onSuccess: () =>
        Console.log(
          JSON.stringify({
            type: "job_detail_run",
            jobNumber,
            status: "success",
            startedAt,
            finishedAt: new Date().toISOString(),
          }),
        ),
      onFailure: (error) => {
        const errorMessage =
          typeof error === "string"
            ? error
            : `${error._tag}: ${"reason" in error ? error.reason : error.message}`;
        return Console.error(
          JSON.stringify({
            type: "job_detail_run",
            jobNumber,
            status: "failed",
            startedAt,
            finishedAt: new Date().toISOString(),
            errorMessage,
          }),
        );
      },
    }),
    Effect.runPromise,
  );
};
