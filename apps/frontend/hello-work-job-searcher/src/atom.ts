import { atom } from "jotai";
import type { JobOverview } from "@/dto";

// ── Source of Truth ──

export const favoriteJobsAtom = atom<JobOverview[]>([]);

// ── Selectors (derived) ──

export const favoriteJobsSelector = atom((get) => get(favoriteJobsAtom));

export const isFavoriteSelector = atom((get) => {
  const favorites = get(favoriteJobsAtom);
  return (jobNumber: string) =>
    favorites.some((job) => job.jobNumber === jobNumber);
});

// ── Writers (side effects) ──

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
