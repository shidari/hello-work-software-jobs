"use client";

import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { jobAtom } from "@/atom";
import type { TJobDetail } from "@/components/features/JobDetail/JobDetail";
import { JobDetail } from "@/components/features/JobDetail/JobDetail";

export function HydratedJob({
  initialDataFromServer,
}: {
  initialDataFromServer: TJobDetail;
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
