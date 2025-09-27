import { Data } from "effect";

export class FromJobListToJobDetailPageError extends Data.TaggedError(
    "FromJobListToJobDetailPageError",
)<{
    readonly message: string;
}> { }

export class NextJobListPageError extends Data.TaggedError(
    "NextJobListPageError",
)<{ readonly message: string }> { }