import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { JobNumber } from "@sho/models";
import { Config, Context, Data, Effect, Layer } from "effect";
import type { SystemError } from "../lib/error";

// ── エラー ──

class QueueSendError extends Data.TaggedError("QueueSendError")<SystemError> {}

// ── JobDetailQueueConfig (Context.Tag) ──

export class JobDetailQueueConfig extends Context.Tag("JobDetailQueueConfig")<
  JobDetailQueueConfig,
  { readonly queueUrl: string; readonly endpoint?: string }
>() {
  static main = Layer.effect(
    JobDetailQueueConfig,
    Effect.gen(function* () {
      const queueUrl = yield* Config.string("SQS_QUEUE_URL");
      const endpointUrl = yield* Config.string("SQS_ENDPOINT_URL").pipe(
        Config.option,
      );
      return {
        queueUrl,
        ...(endpointUrl._tag === "Some" ? { endpoint: endpointUrl.value } : {}),
      };
    }),
  );
}

// ── sendJobDetail (Effect.fn) ──

export const sendJobDetail = Effect.fn("sendJobDetail")(function* (payload: {
  jobNumber: JobNumber;
}) {
  const { queueUrl, endpoint } = yield* JobDetailQueueConfig;
  const client = new SQSClient(endpoint ? { endpoint } : {});
  return yield* Effect.tryPromise({
    try: () =>
      client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(payload),
        }),
      ),
    catch: (e) =>
      new QueueSendError({
        reason: "Failed to send to SQS",
        error: e instanceof Error ? e : new Error(String(e)),
      }),
  });
});
