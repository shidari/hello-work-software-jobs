import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { JobMetadata } from "@sho/models";
import { Effect } from "effect";
import { SendSQSMessageError } from "./error";
export type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable };
export const sendMessageToQueue = (value: Serializable, url: string) =>
  Effect.gen(function* () {
    const sqs = new SQSClient({});
    return yield* Effect.tryPromise({
      try: async () => {
        return await sqs.send(
          new SendMessageCommand({
            QueueUrl: url,
            MessageBody: JSON.stringify(value),
          }),
        );
      },
      catch: (e) =>
        new SendSQSMessageError({ message: `unexpected error.\n${String(e)}` }),
    });
  });
export const sendJobToRawJobDetailExtractorQueue = (job: JobMetadata) =>
  Effect.gen(function* () {
    const sqs = new SQSClient({});
    const QUEUE_URL = yield* Effect.fromNullable(
      process.env.RAW_JOB_DETAIL_EXTRACTOR_QUEUE_URL,
    );
    return yield* Effect.tryPromise({
      try: async () => {
        return await sqs.send(
          new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify({
              job,
            }),
          }),
        );
      },
      catch: (e) =>
        new SendSQSMessageError({ message: `unexpected error.\n${String(e)}` }),
    });
  });
