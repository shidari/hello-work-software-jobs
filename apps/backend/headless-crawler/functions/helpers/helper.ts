import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
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
