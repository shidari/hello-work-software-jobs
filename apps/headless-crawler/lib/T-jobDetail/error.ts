import { Data } from "effect";

export class WageTransformationError extends Data.TaggedError(
    "WageTransformationError",
)<{ readonly message: string }> { }

export class WorkingHoursTransformationError extends Data.TaggedError(
    "WorkingHoursTransformationError",
)<{ readonly message: string }> { }

export class EmployeeCountTransformationError extends Data.TaggedError(
    "EmployeeCountTransformationError",
)<{ readonly message: string }> { }