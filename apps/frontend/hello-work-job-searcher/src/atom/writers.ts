import { atom } from "jotai";
import type { JobOverview } from "@/dto";
import { client } from "@/lib/backend-client";
import type { SearchFilter } from "./atoms";
import {
  favoriteJobsAtom,
  jobAtom,
  jobListAtom,
  searchFilterAtom,
} from "./atoms";

export const jobListInitWriter = atom(
  null,
  async (_get, set, searchFilter: SearchFilter) => {
    set(searchFilterAtom, searchFilter);
    const res = await client.jobs.$get({
      query: {
        ...searchFilter,
        onlyNotExpired: searchFilter.onlyNotExpired ? "true" : undefined,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const { jobs, meta } = await res.json();
    set(jobListAtom, { jobs, ...meta });
  },
);

export const jobListWriter = atom(
  null,
  async (get, set, targetPage: number) => {
    const searchFilter = get(searchFilterAtom);
    const res = await client.jobs.$get({
      query: {
        ...searchFilter,
        onlyNotExpired: searchFilter.onlyNotExpired ? "true" : undefined,
        page: String(targetPage),
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const { jobs, meta } = await res.json();
    set(jobListAtom, { jobs, ...meta });
  },
);

export const jobSelectWriter = atom(
  null,
  async (_get, set, jobNumber: string) => {
    const res = await client.jobs[":jobNumber"].$get({
      param: { jobNumber },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    set(jobAtom, data ?? undefined);
  },
);

export const favoriteAppendWriter = atom(
  null,
  (_get, set, job: JobOverview) => {
    set(favoriteJobsAtom, (prev) => {
      const next = [...prev, job];
      localStorage.setItem("favoriteJobs", JSON.stringify(next));
      return next;
    });
  },
);

export const favoriteRemoveWriter = atom(
  null,
  (_get, set, jobNumber: string) => {
    set(favoriteJobsAtom, (prev) => {
      const next = prev.filter((job) => job.jobNumber !== jobNumber);
      localStorage.setItem("favoriteJobs", JSON.stringify(next));
      return next;
    });
  },
);
