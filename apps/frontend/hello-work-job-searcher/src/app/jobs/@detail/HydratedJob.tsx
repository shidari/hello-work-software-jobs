"use client";

import type { Job } from "@sho/models";
import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { jobAtom } from "@/atom";
import { JobDetail } from "@/components/features/detail/JobDetail";

export function HydratedJob({
  initialDataFromServer,
}: {
  initialDataFromServer: Job;
}) {
  useHydrateAtoms([[jobAtom, initialDataFromServer]]);
  return <ClientJobDetail />;
}

export function ClientJobDetail() {
  const job = useAtomValue(jobAtom);
  if (!job) {
    return <div>求人情報が選択されていません。</div>;
  }
  return <JobDetail jobDetail={job} />;
}
