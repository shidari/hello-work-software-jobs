import { Data } from "effect";

export class QualificationsElmNotFoundError extends Data.TaggedError(
  "QualificationsElmNotFoundError",
)<{ readonly message: string }> {}

export class HomePageElmNotFoundError extends Data.TaggedError(
  "HomePageElmNotFoundError",
)<{ readonly message: string }> {}
