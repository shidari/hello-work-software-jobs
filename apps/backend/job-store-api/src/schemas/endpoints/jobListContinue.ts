import { number, object, string } from "valibot";
import { searchFilterSchema } from "../dbClient";

export const jobListContinueQuerySchema = object({
	nextToken: string(),
});

export const decodedNextTokenSchema = object({
	iss: string(),
	iat: number(),
	nbf: number(),
	exp: number(),
	page: number(),
	filter: searchFilterSchema,
});

export const jobListContinueClientErrorResponseSchema = object({
	message: string(),
});

export const jobListContinueServerErrorSchema = object({
	message: string(),
});
