"use client";

import { useHydrateAtoms } from "jotai/utils";
import { jobListAtom, type SearchFilter, searchFilterAtom } from "@/atom/atoms";
import { jobTotalCountSelector } from "@/atom/selectors";
import type { JobList } from "@/dto";
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
    [jobTotalCountSelector, initialData.totalCount],
    [searchFilterAtom, initialFilter],
  ]);
  return <JobsPageClient initialTotalCount={initialData.totalCount} />;
}
