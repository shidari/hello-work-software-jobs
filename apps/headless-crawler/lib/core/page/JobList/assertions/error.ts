import { Data } from "effect";

export class AssertSingleJobListedError extends Data.TaggedError(
  "AssertSingleJobListedError",
)<{ readonly message: string }> {}
