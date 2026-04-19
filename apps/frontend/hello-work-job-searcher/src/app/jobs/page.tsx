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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>求人情報一覧</h1>
        <Collapsible title="絞り込み" defaultOpen={hasFilter}>
          <SearchFilterForm defaultValue={filter} />
        </Collapsible>
      </div>
      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList jobsPromise={jobsPromise} />
      </Suspense>
    </div>
  );
}
