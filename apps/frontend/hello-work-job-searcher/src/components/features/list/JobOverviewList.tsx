"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import React, { useTransition } from "react";
import {
  continuousJobOverviewListWriterAtom,
  JobOverviewListAtom,
  jobWriterAtom,
  scrollRestorationByItemIndexAtom,
  scrollRestorationByItemListAtom,
} from "@/atom";
import { useJobsWithFavorite } from "@/components/features/favorites/useJobsWithFavorite";
import { Card } from "@/components/ui/Card";
import { JobOverview } from "./JobOverview";
import styles from "./JobOverviewList.module.css";
import cardStyles from "./jobCard.module.css";

function NewBadge() {
  return <span className={cardStyles.newBadge}>新着</span>;
}
export function JobOverviewList({ onJobSelect }: { onJobSelect?: () => void }) {
  const { items, page, totalPages } = useAtomValue(JobOverviewListAtom);
  const wrappedItems = useJobsWithFavorite(items);
  const fetchNextPage = useSetAtom(continuousJobOverviewListWriterAtom);
  const selectJob = useSetAtom(jobWriterAtom);
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
              <Card>
                {isNew && <NewBadge />}
                <button
                  type="button"
                  className={cardStyles.selectButton}
                  onClick={() => {
                    startTransition(async () => {
                      await selectJob(item.jobNumber);
                      onJobSelect?.();
                    });
                  }}
                >
                  <JobOverview
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
              {virtualItem.index === lastItem.index && (
                <div className={styles.moreJobsButtonWrapper}>
                  <button
                    type="button"
                    className={styles.moreJobsButton}
                    disabled={page >= totalPages || isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await fetchNextPage();
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
