import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { JobMetadata } from "@sho/schema";
import { Effect } from "effect";
import { SendSQSMessageError } from "./error";

export const sendJobToQueue = (job: JobMetadata) =>
  Effect.gen(function* () {
    const sqs = new SQSClient({});
    const QUEUE_URL = yield* Effect.fromNullable(process.env.QUEUE_URL);
    return yield* Effect.tryPromise({
      try: async () => {
        return await sqs.send(
          new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
              job,
              timestamp: new Date().toISOString(),
            }),
          }),
        );
      },
      catch: (e) =>
        new SendSQSMessageError({ message: `unexpected error.\n${String(e)}` }),
    });
  });
