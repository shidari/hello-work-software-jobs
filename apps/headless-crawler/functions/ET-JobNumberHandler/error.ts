import { Data } from "effect";

export class EventSchemaValidationError extends Data.TaggedError("EventSchemaValidationError")<{
    readonly message: string;
}> { }