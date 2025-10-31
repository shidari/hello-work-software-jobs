import { Data } from "effect";

export class ReceivedDateTransformationError extends Data.TaggedError(
  "ReceivedDateTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}

export class ExpiryDateTransformationError extends Data.TaggedError(
  "ExpiryDateTransformationError",
)<{ readonly reason: string; serializedVal: string }> {}
