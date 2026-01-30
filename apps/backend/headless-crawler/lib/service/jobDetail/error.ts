import { Data } from "effect";

export class GetExecutablePathError extends Data.TaggedError(
    "GetExecutablePathError",
)<{
    readonly message: string;
}> { }