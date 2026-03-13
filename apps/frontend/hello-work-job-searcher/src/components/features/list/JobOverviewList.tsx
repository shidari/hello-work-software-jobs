"use client";

import { useAtom, useAtomValue } from "jotai";
import { jobOverviewListSelector } from "@/atom/selectors";
import { jobListWriter, jobSelectWriter } from "@/atom/writers";
import { useJobsWithFavorite } from "@/components/features/favorites/useJobsWithFavorite";
import { Card } from "@/components/ui/Card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";
import { JobOverviewCard } from "./JobOverview";
import styles from "./JobOverviewList.module.css";
import cardStyles from "./jobCard.module.css";

function NewBadge() {
  return <span className={cardStyles.newBadge}>新着</span>;
}

export function JobOverviewList({ onJobSelect }: { onJobSelect?: () => void }) {
  const { items, page, totalPages } = useAtomValue(jobOverviewListSelector);
  const wrappedItems = useJobsWithFavorite(items);
  const [, goToPage] = useAtom(jobListWriter);
  const [, selectJob] = useAtom(jobSelectWriter);

  return (
    <div className={styles.list}>
      <div className={styles.items}>
        {wrappedItems.map(({ item, JobFavoriteButton }) => {
          const isNew =
            !!item.receivedDate &&
            Date.now() - new Date(item.receivedDate).getTime() <=
              3 * 24 * 60 * 60 * 1000;
          return (
            <Card key={item.jobNumber}>
              {isNew && <NewBadge />}
              <button
                type="button"
                className={cardStyles.selectButton}
                onClick={async () => {
                  await selectJob(item.jobNumber);
                  onJobSelect?.();
                }}
              >
                <JobOverviewCard
                  jobNumber={item.jobNumber}
                  companyName={item.companyName}
                  occupation={item.occupation}
                  employmentType={item.employmentType}
                  workPlace={item.workPlace}
                  employeeCount={item.employeeCount}
                  receivedDate={item.receivedDate}
                />
              </button>
              <JobFavoriteButton />
            </Card>
          );
        })}
      </div>
      {totalPages > 1 && (
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
      )}
    </div>
  );
}
