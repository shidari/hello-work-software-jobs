export const dynamic = "force-dynamic";

import { Effect, Schema } from "effect";
import Link from "next/link";
import { jobStoreClient } from "#lib/backend-client";
import { JobCard } from "@/components/features/list/JobCard";
import { SearchFilterSchema } from "@/components/features/list/JobSearchFilter";
import { Collapsible } from "@/components/ui/Collapsible";
import { runLog } from "@/lib/log";
import styles from "./JobsPageClient.module.css";
import { JobsPagination } from "./JobsPagination_client";
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
    return <main>求人情報の取得に失敗しました。</main>;
  }
  const data = await res.json();
  const { page, totalPages, totalCount } = data.meta;
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
        <div>求人情報の総数: {totalCount} 件</div>
        <Collapsible title="絞り込み" defaultOpen={hasFilter}>
          <SearchFilterForm defaultValue={filter} />
        </Collapsible>
      </div>
      {totalPages > 1 && (
        <JobsPagination
          currentPage={page}
          totalPages={totalPages}
          filterParams={filterParams}
        />
      )}
      <div className={styles.items}>
        {data.jobs.map((job) => {
          const isNew =
            !!job.receivedDate &&
            Date.now() - new Date(job.receivedDate).getTime() <=
              3 * 24 * 60 * 60 * 1000;
          return (
            <Link
              key={job.jobNumber}
              href={`/jobs/${job.jobNumber}`}
              className={styles.cardLink}
            >
              <JobCard job={job} isNew={isNew} />
            </Link>
          );
        })}
      </div>
      {totalPages > 1 && (
        <JobsPagination
          currentPage={page}
          totalPages={totalPages}
          filterParams={filterParams}
        />
      )}
    </div>
  );
}
