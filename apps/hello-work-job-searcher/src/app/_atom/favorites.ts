import type { TJobOverview } from "@sho/models";
import { atom } from "jotai";

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
