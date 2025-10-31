import { Data } from "effect";

export class WageTransformationError extends Data.TaggedError(
  "WageTransformationError",
)<{ readonly reason: string, serializedVal: string }> { }

export class WorkingHoursTransformationError extends Data.TaggedError(
  "WorkingHoursTransformationError",
)<{ readonly reason: string, serializedVal: string }> { }

export class EmployeeCountTransformationError extends Data.TaggedError(
  "EmployeeCountTransformationError",
)<{ readonly reason: string, serializedVal: string }> { }

export class HomePageTransformationError extends Data.TaggedError(
  "HomePageTransformationError",
)<{ readonly reason: string, serializedVal: string }> { }