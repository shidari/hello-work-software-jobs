import { Data } from "effect";

export class ExtractJobNumbersError extends Data.TaggedError(
    "ExtractJobNumbersError",
)<{ readonly message: string }> { }