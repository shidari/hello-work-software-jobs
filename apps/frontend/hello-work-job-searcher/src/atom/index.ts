import type { Job, Unbrand } from "@sho/models";
import type { VirtualItem } from "@tanstack/react-virtual";
import { hc } from "hono/client";
import { atom } from "jotai";
import type { JobOverview } from "@/components/features/list/JobOverview";
import type { AppType } from "@/lib/backend-client";

export type JobList = Unbrand<Job>[];

export type SearchFilter = {
  companyName?: string;
  employeeCountLt?: string;
  employeeCountGt?: string;
  jobDescription?: string;
  jobDescriptionExclude?: string;
  onlyNotExpired?: boolean;
  orderByReceiveDate?: "asc" | "desc";
  addedSince?: string;
  addedUntil?: string;
};

const client = hc<AppType>("/");

// --- favorites ---

export const favoriteJobsAtom = atom<JobOverview[]>([]);

// favoriteJobsAtomにJobOverviewをappendし、localStorageにも書き込むwrite-only atom
export const appendFavoriteJobAtom = atom<null, [JobOverview], void>(
  null,
  (get, set, job) => {
    const prev = get(favoriteJobsAtom);
    const next = [...prev, job];
    set(favoriteJobsAtom, next);
    localStorage.setItem("favoriteJobs", JSON.stringify(next));
  },
);

// favoriteJobsAtomからjobNumberで該当データを削除し、localStorageにも書き込むwrite-only atom
export const removeFavoriteJobAtom = atom<null, [string], void>(
  null,
  (get, set, jobNumber) => {
    const prev = get(favoriteJobsAtom);
    const next = prev.filter((job) => job.jobNumber !== jobNumber);
    set(favoriteJobsAtom, next);
    localStorage.setItem("favoriteJobs", JSON.stringify(next));
  },
);

// --- jobs ---

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

export const JobtotalCountAtom = atom(
  async (get) => {
    const { totalCount } = get(jobListAtom);
    return totalCount;
  },
  async (_get, set, newCount: number) => {
    set(jobListAtom, (prev) => ({
      ...prev,
      totalCount: newCount,
    }));
  },
);

export const JobOverviewListAtom = atom<{
  items: JobOverview[];
  page: number;
  totalPages: number;
}>((get) => {
  const { jobs, page, totalPages } = get(jobListAtom);
  return {
    items: jobs.map((job) => ({
      jobNumber: job.jobNumber,
      companyName: job.companyName,
      occupation: job.occupation,
      employmentType: job.employmentType,
      workPlace: job.workPlace,
      employeeCount: job.employeeCount,
      receivedDate: job.receivedDate,
    })),
    page,
    totalPages,
  };
});

export const initializeJobListWriterAtom = atom<
  null,
  [SearchFilter],
  Promise<void>
>(null, async (_, set, searchFilter) => {
  set(searchFilterAtom, searchFilter);
  const res = await client.api.jobs.$get({
    query: {
      ...searchFilter,
      onlyNotExpired: searchFilter.onlyNotExpired ? "true" : undefined,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  const {
    jobs,
    meta: { totalCount, page, totalPages },
  } = data;
  set(jobListAtom, {
    jobs,
    page,
    totalPages,
    totalCount,
  });
});

// 書き込み専用atom: 次ページを取得してリストに追加
export const continuousJobOverviewListWriterAtom = atom<
  null,
  [],
  Promise<void>
>(null, async (get, set) => {
  const currentState = get(jobListAtom);
  const searchFilter = get(searchFilterAtom);
  const nextPage = currentState.page + 1;
  const res = await client.api.jobs.$get({
    query: {
      ...searchFilter,
      onlyNotExpired: searchFilter.onlyNotExpired ? "true" : undefined,
      page: String(nextPage),
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  const {
    jobs,
    meta: { totalCount, page, totalPages },
  } = data;
  set(jobListAtom, (prev) => ({
    jobs: [...prev.jobs, ...jobs],
    page,
    totalPages,
    totalCount,
  }));
});

export const jobAtom = atom<Unbrand<Job> | undefined>();
export const jobWriterAtom = atom<null, [string], Promise<void>>(
  null,
  async (_get, set, jobNumber) => {
    const res = await client.api.jobs[":jobNumber"].$get({
      param: { jobNumber },
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const data = await res.json();
    set(jobAtom, data ?? undefined);
  },
);

export const scrollRestorationByItemIndexAtom = atom(0);
// あまり直接的に外部ライブラリのインターフェースに依存させたくないが、仕方なく
export const scrollRestorationByItemListAtom = atom<VirtualItem[]>([]);
