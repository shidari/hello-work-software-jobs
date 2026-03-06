"use client";

import { useHydrateAtoms } from "jotai/utils";
import type { JobList } from "@/atom";
import { JobtotalCountAtom, jobListAtom } from "@/atom";
import { JobsPageClient } from "./JobsPageClient";

export function HydratedJobsPage({
  initialData,
}: {
  initialData: {
    jobs: JobList;
    page: number;
    totalPages: number;
    totalCount: number;
  };
}) {
  useHydrateAtoms([
    [jobListAtom, initialData],
    [JobtotalCountAtom, initialData.totalCount],
  ]);
  return <JobsPageClient initialTotalCount={initialData.totalCount} />;
}
