import type { InferRequestType } from "hono/client";
import { atom } from "jotai";
import type { JobDetail, JobList, JobOverview } from "@/dto";
import type { Client } from "@/lib/backend-client";

export type SearchFilter = Omit<
  NonNullable<InferRequestType<Client["jobs"]["$get"]>["query"]>,
  "page"
>;

export const searchFilterAtom = atom<SearchFilter>({});
export const jobListAtom = atom<{
  jobs: JobList;
  page: number;
  totalPages: number;
  totalCount: number;
}>({
  jobs: [],
  page: 1,
  totalPages: 0,
  totalCount: 0,
});
export const jobAtom = atom<JobDetail | undefined>();
export const favoriteJobsAtom = atom<JobOverview[]>([]);
