"use client";

import type { JobList } from "@sho/models";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import Link from "next/link";
import React, { useTransition } from "react";
import { JobOverview } from "@/app/_components/Job";
import { useJobsWithFavorite } from "@/app/_components/client/hooks/useJobsWithFavorite";
import {
  continuousJobOverviewListWriterAtom,
  JobOverviewListAtom,
  jobListAtom,
  scrollRestorationByItemIndexAtom,
  scrollRestorationByItemListAtom,
} from "../atom";
import styles from "./JobOverviewList.module.css";

function NewBadge() {
  return (
    <span className={`${styles.newBadge} ${styles.newBadgeAbsolute}`}>
      新着
    </span>
  );
}
export function JobOverviewList() {
  const { items, nextToken } = useAtomValue(JobOverviewListAtom);
  const wrappedItems = useJobsWithFavorite(items);
  const fetchNextPage = useSetAtom(continuousJobOverviewListWriterAtom);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [_kSavedOffset, setSavedOffset] = useAtom(
    scrollRestorationByItemIndexAtom,
  );
  const [_kMeasurementsCache, setSavedItemList] = useAtom(
    scrollRestorationByItemListAtom,
  );

  const rowVirtualizer = useVirtualizer({
    count: wrappedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // 内部計算用はpxのまま
    initialOffset: _kSavedOffset,
    initialMeasurementsCache: _kMeasurementsCache,
    onChange: (virtualizer) => {
      if (!virtualizer.isScrolling) {
        setSavedItemList(virtualizer.measurementsCache);
        setSavedOffset(virtualizer.scrollOffset || 0);
      }
    },
  });

  const [isPending, startTransition] = useTransition();

  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div ref={parentRef} style={{ height: "100%", overflow: "auto" }}>
      <div
        style={{
          height: `${totalSize}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const wrappedItem = wrappedItems[virtualItem.index];
          const { item, JobFavoriteButton } = wrappedItem;
          // 新着判定: 3日前以内
          const isNew =
            !!item.receivedDate &&
            Date.now() - new Date(item.receivedDate).getTime() <=
              3 * 24 * 60 * 60 * 1000;
          const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
          return (
            <div
              key={item.jobNumber}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <section
                className={`${styles.jobOverview} ${styles.jobOverviewRelative}`}
              >
                {isNew && <NewBadge />}
                <div className={styles.sectionHeader}>
                  <Link
                    href={`/jobs/${item.jobNumber}`}
                    className={styles.jobLink}
                  >
                    <JobOverview
                      jobNumber={item.jobNumber}
                      companyName={item.companyName}
                      jobTitle={item.jobTitle}
                      employmentType={item.employmentType}
                      workPlace={item.workPlace}
                      employeeCount={item.employeeCount}
                      receivedDate={item.receivedDate}
                    />
                  </Link>
                  <JobFavoriteButton />
                </div>
              </section>
              {virtualItem.index === lastItem.index && (
                <div className={styles.moreJobsButtonWrapper}>
                  <button
                    type="button"
                    className={styles.moreJobsButton}
                    disabled={!nextToken || isPending}
                    onClick={() => {
                      startTransition(async () => {
                        nextToken && (await fetchNextPage(nextToken));
                      });
                    }}
                  >
                    {isPending ? "求人を読み込み中" : "求人をもっと見る"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HydratedJobOverviewList({
  initialDataFromServer,
}: {
  initialDataFromServer: {
    jobs: JobList;
    nextToken: string | undefined;
    totalCount: number;
  };
}) {
  useHydrateAtoms([[jobListAtom, initialDataFromServer]]);
  return <JobOverviewList />;
}
