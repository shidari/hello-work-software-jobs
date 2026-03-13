import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  ScheduledEvent,
} from "aws-lambda";
import { Cause, Effect, Exit, Layer } from "effect";
import { PlaywrightChromium } from "../../../lib/browser";
import type { SearchPeriod } from "../../../lib/job-number-crawler/crawl";
import {
  crawlJobLinks,
  JobNumberCrawlerConfig,
} from "../../../lib/job-number-crawler/crawl";
import { JobDetailQueue } from "../../sqs";

// ── handleScheduled ──

const validPeriods = new Set<string>(["today", "week", "all"]);
const MAX_COUNT_LIMIT = 5000;

const handleScheduled = async (
  trigger: "cron" | "manual" = "cron",
  searchPeriod: SearchPeriod = "today",
  maxCount?: number,
) => {
  const startedAt = new Date().toISOString();

  const program = Effect.gen(function* () {
    const queue = yield* JobDetailQueue;
    const jobs = yield* crawlJobLinks();
    yield* Effect.forEach(jobs, (job) => queue.send(job));
    return jobs;
  });

  const crawlerConfigLayer = Layer.effect(
    JobNumberCrawlerConfig,
    Effect.gen(function* () {
      const base = yield* JobNumberCrawlerConfig;
      return new JobNumberCrawlerConfig({
        config: {
          ...base.config,
          ...(maxCount != null ? { roughMaxCount: maxCount } : {}),
          jobSearchCriteria: {
            ...base.config.jobSearchCriteria,
            searchPeriod,
          },
        },
      });
    }).pipe(Effect.provide(JobNumberCrawlerConfig.Default)),
  );

  const runnable = program.pipe(
    Effect.provide(crawlerConfigLayer),
    Effect.provide(PlaywrightChromium.Default),
    Effect.provide(JobDetailQueue.Default),
    Effect.scoped,
  );
  const exit = await Effect.runPromiseExit(runnable);

  if (Exit.isSuccess(exit)) {
    const jobs = exit.value;
    console.log(
      JSON.stringify({
        event: "crawler_run",
        status: "success",
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        fetchedCount: jobs.length,
        queuedCount: jobs.length,
      }),
    );
    return jobs;
  }

  const errorMessage = Cause.pretty(exit.cause);
  console.error(
    JSON.stringify({
      event: "crawler_run",
      status: "failed",
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      errorMessage,
    }),
  );
  throw new Error(`handler failed: ${errorMessage}`);
};

// ── Lambda handler ──

function isScheduledEvent(event: unknown): event is ScheduledEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "source" in event &&
    (event as Record<string, unknown>).source === "aws.events"
  );
}

function isFunctionUrlEvent(event: unknown): event is APIGatewayProxyEventV2 {
  return (
    typeof event === "object" &&
    event !== null &&
    "requestContext" in event &&
    "headers" in event
  );
}

export const handler = async (
  event: ScheduledEvent | APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2 | undefined> => {
  // EventBridge scheduled event
  if (isScheduledEvent(event)) {
    await handleScheduled("cron");
    return;
  }

  // Lambda Function URL (manual trigger)
  if (isFunctionUrlEvent(event)) {
    const apiKey = event.headers["x-api-key"];
    const expectedKey = process.env.API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid API key" }),
      };
    }

    const params = event.queryStringParameters ?? {};
    const period = params.period;
    const searchPeriod: SearchPeriod =
      period && validPeriods.has(period) ? (period as SearchPeriod) : "today";
    const maxCountRaw = params.maxCount;
    const maxCount =
      maxCountRaw && /^\d+$/.test(maxCountRaw) && Number(maxCountRaw) > 0
        ? Math.min(Number(maxCountRaw), MAX_COUNT_LIMIT)
        : undefined;

    await handleScheduled("manual", searchPeriod, maxCount);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Crawler completed" }),
    };
  }

  console.error("Unknown event type:", JSON.stringify(event));
  throw new Error("Unknown event type");
};
