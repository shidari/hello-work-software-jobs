import { createD1DB } from "@sho/db";
import type { JobNumber } from "@sho/models";
import { Cause, ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  JobDetailExtractor,
  JobDetailLoader,
  JobDetailTransformer,
  processJob,
} from "../../lib/job-detail-crawler";
import type { Env } from "../index";

function stageFromCause(cause: Cause.Cause<unknown>): string | null {
  const failures = Cause.failures(cause);
  const first = Array.from(failures)[0];
  if (!first || typeof first !== "object" || first === null) return null;
  const tag = (first as { _tag?: string })._tag;
  switch (tag) {
    case "ExtractJobDetailRawHtmlError":
      return "extract";
    case "JobDetailTransformError":
      return "transform";
    case "InsertJobError":
      return "load";
    default:
      return null;
  }
}

export const handleQueue = async (jobNumber: string, env: Env) => {
  const db = createD1DB(env.DB);
  const now = new Date().toISOString();

  let runId: number | null = null;
  try {
    const row = await db
      .insertInto("job_detail_runs")
      .values({
        jobNumber,
        status: "running",
        startedAt: now,
        createdAt: now,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    runId = row.id;
  } catch (e) {
    console.error("Failed to start job_detail_runs log", e);
  }

  const program = Effect.gen(function* () {
    yield* processJob(jobNumber as JobNumber);
  });

  const runnable = program.pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.Default),
    Effect.provide(PlaywrightChromium.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const result = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(result)) {
    console.log("Queue job succeeded:", result.value);
    if (runId != null) {
      try {
        await db
          .updateTable("job_detail_runs")
          .set({
            status: "success",
            finishedAt: new Date().toISOString(),
          })
          .where("id", "=", runId)
          .execute();
      } catch (e) {
        console.error("Failed to update job_detail_runs log", e);
      }
    }
  } else {
    console.error("Queue job failed", result.cause);
    if (runId != null) {
      try {
        await db
          .updateTable("job_detail_runs")
          .set({
            status: "failed",
            stage: stageFromCause(result.cause),
            finishedAt: new Date().toISOString(),
            errorMessage: Cause.pretty(result.cause).substring(0, 1000),
          })
          .where("id", "=", runId)
          .execute();
      } catch (e) {
        console.error("Failed to update job_detail_runs log", e);
      }
    }
    throw new Error(JSON.stringify(result.cause, null, 2));
  }
};
