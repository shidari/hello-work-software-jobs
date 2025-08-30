export type ResponseSchemaValidationError = {
  readonly _tag: "ResponseSchemaValidationError";
  readonly message: string;
};

export const createSchemaValidationError = (
  message: string,
): ResponseSchemaValidationError => ({
  _tag: "ResponseSchemaValidationError",
  message,
});

export type JWTSignatureError = {
  readonly _tag: "JWTSignatureError";
  readonly message: string;
};

export type EnvError = {
  readonly _tag: "EnvError";
  readonly message: string;
};

export type EmployeeCountGtValidationError = {
  readonly _tag: "EmployeeCountGtValidationError";
  readonly message: string;
};
export type EmployeeCountLtValidationError = {
  readonly _tag: "EmployeeCountLtValidationError";
  readonly message: string;
};

export const createEmployeeCountGtValidationError = (
  message: string,
): EmployeeCountGtValidationError => ({
  _tag: "EmployeeCountGtValidationError",
  message,
});

export const createEmployeeCountLtValidationError = (
  message: string,
): EmployeeCountLtValidationError => ({
  _tag: "EmployeeCountLtValidationError",
  message,
});

export const createJWTSignatureError = (
  message: string,
): JWTSignatureError => ({
  _tag: "JWTSignatureError",
  message,
});

export const createEnvError = (message: string): EnvError => ({
  _tag: "EnvError",
  message,
});
