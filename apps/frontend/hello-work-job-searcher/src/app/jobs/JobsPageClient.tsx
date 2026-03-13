"use client";

import { useAtom, useAtomValue } from "jotai";
import Link from "next/link";
import { jobOverviewListSelector } from "@/atom/selectors";
import { jobListWriter } from "@/atom/writers";
import { useJobsWithFavorite } from "@/components/features/favorites/useJobsWithFavorite";
import { JobOverviewCard } from "@/components/features/list/JobOverview";
import { JobsSearchfilter } from "@/components/features/list/JobSearchFilter";
import { JobtotalCount } from "@/components/features/list/JobTotalCount";
import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";
import styles from "./JobsPageClient.module.css";

export function JobsPageClient({
  initialTotalCount,
  filterOpen = false,
}: {
  initialTotalCount: number;
  filterOpen?: boolean;
}) {
  const { items, page, totalPages } = useAtomValue(jobOverviewListSelector);
  const wrappedItems = useJobsWithFavorite(items);
  const [, goToPage] = useAtom(jobListWriter);

  const pagination = totalPages > 1 && (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink disabled>
            {page} / {totalPages}
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>求人情報一覧</h1>
        <JobtotalCount initialDataFromServer={initialTotalCount} />
        <Collapsible title="絞り込み" defaultOpen={filterOpen}>
          <JobsSearchfilter />
        </Collapsible>
      </div>
      {pagination}
      <div className={styles.items}>
        {wrappedItems.map(({ item, JobFavoriteButton }) => {
          const isNew =
            !!item.receivedDate &&
            Date.now() - new Date(item.receivedDate).getTime() <=
              3 * 24 * 60 * 60 * 1000;
          return (
            <Link
              key={item.jobNumber}
              href={`/jobs/${item.jobNumber}`}
              className={styles.cardLink}
            >
              <Card>
                {isNew && <span className={styles.newBadge}>新着</span>}
                <JobOverviewCard
                  jobNumber={item.jobNumber}
                  companyName={item.companyName}
                  occupation={item.occupation}
                  employmentType={item.employmentType}
                  workPlace={item.workPlace}
                  employeeCount={item.employeeCount}
                  receivedDate={item.receivedDate}
                />
                <JobFavoriteButton />
              </Card>
            </Link>
          );
        })}
      </div>
      {pagination}
    </div>
  );
}
