import type { VirtualItem } from "@tanstack/react-virtual";
import { hc } from "hono/client";
import { atom } from "jotai";
import type { TJobDetail, TJobOverview } from "@/app/_components/Job";
import type { JobList, SearchFilter } from "@/app/_job-store-fetcher";
import type { AppType } from "@/app/api/[[...route]]/route";

const client = hc<AppType>("/");

// --- favorites ---

export const favoriteJobsAtom = atom<TJobOverview[]>([]);

// favoriteJobsAtomにTJobOverviewをappendし、localStorageにも書き込むwrite-only atom
export const appendFavoriteJobAtom = atom<null, [TJobOverview], void>(
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

export const jobListAtom = atom<{
  jobs: JobList;
  nextToken: string | undefined;
  totalCount: number;
}>({
  jobs: [],
  nextToken: undefined,
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
  items: TJobOverview[];
  nextToken: string | undefined;
}>((get) => {
  const { jobs, nextToken } = get(jobListAtom);
  return {
    items: jobs.map((job) => ({
      jobNumber: job.jobNumber,
      companyName: job.companyName || undefined,
      jobTitle: job.occupation,
      employmentType: job.employmentType,
      workPlace: job.workPlace || "不明",
      employeeCount: job.employeeCount || Number.NaN,
      receivedDate: job.receivedDate,
    })),
    nextToken,
  };
});

export const initializeJobListWriterAtom = atom<
  null,
  [SearchFilter],
  Promise<void>
>(null, async (_, set, searchFilter) => {
  const res = await client.api.jobs.$get({
    query: {
      ...searchFilter,
    },
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  const {
    jobs,
    nextToken,
    meta: { totalCount },
  } = data;
  set(jobListAtom, {
    jobs,
    nextToken,
    totalCount,
  });
});

// 書き込み専用atom: getContinuedJobsを叩いてリストを更新
export const continuousJobOverviewListWriterAtom = atom<
  null,
  [string],
  Promise<void>
>(null, async (_get, set, nextToken) => {
  const res = await client.api.jobs.continue.$get({
    query: { nextToken },
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  const {
    jobs,
    nextToken: newNextToken,
    meta: { totalCount },
  } = data;
  set(jobListAtom, (prev) => ({
    jobs: [...prev.jobs, ...jobs],
    nextToken: newNextToken,
    totalCount: totalCount,
  }));
});

export const jobAtom = atom<TJobDetail | undefined>();
export const jobWriterAtom = atom<null, [string], Promise<void>>(
  null,
  async (_get, set, jobNumber) => {
    const res = await client.api.jobs[":jobNumber"].$get({
      param: { jobNumber },
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    set(jobAtom, {
      jobNumber: data.jobNumber,
      jobTitle: data.occupation,
      companyName: data.companyName ?? undefined,
      employmentType: data.employmentType,
      workPlace: data.workPlace || "不明",
      employeeCount: data.employeeCount || Number.NaN,
      receivedDate: data.receivedDate,
      jobDescription: data.jobDescription || "説明なし",
      qualifications: data.qualifications || "不明",
      salary: `${data.wage.min} ~ ${data.wage.max} 円`,
      workingHours: `${data.workingHours.start} ~ ${data.workingHours.end}`,
      expiryDate: data.expiryDate,
    });
  },
);

export const scrollRestorationByItemIndexAtom = atom(0);
// あまり直接的に外部ライブラリのインターフェースに依存させたくないが、仕方なく
export const scrollRestorationByItemListAtom = atom<VirtualItem[]>([]);
