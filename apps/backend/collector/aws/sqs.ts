import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { JobNumber } from "@sho/models";
import { Config, Data, Effect } from "effect";

// ── エラー ──

export class QueueSendError extends Data.TaggedError("QueueSendError")<{
  readonly message: string;
}> {}

// ── JobDetailQueue Effect.Service ──

export class JobDetailQueue extends Effect.Service<JobDetailQueue>()(
  "JobDetailQueue",
  {
    effect: Effect.gen(function* () {
      const queueUrl = yield* Config.string("SQS_QUEUE_URL");
      const endpointUrl = yield* Config.string("SQS_ENDPOINT_URL").pipe(
        Config.option,
      );
      const client = new SQSClient({
        ...(endpointUrl._tag === "Some" ? { endpoint: endpointUrl.value } : {}),
      });
      return {
        send: (payload: { jobNumber: JobNumber }) =>
          Effect.tryPromise({
            try: () =>
              client.send(
                new SendMessageCommand({
                  QueueUrl: queueUrl,
                  MessageBody: JSON.stringify(payload),
                }),
              ),
            catch: (e) =>
              new QueueSendError({
                message: `Failed to send to SQS: ${String(e)}`,
              }),
          }),
      };
    }),
  },
) {}
