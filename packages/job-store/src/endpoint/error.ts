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
