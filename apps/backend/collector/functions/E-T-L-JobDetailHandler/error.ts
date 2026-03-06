import { Data } from "effect";

export class ToFirstRecordError extends Data.TaggedError("ToFirstRecordError")<{
  readonly message: string;
}> {}

export class FromExtractJobNumberJobQueueEventBodySchemaValidationError extends Data.TaggedError(
  "FromExtractJobNumberJobQueueEventBodySchemaValidationError",
)<{
  readonly message: string;
}> {}

export class JsonParseError extends Data.TaggedError("JsonParseError")<{
  readonly message: string;
}> {}
