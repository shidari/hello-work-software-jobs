import { readdir, rm } from "node:fs/promises";
import { JobNumber } from "@sho/models";
import type { SQSEvent } from "aws-lambda";
import { Effect, Schema } from "effect";
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
  await Effect.scoped(
    Effect.gen(function* () {
      const parsed = yield* Schema.decodeEither(JobNumber)(jobNumber);
      yield* processJob(parsed);
    }),
  ).pipe(
    Effect.provide(JobDetailExtractor.Default),
    Effect.provide(JobDetailTransformer.Default),
    Effect.provide(JobDetailLoader.main),
    Effect.provide(PlaywrightBrowserConfig.lambda),
    Effect.runPromise,
  );
  console.log(`${jobNumber} success`);
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
  await handleQueue(parsed.jobNumber).catch((error) => {
    console.error(`${parsed.jobNumber} failed:`, error);
    throw error;
  });

  // Playwright が /tmp/playwright_* にプロファイルを生成し browser.close() 後も残る。
  // Warm Start でコンテナ再利用時に蓄積し /tmp 容量枯渇 → newPage() クラッシュの原因になると判断。
  try {
    for (const entry of await readdir("/tmp")) {
      if (entry.startsWith("playwright_")) {
        await rm(`/tmp/${entry}`, { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.error("cleanup /tmp/playwright_* failed", e);
  }
};
