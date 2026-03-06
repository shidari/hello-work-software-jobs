"use client";

import { useHydrateAtoms } from "jotai/utils";
import type { JobList, SearchFilter } from "@/atom";
import { JobtotalCountAtom, jobListAtom, searchFilterAtom } from "@/atom";
import { JobsPageClient } from "./JobsPageClient";

export function HydratedJobsPage({
  initialData,
  initialFilter,
}: {
  initialData: {
    jobs: JobList;
    page: number;
    totalPages: number;
    totalCount: number;
  };
  initialFilter: SearchFilter;
}) {
  useHydrateAtoms([
    [jobListAtom, initialData],
    [JobtotalCountAtom, initialData.totalCount],
    [searchFilterAtom, initialFilter],
  ]);
  return <JobsPageClient initialTotalCount={initialData.totalCount} />;
}
