import { atom } from "jotai";
import type { JobOverview } from "@/dto";
import { jobListAtom } from "./atoms";

export const jobTotalCountSelector = atom(
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

export const jobOverviewListSelector = atom<{
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
