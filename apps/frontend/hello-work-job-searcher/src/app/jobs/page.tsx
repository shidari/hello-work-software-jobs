export const dynamic = "force-dynamic";

import { Effect, Schema } from "effect";
import { Suspense } from "react";
import { jobStoreClient } from "#lib/backend-client";
import { SearchFilterSchema } from "@/components/features/list/JobSearchFilter.schema";
import { Collapsible } from "@/components/ui/Collapsible";
import { runLog } from "@/lib/log";
import { JobsList } from "./JobsList_client";
import { JobsListSkeleton } from "./JobsListSkeleton";
import styles from "./JobsPageClient.module.css";
import { SearchFilterForm } from "./SearchFilterForm_client";

const SearchParams = Schema.Struct({
  ...SearchFilterSchema.fields,
  page: Schema.optional(Schema.String),
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { page: pageStr, ...filter } =
    Schema.decodeUnknownSync(SearchParams)(raw);

  const jobsPromise = (async () => {
    const res = await jobStoreClient.jobs.$get({
      query: {
        ...filter,
        onlyNotExpired: filter.onlyNotExpired === "true" ? "true" : undefined,
        orderByReceiveDate: filter.orderByReceiveDate ?? ("desc" as const),
        page: pageStr ?? "1",
      },
    });
    if (!res.ok) {
      await runLog(
        Effect.logError("fetch jobs list failed").pipe(
          Effect.annotateLogs({ status: res.status, path: "/jobs" }),
        ),
      );
      throw new Error(`fetch jobs list failed: ${res.status}`);
    }
    return await res.json();
  })();

  const hasFilter =
    !!filter.companyName ||
    !!filter.jobDescription ||
    !!filter.jobDescriptionExclude ||
    !!filter.occupation ||
    !!filter.workPlace ||
    !!filter.qualifications ||
    !!filter.employmentType ||
    !!filter.wageMin ||
    !!filter.wageMax ||
    !!filter.addedSince ||
    !!filter.addedUntil ||
    !!filter.orderByReceiveDate ||
    !!filter.onlyNotExpired ||
    !!filter.employeeCountGt ||
    !!filter.employeeCountLt;

  const filterParams = new URLSearchParams();
  if (filter.companyName) filterParams.set("companyName", filter.companyName);
  if (filter.jobDescription)
    filterParams.set("jobDescription", filter.jobDescription);
  if (filter.jobDescriptionExclude)
    filterParams.set("jobDescriptionExclude", filter.jobDescriptionExclude);
  if (filter.occupation) filterParams.set("occupation", filter.occupation);
  if (filter.workPlace) filterParams.set("workPlace", filter.workPlace);
  if (filter.qualifications)
    filterParams.set("qualifications", filter.qualifications);
  if (filter.employmentType)
    filterParams.set("employmentType", filter.employmentType);
  if (filter.wageMin) filterParams.set("wageMin", filter.wageMin);
  if (filter.wageMax) filterParams.set("wageMax", filter.wageMax);
  if (filter.addedSince) filterParams.set("addedSince", filter.addedSince);
  if (filter.addedUntil) filterParams.set("addedUntil", filter.addedUntil);
  if (filter.orderByReceiveDate)
    filterParams.set("orderByReceiveDate", filter.orderByReceiveDate);
  if (filter.onlyNotExpired)
    filterParams.set("onlyNotExpired", filter.onlyNotExpired);
  if (filter.employeeCountGt)
    filterParams.set("employeeCountGt", filter.employeeCountGt);
  if (filter.employeeCountLt)
    filterParams.set("employeeCountLt", filter.employeeCountLt);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>求人情報一覧</h1>
        <Collapsible title="絞り込み" defaultOpen={hasFilter}>
          <SearchFilterForm defaultValue={filter} />
        </Collapsible>
      </div>
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList jobsPromise={jobsPromise} filterParams={filterParams} />
      </Suspense>
    </div>
  );
}
