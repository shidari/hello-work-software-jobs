"use client";

import type { hc, InferResponseType } from "hono/client";
import Link from "next/link";
import { use } from "react";
import { JobCard } from "@/components/features/list/JobCard";
import type { AppType } from "@/lib/backend-client";
import styles from "./JobsPageClient.module.css";
import { JobsPagination } from "./JobsPagination_client";

export type JobsListData = InferResponseType<
  ReturnType<typeof hc<AppType>>["jobs"]["$get"],
  200
>;

export function JobsList({
  jobsPromise,
  filterParams,
}: {
  jobsPromise: Promise<JobsListData>;
  filterParams: URLSearchParams;
}) {
  const data = use(jobsPromise);
  const { page, totalPages, totalCount } = data.meta;

  return (
    <>
      <div>求人情報の総数: {totalCount} 件</div>
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
    </>
  );
}
