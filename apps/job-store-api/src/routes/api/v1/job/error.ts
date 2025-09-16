export type FetchJobValidationError = {
  readonly _tag: "FetchJobValidationError";
  readonly message: string;
  readonly errorType: "client";
};

export const createFetchValidationError = (
  message: string,
): FetchJobValidationError => ({
  _tag: "FetchJobValidationError",
  message,
  errorType: "client",
});
