import { createD1DB } from "@sho/db";
import { ConfigProvider, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../lib/browser";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../lib/job-number-crawler/crawl";
import type { Env } from "../index";

export const handleScheduled = async (
  env: Env,
  trigger: "cron" | "manual" = "cron",
) => {
  const db = createD1DB(env.DB);

  let runId: number | null = null;
  try {
    const now = new Date().toISOString();
    const row = await db
      .insertInto("crawler_runs")
      .values({ status: "running", trigger, startedAt: now, createdAt: now })
      .returning("id")
      .executeTakeFirstOrThrow();
    runId = row.id;
  } catch (e) {
    console.error("Failed to start crawler run log", e);
  }

  const program = Effect.gen(function* () {
    const jobs = yield* crawlJobLinks();
    yield* Effect.forEach(jobs, (job) =>
      Effect.tryPromise({
        try: () => env.JOB_DETAIL_QUEUE.send({ jobNumber: job.jobNumber }),
        catch: (e) => new Error(`Failed to send to queue: ${String(e)}`),
      }),
    );
    return jobs;
  });

  const runnable = program.pipe(
    Effect.provide(JobNumberCrawlerConfig.Default),
    Effect.provide(PlaywrightChromium.cloudflare(env.MYBROWSER)),
    Effect.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log("handler succeeded", JSON.stringify(jobs, null, 2));
    if (runId != null) {
      try {
        await db
          .updateTable("crawler_runs")
          .set({
            status: "success",
            finishedAt: new Date().toISOString(),
            fetchedCount: jobs.length,
            queuedCount: jobs.length,
            failedCount: 0,
            errorMessage: null,
          })
          .where("id", "=", runId)
          .execute();
      } catch (e) {
        console.error("Failed to finish crawler run log", e);
      }
    }
    return jobs;
  }

  if (runId != null) {
    try {
      await db
        .updateTable("crawler_runs")
        .set({
          status: "failed",
          finishedAt: new Date().toISOString(),
          fetchedCount: 0,
          queuedCount: 0,
          failedCount: 0,
          errorMessage: String(exit.cause),
        })
        .where("id", "=", runId)
        .execute();
    } catch (e) {
      console.error("Failed to finish crawler run log", e);
    }
  }
  throw new Error(`handler failed: ${exit.cause}`);
};
