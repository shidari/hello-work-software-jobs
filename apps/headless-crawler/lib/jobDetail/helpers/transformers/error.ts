import { Data } from "effect";

export class ReceivedDateTransformationError extends Data.TaggedError(
  "ReceivedDateTransformationError",
)<{ readonly message: string }> {}

export class ExpiryDateTransformationError extends Data.TaggedError(
  "ExpiryDateTransformationError",
)<{ readonly message: string }> {}
