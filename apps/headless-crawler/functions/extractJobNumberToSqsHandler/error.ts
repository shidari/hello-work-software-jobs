import { Data } from "effect";

export class SendSQSMessageError extends Data.TaggedError(
  "SendSQSMessageError",
)<{
  readonly message: string;
}> {}
