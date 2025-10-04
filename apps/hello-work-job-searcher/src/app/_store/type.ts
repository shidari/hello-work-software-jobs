import type { JobListQuery, jobListSuccessResponseSchema } from "@sho/models";
import type { ResultAsync } from "neverthrow";
import type { InferOutput } from "valibot";
/**
 * 求人ストアクライアントの共通インターフェース
 */
export interface JobStoreClient {
  /**
   * 初期求人リスト取得
   * @param filter 検索フィルター
   */
  getInitialJobs(
    query?: JobListQuery,
  ): ResultAsync<
    InferOutput<typeof jobListSuccessResponseSchema>,
    EndpointNotFoundError | FetchJobsError | ParseJsonError | ValidateJobsError
  >;

  /**
   * 続きの求人リスト取得
   * @param nextToken ページネーション用トークン
   */
  getContinuedJobs(
    nextToken: string,
  ): ResultAsync<
    InferOutput<typeof jobListSuccessResponseSchema>,
    EndpointNotFoundError | FetchJobsError | ParseJsonError | ValidateJobsError
  >;
}

export type EndpointNotFoundError = {
  readonly _tag: "EndpointNotFoundError";
  readonly message: string;
};

export type FetchJobsError = {
  readonly _tag: "FetchJobsError";
  readonly message: string;
};

export type ParseJsonError = {
  readonly _tag: "ParseJsonError";
  readonly message: string;
};

export type ValidateJobsError = {
  readonly _tag: "ValidateJobsError";
  readonly message: string;
};

export const createValidateJobsError: (message: string) => ValidateJobsError = (
  message,
) => ({
  _tag: "ValidateJobsError",
  message,
});

export const createParseJsonError: (message: string) => ParseJsonError = (
  message,
) => ({
  _tag: "ParseJsonError",
  message,
});

export const createFetchJobsError: (message: string) => FetchJobsError = (
  message,
) => ({
  _tag: "FetchJobsError",
  message,
});

export const createEndPointNotFoundError: (
  message: string,
) => EndpointNotFoundError = (message) => ({
  _tag: "EndpointNotFoundError",
  message,
});
