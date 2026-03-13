import { atom } from "jotai";
import type { JobOverview } from "@/dto";
import { client } from "@/lib/client";
import type { SearchFilter } from "./atoms";
import { favoriteJobsAtom, jobListAtom, searchFilterAtom } from "./atoms";

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
