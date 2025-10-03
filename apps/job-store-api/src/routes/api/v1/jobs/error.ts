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


export type UnexpectedError ={
  readonly _tag: "UnexpectedError";
  readonly message: string;
  readonly errorType: "server";
}

export const createUnexpectedError = (
  message: string,
): UnexpectedError => ({
  _tag: "UnexpectedError",
  message,
  errorType: "server",
});